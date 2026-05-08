// commands/ban.js

const User = require('../models/User')
const isAdmin = require('../lib/isAdmin')
const { isSudo } = require('../lib/index')

async function banCommand(sock, chatId, message) {

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

    let userToBan

    // Mención
    if (
        message.message?.extendedTextMessage
            ?.contextInfo?.mentionedJid?.length > 0
    ) {

        userToBan =
            message.message.extendedTextMessage
                .contextInfo.mentionedJid[0]
    }

    // Reply
    else if (
        message.message?.extendedTextMessage
            ?.contextInfo?.participant
    ) {

        userToBan =
            message.message.extendedTextMessage
                .contextInfo.participant
    }

    // No encontró usuario
    if (!userToBan) {

        return await sock.sendMessage(chatId, {
            text: '❌ Menciona o responde al mensaje de un usuario.'
        }, {
            quoted: message
        })
    }

    // =========================
    // EVITAR BANEAR BOT
    // =========================

    const botId =
        sock.user.id.split(':')[0] + '@s.whatsapp.net'

    if (
        userToBan === botId ||
        userToBan === botId.replace(
            '@s.whatsapp.net',
            '@lid'
        )
    ) {

        return await sock.sendMessage(chatId, {
            text: '❌ No puedes banear al bot.'
        }, {
            quoted: message
        })
    }

    // =========================
    // BUSCAR USUARIO
    // =========================

    let userData = await User.findOne({
        userId: userToBan
    })

    // Crear usuario si no existe
    if (!userData) {

        userData = await User.create({
            userId: userToBan
        })
    }

    // =========================
    // YA BANEADO
    // =========================

    if (userData.banned) {

        return await sock.sendMessage(chatId, {
            text:
`⚠️ El usuario ya está baneado.

👤 @${userToBan.split('@')[0]}`,
            mentions: [userToBan]
        }, {
            quoted: message
        })
    }

    // =========================
    // BANEAR
    // =========================

    userData.banned = true

    await userData.save()

    // =========================
    // MENSAJE FINAL
    // =========================

    await sock.sendMessage(chatId, {
        text:
`🚫 Usuario baneado correctamente.

👤 Usuario:
@${userToBan.split('@')[0]}

🤖 El bot ignorará sus comandos.`,
        mentions: [userToBan]
    }, {
        quoted: message
    })
}

module.exports = banCommand