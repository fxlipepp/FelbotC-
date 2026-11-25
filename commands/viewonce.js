const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

function unwrapQuotedContent(content) {
    let current = content;

    // Baileys puede envolver mensajes normales en ephemeral/documentWithCaption.
    // No desenvolvemos viewOnce: .vv no debe procesar contenido de una sola visualización.
    while (current) {
        if (current.ephemeralMessage?.message) {
            current = current.ephemeralMessage.message;
            continue;
        }
        if (current.documentWithCaptionMessage?.message) {
            current = current.documentWithCaptionMessage.message;
            continue;
        }
        break;
    }

    return current || {};
}

async function downloadMedia(media, mediaType) {
    if (!media || media.viewOnce || (!media.url && !media.directPath)) {
        throw new Error('El mensaje citado no contiene una foto o video normal descargable.');
    }

    const stream = await downloadContentFromMessage(media, mediaType);
    const chunks = [];

    for await (const chunk of stream) {
        chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    if (!buffer.length) {
        throw new Error('La descarga terminó sin contenido multimedia.');
    }

    return buffer;
}

async function viewonceCommand(sock, chatId, message) {
    const contextInfo = message?.message?.extendedTextMessage?.contextInfo;
    const quotedRaw = contextInfo?.quotedMessage;

    if (!quotedRaw) {
        await sock.sendMessage(chatId, {
            text: '⚠️ Responde a una foto o video normal con *.vv* para reenviarlo.'
        }, { quoted: message });
        return;
    }

    const quoted = unwrapQuotedContent(quotedRaw);
    const image = quoted.imageMessage;
    const video = quoted.videoMessage;

    // Rechazar explícitamente mensajes de una sola visualización.
    if (image?.viewOnce || video?.viewOnce) {
        await sock.sendMessage(chatId, {
            text: '⚠️ *.vv* solo admite fotos y videos normales, no mensajes de una sola visualización.'
        }, { quoted: message });
        return;
    }

    const media = image || video;
    const mediaType = image ? 'image' : video ? 'video' : null;

    if (!media || !mediaType) {
        await sock.sendMessage(chatId, {
            text: '❌ No encontré una foto o video válido en el mensaje citado. Responde directamente al archivo con *.vv*.'
        }, { quoted: message });
        return;
    }

    try {
        const buffer = await downloadMedia(media, mediaType);
        const payload = mediaType === 'image'
            ? { image: buffer, caption: media.caption || '' }
            : { video: buffer, caption: media.caption || '', mimetype: 'video/mp4' };

        await sock.sendMessage(chatId, payload, { quoted: message });
    } catch (error) {
        console.error('[.vv] No se pudo procesar el archivo citado:', error);
        await sock.sendMessage(chatId, {
            text: '❌ No pude descargar ese archivo. Puede que el mensaje ya no tenga el contenido multimedia disponible.'
        }, { quoted: message });
    }
}

module.exports = viewonceCommand;