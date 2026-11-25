'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const sharp = require('sharp');
const { promisify } = require('util');
const { execFile } = require('child_process');
const {
    downloadMediaMessage,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    proto
} = require('@whiskeysockets/baileys');
const { getVideoCandidates, isValidTikTokUrl } = require('./tiktok');
const { attachAudio, detachAudio, installStickerAudioPatch } = require('../lib/stickerAudioPatch');

const execFileAsync = promisify(execFile);
const MAX_AUDIO_SECONDS = 10;
const MAX_STICKER_BYTES = 500 * 1024;

function unwrapMessage(content) {
    let current = content;
    while (current?.ephemeralMessage?.message || current?.documentWithCaptionMessage?.message) {
        current = current.ephemeralMessage?.message || current.documentWithCaptionMessage?.message;
    }
    return current || {};
}

function getText(message) {
    return String(
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.imageMessage?.caption ||
        message.message?.videoMessage?.caption ||
        ''
    ).trim();
}

function getQuotedSticker(message) {
    const context =
        message.message?.extendedTextMessage?.contextInfo ||
        message.message?.imageMessage?.contextInfo ||
        message.message?.videoMessage?.contextInfo;
    if (!context?.quotedMessage) return null;

    const quoted = unwrapMessage(context.quotedMessage);
    if (!quoted.stickerMessage) return null;

    return {
        context,
        message: {
            key: {
                remoteJid: message.key.remoteJid,
                id: context.stanzaId,
                participant: context.participant
            },
            message: quoted
        },
        sticker: quoted.stickerMessage
    };
}

async function downloadTikTok(url, outputFile) {
    const candidates = await getVideoCandidates(url);
    if (!candidates.length) throw new Error('Los servidores no encontraron un enlace de descarga válido.');

    let lastError;
    for (const candidate of candidates) {
        try {
            const response = await axios.get(candidate.video, {
                responseType: 'arraybuffer',
                timeout: 45000,
                maxContentLength: 80 * 1024 * 1024,
                maxBodyLength: 80 * 1024 * 1024,
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Referer': 'https://www.tiktok.com/'
                },
                validateStatus: status => status >= 200 && status < 300
            });

            const buffer = Buffer.from(response.data);
            if (buffer.length < 4096) throw new Error('El servidor devolvió un archivo incompleto.');
            fs.writeFileSync(outputFile, buffer);

            // No confiar solo en el enlace de la API: comprobar que sea un MP4
            // legible y que realmente tenga una pista de audio antes de continuar.
            const duration = await probeDuration(outputFile);
            return duration;
        } catch (error) {
            lastError = error;
            try { fs.unlinkSync(outputFile); } catch {}
        }
    }

    throw new Error(
        'Los enlaces de TikTok devolvieron archivos dañados o sin audio.' +
        (lastError?.message ? ' Último error: ' + lastError.message : '')
    );
}

async function probeDuration(file) {
    const { stdout } = await execFileAsync('ffprobe', [
        '-v', 'error',
        '-select_streams', 'a:0',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        file
    ], { timeout: 20000, maxBuffer: 1024 * 1024 });

    const duration = Number.parseFloat(stdout.trim());
    if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('El TikTok no tiene una pista de audio válida.');
    }
    return Math.min(MAX_AUDIO_SECONDS, duration);
}

async function createAnimatedSticker(inputPng, videoFile, outputWebp, duration) {
    const attempts = [
        { fps: 12, quality: 55 },
        { fps: 10, quality: 40 },
        { fps: 8, quality: 28 },
        { fps: 6, quality: 18 }
    ];

    for (const setting of attempts) {
        await execFileAsync('ffmpeg', [
            '-v', 'error',
            '-y',
            '-loop', '1', '-i', inputPng,
            '-t', duration.toFixed(3),
            '-vf', `fps=${setting.fps},scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000`,
            '-an',
            '-c:v', 'libwebp',
            '-lossless', '0',
            '-q:v', String(setting.quality),
            '-compression_level', '4',
            '-loop', '0',
            '-fps_mode', 'passthrough',
            '-pix_fmt', 'yuva420p',
            outputWebp
        ], { timeout: 90000, maxBuffer: 1024 * 1024 });

        const size = fs.statSync(outputWebp).size;
        if (size <= MAX_STICKER_BYTES) return;
    }

    throw new Error('El sticker supera el límite de 500 KB incluso después de comprimirlo.');
}

async function createOpusAudio(videoFile, outputOgg, duration) {
    await execFileAsync('ffmpeg', [
        '-y',
        '-i', videoFile,
        '-t', duration.toFixed(3),
        '-map', '0:a:0',
        '-vn',
        '-c:a', 'libopus',
        '-b:a', '32k',
        '-ar', '48000',
        '-ac', '1',
        '-application', 'voip',
        '-map_metadata', '-1',
        outputOgg
    ], { timeout: 90000, maxBuffer: 4 * 1024 * 1024 });
}

async function soundStickerCommand(sock, chatId, message) {
    const quoted = getQuotedSticker(message);
    if (!quoted) {
        await sock.sendMessage(chatId, {
            text: '❌ Cita primero un sticker y escribe:\n.ss https://www.tiktok.com/...'
        }, { quoted: message });
        return false;
    }

    const text = getText(message);
    const url = text.split(/\s+/).slice(1).find(part => /^https?:\/\//i.test(part));
    if (!url || !isValidTikTokUrl(url)) {
        await sock.sendMessage(chatId, {
            text: '❌ Falta un enlace válido de TikTok.\n\nEjemplo: .ss https://www.tiktok.com/...'
        }, { quoted: message });
        return false;
    }

    const tempRoot = path.join(process.cwd(), 'temp');
    fs.mkdirSync(tempRoot, { recursive: true });
    const workDir = fs.mkdtempSync(path.join(tempRoot, 'sound-sticker-'));
    const stickerInput = path.join(workDir, 'quoted.webp');
    const stickerFrame = path.join(workDir, 'quoted.png');
    const tiktokVideo = path.join(workDir, 'tiktok.mp4');
    const stickerOutput = path.join(workDir, 'sound.webp');
    const audioOutput = path.join(workDir, 'sound.ogg');

    try {
        const stickerBuffer = await downloadMediaMessage(
            quoted.message,
            'buffer',
            {},
            { logger: undefined, reuploadRequest: sock.updateMediaMessage }
        );
        if (!stickerBuffer?.length) throw new Error('No pude descargar el sticker citado.');
        fs.writeFileSync(stickerInput, stickerBuffer);

        // Sharp decodes animated WebP correctly; FFmpeg's WebP demuxer may reject ANIM/ANMF chunks.
        await sharp(stickerBuffer, { animated: false, page: 0 })
            .rotate()
            .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
            .png()
            .toFile(stickerFrame);

        const duration = await downloadTikTok(url, tiktokVideo);
        await Promise.all([
            createAnimatedSticker(stickerFrame, tiktokVideo, stickerOutput, duration),
            createOpusAudio(tiktokVideo, audioOutput, duration)
        ]);

        installStickerAudioPatch(proto);

        const uploadOptions = { upload: sock.waUploadToServer };
        const [uploadedAudio, uploadedSticker] = await Promise.all([
            prepareWAMessageMedia({
                audio: fs.readFileSync(audioOutput),
                mimetype: 'audio/ogg; codecs=opus',
                seconds: Math.max(1, Math.round(duration))
            }, uploadOptions),
            prepareWAMessageMedia({
                sticker: fs.readFileSync(stickerOutput),
                isAnimated: true
            }, uploadOptions)
        ]);

        const audio = uploadedAudio.audioMessage;
        const audioBytes = proto.Message.AudioMessage.encode(
            proto.Message.AudioMessage.create({
                url: audio.url,
                mimetype: 'audio/ogg; codecs=opus',
                fileSha256: audio.fileSha256,
                fileLength: audio.fileLength,
                seconds: Math.max(1, Math.round(duration)),
                ptt: true,
                mediaKey: audio.mediaKey,
                fileEncSha256: audio.fileEncSha256,
                directPath: audio.directPath,
                mediaKeyTimestamp: audio.mediaKeyTimestamp || Math.floor(Date.now() / 1000)
            })
        ).finish();

        const sticker = uploadedSticker.stickerMessage;
        sticker.isAnimated = true;
        attachAudio(sticker.fileSha256, audioBytes);

        try {
            const outgoing = generateWAMessageFromContent(
                chatId,
                { stickerMessage: sticker },
                { quoted: message, userJid: sock.user?.id }
            );
            await sock.relayMessage(chatId, outgoing.message, { messageId: outgoing.key.id });
        } finally {
            detachAudio(sticker.fileSha256);
        }

        return true;
    } catch (error) {
        console.error('[.ss] Error creando Sound Sticker:', error);
        await sock.sendMessage(chatId, {
            text: '❌ No pude crear el sticker con sonido.\n' +
                (String(error?.message || '').slice(0, 220) || 'Inténtalo nuevamente.')
        }, { quoted: message });
        return false;
    } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
    }
}

module.exports = soundStickerCommand;
