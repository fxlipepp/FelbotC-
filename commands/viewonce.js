const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const settings = require('../settings');

function getOwnerJid() {
    const rawNumber = (settings.OWNER_NUMBER || settings.ownerNumber || '').toString().trim();
    const cleanNumber = rawNumber.replace(/\D/g, '');

    if (!cleanNumber) return null;
    return `${cleanNumber}@s.whatsapp.net`;
}

async function viewonceCommand(sock, chatId, message) {
    // Obtener mensaje citado
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedImage = quoted?.imageMessage;
    const quotedVideo = quoted?.videoMessage;

    if (quotedImage && quotedImage.viewOnce) {

        // Descargar imagen
        const stream = await downloadContentFromMessage(quotedImage, 'image');
        let buffer = Buffer.from([]);

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const ownerJid = getOwnerJid();
        if (ownerJid) {
            await sock.sendMessage(
                ownerJid,
                {
                    image: buffer,
                    fileName: 'media.jpg',
                    caption: `👁️ *Vista recuperada*\n\n${quotedImage.caption || ''}`
                }
            );
        }
        return;

    } else if (quotedVideo && quotedVideo.viewOnce) {

        // Descargar video
        const stream = await downloadContentFromMessage(quotedVideo, 'video');
        let buffer = Buffer.from([]);

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const ownerJid = getOwnerJid();
        if (ownerJid) {
            await sock.sendMessage(
                ownerJid,
                {
                    video: buffer,
                    fileName: 'media.mp4',
                    caption: `👁️ *Vista recuperada*\n\n${quotedVideo.caption || ''}`
                }
            );
        }
        return;

    } else {
        // Sin mensajes en grupo: se mantiene el flujo de error sin responder al chat actual.
        console.error('viewonceCommand: no se pudo recuperar la media o no es un mensaje de vista única.');
        return;
    }
}

module.exports = viewonceCommand;