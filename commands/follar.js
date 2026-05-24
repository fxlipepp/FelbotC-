const fs = require('fs')
const path = require('path')
const ffmpeg = require('fluent-ffmpeg')

async function convertToMp4(inputPath, outputPath) {

    return new Promise((resolve, reject) => {

        ffmpeg(inputPath)

            .outputOptions([
                '-movflags faststart',
                '-pix_fmt yuv420p'
            ])

            .toFormat('mp4')

            .save(outputPath)

            .on('end', () => resolve(outputPath))

            .on('error', err => reject(err))
    })
}

async function follarCommand(sock, chatId, message) {

    try {

        // =========================
        // 📁 CARPETA
        // =========================
        const mediaPath = path.join(
            __dirname,
            '..',
            'assets',
            'gifs',
            'follar'
        )

        // =========================
        // 📦 ARCHIVOS
        // =========================
        const files = fs.readdirSync(mediaPath)
            .filter(file =>
                /\.(gif|mp4|webm|mov|mkv|avi)$/i.test(file)
            )

        // =========================
        // ❌ SIN ARCHIVOS
        // =========================
        if (files.length === 0) {

            return await sock.sendMessage(chatId, {
                text:
`❌ No hay archivos en:

assets/gifs/follar`
            }, { quoted: message })
        }

        // =========================
        // 👥 MENCIONES
        // =========================
        const mentioned =
            message.message?.extendedTextMessage
                ?.contextInfo?.mentionedJid || []

        if (!mentioned[0]) {

            return await sock.sendMessage(chatId, {
                text:
`❌ Etiqueta a alguien.

Ejemplo:
.follar @usuario`
            }, { quoted: message })
        }

        // =========================
        // 👤 USUARIOS
        // =========================
        const sender =
            message.key.participant ||
            message.key.remoteJid

        const senderNumber =
            sender.split('@')[0]

        const targetNumber =
            mentioned[0].split('@')[0]

        // =========================
        // 💬 50 FRASES
        // =========================
        const frases = [

`💋 @${senderNumber} \`marcó completamente a\` @${targetNumber} \`sin darle descanso\``,

`🔥 @${senderNumber} \`encendió la noche de\` @${targetNumber} \`hasta hacerlo temblar\``,

`🥵 @${senderNumber} \`dominó lentamente a\` @${targetNumber} \`contra la pared\``,

`😈 @${senderNumber} \`tomó el control de\` @${targetNumber} \`sin piedad\``,

`💦 @${senderNumber} \`dejó sin fuerzas a\` @${targetNumber} \``,

`🛏️ @${senderNumber} \`pasó toda la noche encima de\` @${targetNumber} \``,

`💋 @${senderNumber} \`besó intensamente a\` @${targetNumber} \`hasta perder el control\``,

`🔥 @${senderNumber} \`calentó demasiado a\` @${targetNumber} \``,

`😏 @${senderNumber} \`provocó sin parar a\` @${targetNumber} \``,

`🥵 @${senderNumber} \`dejó temblando a\` @${targetNumber} \``,

`💦 @${senderNumber} \`terminó agotando a\` @${targetNumber} \`en la cama\``,

`😈 @${senderNumber} \`dominó cada movimiento de\` @${targetNumber} \``,

`🔥 @${senderNumber} \`encerró entre besos a\` @${targetNumber} \``,

`🖤 @${senderNumber} \`se volvió loco con\` @${targetNumber} \``,

`💋 @${senderNumber} \`devoró lentamente a\` @${targetNumber} \``,

`🥵 @${senderNumber} \`hizo jadear demasiado a\` @${targetNumber} \``,

`💦 @${senderNumber} \`acabó empapando a\` @${targetNumber} \``,

`😏 @${senderNumber} \`no dejó descansar a\` @${targetNumber} \``,

`🔥 @${senderNumber} \`se aprovechó completamente de\` @${targetNumber} \``,

`🛏️ @${senderNumber} \`pasó una noche prohibida con\` @${targetNumber} \``,

`💋 @${senderNumber} \`llenó de pasión a\` @${targetNumber} \``,

`😈 @${senderNumber} \`perdió el control junto a\` @${targetNumber} \``,

`🔥 @${senderNumber} \`dejó marcado a\` @${targetNumber} \``,

`🥵 @${senderNumber} \`hizo explotar de placer a\` @${targetNumber} \``,

`💦 @${senderNumber} \`se puso demasiado intenso con\` @${targetNumber} \``,

`🛏️ @${senderNumber} \`pasó horas disfrutando de\` @${targetNumber} \``,

`😏 @${senderNumber} \`volvió loco a\` @${targetNumber} \``,

`🔥 @${senderNumber} \`dejó agotado a\` @${targetNumber} \``,

`💋 @${senderNumber} \`hizo perder el control a\` @${targetNumber} \``,

`🥵 @${senderNumber} \`acabó dominando totalmente a\` @${targetNumber} \``,

`😈 @${senderNumber} \`jugó toda la noche con\` @${targetNumber} \``,

`💦 @${senderNumber} \`llenó de besos a\` @${targetNumber} \``,

`🔥 @${senderNumber} \`encendió cada parte de\` @${targetNumber} \``,

`🖤 @${senderNumber} \`atrapó completamente a\` @${targetNumber} \``,

`💋 @${senderNumber} \`hizo sudar demasiado a\` @${targetNumber} \``,

`🥵 @${senderNumber} \`dejó sin aliento a\` @${targetNumber} \``,

`😏 @${senderNumber} \`dominó la situación con\` @${targetNumber} \``,

`🔥 @${senderNumber} \`llevó al límite a\` @${targetNumber} \``,

`💦 @${senderNumber} \`acabó agotando a\` @${targetNumber} \`sin descanso\``,

`🛏️ @${senderNumber} \`pasó toda la madrugada con\` @${targetNumber} \``,

`😈 @${senderNumber} \`provocó intensamente a\` @${targetNumber} \``,

`💋 @${senderNumber} \`se adueñó completamente de\` @${targetNumber} \``,

`🔥 @${senderNumber} \`calentó la habitación junto a\` @${targetNumber} \``,

`🥵 @${senderNumber} \`hizo temblar completamente a\` @${targetNumber} \``,

`💦 @${senderNumber} \`pasó una noche intensa con\` @${targetNumber} \``,

`😏 @${senderNumber} \`descontroló totalmente a\` @${targetNumber} \``,

`🖤 @${senderNumber} \`dejó completamente satisfecho a\` @${targetNumber} \``,

`🔥 @${senderNumber} \`terminó encima de\` @${targetNumber} \`sin parar\``,

`💋 @${senderNumber} \`acabó enamorando a\` @${targetNumber} \`con pasión\``,

`😈 @${senderNumber} \`se entregó completamente a\` @${targetNumber} \``

        ]

        // =========================
        // 🎲 RANDOM
        // =========================
        const randomPhrase =
            frases[Math.floor(Math.random() * frases.length)]

        const randomFile =
            files[Math.floor(Math.random() * files.length)]

        // =========================
        // 📂 PATHS
        // =========================
        const inputPath = path.join(
            mediaPath,
            randomFile
        )

        const outputPath = path.join(
            mediaPath,
            `converted_${Date.now()}.mp4`
        )

        // =========================
        // 🔄 CONVERTIR A MP4
        // =========================
        await convertToMp4(
            inputPath,
            outputPath
        )

        // =========================
        // 📦 BUFFER
        // =========================
        const videoBuffer =
            fs.readFileSync(outputPath)

        // =========================
        // 📤 ENVIAR
        // =========================
        await sock.sendMessage(chatId, {

            video: videoBuffer,

            gifPlayback: true,

            caption: randomPhrase,

            mentions: [
                sender,
                mentioned[0]
            ]

        }, { quoted: message })

        // =========================
        // 🧹 BORRAR TEMP
        // =========================
        fs.unlinkSync(outputPath)

    } catch (err) {

        console.log(err)

        await sock.sendMessage(chatId, {

            text:
`❌ Error usando el comando.

Verifica:
• ffmpeg instalado
• archivos válidos
• carpeta correcta`

        }, { quoted: message })
    }
}

module.exports = {
    follarCommand
}