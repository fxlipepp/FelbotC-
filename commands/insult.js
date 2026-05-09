const insults = [

    "Eres tan fastidioso que hasta el WiFi se desconecta cuando hablas 😭",
    "Tienes menos futuro que un Nokia sin cargador JAJA",
    "Hablas mucha mierda pa tan poca neurona 🧠",
    "Eres la prueba de que respirar no requiere inteligencia 😔",
    "Tu personalidad da sueño hp 😭",
    "Ni Google encuentra sentido a lo que dices JAJA",
    "Tienes cara de pedir fiado y desaparecer 😭",
    "Tu árbol genealógico seguro es un círculo 🔄",
    "Eres tan inútil que ni pa ejemplo sirves 😭",
    "Tu mamá te hizo y Dios dijo: 'uy no qué pena' 😭",
    "Eres más cansón que anuncio de YouTube de 2 horas 😩",
    "Si la estupidez doliera vivirías gritando 😭",
    "Tienes menos brillo que un bombillo fundido 💀",
    "Das más pena que hablar solo en público 😭",
    "Pareces error de sistema JAJA",
    "Tienes cara de oler a humedad 😭",
    "Ni el autocorrector entiende las babosadas que escribes 😩",
    "Tu presencia baja el IQ del grupo 🧠⬇️",
    "Hablas como si pensar fuera opcional 😭",
    "Tienes tremenda energía de NPC dañado 🎮",
    "Eres más falso que billete de 3 mil 😭",
    "Tu sentido común está en mantenimiento desde nacimiento 💀",
    "Das más vueltas que ventilador dañado 😭",
    "Tienes cara de llorar por estados 😭",
    "Tu existencia parece castigo divino 😔",
    "Eres tan intenso que hasta los bots te ignoran JAJA",
    "Tienes menos personalidad que una cuchara 🥄",
    "Pareces comentario de Facebook escrito por un tío borracho 😭",
    "Hablas mucho pa no decir nada 😩",
    "Tienes carisma de poste mojado 😭",
    "Das más cringe que bailar solo en TikTok 😭",
    "Tu cerebro está corriendo en 144p 💀",
    "Eres más perdido que pingüino en Medellín 😭",
    "Tienes cara de pedir cargador y no devolverlo nunca 😭",
    "Tu humor parece castigo del SENA 😭",
    "Eres la razón por la que ponen instrucciones en el shampoo JAJA",
    "Tu vida amorosa debe ser igual de vacía que tu cabeza 😭",
    "Das más rabia que perder una partida por lag 😩",
    "Eres más lento que fila de EPS 😭",
    "Tienes cara de escribir 'ola k ase' en pleno 2026 💀",
    "Tu opinión vale menos que los centavos del piso 😭",
    "Ni ChatGPT entiende tus estupideces JAJA",
    "Eres más incómodo que abrazo sudado 😭",
    "Pareces villano secundario mal escrito 🎬",
    "Das más miedo que abrir la cámara frontal 😭",
    "Tu existencia parece bug de la Matrix 💀",
    "Tienes la inteligencia emocional de una piedra 🪨",
    "Hablar contigo quita años de vida 😭",
    "Tienes cara de quedarse viendo reels 14 horas seguidas 😭",
    "Eres tan insoportable que hasta Siri se silencia 😩",
    "Tu nivel de lógica da dolor físico 😭",
    "Das más pena que mandar mensaje y borrarlo rápido 💀",
    "Eres tan cansón que seguramente el grupo te tiene archivado 😭",
    "Tienes cara de pelear por Free Fire 😭",
    "Tu cerebro parece demo gratis sin desbloquear 😭",
    "Das más decepción que examen sorpresa 😩",
    "Pareces audio reenviado por la tía conspiranoica 😭",
    "Tienes menos calle que Barbie princesa 💀",
    "Hablas como si fueras importante JAJA",
    "Tu actitud da ganas de reiniciar el universo 😭",
    "Eres más inútil que semáforo en GTA 😭",
    "Das más estrés que internet lento 😩",
    "Tienes cara de decir 'yo no fui' con pruebas al frente 😭",
    "Tu energía espanta hasta los mosquitos 💀",
    "Eres tan paila que ni el autocorrector te salva 😭",
    "Tienes más ego que talento 😩",
    "Das más sueño que clase virtual a las 6am 😭",
    "Pareces un meme malo reciclado 😭",
    "Tu lógica parece hecha con IA pirata 💀",
    "Tienes cara de terminar funado 😭",
    "Eres tan fastidioso que hasta tus estados aburren 😩",
    "Das más pena que gritar 'profe no revisó tarea' 😭",
    "Tienes menos gracia que una pared blanca 😭",
    "Tu existencia se siente como anuncio sin botón de saltar 💀",
    "Hablar contigo debería contar como trabajo comunitario 😭"

]

async function insultCommand(sock, chatId, message) {

    try {

        if (!message || !chatId) {
            console.log('Invalid message or chatId:', { message, chatId })
            return
        }

        let userToInsult

        // 📌 Usuario mencionado
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {

            userToInsult =
                message.message.extendedTextMessage.contextInfo.mentionedJid[0]
        }

        // 📌 Usuario respondido
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {

            userToInsult =
                message.message.extendedTextMessage.contextInfo.participant
        }

        if (!userToInsult) {

            await sock.sendMessage(chatId, {
                text: '💀 Menciona a alguien o responde un mensaje para insultarlo.'
            })

            return
        }

        const insult =
            insults[Math.floor(Math.random() * insults.length)]

        await new Promise(resolve => setTimeout(resolve, 1000))

        await sock.sendMessage(chatId, {

            text: `☠️ @${userToInsult.split('@')[0]} ${insult}`,

            mentions: [userToInsult]

        })

    } catch (error) {

        console.error('Error in insult command:', error)

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
                    text: '❌ Ocurrió un error enviando el insulto.'
                })

            } catch (sendError) {

                console.error('Error sending error message:', sendError)
            }
        }
    }
}

module.exports = { insultCommand }