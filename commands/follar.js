const fs = require('fs')
const path = require('path')

// ======================================
// 🧠 CACHE GLOBAL POR GRUPO
// evita repetir gifs hasta acabarlos
// ======================================
const usedFilesByChat = new Map()

async function follarCommand(sock, chatId, message) {

    try {

        // ======================================
        // 📁 CARPETA
        // ======================================
        const gifsPath = path.join(
            __dirname,
            '..',
            'assets',
            'gifs',
            'follar'
        )

        // ======================================
        // 📦 ARCHIVOS
        // ======================================
        const files = fs.readdirSync(gifsPath)
            .filter(file =>
                /\.(gif|mp4|webm|mov|mkv)$/i.test(file)
            )

        // ======================================
        // ❌ SIN ARCHIVOS
        // ======================================
        if (files.length === 0) {

            return await sock.sendMessage(chatId, {
                text:
`❌ No hay gifs/videos en:

assets/gifs/follar

Formatos permitidos:
• .gif
• .mp4
• .webm
• .mov
• .mkv`
            }, { quoted: message })
        }

        // ======================================
        // 👥 MENCIONES
        // ======================================
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

        // ======================================
        // 👤 USUARIOS
        // ======================================
        const sender =
            message.key.participant ||
            message.key.remoteJid

        const senderNumber =
            sender.split('@')[0]

        const target =
            mentioned[0]

        const targetNumber =
            target.split('@')[0]

        // ======================================
        // 🚫 AUTOFOLLAR
        // ======================================
        if (sender === target) {

            return await sock.sendMessage(chatId, {
                text:
`🤨 @${senderNumber} intentó follarse a sí mismo... qué solo.`,
                mentions: [sender]
            }, { quoted: message })
        }

        // ======================================
        // 💬 FRASES +18
        // ======================================
      // ======================================
// 💬 FRASES +18
// ======================================
const frases = [

`💋 @${senderNumber} \`marcó completamente a\` @${targetNumber} \`sin darle descanso\``,

`🔥 @${senderNumber} \`encendió la noche de\` @${targetNumber} \`hasta hacerlo temblar\``,

`🥵 @${senderNumber} \`dominó lentamente a\` @${targetNumber} \`contra la pared\``,

`😈 @${senderNumber} \`tomó el control total de\` @${targetNumber} \`sin ninguna piedad\``,

`💦 @${senderNumber} \`dejó completamente agotado a\` @${targetNumber} \`en la cama\``,

`🛏️ @${senderNumber} \`pasó toda la noche encima de\` @${targetNumber} \`sin detenerse\``,

`💋 @${senderNumber} \`besó intensamente a\` @${targetNumber} \`hasta hacerlo perder el control\``,

`🔥 @${senderNumber} \`calentó demasiado a\` @${targetNumber} \`hasta hacerlo gemir\``,

`😏 @${senderNumber} \`provocó sin parar a\` @${targetNumber} \`durante toda la madrugada\``,

`🥵 @${senderNumber} \`hizo temblar completamente a\` @${targetNumber} \`con cada movimiento\``,

`💦 @${senderNumber} \`terminó agotando a\` @${targetNumber} \`hasta dejarlo sin fuerzas\``,

`😈 @${senderNumber} \`dominó cada parte del cuerpo de\` @${targetNumber} \`sin descanso\``,

`🔥 @${senderNumber} \`encerró entre besos y caricias a\` @${targetNumber} \`durante horas\``,

`🖤 @${senderNumber} \`se volvió completamente loco por\` @${targetNumber} \`esa noche\``,

`💋 @${senderNumber} \`devoró lentamente a\` @${targetNumber} \`sin dejar escapar ningún gemido\``,

`🥵 @${senderNumber} \`dejó jadeando intensamente a\` @${targetNumber} \`sobre la cama\``,

`💦 @${senderNumber} \`acabó empapando completamente a\` @${targetNumber} \`de placer\``,

`😏 @${senderNumber} \`no dejó descansar ni un segundo a\` @${targetNumber} \``,

`🔥 @${senderNumber} \`se aprovechó totalmente de\` @${targetNumber} \`durante toda la noche\``,

`🛏️ @${senderNumber} \`pasó una noche demasiado intensa con\` @${targetNumber} \``,

`💋 @${senderNumber} \`dejó lleno de marcas y besos a\` @${targetNumber} \``,

`🥵 @${senderNumber} \`hizo gemir tan fuerte a\` @${targetNumber} \`que todos escucharon\``,

`💦 @${senderNumber} \`terminó drenando toda la energía de\` @${targetNumber} \``,

`😈 @${senderNumber} \`hizo suyo completamente a\` @${targetNumber} \`durante horas\``,

`🔥 @${senderNumber} \`dejó temblando las piernas de\` @${targetNumber} \`después de esa noche\``,

`💋 @${senderNumber} \`no dejó rincón del cuerpo de\` @${targetNumber} \`sin besar\``,

`🥵 @${senderNumber} \`terminó haciendo sudar y jadear a\` @${targetNumber} \`sin parar\``,

`💦 @${senderNumber} \`acabó encima de\` @${targetNumber} \`hasta el amanecer\``,

`😏 @${senderNumber} \`jugó toda la noche con\` @${targetNumber} \`sin cansarse\``,

`🔥 @${senderNumber} \`hizo perder totalmente la inocencia de\` @${targetNumber} \``,

`🖤 @${senderNumber} \`hizo quedar completamente enamorado a\` @${targetNumber} \`después de esa noche\``,

`💋 @${senderNumber} \`mordió lentamente el cuello de\` @${targetNumber} \`hasta hacerlo estremecer\``,

`🥵 @${senderNumber} \`hizo que\` @${targetNumber} \`no pudiera caminar después\``,

`💦 @${senderNumber} \`dejó totalmente rendido a\` @${targetNumber} \`sobre las sábanas\``,

`😈 @${senderNumber} \`susurró cosas prohibidas al oído de\` @${targetNumber} \`toda la noche\``,

`🔥 @${senderNumber} \`terminó encerrado en una noche salvaje con\` @${targetNumber} \``,

`🛏️ @${senderNumber} \`pasó horas enteras disfrutando de\` @${targetNumber} \`sin detenerse\``,

`💋 @${senderNumber} \`hizo sonrojar completamente a\` @${targetNumber} \`con sus movimientos\``,

`🥵 @${senderNumber} \`dejó totalmente sin aliento a\` @${targetNumber} \``,

`💦 @${senderNumber} \`terminó haciendo gritar de placer a\` @${targetNumber} \``,

`😏 @${senderNumber} \`no tuvo ninguna piedad con\` @${targetNumber} \`esa madrugada\``,

`🔥 @${senderNumber} \`encendió cada parte del cuerpo de\` @${targetNumber} \``,

`🖤 @${senderNumber} \`terminó completamente obsesionado con\` @${targetNumber} \``,

`💋 @${senderNumber} \`hizo perder el control a\` @${targetNumber} \`con solo un beso\``,

`🥵 @${senderNumber} \`dejó a\` @${targetNumber} \`rogando por otra ronda\``,

`💦 @${senderNumber} \`acabó completamente encima de\` @${targetNumber} \`hasta dejarlo agotado\``,

`😈 @${senderNumber} \`terminó dominando salvajemente a\` @${targetNumber} \`contra la cama\``,

`🔥 @${senderNumber} \`hizo arder toda la noche de\` @${targetNumber} \``,

`🛏️ @${senderNumber} \`dejó completamente destruido a\` @${targetNumber} \`después de tantas horas\``

]
        // ======================================
        // 🎲 FRASE RANDOM
        // ======================================
        const randomPhrase =
            frases[Math.floor(Math.random() * frases.length)]

        // ======================================
        // 🧠 SISTEMA ANTI-REPETICIÓN
        // POR GRUPO
        // ======================================

        // obtener usados del grupo
        let usedFiles =
            usedFilesByChat.get(chatId) || []

        // archivos disponibles
        let availableFiles =
            files.filter(file =>
                !usedFiles.includes(file)
            )

        // si ya se usaron todos
        // reinicia la lista
        if (availableFiles.length === 0) {

            usedFiles = []
            availableFiles = [...files]

            console.log(
                `♻️ Reiniciando gifs usados en ${chatId}`
            )
        }

        // elegir random
        const randomFile =
            availableFiles[
                Math.floor(
                    Math.random() * availableFiles.length
                )
            ]

        // guardar usado
        usedFiles.push(randomFile)

        usedFilesByChat.set(
            chatId,
            usedFiles
        )

        // ======================================
        // 📂 BUFFER
        // ======================================
        const mediaBuffer = fs.readFileSync(
            path.join(gifsPath, randomFile)
        )

        // ======================================
        // 📤 ENVIAR
        // ======================================
        await sock.sendMessage(chatId, {

            video: mediaBuffer,

            gifPlayback: true,

            caption:
`${randomPhrase}

┌─⊷
▢ 🎬 Archivo: ${randomFile}
▢ 📦 Restantes: ${availableFiles.length - 1}/${files.length}
└───────────`,
            
            mentions: [
                sender,
                target
            ]

        }, { quoted: message })

        console.log(
            `✅ .follar enviado en ${chatId}: ${randomFile}`
        )

    } catch (err) {

        console.log(
            '❌ Error comando .follar:',
            err
        )

        await sock.sendMessage(chatId, {

            text:
`❌ Error usando el comando.

Verifica:
• que exista la carpeta
• que tenga gifs/videos
• formatos válidos
• permisos del archivo`

        }, { quoted: message })
    }
}

module.exports = {
    follarCommand
}