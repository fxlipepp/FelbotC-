// ===============================
// 📁 commands/nsfw.js
// ===============================

const fs = require('fs')
const path = require('path')

const Group = require('../models/Group')
const isAdmin = require('../lib/isAdmin')

async function nsfwCommand(
    sock,
    chatId,
    message,
    args
) {

    // ===============================
    // ❌ SOLO GRUPOS
    // ===============================

    if (!chatId.endsWith('@g.us')) {

        return await sock.sendMessage(chatId, {
            text:
'❌ Este comando solo funciona en grupos.'
        }, { quoted: message })

    }

    // ===============================
    // 👤 SENDER
    // ===============================

    const senderId =
        message.key.participant ||
        message.participant ||
        message.key.remoteJid

    // ===============================
    // 👑 CHECK ADMIN
    // ===============================

    const adminStatus =
        await isAdmin(
            sock,
            chatId,
            senderId
        )

    if (!adminStatus.isSenderAdmin) {

        return await sock.sendMessage(chatId, {
            text:
'❌ Solo administradores pueden usar este comando.'
        }, { quoted: message })

    }

    // ===============================
    // 📦 GET GROUP DATA
    // ===============================

    let groupData =
        await Group.findOne({
            groupId: chatId
        })

    // ===============================
    // 🆕 CREATE IF NOT EXISTS
    // ===============================

    if (!groupData) {

        groupData =
            await Group.create({
                groupId: chatId
            })

    }

    // ===============================
    // 📌 ACTION
    // ===============================

    const action =
        args[0]?.toLowerCase()

    // ===============================
    // 🖼️ IMAGE
    // ===============================

    const imagePath = path.join(
        __dirname,
        '..',
        'assets',
        'imagenes',
        'admin',
        'admin.png'
    )

    const imageBuffer =
        fs.readFileSync(imagePath)

    // ===============================
    // 📋 MENU
    // ===============================

    if (!action) {

        return await sock.sendMessage(chatId, {

            text:
`╭─〔 🔞 NSFW SYSTEM 〕─╮

📌 ESTADO:
${groupData.nsfw?.enabled ? 'ON ✅' : 'OFF ❌'}

🔞 .nsfw on
> Activar NSFW

🔞 .nsfw off
> Desactivar NSFW

╰────────────────╯`

        }, { quoted: message })

    }

    // ===============================
    // ✅ ON
    // ===============================

    if (action === 'on') {

        groupData.nsfw.enabled = true

        await groupData.save()

        return await sock.sendMessage(chatId, {

            image: imageBuffer,

            caption:
`> 🔞 NSFW ACTIVADO
> ESTADO: ON ✅`,

            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid:
'120363409628624676@newsletter',

                    newsletterName:
'✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕺𝖋𝖎𝖈𝖎𝖆𝗅 ✧'
                }
            }

        }, { quoted: message })

    }

    // ===============================
    // ❌ OFF
    // ===============================

    if (action === 'off') {

        groupData.nsfw.enabled = false

        await groupData.save()

        return await sock.sendMessage(chatId, {

            image: imageBuffer,

            caption:
`> 🔞 NSFW DESACTIVADO
> ESTADO: OFF ❌`,

            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid:
'120363409628624676@newsletter',

                    newsletterName:
'✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕺𝖋𝖎𝖈𝖎𝖆𝗅 ✧'
                }
            }

        }, { quoted: message })

    }

    // ===============================
    // ❌ INVALID OPTION
    // ===============================

    return await sock.sendMessage(chatId, {

        text:
'❌ Usa:\n.nsfw on\n.nsfw off'

    }, { quoted: message })

}

module.exports = {
    nsfwCommand
}