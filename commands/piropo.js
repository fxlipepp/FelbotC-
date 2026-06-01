async function piropoCommand(sock, chatId, msg) {

    try {

        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❌ Este comando solo funciona en grupos.'
            }, { quoted: msg })
        }

        const mentionedJids =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

        if (!mentionedJids.length) {
            return await sock.sendMessage(chatId, {
                text: '💌 Etiqueta a alguien.\n\nEjemplo:\n.piropo @usuario'
            }, { quoted: msg })
        }

        const sender = msg.key.participant || msg.key.remoteJid
        const target = mentionedJids[0]

        if (sender === target) {
            return await sock.sendMessage(chatId, {
                text: '😂 No puedes enviarte piropos a ti mismo.'
            }, { quoted: msg })
        }

        const piropos = [

            'Si la belleza fuera delito, estarías condenado de por vida.',
            'Contigo entendí por qué existe el amor a primera vista.',
            'Tus ojos tienen más brillo que todas las estrellas.',
            'Eres la casualidad más bonita que podría existir.',
            'Si fueras canción, serías mi favorita.',
            'Tu sonrisa debería ser patrimonio mundial.',
            'Ni Google tiene todo lo que busco, pero tú sí.',
            'Eres el motivo por el que las palabras bonitas existen.',
            'Si fueras un sueño, no quisiera despertar.',
            'Tu mirada tiene poderes sobrenaturales.',
            'Eres arte que camina por la tierra.',
            'La luna sale cada noche intentando parecerse a ti.',
            'No sabía qué era la perfección hasta que te vi.',
            'Tienes una sonrisa capaz de arreglar cualquier día.',
            'Si la belleza pagara impuestos estarías en bancarrota.',
            'Tus ojos parecen dos universos completos.',
            'Qué suerte tiene el mundo de tenerte.',
            'Hasta el sol se pone nervioso cuando apareces.',
            'Eres más bonito que un mensaje inesperado.',
            'Tu voz debería estar en Spotify.',
            'Tienes el talento de alegrar cualquier lugar.',
            'Tus ojos son mi lugar favorito.',
            'Eres la definición de "demasiado hermoso".',
            'Ni los filtros pueden competir contigo.',
            'Tu sonrisa debería ser considerada medicina.',
            'Eres más brillante que cualquier diamante.',
            'Si fueras una estrella, serías la más visible.',
            'El universo se lució contigo.',
            'Pareces sacado de una película romántica.',
            'Tu belleza debería estar prohibida.',
            'No eres una persona, eres una obra maestra.',
            'Tus ojos deberían tener advertencia de peligro.',
            'Porque enamoran demasiado.',
            'Hasta el WiFi pierde señal cuando apareces.',
            'Eres la mejor vista del día.',
            'Tienes una energía increíble.',
            'Tu presencia mejora cualquier lugar.',
            'Eres más dulce que cualquier postre.',
            'La suerte sería encontrarte dos veces.',
            'Tus ojos son pura magia.',
            'Eres imposible de ignorar.',
            'Tu sonrisa vale millones.',
            'Si fueras una flor, serías la más hermosa.',
            'Ni el cielo tiene tantos colores como tú.',
            'Eres inspiración para poetas.',
            'Tu mirada vale más que mil palabras.',
            'Tienes algo especial que nadie más tiene.',
            'Eres la razón por la que existen los corazones.',
            'Si fueras un libro, no dejaría de leerte.',
            'Tienes una belleza que no necesita explicación.',
            'Eres demasiado lindo para ser real.',
            'Tu sonrisa es mi lugar seguro.',
            'Hasta el tiempo se detiene cuando apareces.',
            'Eres más brillante que cualquier amanecer.',
            'Tu existencia mejora el mundo.',
            'Pareces diseñado por los dioses.',
            'Tienes una belleza que impresiona.',
            'Eres una casualidad demasiado perfecta.',
            'Tu mirada es un peligro para mi corazón.',
            'Tus ojos cuentan historias hermosas.',
            'Eres la mejor parte del día.',
            'Tienes una sonrisa que conquista.',
            'Eres tan lindo que debería haber pruebas.',
            'Ni el arte puede representarte.',
            'Tu voz merece un premio.',
            'Eres un milagro visual.',
            'Tu belleza rompe estadísticas.',
            'Tienes el encanto activado permanentemente.',
            'Eres más bonito que cualquier paisaje.',
            'Tus ojos deberían ser patrimonio cultural.',
            'Eres la prueba de que la perfección existe.',
            'Tu sonrisa ilumina más que el sol.',
            'Eres simplemente inolvidable.',
            'Hasta las estrellas te tienen envidia.',
            'Tienes una elegancia natural increíble.',
            'Eres una combinación perfecta.',
            'Tu mirada derrite corazones.',
            'Eres demasiado especial.',
            'Tu presencia alegra cualquier chat.',
            'Eres lo más bonito que vi hoy.',
            'Tus ojos tienen gravedad propia.',
            'Eres la definición de atractivo.',
            'Tienes una sonrisa legendaria.',
            'Eres un tesoro escondido.',
            'Tu belleza desafía la lógica.',
            'Eres un espectáculo visual.',
            'Tu mirada es adictiva.',
            'Eres un regalo para los ojos.',
            'Tienes una vibra increíble.',
            'Tu sonrisa merece un monumento.',
            'Eres más bonito que cualquier atardecer.',
            'Tienes el poder de alegrar corazones.',
            'Eres una joya única.',
            'Tu presencia cambia el ambiente.',
            'Eres imposible de reemplazar.',
            'Tienes una sonrisa que vale oro.',
            'Tu belleza es otro nivel.',
            'Eres más impresionante que una aurora.',
            'Tienes una mirada encantadora.',
            'Eres una maravilla de persona.',
            'Tu sonrisa debería ser protegida.',
            'Eres una obra de arte viviente.',
            'Tienes un encanto fuera de serie.',
            'Tu belleza rompe récords.',
            'Eres el tipo de persona que inspira canciones.',
            'Tienes una mirada que enamora.',
            'Eres más brillante que las estrellas.',
            'Tu sonrisa es pura felicidad.',
            'Eres una razón para sonreír.',
            'Tienes una belleza inolvidable.',
            'Eres un sueño hecho realidad.',
            'Tu mirada vale más que cualquier tesoro.',
            'Eres una persona extraordinaria.',
            'Tienes una energía hermosa.',
            'Eres simplemente espectacular.',
            'Tu sonrisa mejora cualquier día.',
            'Eres demasiado increíble.',
            'Tienes una belleza única.',
            'Eres el mejor accidente del universo.',
            'Tu mirada es poesía.',
            'Eres tan lindo que parece trampa.',
            'Tienes una sonrisa que enamora hasta al bot.',
            'Eres la mejor notificación que alguien podría recibir.',
            'Tu belleza debería tener límite de velocidad.',
            'Eres un 10 y todavía sobran puntos.',
            'Tienes más brillo que una galaxia completa.'

        ]

        const piropo = piropos[Math.floor(Math.random() * piropos.length)]

        const senderTag = `@${sender.split('@')[0]}`
        const targetTag = `@${target.split('@')[0]}`

        const text = `
╭━━━〔 💌 𝕻𝕴𝕽𝕺𝕻𝕺 💌 〕━━━⬣

${senderTag} le dedica a ${targetTag}:

✨ "${piropo}"

💖 Qué romántico...

╰━━━━━━━━━━━━━━━━⬣
`.trim()

        await sock.sendMessage(chatId, {
            text,
            mentions: [sender, target]
        }, { quoted: msg })

    } catch (error) {

        console.error('Error en piropo:', error)

        await sock.sendMessage(chatId, {
            text: '❌ Ocurrió un error usando el comando.'
        }, { quoted: msg })

    }

}

module.exports = piropoCommand
