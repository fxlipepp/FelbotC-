// ===============================
// 📁 lib/nsfwCheck.js
// ===============================

const fs = require('fs')
const path = require('path')

const Group = require('../models/Group')

async function nsfwCheck(
    sock,
    chatId,
    message
) {

    // ✅ PRIVADO

    if (!chatId.endsWith('@g.us')) {
        return true
    }

    // 📦 GROUP DATA

    let groupData =
        await Group.findOne({
            groupId: chatId
        })

    // 🆕 CREATE IF NOT EXISTS

    if (!groupData) {

        groupData =
            await Group.create({
                groupId: chatId
            })

    }

    // 🔞 CHECK

    if (!groupData?.nsfw?.enabled) {

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

        await sock.sendMessage(chatId, {

            image: imageBuffer,

            caption:
`> 🔞 NSFW DESACTIVADO EN ESTE GRUPO
> PÍDELE A UN ADMIN QUE USE:
> .nsfw on`,

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

        return false

    }

    return true

}

module.exports = nsfwCheck