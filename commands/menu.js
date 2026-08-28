const fs = require('fs')
const path = require('path')
const { ButtonV2 } = require('../lib/airich')

function formatUptime(seconds) {

    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    return `${h}h ${m}m ${s}s`
}

function buildIntroHeader(uptimeSeconds, version = '2.0.0') {
    const uptime = formatUptime(uptimeSeconds)
    return `╭────────────────────────────╮
│        𝕱𝖊𝖑𝖇𝖔𝖙 夜        │
├────────────────────────────┤
│ 👑 Fxlipe       ⚙️ v${version}
│ 📚 120 comandos  ⏳ ${uptime}
│ 📢 FELBOT 夜 | Canal oficial
╰────────────────────────────╯`
}

function buildMenuText(uptimeSeconds, version = '2.0.0') {
    const introHeader = buildIntroHeader(uptimeSeconds, version)
    const helpMessage = `
${introHeader}

╭━━〔 👑 OWNER 〕━━━━━━━━━━⬣
┃ Control y configuración del grupo.

❀ \`.felbot on\`
> Activar Felbot en el grupo.

❀ \`.felbot off\`
> Desactivar Felbot en el grupo.

╰━━━━━━━━━━━━━━━━⬣

╭━━〔 🌐 GENERAL 〕━━━━━━━━━⬣
┃ Información y herramientas principales.

❀ \`.menu\` › \`.help\`
> Mostrar el menú completo del bot.

❀ \`.ping\`
> Ver la velocidad y respuesta del bot.

❀ \`.alive\`
> Comprobar si el bot está activo.

❀ \.info\`
> Ver la información de los creadores.

❀ \`.owner\`
> Ver el contacto del creador del bot.

❀ \`.jid\`
> Obtener tu ID de WhatsApp.

❀ \`.groupinfo\`
> Mostrar información del grupo.

❀ \`.staff\` › \`.admins\`
> Ver la lista de administradores.
╰━━━━━━━━━━━━━━━━⬣

╭━━〔 🛠️ UTILIDADES 〕━━━━━━⬣
┃ Herramientas rápidas para el día a día.

❀ \`.tts\` + <texto>
> Convertir texto a voz.

❀ \`.trt\` + <texto>
> Traducir texto automáticamente.

❀ \`.vv\`
> Ver mensajes de visualización única.

❀ \`.8ball\` + <pregunta>
> Respuestas aleatorias tipo bola mágica.
╰━━━━━━━━━━━━━━━━⬣

╭━━〔 👮 ADMIN 〕━━━━━━━━━━⬣
┃ Moderación y gestión avanzada del grupo.

❀ \`.ban\` + <@usuario>
> Banear un usuario del bot.

❀ \`.unban\` + <@usuario>
> Desbanear un usuario del bot.

❀ \`.kick\` + <@usuario>
> Expulsar un miembro del grupo.

❀ \`.warn\` + <@usuario>
> Dar advertencias a un usuario.

❀ \`.warnings\` + <@usuario>
> Ver advertencias acumuladas.

❀ \`.mute\`
> Silenciar el grupo temporalmente.

❀ \`.unmute\`
> Volver a activar mensajes del grupo.

❀ \`.promote\` + <@usuario>
> Dar administrador a un usuario.

❀ \`.demote\` + <@usuario>
> Quitar administrador a un usuario.

❀ \`.delete\` › \`.del\`
> Eliminar mensajes enviados.

❀ \`.antilink\` on/off
> Activar o desactivar anti enlaces.

❀ \`.modoadmin\` on/off
> Activar o desactivar modo admin.

❀ \`.welcome\` on/off
> Activar o desactivar bienvenidas.

❀ \`.n\` + <texto>
> Mencionar a todos los miembros.

❀ \`.todos\`
> Etiquetar a todos los participantes.

❀ \`.setgname\` + <texto>
> Cambiar nombre del grupo.

❀ \`.setgpp\` + <imagen>
> Cambiar foto del grupo.

❀ \`.setgdesc\` + <texto>
> Cambiar descripción del grupo.

❀ \`.abrir\` 
> Abrir el grupo.

❀ \`.cerrar\` 
> Cerrar el grupo.
╰━━━━━━━━━━━━━━━━⬣

╭━━〔 🔫 FREE FIRE 〕━━━━━━⬣
┃ Organiza tus partidas y equipos.

❀ \`.2vs2\` + <hora>
> Lista de 2vs2.

❀ \`.4vs4\` + <hora>
> Lista de 4vs4.

❀ \`.6vs6\` + <hora>
> Lista de 6vs6.

❀ \`.int2\` 
> Lista de 2vs2 (interna).

❀ \`.int4\` 
> Lista de 4vs4 (interna).

❀ \`.int6\` 
> Lista de 6vs6 (interna).
╰━━━━━━━━━━━━━━━━⬣

╭━━〔 🔞 NSFW 〕━━━━━━━━━━━⬣
┃ Contenido para adultos.

❀ \`.xxnx\` + <texto>
> Busqueda porno (Para descarga).

❀ \`.follar\` + <@usuario>
> Follarse a un usuario.

❀ \`.cum\` + <@usuario>
> Cum sobre un usuario.

❀ \`.masturbarsef\` (Femenino)
> Masturbarse.

❀ \`.masturbarsem\` (Masculino)
> Masturbarse.
╰━━━━━━━━━━━━━━━━⬣

╭━━〔 🎨 STICKERS 〕━━━━━━━⬣
┃ Convierte imágenes, videos y texto.

❀ \`.s\`
> Convertir imagen o video en sticker.

❀ \`.crop\`
> Imagen-Video a stiker (centrado).

❀ \`.brat\`
> Convertir texto sticker.

❀ \`.wm\`
> Cambiar packname de un sticker.

❀ \`.attp\` + <texto>
> Crear sticker animado con texto.

❀ \`.emojimix\` + <emoji+emoji>
> Combinar emojis en stickers.

❀ \`.removebg\`
> Eliminar fondo de imágenes.
╰━━━━━━━━━━━━━━━━⬣

╭━━〔 🔤 TEXTMAKER 〕━━━━━━⬣
┃ Diseña textos con estilos especiales.

❀ \`.metallic\` + <texto>
> Texto metálico brillante.

❀ \`.ice\` + <texto>
> Texto congelado estilo hielo.

❀ \`.snow\` + <texto>
> Texto cubierto de nieve.

❀ \`.impressive\` + <texto>
> Texto impresionante decorado.

❀ \`.matrix\` + <texto>
> Texto estilo Matrix hacker.

❀ \`.light\` + <texto>
> Texto iluminado.

❀ \`.neon\` + <texto>
> Texto con efecto neón.

❀ \`.devil\` + <texto>
> Texto estilo demoníaco.

❀ \`.purple\` + <texto>
> Texto morado brillante.

❀ \`.thunder\` + <texto>
> Texto con rayos eléctricos.

❀ \`.leaves\` + <texto>
> Texto decorado con hojas.

❀ \`.1917\` + <texto>
> Texto estilo película 1917.

❀ \`.arena\` + <texto>
> Texto arena/desierto.

❀ \`.hacker\` + <texto>
> Texto hacker oscuro.

❀ \`.sand\` + <texto>
> Texto de arena caliente.

❀ \`.blackpink\` + <texto>
> Texto estilo BLACKPINK.

❀ \`.glitch\` + <texto>
> Texto con efecto glitch.

❀ \`.fire\` + <texto>
> Texto en llamas 🔥
╰━━━━━━━━━━━━━━━━⬣

╭━━〔 🖼️ ANIME 〕━━━━━━━━━━⬣
┃ Reacciones, gifs y diversión anime.

❀ \`.nom\`
> Comer cariñosamente a alguien.

❀ \`.poke\`
> Picar/molestar a alguien.

❀ \`.cry\`
> Llorar estilo anime.

❀ \`.besar\` + <@usuario>
> Besar a Usuario.

❀ \`.pat\`
> Dar palmadas en la cabeza.

❀ \`.hug\`
> Abrazar a alguien.

❀ \`.wink\`
> Guiñar el ojo.

❀ \`.facepalm\`
> Hacer facepalm anime.
╰━━━━━━━━━━━━━━━━⬣

╭━━〔 🎮 JUEGOS 〕━━━━━━━━━⬣
┃ Retos, partidas y entretenimiento.

❀ \`.tictactoe\`
> Jugar tres en raya.

❀ \`.hangman\`
> Jugar ahorcado.

❀ \`.guess\`
> Juego de adivinar palabras.

❀ \`.trivia\`
> Responder preguntas de trivia.

❀ \`.truth\`
> Preguntas de verdad.

❀ \`.dare\`
> Retos aleatorios.
╰━━━━━━━━━━━━━━━━⬣

╭━━〔 🎯 DIVERSIÓN 〕━━━━━━⬣
┃ Comandos sociales para compartir.

❀ \`.parejas\`
> Crear el top 5 de parejas del grupo.

❀ \`.compliment\` + <@usuario>
> Enviar cumplidos a alguien.

❀ \`.propuesta\` + <@usuario>
> Envia propuesta de matrimonio.

❀ \`.top\` + <texto>
> Top 5 (categoria).

❀ \`.piropo\` + <@usuario>
> Enviar piropos a alguien.

❀ \`.insult\` + <@usuario>
> Insultar amistosamente a alguien.

❀ \`.flirt\`
> Coquetear con un usuario.

❀ \`.ship\`
> Ver porcentaje de compatibilidad.

❀ \`.simp\` + <@usuario>
> Tarjeta Simp.

❀ \`.stupid\` + <@usuario>
> Estúpido del grupo.
╰━━━━━━━━━━━━━━━━⬣

╭━━〔 📥 DESCARGAS 〕━━━━━━⬣
┃ Encuentra y descarga contenido multimedia.

❀ \`.play\` + <nombre>
> Buscar y descargar música.

❀ \`.video\` + <nombre>
> Buscar y video de yt.

❀ \`.song\` + <nombre>
> Descargar canciones en mp3.

❀ \`.spotify\` + <link>
> Descargar audio de Spotify.

❀ \`.tiktok\` + <link>
> Descargar videos de TikTok.

❀ \`.facebook\` + <link>
> Descargar videos de Facebook.

❀ \`.instagram\` + <link>
> Descargar reels y publicaciones.

❀ \`.ytmp4\` + <link>
> Descargar videos de YouTube.
╰━━━━━━━━━━━━━━━━⬣

╭────────────────────────────╮
│     🚀 Powered by Fxlipe 夜  │
│      Usa .menu para volver   │
╰────────────────────────────╯`

    return `${helpMessage.trim()}`
}

function getMenuButtonAction(buttonId) {
    switch (buttonId) {
        case 'view_full_menu':
            return { type: 'send_full_menu' }
        default:
            return null
    }
}

async function handleMenuButton(sock, chatId, buttonId, message) {
    const action = getMenuButtonAction(buttonId)
    if (!action) return false

    if (action.type === 'send_full_menu') {
        const fullMenu = buildMenuText(process.uptime(), '2.0.0')
        await sock.sendMessage(chatId, { text: fullMenu }, { quoted: message })
        return true
    }

    return false
}

async function helpCommand(sock, chatId, message) {

    const fullMenu = buildMenuText(process.uptime(), '2.0.0')
    const introCaption = `${buildIntroHeader(process.uptime(), '2.0.0')}

Bienvenido a Felbot 夜.
    Herramientas, administración y entretenimiento en un solo lugar.

    👇 Elige una opción para continuar.`

    try {
        const imagePath = path.join(__dirname, '..', 'assets', 'imagenes', 'admin', 'admin.png')
        const imageBuffer = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : null

        if (imageBuffer) {
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                mimetype: 'image/png',
                caption: introCaption
            }, { quoted: message })
        }

        const buttonMenu = new ButtonV2(sock)
            .setBody('Todo listo. Elige una opción para explorar Felbot 夜.')
            .setFooter('FelbotC • Menú interactivo')
            .addButton('📚 VER COMANDOS', 'view_full_menu')
            .addButton('👑 CONTACTAR OWNER', 'owner')
            .addButton('🐞 REPORTAR ERROR', 'report_error')
            .addButton('🕸️ SOLICITAR COMANDO', 'request_command')
            .addButton('💵 ADQUIRIR BOT', 'buy_bot')

        await buttonMenu.send(chatId, { quoted: message })
    } catch (error) {
        console.error(error)
        await sock.sendMessage(chatId, {
            text: fullMenu,
        }, { quoted: message })
    }
}

helpCommand.buildMenuText = buildMenuText
helpCommand.getMenuButtonAction = getMenuButtonAction
helpCommand.handleMenuButton = handleMenuButton
module.exports = helpCommand
module.exports.buildMenuText = buildMenuText
module.exports.getMenuButtonAction = getMenuButtonAction
module.exports.handleMenuButton = handleMenuButton