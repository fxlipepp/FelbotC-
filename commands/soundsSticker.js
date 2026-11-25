'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');
const crypto = require('crypto');
const { promisify } = require('util');
const { execFile } = require('child_process');
const {
    downloadMediaMessage,
    prepareWAMessageMedia,
    proto
} = require('@whiskeysockets/baileys');
const { getVideoCandidates, isValidTikTokUrl } = require('./tiktok');
const { installStickerAudioPatch } = require('../lib/stickerAudioPatch');

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
    if (!candidates.length) throw new Error('Los servidores no encontraron enlaces de descarga.');

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
                    'Referer': 'https://www.tiktok.com/',
                    'Accept': 'video/mp4,video/*,application/octet-stream,*/*'
                },
                validateStatus: status => status >= 200 && status < 300
            });

            const buffer = Buffer.from(response.data);
            const contentType = String(response.headers?.['content-type'] || '').toLowerCase();

            if (buffer.length < 4096) {
                throw new Error('El servidor devolvió un archivo vacío o incompleto.');
            }
            if (contentType.includes('text/html') || contentType.includes('application/json')) {
                throw new Error('El servidor devolvió una página de error en lugar del video.');
            }
            // Los MP4 contienen normalmente la firma ftyp al inicio del contenedor.
            if (buffer.toString('ascii', 4, 8) !== 'ftyp') {
                throw new Error('La respuesta no tiene una cabecera MP4 válida.');
            }

            fs.writeFileSync(outputFile, buffer);

            // Validar el contenedor y exigir ambas pistas antes de usar el archivo.
            const duration = await probeDuration(outputFile);
            return duration;
        } catch (error) {
            lastError = error;
            try { fs.unlinkSync(outputFile); } catch {}
        }
    }

    throw new Error(
        'Todos los enlaces de TikTok fallaron al validar el MP4.' +
        (lastError?.message ? ' Último error: ' + lastError.message : '')
    );
}

async function probeDuration(file) {
    const { stdout } = await execFileAsync('ffprobe', [
        '-v', 'error',
        '-show_entries', 'stream=codec_type:format=duration',
        '-of', 'json',
        file
    ], { timeout: 20000, maxBuffer: 1024 * 1024 });

    let metadata;
    try {
        metadata = JSON.parse(stdout);
    } catch {
        throw new Error('FFprobe no pudo leer los metadatos del video.');
    }

    const streams = Array.isArray(metadata.streams) ? metadata.streams : [];
    const hasVideo = streams.some(stream => stream.codec_type === 'video');
    const hasAudio = streams.some(stream => stream.codec_type === 'audio');
    const duration = Number.parseFloat(metadata.format?.duration);

    if (!hasVideo) throw new Error('El archivo descargado no contiene una pista de video.');
    if (!hasAudio) throw new Error('El TikTok descargado no contiene una pista de audio.');
    if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('El TikTok tiene una duración inválida.');
    }

    return Math.min(MAX_AUDIO_SECONDS, duration);
}

async function createAnimatedSticker(inputGif, videoFile, outputWebp, duration) {
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
            '-stream_loop', '-1', '-i', inputGif,
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

async function createWaveform(audioFile) {
    const { stdout } = await execFileAsync('ffmpeg', [
        '-v', 'error', '-i', audioFile, '-vn',
        '-f', 's16le', '-ac', '1', '-ar', '8000', 'pipe:1'
    ], { timeout: 30000, maxBuffer: 4 * 1024 * 1024, encoding: 'buffer' });

    const pcm = Buffer.from(stdout);
    const samples = Math.floor(pcm.length / 2);
    const bars = 64;
    const levels = new Array(bars).fill(0);
    if (!samples) throw new Error('No pude generar la forma de onda del audio.');

    const perBar = Math.max(1, Math.floor(samples / bars));
    for (let bar = 0; bar < bars; bar++) {
        const from = bar * perBar;
        const to = Math.min(samples, from + perBar);
        let sum = 0;
        for (let i = from; i < to; i++) sum += Math.abs(pcm.readInt16LE(i * 2));
        levels[bar] = to > from ? sum / (to - from) : 0;
    }
    const peak = Math.max(...levels) || 1;
    return Uint8Array.from(levels.map(value => Math.round((value / peak) * 100)));
}

async function createOpusAudio(videoFile, outputOgg, duration) {
    // Re-encode through clean 48 kHz PCM before Opus. This avoids carrying
    // source MP4 timestamps into the Ogg stream (some WhatsApp clients reject it).
    const wavFile = outputOgg + '.wav';
    try {
        await execFileAsync('ffmpeg', [
            '-v', 'error', '-y',
            '-i', videoFile,
            '-vn', '-map', '0:a:0',
            '-af', `aresample=48000:first_pts=0,apad=whole_dur=${duration.toFixed(3)}`,
            '-ac', '1',
            '-c:a', 'pcm_s16le',
            '-t', duration.toFixed(3),
            wavFile
        ], { timeout: 90000, maxBuffer: 4 * 1024 * 1024 });

        await execFileAsync('ffmpeg', [
            '-v', 'error', '-y',
            '-i', wavFile,
            '-c:a', 'libopus',
            '-b:a', '32k',
            '-map_metadata', '-1',
            outputOgg
        ], { timeout: 90000, maxBuffer: 4 * 1024 * 1024 });
    } finally {
        try { fs.unlinkSync(wavFile); } catch {}
    }
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
    const stickerGif = path.join(workDir, 'quoted.gif');
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

        // Preserve every frame: extracting page 0 turns an animated sticker into a still image.
        // Sharp decodes animated WebP and writes GIF, which FFmpeg can reliably read.
        await sharp(stickerBuffer, { animated: true })
            .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .gif()
            .toFile(stickerGif);

        const duration = await downloadTikTok(url, tiktokVideo);
        await Promise.all([
            createAnimatedSticker(stickerGif, tiktokVideo, stickerOutput, duration),
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
        const waveform = await createWaveform(audioOutput);
        const audioMessage = proto.Message.AudioMessage.create({
                url: audio.url,
                mimetype: 'audio/ogg; codecs=opus',
                fileSha256: audio.fileSha256,
                fileLength: audio.fileLength,
                seconds: Math.max(1, Math.round(duration)),
                ptt: false,
                mediaKey: audio.mediaKey,
                fileEncSha256: audio.fileEncSha256,
                directPath: audio.directPath,
                mediaKeyTimestamp: audio.mediaKeyTimestamp || Math.floor(Date.now() / 1000),
                waveform
            });

        const sticker = uploadedSticker.stickerMessage;
        sticker.isAnimated = true;
        sticker.width = 512;
        sticker.height = 512;
        sticker.audioMessage = {
            ...audioMessage,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: false
        };

        // WhatsApp/Suki usa el sobre AudioStickerMessage (campo 134),
        // que contiene Message.stickerMessage y su StickerMessage.audioMessage (campo 26).
        // El formato anterior solo enviaba StickerMessage directamente y por eso
        // WhatsApp mostraba la animación como un sticker normal, sin altavoz.
        const firstFrameLength = (buffer) => {
            if (!Buffer.isBuffer(buffer) || buffer.length < 12 || buffer.toString('ascii', 0, 4) !== 'RIFF') return null;
            let offset = 12;
            while (offset + 8 <= buffer.length) {
                const chunk = buffer.toString('ascii', offset, offset + 4);
                const size = buffer.readUInt32LE(offset + 4);
                offset += 8 + size + (size % 2);
                if (chunk === 'ANMF') return offset;
            }
            return null;
        };
        const firstFrame = firstFrameLength(fs.readFileSync(stickerOutput));
        if (firstFrame) sticker.firstFrameLength = firstFrame;

        const payload = {
            audioStickerMessage: {
                message: { stickerMessage: sticker }
            },
            messageContextInfo: {
                messageSecret: crypto.randomBytes(32)
            }
        };

        const encoded = Buffer.from(proto.Message.encode(payload).finish());
        const readVarint = (buffer, state) => {
            let value = 0n;
            let shift = 0n;
            while (state.offset < buffer.length) {
                const byte = buffer[state.offset++];
                value |= BigInt(byte & 0x7f) << shift;
                if (!(byte & 0x80)) return Number(value);
                shift += 7n;
            }
            throw new Error('Protobuf incompleto al validar el Sound Sticker.');
        };
        const findBytesField = (buffer, wanted) => {
            const state = { offset: 0 };
            while (state.offset < buffer.length) {
                const tag = readVarint(buffer, state);
                const field = tag >> 3;
                const wire = tag & 7;
                if (wire === 2) {
                    const length = readVarint(buffer, state);
                    const end = state.offset + length;
                    if (end > buffer.length) throw new Error('Longitud protobuf inválida.');
                    const data = buffer.subarray(state.offset, end);
                    if (field === wanted) return data;
                    state.offset = end;
                } else if (wire === 0) {
                    readVarint(buffer, state);
                } else if (wire === 1) {
                    state.offset += 8;
                } else if (wire === 5) {
                    state.offset += 4;
                } else {
                    throw new Error('Tipo protobuf no compatible al validar audio.');
                }
            }
            return null;
        };

        // Campo 134 = audioStickerMessage; dentro viene Message (campo 1),
        // luego StickerMessage (26) y finalmente AudioMessage (26).
        const audioStickerPayload = findBytesField(encoded, 134);
        const wrappedMessage = audioStickerPayload && findBytesField(audioStickerPayload, 1);
        const stickerPayload = wrappedMessage && findBytesField(wrappedMessage, 26);
        const embeddedAudio = stickerPayload && findBytesField(stickerPayload, 26);
        if (!embeddedAudio) {
            throw new Error('El sobre AudioStickerMessage no conservó el audio incrustado; se canceló el envío.');
        }

        const decodedAudio = proto.Message.AudioMessage.decode(embeddedAudio);
        if (!decodedAudio.url || !decodedAudio.directPath || !decodedAudio.mediaKey ||
            !decodedAudio.fileSha256 || !decodedAudio.fileEncSha256) {
            throw new Error('El audio quedó incrustado, pero sus datos de descarga están incompletos.');
        }

        console.log('[.ss] AudioStickerMessage validado:', {
            wrapperField: 134,
            stickerAudioField: 26,
            audioBytes: embeddedAudio.length,
            seconds: decodedAudio.seconds,
            mimetype: decodedAudio.mimetype,
            ptt: decodedAudio.ptt,
            waveformBytes: decodedAudio.waveform?.length || 0,
            stickerBytes: fs.statSync(stickerOutput).size,
            firstFrameLength: sticker.firstFrameLength || 0
        });

        const { generateMessageIDV2, generateMessageID } = require('@whiskeysockets/baileys');
        const messageId = typeof generateMessageIDV2 === 'function'
            ? generateMessageIDV2(sock.user?.id)
            : typeof generateMessageID === 'function'
                ? generateMessageID()
                : crypto.randomBytes(10).toString('hex').toUpperCase();

        await sock.relayMessage(chatId, payload, { messageId });
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
