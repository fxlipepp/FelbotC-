async function topCommand(sock, chatId, senderId, message) {
    try {
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            ''

        const args = text.split(' ').slice(1)
        const phrase = args.join(' ').trim()

        if (!phrase) {
            return await sock.sendMessage(chatId, {
                text:
`╭━━━〔 📊 TOP FELBOT 〕━━━⬣

❀ Usa el comando así:

.top <categoría>

📌 Ejemplos:
.top los más guapos
.top los más gays
.top los más inteligentes
.top los más vagos

╰━━━━━━━━━━━━━━⬣`
            }, { quoted: message })
        }

        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❀ Este comando solo funciona en grupos.'
            }, { quoted: message })
        }

        const metadata = await sock.groupMetadata(chatId)
        const participants = metadata.participants || []

        const botJid = sock.user?.id || null

        const pool = participants
            .map(p => p.id)
            .filter(id => id !== botJid)

        if (pool.length < 2) {
            return await sock.sendMessage(chatId, {
                text: '❀ No hay suficientes participantes.'
            }, { quoted: message })
        }

        // Mezclar usuarios
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[pool[i], pool[j]] = [pool[j], pool[i]]
        }

        const top = pool.slice(0, 5)

        const medals = [
            '👑',
            '🥈',
            '🥉',
            '🏅',
            '🎖️'
        ]

        const genericRoasts = [
            'Ni él sabe cómo terminó aquí 💀',
            'Se votó desde 14 cuentas distintas 🤨',
            'Hoy se siente famoso 😎',
            'El grupo decidió y nadie entiende por qué 😂',
            'Lleva días preparándose para este momento 🗿',
            'Su mamá está orgullosa 👏',
            'Está celebrando como si hubiera ganado un mundial 🏆',
            'Se lo tomó demasiado en serio 😭',
            'No deja de presumir este puesto 😏',
            'Hasta Felbot quedó sorprendido 🤖'
        ]

        const lowerPhrase = phrase.toLowerCase()

        let categoryRoasts = genericRoasts

        if (lowerPhrase.includes('gay')) {
            categoryRoasts = [
                'Felbot detectó actividad sospechosa 🌈',
                'Lo niega pero las pruebas existen 😭',
                'Su historial fue determinante 💀',
                'No pudo escapar del ranking 😂',
                'Ya todos lo sabían 🤨',
                'Ganó por amplia diferencia 🏳️‍🌈'
            ]
        } else if (lowerPhrase.includes('guapo')) {
            categoryRoasts = [
                'El espejo confirmó los resultados 😎',
                'Las tías del grupo votaron masivamente 💘',
                'Demasiado fachero para este grupo ✨',
                'Tiene más fans de los que admite 😏',
                'Hasta Felbot quedó enamorado 😳'
            ]
        } else if (
            lowerPhrase.includes('feo') ||
            lowerPhrase.includes('horrible')
        ) {
            categoryRoasts = [
                'La cámara frontal lo delató 📸',
                'Perdió contra un filtro de TikTok 😭',
                'Ni el espejo quiso opinar 💀',
                'El resultado fue unánime 🤣',
                'Felbot lamenta informar esto 😔'
            ]
        } else if (
            lowerPhrase.includes('inteligente') ||
            lowerPhrase.includes('listo')
        ) {
            categoryRoasts = [
                'Google está orgulloso de él 🧠',
                'Corrige a los profesores por deporte 🤓',
                'Resuelve problemas que nadie entiende 📚',
                'Tiene demasiadas pestañas abiertas 😭',
                'Probablemente ya sabía este resultado 😎'
            ]
        } else if (
            lowerPhrase.includes('vago') ||
            lowerPhrase.includes('perezoso')
        ) {
            categoryRoasts = [
                'Ni vino a recoger el premio 🛌',
                'Le dio pereza perder 😴',
                'Se cansó leyendo este mensaje 😭',
                'Está descansando desde ayer 💤',
                'Trabajar no estaba en sus planes 🤣'
            ]
        }

        let ranking = ''

        top.forEach((jid, index) => {
            const roast =
                categoryRoasts[Math.floor(Math.random() * categoryRoasts.length)]

            const porcentaje = Math.max(
                100 - (index * 5) - Math.floor(Math.random() * 6),
                70
            )

            ranking += `
${medals[index]} *#${index + 1}* ➜ @${jid.split('@')[0]}
┊ 📊 Nivel: *${porcentaje}%*
┊ 💬 ${roast}

`
        })

        const finalText = `
╭〔 🔥 TOP FELBOT 🔥 〕━⬣

🎯 *CATEGORÍA*
> ➜ ${phrase.toUpperCase()}

━━━━━━━━━━━━━━━

 ${ranking}
━━━━━━━━━━━━━━━

🤖 *Análisis completado*

> ⚠️ Reclamos, lloros y apelaciones:
*No serán escuchados.* 😂

╰━━━━━━━━━━━━━━⬣
`.trim()

        await sock.sendMessage(chatId, {
            text: finalText,
            mentions: top
        }, { quoted: message })

    } catch (err) {
        console.error('Error en comando top:', err)

        await sock.sendMessage(chatId, {
            text: '❌ Ocurrió un error al generar el TOP.'
        }, { quoted: message })
    }
}

module.exports = topCommand