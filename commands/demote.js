const isAdmin = require('../lib/isAdmin')
const fs = require('fs')
const path = require('path')

// =========================
// COMANDO DEMOTE
// =========================

async function demoteCommand(sock, chatId, mentionedJids, message) {

    try {

        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❌ Este comando solo funciona en grupos.'
            }, { quoted: message })
        }

        const adminStatus = await isAdmin(
            sock,
            chatId,
            message.key.participant || message.key.remoteJid
        )

        if (!adminStatus.isBotAdmin) {
            return await sock.sendMessage(chatId, {
                text: '❌ El bot necesita ser administrador.'
            }, { quoted: message })
        }

        if (!adminStatus.isSenderAdmin) {
            return await sock.sendMessage(chatId, {
                text: '❌ Solo los administradores pueden usar este comando.'
            }, { quoted: message })
        }

        let userToDemote = []

        if (mentionedJids?.length) {
            userToDemote = mentionedJids
        } else if (
            message.message?.extendedTextMessage?.contextInfo?.participant
        ) {
            userToDemote = [
                message.message.extendedTextMessage.contextInfo.participant
            ]
        }

        if (!userToDemote.length) {
            return await sock.sendMessage(chatId, {
                text: '❌ Menciona o responde al usuario.'
            }, { quoted: message })
        }

        await sock.groupParticipantsUpdate(
            chatId,
            userToDemote,
            'demote'
        )

    } catch (err) {
        console.error(err)
        return await sock.sendMessage(chatId, {
            text: '❌ Error al degradar usuario.'
        }, { quoted: message })
    }
}

// =========================
// EVENTO DEMOTE (FINAL PRO)
// =========================

async function handleDemotionEvent(sock, groupId, participants, author) {

    try {

        if (!Array.isArray(participants) || !participants.length) return

        const safeJid = (jid) => {
            if (!jid) return null
            if (typeof jid === 'string') return jid
            if (jid.id) return jid.id
            if (jid.toString) return jid.toString()
            return null
        }

        const demotedUsers = participants.map(jid => {
            const id = safeJid(jid)
            return id ? `@${id.split('@')[0]}` : '@desconocido'
        })

        let mentionList = participants
            .map(jid => safeJid(jid))
            .filter(Boolean)

        let demotedBy = 'Sistema'

        if (author) {
            const aid = safeJid(author)
            if (aid) {
                demotedBy = `@${aid.split('@')[0]}`
                mentionList.push(aid)
            }
        }

        const date = new Date().toLocaleString('es-CO')

        // 🔥 IMAGEN LOCAL
        const imagePath = path.join(
            __dirname,
            '..',
            'assets',
            'imagenes',
            'admin',
            'admin.png'
        )

        const imageBuffer = fs.readFileSync(imagePath)

        const text =
`> ❀ ${demotedUsers.join(', ')} deja${participants.length > 1 ? 'n' : ''} de ser admin del grupo.
> ✦ Acción hecha por: ${demotedBy}

> 📅 ${date}`

        const fake = {
            key: {
                fromMe: false,
                participant: '0@s.whatsapp.net',
                remoteJid: 'status@broadcast'
            },
            message: {
                conversation: '𝕱𝖊𝖑𝖇𝖔𝖙 夜'
            }
        }

        await sock.sendMessage(groupId, {

            image: imageBuffer,
            caption: text,

            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,

                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363409628624676@newsletter',
                    newsletterName: '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 𝕮𝖍𝖆𝖓𝖓𝖊𝖑  ✧'
                }
            },

            mentions: mentionList

        }, { quoted: fake })

    } catch (err) {
        console.error('Error demotion event:', err)
    }
}

module.exports = {
    demoteCommand,
    handleDemotionEvent
}
