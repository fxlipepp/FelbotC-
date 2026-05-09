const compliments = [

    "Tienes una sonrisa que da ganas de besar 😳",
    "Qué peligro hablar contigo y terminar enamorado JAJA",
    "Tienes una vibra demasiado rica 😮‍💨",
    "Tu voz seguro pone nervioso a cualquiera 💘",
    "Eres un malparido 10/10 😭",
    "Tienes cara de besar demasiado bien 😳",
    "Contigo sí me pierdo sin Google JAJA",
    "Tu mirada debe dejar gente traumada 😮‍💨",
    "Hablar contigo debería ser ilegal de lo adictivo 😭",
    "Tienes un flow demasiado hp 🔥",
    "Tu existencia mejora cualquier grupo 💖",
    "Tienes energía de protagonista sexy 😮‍💨",
    "Qué rico sería dormir abrazado contigo 😳",
    "Tienes cara de mandar audios lindos 😭",
    "Tu humor enamora demasiado JAJA",
    "Eres tan lindo/a que da rabia 😭",
    "Tienes una personalidad demasiado atractiva 🫠",
    "Tu carita merece demasiados besitos 😳",
    "Seguro haces ojitos y la gente cae 😭",
    "Tu sonrisa debería pagar impuestos 🚨",
    "Tienes tremenda pinta 😮‍💨",
    "Qué ganas de coquetearte sin miedo 😳",
    "Eres de esas personas que uno presume 😌",
    "Hasta tus mensajes se sienten lindos 💌",
    "Tienes cara de ser tremendo problema emocional 😭",
    "Qué peligro encariñarse contigo JAJA",
    "Tu presencia pone el ambiente bonito ✨",
    "Tienes energía de “me dañó pero valió la pena” 😭",
    "Seguro hueles demasiado rico 😳",
    "Tu voz debe sonar deliciosa 😮‍💨",
    "Tienes un no sé qué que uff 😳",
    "Qué rico verte conectado/a JAJA",
    "Tu existencia da paz y ganas al mismo tiempo 😭",
    "Eres demasiado sexy para estar gratis 😮‍💨",
    "Tienes cara de abrazar demasiado rico 🫂",
    "Tu mirada debe desvestir emocionalmente 😭",
    "Qué ganas de perder el tiempo contigo 😳",
    "Tienes carisma de sobra 🔥",
    "Tu belleza debería venir con advertencia 🚨",
    "Tú no enamoras… tú destruyes emocionalmente 😭",
    "Tienes cara de mandar reels lindos a las 2am 😔",
    "Tu risa debe curar depresiones JAJA",
    "Eres demasiado lindo/a pa este planeta 😭",
    "Tienes energía de “uno más y me enamoro” 😳",
    "Tu personalidad pega demasiado duro 💘",
    "Dan ganas de darte mimitos 😭",
    "Tienes unos ojitos que uff 😳",
    "Qué peligro dejarte entrar al corazón 😔",
    "Tu atractivo está completamente roto 😮‍💨",
    "Tienes cara de besar lento 😳",
    "Tu vibra da demasiadas ganas de quedarse 💖",
    "Qué rico coincidir contigo 😌",
    "Eres literalmente un gusto visual 😮‍💨",
    "Tienes cara de ser adicción emocional 😭",
    "Tu existencia ya hace bonito el día ✨",
    "Qué rico hablar contigo sin aburrirse nunca 😳",
    "Tienes cara de celoso/a bonito/a JAJA",
    "Eres demasiado coqueteable 😮‍💨",
    "Tu sonrisa merece patrimonio cultural 😭",
    "Seguro haces sonrojar fácil 😳",
    "Tienes una mezcla peligrosa entre lindo/a y hot 😮‍💨",
    "Tu presencia se siente demasiado rico ✨",
    "Qué ganas de molestarte cariñosamente JAJA",
    "Eres de esos gustos que uno oculta pa no verse débil 😭",
    "Tu forma de hablar atrapa demasiado 😳",
    "Qué pecado estar tan bueno/a 😮‍💨",
    "Tienes cara de dar besos adictivos 😭",
    "Tu belleza ya es bullying JAJA",
    "Qué rico sería verte todos los días 😳",
    "Tienes una energía demasiado provocativa 😮‍💨",
    "Tú sí eres mucho paquete JAJA 🔥"

]

async function complimentCommand(sock, chatId, message) {

    try {

        if (!message || !chatId) {
            console.log('Invalid message or chatId:', { message, chatId })
            return
        }

        let userToCompliment

        // 📌 Usuario mencionado
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {

            userToCompliment =
                message.message.extendedTextMessage.contextInfo.mentionedJid[0]
        }

        // 📌 Usuario respondido
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {

            userToCompliment =
                message.message.extendedTextMessage.contextInfo.participant
        }

        if (!userToCompliment) {

            await sock.sendMessage(chatId, {
                text: '✨ Menciona a alguien o responde un mensaje para enviarle un cumplido.'
            })

            return
        }

        const compliment =
            compliments[Math.floor(Math.random() * compliments.length)]

        await new Promise(resolve => setTimeout(resolve, 1000))

        await sock.sendMessage(chatId, {

            text: `💌 @${userToCompliment.split('@')[0]} ${compliment}`,

            mentions: [userToCompliment]

        })

    } catch (error) {

        console.error('Error in compliment command:', error)

        if (error?.data === 429) {

            await new Promise(resolve => setTimeout(resolve, 2000))

            try {

                await sock.sendMessage(chatId, {
                    text: '⏳ Espera unos segundos antes de volver a usar el comando.'
                })

            } catch (retryError) {

                console.error('Retry error:', retryError)
            }

        } else {

            try {

                await sock.sendMessage(chatId, {
                    text: '❌ Ocurrió un error enviando el cumplido.'
                })

            } catch (sendError) {

                console.error('Error sending error message:', sendError)
            }
        }
    }
}

module.exports = { complimentCommand }