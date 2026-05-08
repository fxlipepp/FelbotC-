// commands/unban.js

const User = require('../models/User')
const isAdmin = require('../lib/isAdmin')
const { isSudo } = require('../lib/index')

async function unbanCommand(sock, chatId, message) {

    // Verificar si es grupo
    const isGroup = chatId.endsWith('@g.us')

    // =========================
    // VERIFICAR PERMISOS
    // =========================

    if (isGroup) {

        const senderId =
            message.key.participant || message.key.remoteJid

        const { isSenderAdmin, isBotAdmin } =
            await isAdmin(sock, chatId, senderId)

        // Bot admin
        if (!isBotAdmin) {

            return await sock.sendMessage(chatId, {
                text: '❌ El bot necesita ser administrador.'
            }, {
                quoted: message
            })
        }

        // Usuario admin
        if (!isSenderAdmin && !message.key.fromMe) {

            return await sock.sendMessage(chatId, {
                text: '❌ Solo los administradores pueden usar este comando.'
            }, {
                quoted: message
            })
        }

    } else {

        // Privado
        const senderId =
            message.key.participant || message.key.remoteJid

        const sudo = await isSudo(senderId)

        if (!sudo && !message.key.fromMe) {

            return await sock.sendMessage(chatId, {
                text: '❌ Solo el owner o usuarios sudo pueden usar este comando.'
            }, {
                quoted: message
            })
        }
    }

    // =========================
    // OBTENER USUARIO
    // =========================

    let userToUnban

    // Mención
    if (
        message.message?.extendedTextMessage
            ?.contextInfo?.mentionedJid?.length > 0
    ) {

        userToUnban =
            message.message.extendedTextMessage
                .contextInfo.mentionedJid[0]
    }

    // Reply
    else if (
        message.message?.extendedTextMessage
            ?.contextInfo?.participant
    ) {

        userToUnban =
            message.message.extendedTextMessage
                .contextInfo.participant
    }

    // No encontró usuario
    if (!userToUnban) {

        return await sock.sendMessage(chatId, {
            text: '❌ Menciona o responde al mensaje del usuario.'
        }, {
            quoted: message
        })
    }

    // =========================
    // BUSCAR USUARIO
    // =========================

    let userData = await User.findOne({
        userId: userToUnban
    })

    // Si no existe
    if (!userData) {

        return await sock.sendMessage(chatId, {
            text:
`⚠️ El usuario no existe en la base de datos.

👤 @${userToUnban.split('@')[0]}`,
            mentions: [userToUnban]
        }, {
            quoted: message
        })
    }

    // =========================
    // NO ESTÁ BANEADO
    // =========================

    if (!userData.banned) {

        return await sock.sendMessage(chatId, {
            text:
`⚠️ El usuario no está baneado.

👤 @${userToUnban.split('@')[0]}`,
            mentions: [userToUnban]
        }, {
            quoted: message
        })
    }

    // =========================
    // DESBANEAR
    // =========================

    userData.banned = false

    await userData.save()

    // =========================
    // MENSAJE FINAL
    // =========================

    await sock.sendMessage(chatId, {
        text:
`✅ Usuario desbaneado correctamente.

👤 Usuario:
@${userToUnban.split('@')[0]}

🤖 Ahora puede usar comandos nuevamente.`,
        mentions: [userToUnban]
    }, {
        quoted: message
    })
}

module.exports = unbanCommand