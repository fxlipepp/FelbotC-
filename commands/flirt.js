const fetch = require('node-fetch')

const flirts = [

    "Oye… ¿si te invito a dormir aceptas o te haces el difícil? 😳",
    "Tienes una sonrisa que dan ganas de besar lento 😮‍💨",
    "Qué peligro hablar contigo tanto y terminar enamorado 😭",
    "Tú no coqueteas… tú dejas traumado emocionalmente 💘",
    "Si estuvieras aquí ya te tendría abrazado 😔",
    "Contigo sí me pierdo sin GPS JAJA 😳",
    "Qué rico sería quedarnos hablando toda la noche 🌙",
    "Tienes cara de besar demasiado bien 😮‍💨",
    "Tu voz seguro da demasiada tranquilidad 😭",
    "Eres de esas personas que dan ganas de cuidar 🫶",
    "No sé qué tienes pero me tienes pensando mucho 😳",
    "Qué rico coincidir contigo en esta vida 💖",
    "Tu energía atrae demasiado ✨",
    "Dan ganas de darte besitos en la frente 😭",
    "Tienes algo demasiado adictivo 😳",
    "Si fueras canción te tendría en loop 🎵",
    "Qué peligro encariñarse contigo JAJA",
    "Tu mirada debe enamorar muy fácil 😮‍💨",
    "Eres demasiado lindo/a pa ignorarte 😭",
    "Qué rico dormir abrazado contigo 😳",
    "Tienes una vibra demasiado sexy 😮‍💨",
    "Tu forma de hablar enamora mucho 💘",
    "Eres un problema… porque me gustas demasiado 😭",
    "Tienes cara de ser tremenda tentación 😳",
    "Tu sonrisa debería ser patrimonio nacional 😭",
    "Qué ganas de molestarte cariñosamente JAJA",
    "Tú sí eres mucho paquete 😮‍💨",
    "Tu existencia ya alegra el día ✨",
    "Hablar contigo se siente demasiado bonito 😔",
    "Tienes cara de hacer sonrojar fácil 😳",
    "Eres demasiado coqueteable 😭",
    "Qué rico sería verte todos los días 💖",
    "Tu personalidad pega demasiado duro 😮‍💨",
    "Me caes peligrosamente bien 😭",
    "Seguro hueles demasiado rico 😳",
    "Tienes cara de mandar audios lindos 💘",
    "Tu vibra se siente demasiado cómoda 🫶",
    "Eres literalmente un gusto visual 😮‍💨",
    "Qué rico perder tiempo contigo 😳",
    "Tienes energía de persona inolvidable ✨",
    "Tu sonrisa debería venir con advertencia 🚨",
    "Dan ganas de robarte un abrazo 😭",
    "Tienes una mezcla peligrosa entre lindo/a y hot 😮‍💨",
    "No sé cómo explicarlo pero atraes demasiado 😳",
    "Qué rico sería verte sonreír en persona 💖",
    "Tu voz seguro da paz y nervios al mismo tiempo 😭",
    "Tienes cara de besar rico JAJA 😳",
    "Qué pecado estar tan bueno/a 😮‍💨",
    "Hablar contigo ya se volvió vicio 😭",
    "Tu forma de existir está muy linda 😔"

]

async function flirtCommand(sock, chatId, message) {

    try {

        let userToFlirt

        // 📌 Usuario mencionado
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {

            userToFlirt =
                message.message.extendedTextMessage.contextInfo.mentionedJid[0]
        }

        // 📌 Usuario respondido
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {

            userToFlirt =
                message.message.extendedTextMessage.contextInfo.participant
        }

        const flirtMessage =
            flirts[Math.floor(Math.random() * flirts.length)]

        await new Promise(resolve => setTimeout(resolve, 1000))

        // 💘 Si mencionan a alguien
        if (userToFlirt) {

            await sock.sendMessage(chatId, {

                text: `💘 @${userToFlirt.split('@')[0]} ${flirtMessage}`,

                mentions: [userToFlirt]

            }, { quoted: message })

        } 
        
        // 💘 Si no mencionan a nadie
        else {

            await sock.sendMessage(chatId, {

                text: `💘 ${flirtMessage}`

            }, { quoted: message })
        }

    } catch (error) {

        console.error('Error in flirt command:', error)

        await sock.sendMessage(chatId, {

            text: '❌ Ocurrió un error enviando el coqueteo.'

        }, { quoted: message })
    }
}

module.exports = { flirtCommand }