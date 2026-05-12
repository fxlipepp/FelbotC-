const fs = require('fs')
const path = require('path')

async function besarCommand(sock, chatId, message) {

    const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

    if (!mentioned.length) {
        return await sock.sendMessage(chatId, {
            text: '💋 \`Menciona a alguien.\`😏\nEj: \`.besar @usuario\`'
        }, { quoted: message })
    }

    const target = mentioned[0]
    const sender = message.key.participant || message.key.remoteJid

    const dir = path.join(__dirname, '../assets/gifs/besar')

    if (!fs.existsSync(dir)) {
        return await sock.sendMessage(chatId, {
            text: '❌ \`No hay carpeta de besos\` 💀'
        }, { quoted: message })
    }

    const files = fs.readdirSync(dir).filter(f =>
        f.endsWith('.mp4') || f.endsWith('.gif')
    )

    if (!files.length) {
        return await sock.sendMessage(chatId, {
            text: '❌ No hay gifs disponibles 😭'
        }, { quoted: message })
    }

    const randomFile = files[Math.floor(Math.random() * files.length)]
    const filePath = path.join(dir, randomFile)

    const senderNumber = sender.split('@')[0]
    const targetNumber = target.split('@')[0]

    const frases = [
        `💋 @${senderNumber} \`besó a\` @${targetNumber} \`sin pensarlo dos veces\``,
        `🔥 @${senderNumber} \`le estampó un beso a\` @${targetNumber}`,
        `😈 @${senderNumber} \`no pidió permiso y fue directo a\` @${targetNumber}`,
        `💀 @${senderNumber} \`dejó sin reacción a\` @${targetNumber}`,
        `🫦 @${senderNumber} \`atacó con un beso a\` @${targetNumber}`,
        `⚡ @${senderNumber} \`sorprendió a\` @${targetNumber} \`de la nada\``,
        `😳 @${senderNumber} \`besó a\` @${targetNumber} \`frente a todos\``,
        `💥 @${senderNumber} \`activó modo beso con\` @${targetNumber}`,
        `👀 \`todos vieron lo que hizo\` @${senderNumber} \`con\` @${targetNumber}`,
        `💋 @${senderNumber} \`marcó a\` @${targetNumber} \`sin dudar\``,
        `😏 @${senderNumber} \`hizo lo que quiso con\` @${targetNumber}`,
        `💘 @${senderNumber} \`perdió el control con\` @${targetNumber}`,
        `🥵 @${senderNumber} \`no se aguantó y fue por\` @${targetNumber}`,
        `🙈 @${senderNumber} \`dejó callado al grupo con\` @${targetNumber}`,
        `💞 @${senderNumber} \`le robó un beso a\` @${targetNumber}`,
        `😹 @${senderNumber} \`se lanzó encima de\` @${targetNumber}`,
        `💓 \`la tensión entre\` @${senderNumber} \`y\` @${targetNumber} \`era evidente\``,
        `🔥 \`todo cambió cuando\` @${senderNumber} \`besó a\` @${targetNumber}`,
        `🫠 @${targetNumber} \`quedó totalmente derretido\``,
        `😵 @${targetNumber} \`quedó sin aire después de eso\``,
        `💋 @${senderNumber} \`dejó marcado a\` @${targetNumber}`,
        `😈 @${senderNumber} \`aprovechó el momento con\` @${targetNumber}`,
        `🤭 \`nadie supo cómo reaccionar después de eso\``,
        `💖 \`la tensión entre\` @${senderNumber} \`y\` @${targetNumber} \`explotó\``,
        `😏 @${senderNumber} \`venía con esa intención desde hace rato\``,
        `🫦 @${senderNumber} \`no se contuvo con\`@${targetNumber}`,
        `💥 \`el momento se salió de control\``,
        `😳 \`todos quedaron mirando lo que pasó\``,
        `💋 \`quedó claro lo que pasó entre\` @${senderNumber} \`y\`@${targetNumber}`
    ]

    const frase = frases[Math.floor(Math.random() * frases.length)]

    await sock.sendMessage(chatId, {
        video: fs.readFileSync(filePath),
        gifPlayback: true,
        caption: frase,

        contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363409628624676@newsletter',
                newsletterName: '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 𝕮𝖍𝖆𝖓𝖓𝖊𝖑 ✧'
            }
        },

        mentions: [sender, target]
    }, { quoted: message })
}

module.exports = { besarCommand }