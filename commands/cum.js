const fs = require('fs')
const path = require('path')
const Group = require('../models/Group')
const nsfwCheck = require('../lib/nsfwCheck')

// ======================================
// 🧠 CACHE POR GRUPO
// evita repetir gifs
// ======================================
const usedFilesByChat = new Map()

async function cumCommand(sock, chatId, message) {

     const allowed =
        await nsfwCheck(
            sock,
            chatId,
            message
        )
    
    if (!allowed) return
    
        const groupData = await Group.findOne({
            groupId: chatId
        })

    try {

        // ======================================
        // 📁 CARPETA
        // ======================================
        const gifsPath = path.join(
            __dirname,
            '..',
            'assets',
            'gifs',
            'cum'
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
        // ============================cum==========
        if (files.length === 0) {

            return await sock.sendMessage(chatId, {
                text:
`❌ No hay gifs/videos en:

assets/gifs/cum`
            }, { quoted: message })
        }

        // ======================================
        // 👥 MENCIONES
        // ======================================
        const mentioned =
            message.message?.extendedTextMessage
                ?.contextInfo?.mentionedJid || []

        // ======================================
        // 👤 USUARIOS
        // ======================================
        const sender =
            message.key.participant ||
            message.key.remoteJid

        const senderNumber =
            sender.split('@')[0]

        // si no menciona
        // usa al mismo usuario
        const target =
            mentioned[0] || sender

        const targetNumber =
            target.split('@')[0]

        // ======================================
        // 💬 FRASES
        // ======================================
        const frases = [

`😏 @${senderNumber} \`se dejó dominar totalmente por sus deseos junto a\` @${targetNumber}`,

`🔥 @${senderNumber} \`terminó dejando pegajoso a\` @${targetNumber}`,

`🖤 @${senderNumber} \`Se le vino encima a\` @${targetNumber}`,

`🥵 @${senderNumber} \`acabó completamente agotado después de tanta intensidad con\` @${targetNumber}`,

`💦 @${senderNumber} \`terminó dejando todo un desastre encima de\` @${targetNumber}`,

`😈 @${senderNumber} \`empapo a\` @${targetNumber} \`lo dejo pegajoso\``,

`🛏️ @${senderNumber} \`convirtió la cama de\` @${targetNumber} \`en puro caos\``,

`🔥 @${senderNumber} \`acabó completamente satisfecho después de estar con\` @${targetNumber}`,

`💋 @${senderNumber} \`pasó toda la madrugada disfrutando de\` @${targetNumber}`,

`💦 @${senderNumber} \`acabó dejando las sábanas de\` @${targetNumber} \`totalmente mojadas\``,

`🖤 @${senderNumber} \`terminó demasiado satisfecho después de estar con\` @${targetNumber}`,

`🔥 @${senderNumber} \`acabó encima de\` @${targetNumber} \`hasta el amanecer\``,

`🥵 @${senderNumber} \`dejó la cara de\` @${targetNumber} \`Llena de semen\``,

`💋 @${senderNumber} \`no dejó descansar ni un segundo a\` @${targetNumber}`,

`💦 @${senderNumber} \`terminó agotando totalmente a\` @${targetNumber}`,

`😏 @${senderNumber} \`acabó dejando completamente satisfecho a\` @${targetNumber}`,

`🥵 @${senderNumber} \`se volvió completamente loco con\` @${targetNumber}`,

`💋 @${senderNumber} \`terminó marcando el cuerpo de\` @${targetNumber} \`a besos\``,

`💦 @${senderNumber} \`acabó dejando agotado y pegajoso a\` @${targetNumber}`,

`🔥 @${senderNumber} \`le terminó encima a\` @${targetNumber} \`sin avisar\``,

`💦 @${senderNumber} \`acabó dejándole toda la cara llena a\` @${targetNumber}`,

`🥵 @${senderNumber} \`no se aguantó y terminó sobre\` @${targetNumber}`,

`😈 @${senderNumber} \`acabó explotando completamente encima de\` @${targetNumber}`,

`🖤 @${senderNumber} \`dejó totalmente empapado a\` @${targetNumber}`,

`🔥 @${senderNumber} \`terminó soltándolo todo sobre\` @${targetNumber}`,

`💋 @${senderNumber} \`acabó dejando sin palabras a\` @${targetNumber}`,

`💦 @${senderNumber} \`terminó llenando completamente a\` @${targetNumber}`,

`🥵 @${senderNumber} \`acabó dejando temblando y mojado a\` @${targetNumber}`,

`😏 @${senderNumber} \`se vino completamente sobre\` @${targetNumber}`

        ]

        // ======================================
        // 🎲 FRASE RANDOM
        // ======================================
        const randomPhrase =
            frases[Math.floor(
                Math.random() * frases.length
            )]

        // ======================================
        // 🚫 NO REPETIR GIFS
        // ======================================
        let usedFiles =
            usedFilesByChat.get(chatId) || []

        let availableFiles =
            files.filter(file =>
                !usedFiles.includes(file)
            )

        // reinicia si se usaron todos
        if (availableFiles.length === 0) {

            usedFiles = []
            availableFiles = [...files]
        }

        // ======================================
        // 🎲 RANDOM GIF
        // ======================================
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

            caption: randomPhrase,

            mentions: [
                sender,
                target
            ]

        }, { quoted: message })

        console.log(
            `✅ .cum usado: ${randomFile}`
        )

    } catch (err) {

        console.log(
            '❌ Error comando .cum:',
            err
        )

        await sock.sendMessage(chatId, {

            text:
`❌ Error usando el comando .cum`

        }, { quoted: message })
    }
}

module.exports = {
    cumCommand
}