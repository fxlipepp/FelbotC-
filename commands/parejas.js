async function parejasCommand(sock, chatId, msg) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❌ Este comando solo funciona en grupos.'
            }, { quoted: msg })
        }

        const metadata = await sock.groupMetadata(chatId)
        const users = (metadata.participants || [])
            .map(participant => participant.id || participant.phoneNumber || participant.lid)
            .filter(Boolean)

        if (users.length < 10) {
            return await sock.sendMessage(chatId, {
                text: '❌ Se necesitan mínimo 10 personas para formar 5 parejas.'
            }, { quoted: msg })
        }

        const phrasesByRange = {
            low: [
                'Ni el algoritmo puede salvar esto 💀',
                'Cupido renunció con ustedes 🏹',
                'Mejor como amigos 😂',
                '0 química, 100% amistad 🤝',
                'Hasta el WiFi tiene más conexión 📡',
                'El amor salió del grupo 🚪',
                'Esto necesita un milagro 🙏',
                'Ni en otra dimensión funciona 💀',
                'La química brilló por su ausencia 🥲',
                'Cupido pasó de largo 🏹'
            ],
            veryLow: [
                'Hay amor… pero está perdido 🥲',
                'Una chispa diminuta 🔥',
                'Tal vez en otra vida 👀',
                'Cupido está haciendo horas extras 🏹',
                'La esperanza sigue viva 😭',
                'Más amigos que pareja 😂',
                'El romance está en mantenimiento 🔧',
                'Hay potencial… microscópico 🔬',
                'El amor está cargando… 1% 🔄',
                'Esto necesita bastante trabajo 💀'
            ],
            possible: [
                'Puede funcionar… con suerte 🍀',
                'Hay algo, pero casi nada 👀',
                'Cupido está dudando 🏹',
                'La química intenta aparecer 🧪',
                'El destino está indeciso ⚖️',
                'Hay una pequeña posibilidad 💘',
                'Quizás con una buena cita 🍕',
                'El romance apenas comienza 🌱',
                'Podría pasar algo algún día 👀',
                'No pierdan la esperanza 😂'
            ],
            starting: [
                'Ya se empieza a notar algo 👀',
                'Hay química escondida 🧪',
                'Esto podría ponerse interesante 😏',
                'Cupido ya los tiene en la mira 🏹',
                'Hay posibilidades 💘',
                'El amor está calentando motores 🔥',
                'Pareja en construcción 🚧❤️',
                'El destino está haciendo su trabajo ✨',
                'Ya huele a romance 👀💕',
                'Algo está naciendo 🌱❤️'
            ],
            balanced: [
                'Puede salir algo bonito ❤️',
                'La química está equilibrada ⚗️',
                'El romance está tomando forma 💕',
                'No sería mala pareja 😏',
                'El destino los está acercando ✨',
                'Aquí puede haber historia 📖❤️',
                'La chispa está encendida 🔥',
                'Podrían sorprendernos 💘',
                'Hay una conexión interesante 👀',
                'Cupido está calentando el arco 🏹'
            ],
            good: [
                '¡Ya hay química! 🔥',
                'Esto empieza a ponerse serio 😏',
                'Cupido hizo bien su trabajo 🏹❤️',
                'Aquí hay potencial de verdad 💕',
                'La conexión está fuerte ⚡',
                'Ya parecen pareja 👀',
                'El romance está creciendo 🌹',
                'Esto promete bastante 😍',
                'Hay algo especial entre ustedes ✨',
                'El amor está tomando ventaja 💘'
            ],
            strong: [
                '¡La química está potente! 🔥',
                'Cupido está celebrando 🏹🎉',
                'Aquí hay bastante amor ❤️',
                'Ya casi parecen inseparables 😍',
                'El destino los quiere juntos ✨',
                'Esto tiene futuro 💕',
                'La conexión está clarísima ⚡',
                'Se viene una historia de amor 📖❤️',
                'La compatibilidad está alta 📈💕',
                '¡Parejaza en potencia! 😏'
            ],
            excellent: [
                '¡Esto ya parece oficial! 💍',
                'Cupido dio en el blanco 🎯🏹',
                'La química está por las nubes 🚀❤️',
                'Ustedes nacieron para coincidir ✨',
                'Pareja altamente compatible 💕',
                'Aquí sobra química 🔥',
                'El romance está asegurado 😍',
                'El algoritmo los quiere juntos 😂',
                'Ya pueden ir pensando en la cita 🍕❤️',
                'Esto huele a relación seria 👀💍'
            ],
            almostPerfect: [
                '¡Pareja casi perfecta! 😍',
                'Cupido hizo una obra maestra 🏹✨',
                'El algoritmo los emparejó demasiado bien 🔥',
                'La química es brutal ❤️‍🔥',
                'Esto ya es amor del bueno 💕',
                'El destino no se equivocó ✨',
                '¡Compatibilidad nivel máximo! 📈',
                'Hasta nosotros vemos la conexión 👀❤️',
                'Esta pareja promete muchísimo 💍',
                'Separarlos sería delito 😂❤️'
            ],
            legendary: [
                '¡CASI PERFECTOS! ❤️‍🔥',
                'Cupido se lució con ustedes 🏹🔥',
                'Esto ya parece matrimonio 😂💍',
                'Compatibilidad legendaria 🏆❤️',
                'El algoritmo encontró el amor verdadero 😍',
                'Ni Romeo y Julieta 💀❤️',
                'El destino los escribió juntos ✨',
                '¡Pareja de película! 🎬💕',
                'Aquí hay amor para rato ❤️',
                'Solo falta que se declaren 😏💘'
            ],
            perfect: [
                '*¡100%! EL ALGORITMO CONFIRMÓ EL AMOR ❤️‍🔥*',
                '*¡PAREJA PERFECTA! 💍👑*',
                '*¡CUPIDO ACABA DE ROMPER EL RÉCORD! 🏹🔥*',
                '*¡100% DE COMPATIBILIDAD! NI SE DISCUTE 😍*',
                '*¡EL MATCH DEFINITIVO! ❤️‍🔥*',
                '*¡NACIERON PARA ESTAR JUNTOS! 💕*',
                '*¡EL DESTINO LOS EMPAREJÓ! ✨❤️*',
                '*¡NI EL ALGORITMO LOS PUEDE SEPARAR! 😂💘*',
                '*¡ESTO YA NO ES CASUALIDAD, ES DESTINO! 🔥*',
                '*¡100% AMOR, 0% DISCUSIÓN! 💍❤️*'
            ]
        }

        const getPhrase = percentage => {
            let phrases

            if (percentage <= 10) phrases = phrasesByRange.low
            else if (percentage <= 20) phrases = phrasesByRange.veryLow
            else if (percentage <= 30) phrases = phrasesByRange.possible
            else if (percentage <= 40) phrases = phrasesByRange.starting
            else if (percentage <= 50) phrases = phrasesByRange.balanced
            else if (percentage <= 60) phrases = phrasesByRange.good
            else if (percentage <= 70) phrases = phrasesByRange.strong
            else if (percentage <= 80) phrases = phrasesByRange.excellent
            else if (percentage <= 90) phrases = phrasesByRange.almostPerfect
            else if (percentage < 100) phrases = phrasesByRange.legendary
            else phrases = phrasesByRange.perfect

            return phrases[Math.floor(Math.random() * phrases.length)]
        }

        const shuffledUsers = [...users].sort(() => Math.random() - 0.5)
        const pairs = []
        const mentions = []

        for (let index = 0; index < 10; index += 2) {
            const firstUser = shuffledUsers[index]
            const secondUser = shuffledUsers[index + 1]
            const percentage = Math.floor(Math.random() * 101)

            pairs.push({ firstUser, secondUser, percentage })
        }

        pairs.sort((firstPair, secondPair) => secondPair.percentage - firstPair.percentage)

        const pairLines = pairs.map((pair, index) => {
            const filledBars = Math.floor(pair.percentage / 10)
            const progressBar = '█'.repeat(filledBars) + '░'.repeat(10 - filledBars)
            const phrase = getPhrase(pair.percentage)

            mentions.push(pair.firstUser, pair.secondUser)

            return `#${index + 1}\n` +
                `💞 @${pair.firstUser.split('@')[0]} ❤️ @${pair.secondUser.split('@')[0]}\n` +
                `💗 Compatibilidad: [ ${progressBar} ] ${pair.percentage}%\n` +
                `✨ ${phrase}`
        })

        const parejasText = `
╭━━━〔 💘 𝕻𝕬𝕽𝕰𝕵𝕬𝕾 💘 〕━━━⬣

${pairLines.join('\n\n')}

╰━━━━━━━━━━━━━━━━⬣
`.trim()

        await sock.sendMessage(chatId, {
            text: parejasText,
            mentions
        }, { quoted: msg })
    } catch (error) {
        console.error('Error in parejas command:', error)
        await sock.sendMessage(chatId, {
            text: '❌ Ocurrió un error usando el comando parejas.'
        }, { quoted: msg })
    }
}

module.exports = parejasCommand