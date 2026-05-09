const fetch = require('node-fetch')

async function stupidCommand(
    sock,
    chatId,
    quotedMsg,
    mentionedJid,
    sender,
    args,
    message
) {

    try {

        // 📌 Usuario objetivo
        let who =
            quotedMsg
                ? quotedMsg.sender
                : mentionedJid && mentionedJid[0]
                    ? mentionedJid[0]
                    : sender

        // 📌 Textos random
        const randomTexts = [

            'cerebro en mantenimiento',
            'enemigo del estudio',
            'campeón mundial de decir babosadas',
            '100% puro retraso emocional',
            'pensando en 144p',
            'wifi cerebral desconectado',
            'máquina de decir estupideces',
            'producto defectuoso',
            'NPC dañado',
            'experto en dar cringe',
            'sin neuronas premium',
            'nivel de lógica: tostadora',
            'modo burro activado',
            'generador profesional de pena ajena',
            'mente de pollo frito',
            'sistema operativo: brutoOS',
            'cara de no entender ni el clima',
            'doctorado en estupidez',
            'más lento que Internet Explorer',
            'el terror de las neuronas',
            'el mismísimo rey del ridículo',
            'más perdido que pingüino en Medellín',
            'inteligencia artificial pirateada',
            'candidato a circo nacional',
            'edición limitada de la vergüenza',
            'cara de oler a humedad',
            'el villano de la lógica',
            'nivel intelectual de una piedra',
            'fabricante oficial de estrés',
            'el error 404 de la evolución'

        ]

        // 📌 Texto personalizado o random
        const text =
            args && args.length > 0
                ? args.join(' ')
                : randomTexts[Math.floor(Math.random() * randomTexts.length)]

        // 📌 Foto de perfil
        let avatarUrl

        try {

            avatarUrl = await sock.profilePictureUrl(who, 'image')

        } catch {

            avatarUrl =
                'https://telegra.ph/file/24fa902ead26340f3df2c.png'
        }

        // 📌 API
        const apiUrl =
            `https://some-random-api.com/canvas/misc/its-so-stupid?avatar=${encodeURIComponent(avatarUrl)}&dog=${encodeURIComponent(text)}`

        const response = await fetch(apiUrl)

        if (!response.ok) {

            throw new Error(`API Error ${response.status}`)
        }

        // 📌 Imagen
        const imageBuffer = await response.buffer()

        // 📌 Frases random abajo
        const captions = [

            '😭 Ya no tiene salvación',
            '💀 Caso clínico confirmado',
            '🧠 Neuronas no encontradas',
            '😭 El grupo ya sospechaba',
            '💔 Lo intentamos pero no aprendió',
            '🫡 Se hizo lo que se pudo',
            '🤡 Premio al más perdido',
            '😭 Increíble nivel de estupidez',
            '💀 Ciencia explicando este caso:',
            '😭 Dios abandonó esta partida',
            '🧠 Actualizando inteligencia... 1%',
            '💀 Diagnóstico: irreversible',
            '😭 El estudio le tiene miedo',
            '🤡 Mucho internet y poca neurona',
            '💀 Inteligencia vendida por separado'

        ]

        const randomCaption =
            captions[Math.floor(Math.random() * captions.length)]

        // 📌 Enviar imagen
        await sock.sendMessage(chatId, {

            image: imageBuffer,

            caption:
`╭〔 🤡 STUPID DETECTOR 🤡 〕━━⬣

📌 Usuario:
@${who.split('@')[0]}

🧠 Resultado:
"${text}"

${randomCaption}

╰━━━━━━━━━━━━━━⬣`,

            mentions: [who]

        }, { quoted: message })

    } catch (error) {

        console.error('Error in stupid command:', error)

        await sock.sendMessage(chatId, {

            text:
'❌ No pude generar la imagen del estúpido 😭'

        }, { quoted: message })
    }
}

module.exports = { stupidCommand }