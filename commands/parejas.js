async function parejasCommand(sock, chatId, msg) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❌ Este comando solo funciona en grupos.'
            }, { quoted: msg })
        }

        const metadata = await sock.groupMetadata(chatId)
        const users = (metadata.participants || [])
            .map(participant => participant.id || participant.phoneNumber || participant.lid)
            .filter(Boolean)

        if (users.length < 10) {
            return await sock.sendMessage(chatId, {
                text: '❌ Se necesitan mínimo 10 personas para formar 5 parejas.'
            }, { quoted: msg })
        }

        const shuffledUsers = [...users].sort(() => Math.random() - 0.5)
        const pairs = []
        const mentions = []

        for (let index = 0; index < 10; index += 2) {
            const firstUser = shuffledUsers[index]
            const secondUser = shuffledUsers[index + 1]
            const percentage = Math.floor(Math.random() * 101)
            const filledBars = Math.floor(percentage / 10)
            const progressBar = '█'.repeat(filledBars) + '░'.repeat(10 - filledBars)

            pairs.push(
                `#${pairs.length + 1}\n` +
                `@${firstUser.split('@')[0]} ❤️ @${secondUser.split('@')[0]}\n` +
                `[ ${progressBar} ] ${percentage}%`
            )
            mentions.push(firstUser, secondUser)
        }

        const parejasText = `
╭━━━〔 💘 𝕻𝕬𝕽𝕰𝕵𝕬𝕾 💘 〕━━━⬣

${pairs.join('\n\n')}

╰━━━━━━━━━━━━━━━━⬣
`.trim()

        await sock.sendMessage(chatId, {
            text: parejasText,
            mentions
        }, { quoted: msg })
    } catch (error) {
        console.error('Error in parejas command:', error)
        await sock.sendMessage(chatId, {
            text: '❌ Ocurrió un error usando el comando parejas.'
        }, { quoted: msg })
    }
}

module.exports = parejasCommand