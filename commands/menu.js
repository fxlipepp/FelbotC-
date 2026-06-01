const fs = require('fs')
const path = require('path')

function formatUptime(seconds) {

    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    return `${h}h ${m}m ${s}s`
}

async function helpCommand(sock, chatId, message) {

    const uptime = formatUptime(process.uptime())
    const version = '2.0.0'

    const videoPath = path.join('assets', 'gifs', 'menu', 'menu.mp4')

    const helpMessage = `
╭━━━〔 𝕱𝖊𝖑𝖇𝖔𝖙 夜 〕━━━⬣
┃ 👑 Creador: Fxlipe 夜
┃ ⚙️ Versión: v${version}
┃ ⏳ Uptime: ${uptime}
┃ 📢 Canal Oficial:
┃ ✧ FELBOT 夜 | Oficial ✧
╰━━━━━━━━━━━━━━━━⬣

╭━━〔 👑 OWNER 〕━━⬣
> ✦ Comandos de administracion.

❀ \`.felbot on\`
> Activar Felbot en el grupo.

❀ \`.felbot off\`
> Desactivar Felbot en el grupo.

╰━━━━━━━━━━━━━━━━⬣

╭━━〔 🌐 GENERAL 〕━━⬣
> ✦ Comandos principales e información del bot.

❀ \`.menu\` › \`.help\`
> Mostrar el menú completo del bot.

❀ \`.ping\`
> Ver la velocidad y respuesta del bot.

❀ \`.alive\`
> Comprobar si el bot está activo.

❀ \`.owner\`
> Ver el contacto del creador del bot.

❀ \`.jid\`
> Obtener tu ID de WhatsApp.

❀ \`.groupinfo\`
> Mostrar información del grupo.

❀ \`.staff\` › \`.admins\`
> Ver la lista de administradores.
╰━━━━━━━━━━━━━━━━⬣

╭━━〔 🛠️ UTILIDADES 〕━━⬣
> ✦ Herramientas útiles y funciones extras.

❀ \`.tts\` + <texto>
> Convertir texto a voz.

❀ \`.trt\` + <texto>
> Traducir texto automáticamente.

❀ \`.vv\`
> Ver mensajes de visualización única.

❀ \`.8ball\` + <pregunta>
> Respuestas aleatorias tipo bola mágica.
╰━━━━━━━━━━━━━━━━⬣

╭━━〔 👮 ADMIN 〕━━⬣
> ✦ Herramientas de administración para grupos.

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

╭━━〔 🔫 FREE FIRE 〕━━⬣
> ✦ Comandos para ff.

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

╭━━〔 🔞 NSFW 〕━━⬣
> ✦ Comandos Pornograficos .

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

╭━━〔 🎨 STICKERS 〕━━⬣
> ✦ Herramientas de stickers e imágenes.

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

╭━━〔 🔤 TEXTMAKER 〕━━⬣
> ✦ Crear textos con estilos épicos.

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

╭━━〔 🖼️ ANIME 〕━━⬣
> ✦ Reacciones y gifs estilo anime.

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

╭━━〔 🎮 JUEGOS 〕━━⬣
> ✦ Juegos y entretenimiento interactivo.

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

╭━━〔 🎯 DIVERSIÓN 〕━━⬣
> ✦ Comandos divertidos y sociales.

❀ \`.compliment\` + <@usuario>
> Enviar cumplidos a alguien.

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

╭━━〔 📥 DESCARGAS 〕━━⬣
> ✦ Descargar contenido multimedia.

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

╭━〔  𝕱𝖊𝖑𝖇𝖔𝖙 夜  〕━⬣
> *🚀 Powered By Fxlipe 夜*
╰━━━━━━━━━━━━⬣
`

    try {

        if (fs.existsSync(videoPath)) {

            const videoBuffer = fs.readFileSync(videoPath)

            await sock.sendMessage(chatId, {
                video: videoBuffer,
                gifPlayback: true,
                caption: helpMessage,

                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,

                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363409628624676@newsletter',
                        newsletterName: '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 𝕮𝖍𝖆𝖓𝖓𝖊𝖑 ✧'
                    }
                }

            }, { quoted: message })

        } else {

            await sock.sendMessage(chatId, {
                text: helpMessage,

                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,

                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363409628624676@newsletter',
                        newsletterName: '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 𝕮𝖍𝖆𝖓𝖓𝖊𝖑 ✧'
                    }
                }

            }, { quoted: message })
        }

    } catch (error) {

        console.error(error)

        await sock.sendMessage(chatId, {
            text: helpMessage
        }, { quoted: message })
    }
}

module.exports = helpCommand