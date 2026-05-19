async function lidCommand(sock, chatId, message) {
    try {

        const quoted = message.message?.extendedTextMessage?.contextInfo?.participant
        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

        // 👤 prioridad: mencionado > respondido > propio
        const target =
            mentioned[0] ||
            quoted ||
            message.key.participant ||
            message.key.remoteJid

        if (!target) {
            return sock.sendMessage(chatId, {
                text: '❌ No se pudo obtener el LID.'
            }, { quoted: message })
        }

        return sock.sendMessage(chatId, {
            text: `🆔 LID del usuario:\n\n${target}`
        }, { quoted: message })

    } catch (err) {
        console.log('lidCommand error:', err)
    }
}

module.exports = lidCommand