// commands/promote.js

const { isAdmin } = require('../lib/isAdmin')

// =========================
// COMANDO PROMOTE
// =========================

async function promoteCommand(sock, chatId, mentionedJids, message) {

    let userToPromote = []

    // Menciones
    if (mentionedJids && mentionedJids.length > 0) {

        userToPromote = mentionedJids
    }

    // Reply
    else if (
        message.message?.extendedTextMessage
            ?.contextInfo?.participant
    ) {

        userToPromote = [
            message.message.extendedTextMessage
                .contextInfo.participant
        ]
    }

    // No encontró usuario
    if (userToPromote.length === 0) {

        return await sock.sendMessage(chatId, {
            text: '❌ Menciona o responde al usuario que deseas promover.'
        }, {
            quoted: message
        })
    }

    try {

        // Promover
        await sock.groupParticipantsUpdate(
            chatId,
            userToPromote,
            'promote'
        )

        // Obtener nombres
        const usernames = userToPromote.map(jid => {
            return `@${jid.split('@')[0]}`
        })

        // Admin que promovió
        const promoter =
            message.key.participant || message.key.remoteJid

        // Fecha
        const date = new Date().toLocaleString('es-CO')

        // Mensaje bonito
        const helpMessage =
`╭━━━〔 👑 ASCENSO DE RANGO 👑 〕━━⬣
┃
┃ ✨ Usuario promovido correctamente
┃
┃ 👥 Usuario${userToPromote.length > 1 ? 's' : ''}:
${usernames.map(u => `┃ ➜ ${u}`).join('\n')}
┃
┃ 👑 Promovido por:
┃ ➜ @${promoter.split('@')[0]}
┃
┃ 📅 Fecha:
┃ ➜ ${date}
┃
╰━━━━━━━━━━━━━━━━━━⬣`

        // Enviar
        await sock.sendMessage(chatId, {

            text: helpMessage,

            mentions: [
                ...userToPromote,
                promoter
            ],

            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,

                forwardedNewsletterMessageInfo: {
                    newsletterJid:
                        '120363409628624676@newsletter',

                    newsletterName:
                        '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 𝕮𝖍𝖆𝖓𝖓𝖊𝖑 ✧'
                }
            }

        }, {
            quoted: message
        })

    } catch (error) {

        console.error(
            'Error in promote command:',
            error
        )

        await sock.sendMessage(chatId, {
            text:
                '❌ No se pudo promover al usuario.'
        }, {
            quoted: message
        })
    }
}

// =========================
// EVENTO AUTOMÁTICO
// =========================

async function handlePromotionEvent(
    sock,
    groupId,
    participants,
    author
) {

    try {

        if (
            !Array.isArray(participants) ||
            participants.length === 0
        ) return

        // Usuarios promovidos
        const promotedUsers =
            participants.map(jid => {

                const jidString =
                    typeof jid === 'string'
                        ? jid
                        : (jid.id || jid.toString())

                return `@${jidString.split('@')[0]}`
            })

        // Mention list
        let mentionList =
            participants.map(jid => {

                return typeof jid === 'string'
                    ? jid
                    : (jid.id || jid.toString())
            })

        // Autor
        let promotedBy = 'Sistema'

        if (author) {

            const authorJid =
                typeof author === 'string'
                    ? author
                    : (author.id || author.toString())

            promotedBy =
                `@${authorJid.split('@')[0]}`

            mentionList.push(authorJid)
        }

        // Fecha
        const date =
            new Date().toLocaleString('es-CO')

        // Mensaje
        const helpMessage =
`╭━〔 👑 NUEVO ADMIN 👑 〕━⬣
┃
┃ ✨ Cambio de administración detectado
┃
┃ 👥 Usuario${participants.length > 1 ? 's' : ''}:
${promotedUsers.map(u => `┃ ➜ ${u}`).join('\n')}
┃
┃ 👑 Promovido por:
┃ ➜ ${promotedBy}
┃
┃ 📅 Fecha:
┃ ➜ ${date}
┃
╰━━━━━━━━━━━━⬣`

        // Enviar
        await sock.sendMessage(groupId, {

            text: helpMessage,

            mentions: mentionList,

            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,

                forwardedNewsletterMessageInfo: {
                    newsletterJid:
                        '120363409628624676@newsletter',

                    newsletterName:
                        '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 𝕮𝖍𝖆𝖓𝖓𝖊𝖑 ✧'
                }
            }

        })

    } catch (error) {

        console.error(
            'Error handling promotion event:',
            error
        )
    }
}

module.exports = {
    promoteCommand,
    handlePromotionEvent
}