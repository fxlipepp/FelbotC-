const fs = require('fs')
const path = require('path')

const propuestas = new Map()

function getRandomGif(folder) {
    if (!fs.existsSync(folder)) return null

    const files = fs.readdirSync(folder)
        .filter(file =>
            file.endsWith('.gif') ||
            file.endsWith('.mp4')
        )

    if (!files.length) return null

    return path.join(
        folder,
        files[Math.floor(Math.random() * files.length)]
    )
}

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

async function propuestaCommand(sock, chatId, senderId, message) {

    const target =
        message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

    if (!target) {
        return await sock.sendMessage(chatId, {
            text:
`╭━━━〔 💍 PROUESTA DE MATRIMONIO 💍 〕━━━⬣

💡 Uso correcto:
.propuesta @usuario

╰━━━━━━━━━━━━━━━━━━━━⬣`
        }, { quoted: message })
    }

    if (target === senderId) {
        return await sock.sendMessage(chatId, {
            text:
`╭━━━〔 🤨 ERROR 〕━━━⬣

No puedes proponerte matrimonio a ti mismo.

╰━━━━━━━━━━━━━━⬣`
        }, { quoted: message })
    }

    if (propuestas.has(target)) {
        return await sock.sendMessage(chatId, {
            text:
`╭━━━〔 ⏳ ESPERA 〕━━━⬣

💍 Esa persona ya tiene una propuesta pendiente.

╰━━━━━━━━━━━━━━⬣`
        }, { quoted: message })
    }

    propuestas.set(target, {
        proposer: senderId,
        target,
        chatId
    })

    await sock.sendMessage(chatId, {
        text:
`╭〔 💍 PROPUESTA MATRIMONIO 💍 〕⬣

💖 @${senderId.split('@')[0]} ha reunido todo su valor para hacer una gran pregunta...

✨ @${target.split('@')[0]}
¿Aceptas compartir tu vida junto a esta persona?

💌 Responde con:

• *.si* → Aceptar
• *.no* → Rechazar

💞 El destino está en tus manos.

╰━━━━━━━━━━━━━━⬣`,
        mentions: [senderId, target]
    }, { quoted: message })
}

async function aceptarPropuesta(sock, chatId, senderId) {

    const propuesta = propuestas.get(senderId)

    if (!propuesta) return false

    propuestas.delete(senderId)

    const gif = getRandomGif(
        path.join(__dirname, '../assets/gifs/besar')
    )

    const frases = [
        '💞 El destino los ha unido.',
        '✨ Una nueva historia de amor comienza.',
        '🌹 El grupo celebra esta hermosa unión.',
        '🥂 Que sean muy felices juntos.',
        '💖 El amor ha triunfado hoy.',
        '💕 Dos corazones, un mismo camino.'
    ]

    const texto =
`╭〔 COMPROMISO OFICIAL 💍 〕⬣

🎉 ¡LA RESPUESTA FUE SÍ!

🤵 @${propuesta.proposer.split('@')[0]}
👰 @${propuesta.target.split('@')[0]}

💖 Ahora están oficialmente comprometidos.

💋 ¡Ya pueden darse un beso frente al grupo!

${random(frases)}

╰━━━━━━━━━━━━━━⬣`

    if (gif) {

        await sock.sendMessage(chatId, {
            video: fs.readFileSync(gif),
            gifPlayback: true,
            caption: texto,
            mentions: [
                propuesta.proposer,
                propuesta.target
            ]
        })

    } else {

        await sock.sendMessage(chatId, {
            text: texto,
            mentions: [
                propuesta.proposer,
                propuesta.target
            ]
        })

    }

    return true
}

async function rechazarPropuesta(sock, chatId, senderId) {

    const propuesta = propuestas.get(senderId)

    if (!propuesta) return false

    propuestas.delete(senderId)

    const gif = getRandomGif(
        path.join(__dirname, '../assets/gifs/rechazo')
    )

    const frases = [
        '🍂 A veces el amor toma caminos diferentes.',
        '💔 No todas las historias tienen final feliz.',
        '😔 Quizás en otra vida.',
        '🥀 El corazón deberá recuperarse.',
        '🫂 Mucha fuerza para seguir adelante.'
    ]

    const texto =
`╭〔 💔 CORAZÓN ROTO 💔 〕⬣

😢 @${propuesta.target.split('@')[0]}
ha rechazado la propuesta de

💔 @${propuesta.proposer.split('@')[0]}

${random(frases)}

╰━━━━━━━━━━━━━━⬣`

    if (gif) {

        await sock.sendMessage(chatId, {
            video: fs.readFileSync(gif),
            gifPlayback: true,
            caption: texto,
            mentions: [
                propuesta.proposer,
                propuesta.target
            ]
        })

    } else {

        await sock.sendMessage(chatId, {
            text: texto,
            mentions: [
                propuesta.proposer,
                propuesta.target
            ]
        })

    }

    return true
}

module.exports = {
    propuestaCommand,
    aceptarPropuesta,
    rechazarPropuesta
}