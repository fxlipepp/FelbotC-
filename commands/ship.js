async function shipCommand(sock, chatId, msg) {

    try {

        // 📌 Verificar grupo
        if (!chatId.endsWith('@g.us')) {

            return await sock.sendMessage(chatId, {
                text: '❌ Este comando solo funciona en grupos.'
            }, { quoted: msg })
        }

        // 📌 Obtener participantes
        const metadata = await sock.groupMetadata(chatId)
        const participants = metadata.participants

        if (!participants || participants.length < 2) {

            return await sock.sendMessage(chatId, {
                text: '❌ Se necesitan mínimo 2 personas.'
            }, { quoted: msg })
        }

        const users = participants.map(p => p.id)

        // 📌 Detectar mención
        const mentionedUser =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        let user1
        let user2

        if (mentionedUser) {

            // Usuario que ejecuta el comando
            user1 = msg.key.participant || msg.key.remoteJid

            // Usuario etiquetado
            user2 = mentionedUser

            if (user1 === user2) {

                return await sock.sendMessage(chatId, {
                    text: '💀 No puedes hacer ship contigo mismo JAJA'
                }, { quoted: msg })

            }

        } else {

            // Modo aleatorio normal
            user1 = users[Math.floor(Math.random() * users.length)]

            do {

                user2 = users[Math.floor(Math.random() * users.length)]

            } while (user1 === user2)

        }

        // 📌 Compatibilidad random
        const percentage = Math.floor(Math.random() * 101)

        // 📌 Frases random
        const shipMessages = [

            '💘 Ustedes ya parecen novios JAJA',
            '😳 Hay demasiada tensión aquí...',
            '💍 Ya casi les compro los anillos',
            '🔥 Esta pareja tiene química peligrosa',
            '😭 Se ven demasiado lindos juntos',
            '🫶 Definitivamente hay conexión',
            '💖 El grupo aprueba esta relación',
            '😮‍💨 Demasiado coqueteo entre ustedes',
            '👀 Aquí puede pasar algo...',
            '💞 El destino hizo lo suyo',
            '🥰 Tremenda pareja salió',
            '💘 Esto parece fanfic romántico',
            '😳 Se nota que se gustan',
            '🔥 Ustedes juntos serían un problema',
            '💋 Ya dense un beso JAJA',
            '🫣 Mucha química pa ser casualidad',
            '💓 Compatibilidad peligrosamente alta',
            '🌹 Qué linda pareja hp',
            '💖 El amor está en el aire',
            '😭 Necesito boda urgente',
            '😏 Aquí ya hubo miraditas raras',
            '🫠 Ustedes se traen unas ganas...',
            '💌 El universo los quiere juntos',
            '🥹 Hacen bonita pareja',
            '🔥 Esto ya parece novela',
            '😳 Demasiada química pa ignorarla',
            '💍 Se viene matrimonio grupal',
            '🫶 Son literalmente la pareja del grupo',
            '💖 Aquí hubo flechazo instantáneo',
            '😮‍💨 Qué tensión tan hp',
            '😭 Hasta yo me enamoré viendo esto',
            '👀 Ya me imagino los hijos JAJA',
            '💘 Necesitan cita urgente',
            '🌙 Parecen pareja de Pinterest',
            '😳 Uno mira y el otro se enamora',
            '💞 Compatibilidad fuera de control',
            '🫣 Mucho romance en el ambiente',
            '🔥 Se gustan y no lo quieren admitir',
            '💖 Definitivamente hacen match',
            '😭 Ya quiero edits de ustedes',
            '😏 Aquí se cocina algo',
            '🫶 Ustedes juntos serían invencibles',
            '💍 Ya estoy buscando salón pa la boda',
            '💘 Demasiado lindos juntos',
            '😳 Qué peligro esa combinación',
            '🔥 Esto terminó en luna de miel',
            '💞 El destino los shipeó primero',
            '😭 El grupo ya los adoptó como pareja',
            '💖 Se ven absurdamente bien juntos',
            '🫠 Esa química no es normal',
            '😏 Hay más tensión aquí que en final de novela'

        ]

        const randomMessage =
            shipMessages[Math.floor(Math.random() * shipMessages.length)]

        // 📌 Barra visual
        const totalBars = 10
        const filledBars = Math.floor(percentage / 10)
        const emptyBars = totalBars - filledBars

        const progressBar =
            '█'.repeat(filledBars) +
            '░'.repeat(emptyBars)

        // 📌 Menciones
        const mention1 = `@${user1.split('@')[0]}`
        const mention2 = `@${user2.split('@')[0]}`

        // 📌 Resultado según porcentaje
        let resultMessage = ''

        if (percentage <= 20) {
            resultMessage = '💀 Mejor queden como amigos JAJA'
        }

        else if (percentage <= 40) {
            resultMessage = '😭 Hay interés… pero poquito'
        }

        else if (percentage <= 60) {
            resultMessage = '😳 Puede salir algo aquí'
        }

        else if (percentage <= 80) {
            resultMessage = '💘 Ustedes combinan demasiado'
        }

        else {
            resultMessage = '💍 CASORIO INMINENTE JAJA'
        }

        const shipText = `
╭━━━〔 💘 𝕾𝕳𝕴𝕻 💘 〕━━━⬣

${mention1} ❤️ ${mention2}

💞 Compatibilidad:
[ ${progressBar} ] ${percentage}%

✨ ${randomMessage}

${resultMessage}

╰━━━━━━━━━━━━━━━━⬣
`.trim()

        // 📌 Enviar resultado
        await sock.sendMessage(chatId, {

            text: shipText,
            mentions: [user1, user2]

        }, { quoted: msg })

    } catch (error) {

        console.error('Error in ship command:', error)

        await sock.sendMessage(chatId, {

            text: '❌ Ocurrió un error usando el comando ship.'

        }, { quoted: msg })

    }

}

module.exports = shipCommand