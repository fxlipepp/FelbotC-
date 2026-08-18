const fs = require('fs');
const path = require('path');
const Group = require('../models/Group');
const settings = require('../settings');

const DEFAULT_GOODBYE_MESSAGE = 'Una mierda menos, no te extrañaremos.';

function getGoodbyeAudioPath(groupData = {}) {
    const configured = groupData?.goodbye?.audioPath || settings.goodbyeAudioPath || process.env.GOODBYE_AUDIO_PATH;
    if (!configured) return null;
    return fs.existsSync(configured) ? configured : null;
}

function getGoodbyeImagePath(groupData = {}) {
    const configured = groupData?.goodbye?.imagePath || settings.goodbyeImagePath || process.env.GOODBYE_IMAGE_PATH;
    if (!configured) return null;
    return fs.existsSync(configured) ? configured : null;
}

async function goodbyeCommand(sock, chatId, message) {
    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { text: '❌ Este comando solo funciona dentro de un grupo.' }, { quoted: message });
        return;
    }

    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const args = text.split(' ').slice(1);
    const action = args[0]?.toLowerCase();

    let groupData = await Group.findOne({ groupId: chatId });
    if (!groupData) {
        groupData = await Group.create({ groupId: chatId });
    }

    if (!groupData.goodbye) {
        groupData.goodbye = {
            enabled: false,
            message: DEFAULT_GOODBYE_MESSAGE,
            imagePath: null,
            audioPath: null
        };
    }

    if (!action) {
        await sock.sendMessage(chatId, {
            text: `
╭─〔 👋 𝖦𝗈𝗈𝖽𝖻𝗒𝖾 𝖲𝗒𝗌𝗍𝖾𝗆 〕─╮

> Mostrar sistema de despedidas del bot

✅ .despedida on
> Activar despedidas en el grupo

❌ .despedida off
> Desactivar sistema de despedidas

🛠️ .despedida set texto
> Personalizar mensaje de despedida

📌 También puedes dejar la imagen y el audio en:
> settings.js / GOODBYE_IMAGE_PATH
> settings.js / GOODBYE_AUDIO_PATH

╰────────────────╯
`
        }, { quoted: message });
        return;
    }

    if (action === 'on') {
        groupData.goodbye.enabled = true;
        await groupData.save();
        await sock.sendMessage(chatId, { text: '✅ Despedida activada.' }, { quoted: message });
        return;
    }

    if (action === 'off') {
        groupData.goodbye.enabled = false;
        await groupData.save();
        await sock.sendMessage(chatId, { text: '❌ Despedida desactivada.' }, { quoted: message });
        return;
    }

    if (action === 'set') {
        const customText = args.slice(1).join(' ');

        if (!customText) {
            await sock.sendMessage(chatId, { text: '⚠️ Escribe un mensaje para guardar.' }, { quoted: message });
            return;
        }

        groupData.goodbye.message = customText;
        await groupData.save();
        await sock.sendMessage(chatId, { text: '✅ Mensaje de despedida guardado.' }, { quoted: message });
        return;
    }

    if (action === 'image') {
        const imageValue = args.slice(1).join(' ');
        if (!imageValue) {
            await sock.sendMessage(chatId, { text: '⚠️ Añade la ruta de la imagen.' }, { quoted: message });
            return;
        }
        groupData.goodbye.imagePath = imageValue;
        await groupData.save();
        await sock.sendMessage(chatId, { text: '✅ Ruta de imagen de despedida guardada.' }, { quoted: message });
        return;
    }

    if (action === 'audio') {
        const audioValue = args.slice(1).join(' ');
        if (!audioValue) {
            await sock.sendMessage(chatId, { text: '⚠️ Añade la ruta del audio.' }, { quoted: message });
            return;
        }
        groupData.goodbye.audioPath = audioValue;
        await groupData.save();
        await sock.sendMessage(chatId, { text: '✅ Ruta de audio de despedida guardada.' }, { quoted: message });
        return;
    }

    await sock.sendMessage(chatId, { text: '⚠️ Usa: .despedida on / off / set texto / image ruta / audio ruta' }, { quoted: message });
}

async function handleLeaveEvent(sock, id, participants) {
    const groupData = await Group.findOne({ groupId: id });
    if (!groupData?.goodbye?.enabled) return;

    const groupMetadata = await sock.groupMetadata(id).catch(() => ({ subject: 'Felbot' }));
    const groupName = groupMetadata.subject || 'Felbot';
    const finalMessageBase = groupData.goodbye.message || DEFAULT_GOODBYE_MESSAGE;

    for (const participant of participants) {
        try {
            const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
            const userNumber = participantString.split('@')[0];
            const goodbyeText = finalMessageBase
                .replace(/{user}/g, `@${userNumber}`)
                .replace(/{group}/g, groupName);

            const finalMessage = `
｡ ﾟ･ ｡ 夜 ｡ ﾟ･ ｡

*${groupName}*
↳ @${userNumber}

> ${goodbyeText}
｡ ﾟ･ ｡ ﾟ ･ ｡ ﾟ ･ ｡
╰─ 𓂃 𓈒𓏸 ─╯
`;

            let profilePicUrl = null;
            try {
                profilePicUrl = await sock.profilePictureUrl(participantString, 'image').catch(() => null);
            } catch {
                profilePicUrl = null;
            }

            const goodbyeImagePath = getGoodbyeImagePath(groupData);
            if (profilePicUrl) {
                await sock.sendMessage(id, {
                    image: { url: profilePicUrl },
                    caption: finalMessage,
                    mentions: [participantString]
                });
            } else if (goodbyeImagePath) {
                await sock.sendMessage(id, {
                    image: fs.readFileSync(goodbyeImagePath),
                    caption: finalMessage,
                    mentions: [participantString]
                });
            } else {
                await sock.sendMessage(id, {
                    text: finalMessage,
                    mentions: [participantString]
                });
            }

            const goodbyeAudioPath = getGoodbyeAudioPath(groupData);
            if (goodbyeAudioPath) {
                try {
                    await sock.sendMessage(id, {
                        audio: fs.readFileSync(goodbyeAudioPath),
                        mimetype: 'audio/mpeg',
                        ptt: false
                    });
                } catch (error) {
                    console.log(`[${new Date().toLocaleTimeString()}] ⚠️ Audio de despedida no disponible: ${error.message}`);
                }
            }
        } catch (error) {
            console.error('Error sending goodbye message:', error);
        }
    }
}

module.exports = { goodbyeCommand, handleLeaveEvent };
