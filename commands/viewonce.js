const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

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

        // Enviar imagen recuperada
        await sock.sendMessage(
            chatId,
            {
                image: buffer,
                fileName: 'media.jpg',
                caption: `👁️ *Vista recuperada*\n\n${quotedImage.caption || ''}`
            },
            { quoted: message }
        );

    } else if (quotedVideo && quotedVideo.viewOnce) {

        // Descargar video
        const stream = await downloadContentFromMessage(quotedVideo, 'video');
        let buffer = Buffer.from([]);

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        // Enviar video recuperado
        await sock.sendMessage(
            chatId,
            {
                video: buffer,
                fileName: 'media.mp4',
                caption: `👁️ *Vista recuperada*\n\n${quotedVideo.caption || ''}`
            },
            { quoted: message }
        );

    } else {

        // Mensaje de error
        await sock.sendMessage(
            chatId,
            {
                text: '❌ Responde a una imagen o video de ver una sola vez.'
            },
            { quoted: message }
        );
    }
}

module.exports = viewonceCommand;