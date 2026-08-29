const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const settings = require('../settings');

function getOwnerJid() {
    const rawNumber = (settings.OWNER_NUMBER || settings.ownerNumber || '').toString().trim();
    const cleanNumber = rawNumber.replace(/\D/g, '');

    if (!cleanNumber) return null;
    return `${cleanNumber}@s.whatsapp.net`;
}

function isGroupChat(chatId = '') {
    return typeof chatId === 'string' && chatId.endsWith('@g.us');
}

function getViewOnceTarget(chatId = '') {
    if (isGroupChat(chatId)) return chatId;
    return getOwnerJid() || chatId || null;
}

async function recoverViewOnceMedia(msg) {
    const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const direct = msg?.message?.viewOnceMessageV2?.message || msg?.message?.viewOnceMessage?.message || {};

    const image = quoted?.imageMessage?.viewOnce ? quoted.imageMessage : direct.imageMessage?.viewOnce ? direct.imageMessage : null;
    const video = quoted?.videoMessage?.viewOnce ? quoted.videoMessage : direct.videoMessage?.viewOnce ? direct.videoMessage : null;

    if (image) {
        const stream = await downloadContentFromMessage(image, 'image');
        let buffer = Buffer.from([]);

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        return {
            type: 'image',
            buffer,
            fileName: 'media.jpg',
            caption: image.caption || ''
        };
    }

    if (video) {
        const stream = await downloadContentFromMessage(video, 'video');
        let buffer = Buffer.from([]);

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        return {
            type: 'video',
            buffer,
            fileName: 'media.mp4',
            caption: video.caption || ''
        };
    }

    return null;
}

async function viewonceCommand(sock, chatId, message) {
    const media = await recoverViewOnceMedia(message);
    if (!media) {
        console.error('viewonceCommand: no se pudo recuperar la media o no es un mensaje de vista única.');
        return;
    }

    const targetJid = getViewOnceTarget(chatId);
    if (!targetJid) {
        console.error('viewonceCommand: no hay destino válido para reenviar la media.');
        return;
    }

    await sock.sendMessage(targetJid, {
        [media.type]: media.buffer,
        fileName: media.fileName,
        caption: `👁️ *Vista recuperada*\n\n${media.caption}`
    });
}

module.exports = viewonceCommand;
module.exports.getViewOnceTarget = getViewOnceTarget;
module.exports.getOwnerJid = getOwnerJid;