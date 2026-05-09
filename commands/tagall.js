const isAdmin = require('../lib/isAdmin')

async function tagAllCommand(sock, chatId, senderId, message) {

    try {

        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId)

        if (!isBotAdmin) {
            return await sock.sendMessage(chatId, {
                text: '⚠️ El bot necesita ser administrador primero.'
            }, { quoted: message })
        }

        if (!isSenderAdmin) {
            return await sock.sendMessage(chatId, {
                text: '❌ Solo los administradores pueden usar este comando.'
            }, { quoted: message })
        }

        // 📌 Obtener metadata del grupo
        const metadata = await sock.groupMetadata(chatId)
        const participantes = metadata.participants

        if (!participantes || participantes.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ No se encontraron participantes en el grupo.'
            }, { quoted: message })
        }

        const mentions = participantes.map(p => p.id)

        // 🌤️ Greeting
        const hora = new Date().getHours()

        let greeting = 'Buenas noches 🌙'

        if (hora >= 5 && hora < 12) {
            greeting = 'Buenos días ☀️'
        } else if (hora >= 12 && hora < 18) {
            greeting = 'Buenas tardes 🌤️'
        }

        // 📝 TEXTO
        const texto = `
✦━━━〔  *MENCION*  〕━━━✦
📢 *Mencionando a todos*

👑 *Solicitado por:* @${senderId.split('@')[0]}
🥷 *Grupo:* ${metadata.subject}
🧩 *Miembros:* ${participantes.length}

✦━━━━━━━━━━✦
${participantes.map(p => `➤ @${p.id.split('@')[0]}`).join('\n')}
✦━━━━━━━✦
        `.trim()

        // 🚀 ENVIAR
        await sock.sendMessage(chatId, {
            text: texto,
            mentions,

            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,

                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363409628624676@newsletter',
                    newsletterName: '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕮𝖆𝖓𝖆𝖑 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 ✧'
                },

                externalAdReply: {
                    title: '✨ Felbot++ • Mención General',
                    body: `${greeting} • 🚀 Notificando a todos`,
                    thumbnailUrl: '',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }

        }, { quoted: message })

    } catch (error) {

        console.error('Error en comando tagall:', error)

        await sock.sendMessage(chatId, {
            text: '❌ Ocurrió un error al mencionar a todos.'
        }, { quoted: message })
    }
}

module.exports = tagAllCommand