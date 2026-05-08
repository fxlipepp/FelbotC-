// commands/demote.js

const isAdmin = require('../lib/isAdmin')

// =========================
// COMANDO DEMOTE
// =========================

async function demoteCommand(
    sock,
    chatId,
    mentionedJids,
    message
) {

    try {

        // Solo grupos
        if (!chatId.endsWith('@g.us')) {

            return await sock.sendMessage(chatId, {
                text:
                    '❌ Este comando solo funciona en grupos.'
            }, {
                quoted: message
            })
        }

        // Verificar admins
        const adminStatus = await isAdmin(
            sock,
            chatId,
            message.key.participant ||
            message.key.remoteJid
        )

        // Bot admin
        if (!adminStatus.isBotAdmin) {

            return await sock.sendMessage(chatId, {
                text:
                    '❌ El bot necesita ser administrador.'
            }, {
                quoted: message
            })
        }

        // Usuario admin
        if (!adminStatus.isSenderAdmin) {

            return await sock.sendMessage(chatId, {
                text:
                    '❌ Solo los administradores pueden usar este comando.'
            }, {
                quoted: message
            })
        }

        let userToDemote = []

        // Menciones
        if (
            mentionedJids &&
            mentionedJids.length > 0
        ) {

            userToDemote = mentionedJids
        }

        // Reply
        else if (
            message.message?.extendedTextMessage
                ?.contextInfo?.participant
        ) {

            userToDemote = [
                message.message.extendedTextMessage
                    .contextInfo.participant
            ]
        }

        // No encontró usuario
        if (userToDemote.length === 0) {

            return await sock.sendMessage(chatId, {
                text:
                    '❌ Menciona o responde al usuario que deseas degradar.'
            }, {
                quoted: message
            })
        }

        // Delay anti flood
        await new Promise(resolve =>
            setTimeout(resolve, 1000)
        )

        // Degradar
        await sock.groupParticipantsUpdate(
            chatId,
            userToDemote,
            'demote'
        )

        // Usuarios
        const usernames =
            userToDemote.map(jid => {
                return `@${jid.split('@')[0]}`
            })

        // Admin
        const demoter =
            message.key.participant ||
            message.key.remoteJid

        // Fecha
        const date =
            new Date().toLocaleString('es-CO')

        // Mensaje bonito
        const demotionMessage =
`╭━━━〔 💀 REMOCIÓN DE ADMIN 💀 〕━━⬣
┃
┃ ⚠️ Usuario degradado correctamente
┃
┃ 👥 Usuario${userToDemote.length > 1 ? 's' : ''}:
${usernames.map(u => `┃ ➜ ${u}`).join('\n')}
┃
┃ 👑 Degradado por:
┃ ➜ @${demoter.split('@')[0]}
┃
┃ 📅 Fecha:
┃ ➜ ${date}
┃
╰━━━━━━━━━━━━━━━━━━⬣`

        // Enviar
        await sock.sendMessage(chatId, {

            text: demotionMessage,

            mentions: [
                ...userToDemote,
                demoter
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
            'Error in demote command:',
            error
        )

        if (error.data === 429) {

            await new Promise(resolve =>
                setTimeout(resolve, 2000)
            )

            return await sock.sendMessage(chatId, {
                text:
                    '❌ Demasiadas solicitudes. Espera unos segundos.'
            }, {
                quoted: message
            })
        }

        await sock.sendMessage(chatId, {
            text:
                '❌ No se pudo degradar al usuario.'
        }, {
            quoted: message
        })
    }
}

// =========================
// EVENTO AUTOMÁTICO
// =========================

async function handleDemotionEvent(
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

        // Delay anti flood
        await new Promise(resolve =>
            setTimeout(resolve, 1000)
        )

        // Usuarios
        const demotedUsers =
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
        let demotedBy = 'Sistema'

        if (author) {

            const authorJid =
                typeof author === 'string'
                    ? author
                    : (author.id || author.toString())

            demotedBy =
                `@${authorJid.split('@')[0]}`

            mentionList.push(authorJid)
        }

        // Fecha
        const date =
            new Date().toLocaleString('es-CO')

        // Mensaje bonito
        const demotionMessage =
`╭━〔 💀 ADMIN DEMOTE💀 〕━⬣
┃
┃ ⚠️ Cambio de administración detectado
┃
┃ 👥 Usuario${participants.length > 1 ? 's' : ''}:
${demotedUsers.map(u => `┃ ➜ ${u}`).join('\n')}
┃
┃ 👑 Degradado por:
┃ ➜ ${demotedBy}
┃
┃ 📅 Fecha:
┃ ➜ ${date}
┃
╰━━━━━━━━━━━━⬣`

        // Enviar
        await sock.sendMessage(groupId, {

            text: demotionMessage,

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
            'Error handling demotion event:',
            error
        )

        if (error.data === 429) {

            await new Promise(resolve =>
                setTimeout(resolve, 2000)
            )
        }
    }
}

module.exports = {
    demoteCommand,
    handleDemotionEvent
}