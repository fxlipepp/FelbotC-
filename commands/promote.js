// commands/promote.js

const isAdmin = require('../lib/isAdmin')
const fs = require('fs')
const path = require('path')

// =========================
// COMANDO PROMOTE
// =========================

async function promoteCommand(sock, chatId, mentionedJids, message) {

    try {

        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❌ Este comando funciona solo dentro de un grupo. Por favor, úsalo allí.'
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

        let userToPromote = []

        if (mentionedJids && mentionedJids.length > 0) {
            userToPromote = mentionedJids
        } else if (
            message.message?.extendedTextMessage?.contextInfo?.participant
        ) {
            userToPromote = [
                message.message.extendedTextMessage.contextInfo.participant
            ]
        }

        if (!userToPromote.length) {
            return await sock.sendMessage(chatId, {
                text: '❌ Menciona o responde al usuario que deseas promover.'
            }, { quoted: message })
        }

        await sock.groupParticipantsUpdate(
            chatId,
            userToPromote,
            'promote'
        )

    } catch (error) {

        console.error('Error in promote command:', error)

        await sock.sendMessage(chatId, {
            text: '❌ No se pudo promover al usuario.'
        }, { quoted: message })
    }
}

// =========================
// EVENTO PROMOTE (FINAL PRO)
// =========================

async function handlePromotionEvent(sock, groupId, participants, author) {

    try {

        if (!Array.isArray(participants) || !participants.length) return

        const safeJid = (jid) => {
            if (!jid) return null
            if (typeof jid === 'string') return jid
            if (jid.id) return jid.id
            if (jid.toString) return jid.toString()
            return null
        }

        const promotedUsers = participants.map(jid => {
            const id = safeJid(jid)
            return id ? `@${id.split('@')[0]}` : '@desconocido'
        })

        let mentionList = participants
            .map(jid => safeJid(jid))
            .filter(Boolean)

        let promotedBy = 'Sistema'

        if (author) {

            const aid = safeJid(author)

            if (aid) {
                promotedBy = `@${aid.split('@')[0]}`
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
`> ❀ ${promotedUsers.join(', ')} ahora ${participants.length > 1 ? 'son' : 'es'} admin del grupo.
> ✦ Acción hecha por: ${promotedBy}

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
                    newsletterName: '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 𝕮𝖍𝖆𝖓𝖓𝖊𝖑 ✧'
                }
            },

            mentions: mentionList

        }, { quoted: fake })

    } catch (error) {
        console.error('Error handling promotion event:', error)
    }
}

module.exports = {
    promoteCommand,
    handlePromotionEvent
}

