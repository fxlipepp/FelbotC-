const fs = require('fs')
const path = require('path')
const {
    generateWAMessageFromContent,
    prepareWAMessageMedia
} = require('@whiskeysockets/baileys')

const WEB_URL = 'https://fxlipe.skyultraplus.online/'

function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    return `${h}h ${m}m ${s}s`
}

function buildIntroHeader(uptimeSeconds, version = '2.0.0') {
    const uptime = formatUptime(uptimeSeconds)

    return `╭━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
│
│          𝕱𝖊𝖑𝖇𝖔𝖙 夜
│          WHATSAPP SYSTEM
│
├──────────────────────────⬣
│ 👑 Creador  • Fxlipe 夜
│ ⚙️ Versión  • v${version}
│ 📚 Comandos • 120
│ ⏳ Uptime   • ${uptime}
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`
}

function buildMenuText(uptimeSeconds, version = '2.0.0') {

    const introHeader =
        buildIntroHeader(
            uptimeSeconds,
            version
        )

    const helpMessage = `${introHeader}

╭━━〔 👑 OWNER 〕━━⬣
│
│ ✦ Comandos de administración.
│
│ ❀ \`.felbot on\`
│   Activar Felbot en el grupo.
│
│ ❀ \`.felbot off\`
│   Desactivar Felbot en el grupo.
│
╰━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━〔 🌐 GENERAL 〕━━⬣
│
│ ✦ Comandos principales e información.
│
│ ❀ \`.menu\` › \`.help\`
│   Mostrar el menú completo del bot.
│
│ ❀ \`.ping\`
│   Ver la velocidad y respuesta del bot.
│
│ ❀ \`.alive\`
│   Comprobar si el bot está activo.
│
│ ❀ \`.info\`
│   Ver la información de los creadores.
│
│ ❀ \`.owner\`
│   Ver el contacto del creador.
│
│ ❀ \`.jid\`
│   Obtener tu ID de WhatsApp.
│
│ ❀ \`.groupinfo\`
│   Mostrar información del grupo.
│
│ ❀ \`.staff\` › \`.admins\`
│   Ver la lista de administradores.
│
╰━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━〔 🛠️ UTILIDADES 〕━━⬣
│
│ ✦ Herramientas y funciones extras.
│
│ ❀ \`.tts\` + <texto>
│   Convertir texto a voz.
│
│ ❀ \`.trt\` + <texto>
│   Traducir texto automáticamente.
│
│ ❀ \`.vv\`
│   Ver mensajes de visualización única.
│
│ ❀ \`.8ball\` + <pregunta>
│   Respuestas tipo bola mágica.
│
╰━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━〔 👮 ADMIN 〕━━⬣
│
│ ✦ Herramientas para administrar grupos.
│
│ ❀ \`.ban\` + <@usuario>
│   Banear un usuario del bot.
│
│ ❀ \`.unban\` + <@usuario>
│   Desbanear un usuario del bot.
│
│ ❀ \`.kick\` + <@usuario>
│   Expulsar un miembro del grupo.
│
│ ❀ \`.warn\` + <@usuario>
│   Dar advertencias a un usuario.
│
│ ❀ \`.warnings\` + <@usuario>
│   Ver advertencias acumuladas.
│
│ ❀ \`.mute\`
│   Silenciar el grupo temporalmente.
│
│ ❀ \`.unmute\`
│   Volver a activar mensajes.
│
│ ❀ \`.promote\` + <@usuario>
│   Dar administrador a un usuario.
│
│ ❀ \`.demote\` + <@usuario>
│   Quitar administrador a un usuario.
│
│ ❀ \`.delete\` › \`.del\`
│   Eliminar mensajes enviados.
│
│ ❀ \`.antilink\` on/off
│   Activar o desactivar anti enlaces.
│
│ ❀ \`.modoadmin\` on/off
│   Activar o desactivar modo admin.
│
│ ❀ \`.welcome\` on/off
│   Activar o desactivar bienvenidas.
│
│ ❀ \`.setwelcome\`
│   Configurar audio de bienvenida.
│
│ ❀ \`.resetwelcome\`
│   Eliminar audio de bienvenida.
│
│ ❀ \`.setbye\`
│   Configurar audio de despedida.
│
│ ❀ \`.resetbye\`
│   Eliminar audio de despedida.
│
│ ❀ \`.n\` + <texto>
│   Mencionar a todos los miembros.
│
│ ❀ \`.todos\`
│   Etiquetar a todos los participantes.
│
│ ❀ \`.setgname\` + <texto>
│   Cambiar nombre del grupo.
│
│ ❀ \`.setgpp\` + <imagen>
│   Cambiar foto del grupo.
│
│ ❀ \`.setgdesc\` + <texto>
│   Cambiar descripción del grupo.
│
│ ❀ \`.abrir\`
│   Abrir el grupo.
│
│ ❀ \`.cerrar\`
│   Cerrar el grupo.
│
╰━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━〔 🔫 FREE FIRE 〕━━⬣
│
│ ✦ Comandos para Free Fire.
│
│ ❀ \`.2vs2\` + <hora>
│   Lista de 2vs2.
│
│ ❀ \`.4vs4\` + <hora>
│   Lista de 4vs4.
│
│ ❀ \`.6vs6\` + <hora>
│   Lista de 6vs6.
│
│ ❀ \`.int2\`
│   Lista interna de 2vs2.
│
│ ❀ \`.int4\`
│   Lista interna de 4vs4.
│
│ ❀ \`.int6\`
│   Lista interna de 6vs6.
│
╰━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━〔 🔞 NSFW 〕━━⬣
│
│ ✦ Comandos para contenido adulto.
│
│ ❀ \`.xxnx\` + <texto>
│   Búsqueda para descarga.
│
│ ❀ \`.follar\` + <@usuario>
│   Comando de interacción.
│
│ ❀ \`.cum\` + <@usuario>
│   Comando de interacción.
│
│ ❀ \`.masturbarsef\`
│   Comando de interacción femenina.
│
│ ❀ \`.masturbarsem\`
│   Comando de interacción masculina.
│
╰━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━〔 🎨 STICKERS 〕━━⬣
│
│ ✦ Herramientas de stickers e imágenes.
│
│ ❀ \`.s\`
│   Convertir imagen o video en sticker.
│
│ ❀ \`.crop\`
│   Imagen o video a sticker centrado.
│
│ ❀ \`.brat\`
│   Convertir texto en sticker.
│
│ ❀ \`.wm\`
│   Cambiar packname de un sticker.
│
│ ❀ \`.attp\` + <texto>
│   Crear sticker animado con texto.
│
│ ❀ \`.emojimix\` + <emoji+emoji>
│   Combinar emojis en stickers.
│
│ ❀ \`.removebg\`
│   Eliminar fondo de imágenes.
│
╰━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━〔 🔤 TEXTMAKER 〕━━⬣
│
│ ✦ Crear textos con estilos.
│
│ ❀ \`.metallic\` + <texto>
│   Texto metálico brillante.
│
│ ❀ \`.ice\` + <texto>
│   Texto congelado estilo hielo.
│
│ ❀ \`.snow\` + <texto>
│   Texto cubierto de nieve.
│
│ ❀ \`.impressive\` + <texto>
│   Texto impresionante decorado.
│
│ ❀ \`.matrix\` + <texto>
│   Texto estilo Matrix hacker.
│
│ ❀ \`.light\` + <texto>
│   Texto iluminado.
│
│ ❀ \`.neon\` + <texto>
│   Texto con efecto neón.
│
│ ❀ \`.devil\` + <texto>
│   Texto estilo demoníaco.
│
│ ❀ \`.purple\` + <texto>
│   Texto morado brillante.
│
│ ❀ \`.thunder\` + <texto>
│   Texto con rayos eléctricos.
│
│ ❀ \`.parejas\`
│   Texto decorado con hojas.
│
│ ❀ \`.1917\` + <texto>
│   Texto estilo película 1917.
│
│ ❀ \`.arena\` + <texto>
│   Texto arena/desierto.
│
│ ❀ \`.hacker\` + <texto>
│   Texto hacker oscuro.
│
│ ❀ \`.sand\` + <texto>
│   Texto de arena caliente.
│
│ ❀ \`.blackpink\` + <texto>
│   Texto estilo BLACKPINK.
│
│ ❀ \`.glitch\` + <texto>
│   Texto con efecto glitch.
│
│ ❀ \`.fire\` + <texto>
│   Texto en llamas.
│
╰━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━〔 🖼️ ANIME 〕━━⬣
│
│ ✦ Reacciones y gifs estilo anime.
│
│ ❀ \`.nom\`
│   Comer cariñosamente a alguien.
│
│ ❀ \`.poke\`
│   Picar o molestar a alguien.
│
│ ❀ \`.cry\`
│   Llorar estilo anime.
│
│ ❀ \`.besar\` + <@usuario>
│   Besar a un usuario.
│
│ ❀ \`.pat\`
│   Dar palmadas en la cabeza.
│
│ ❀ \`.hug\`
│   Abrazar a alguien.
│
│ ❀ \`.wink\`
│   Guiñar el ojo.
│
│ ❀ \`.facepalm\`
│   Hacer facepalm anime.
│
╰━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━〔 🎮 JUEGOS 〕━━⬣
│
│ ✦ Juegos y entretenimiento interactivo.
│
│ ❀ \`.ppt\` + <@usuario>
│   Piedra, papel o tijera.
│
│ ❀ \`.dados\`
│   Lanzar dos dados.
│
│ ❀ \`.moneda\` + cara/cruz
│   Cara o cruz.
│
│ ❀ \`.ruleta\` [@usuario]
│   Ruleta aleatoria recreativa.
│
│ ❀ \`.8ball\` + <pregunta>
│   Consultar la bola mágica.
│
│ ❀ \`.adivina\` [categoria]
│   Adivinar una palabra.
│
│ ❀ \`.quiz\`
│   Preguntas y respuestas.
│
│ ❀ \`.duelo\` + <@usuario>
│   Duelo entre usuarios.
│
│ ❀ \`.blackjack\`
│   Jugar blackjack.
│
│ ❀ \`.slots\`
│   Máquina tragamonedas recreativa.
│
│ ❀ \`.memoria\`
│   Juego de memoria.
│
│ ❀ \`.tictactoe\`
│   Jugar tres en raya.
│
│ ❀ \`.hangman\`
│   Jugar ahorcado.
│
│ ❀ \`.guess\`
│   Juego de adivinar palabras.
│
│ ❀ \`.trivia\`
│   Responder preguntas de trivia.
│
│ ❀ \`.truth\`
│   Preguntas de verdad.
│
│ ❀ \`.dare\`
│   Retos aleatorios.
│
│ ❀ \`.perfil\`
│   Ver tus estadísticas.
│
│ ❀ \`.rank\`
│   Ranking de jugadores.
│
╰━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━〔 🎯 DIVERSIÓN 〕━━⬣
│
│ ✦ Comandos divertidos y sociales.
│
│ ❀ \`.Parejas\`
│   Top 5 parejas del grupo.
│
│ ❀ \`.compliment\` + <@usuario>
│   Enviar cumplidos a alguien.
│
│ ❀ \`.propuesta\` + <@usuario>
│   Enviar propuesta de matrimonio.
│
│ ❀ \`.divorcio\` + <@usuario>
│   Finalizar un matrimonio activo.
│
│ ❀ \`.top\` + <texto>
│   Top 5 de una categoría.
│
│ ❀ \`.piropo\` + <@usuario>
│   Enviar piropos a alguien.
│
│ ❀ \`.insult\` + <@usuario>
│   Insultar amistosamente.
│
│ ❀ \`.flirt\`
│   Coquetear con un usuario.
│
│ ❀ \`.ship\`
│   Ver porcentaje de compatibilidad.
│
│ ❀ \`.simp\` + <@usuario>
│   Tarjeta Simp.
│
│ ❀ \`.stupid\` + <@usuario>
│   Estúpido del grupo.
│
╰━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━〔 📥 DESCARGAS 〕━━⬣
│
│ ✦ Descargar contenido multimedia.
│
│ ❀ \`.play\` + <nombre>
│   Buscar y descargar música.
│
│ ❀ \`.video\` + <nombre>
│   Buscar y descargar videos de YouTube.
│
│ ❀ \`.song\` + <nombre>
│   Descargar canciones en MP3.
│
│ ❀ \`.spotify\` + <link>
│   Descargar audio de Spotify.
│
│ ❀ \`.tiktok\` + <link>
│   Descargar videos de TikTok.
│
│ ❀ \`.facebook\` + <link>
│   Descargar videos de Facebook.
│
│ ❀ \`.instagram\` + <link>
│   Descargar reels y publicaciones.
│
│ ❀ \`.ytmp4\` + <link>
│   Descargar videos de YouTube.
│
╰━━━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
│
│          𝕱𝖊𝖑𝖇𝖔𝖙 夜
│
│          POWERED BY FXLIPE 夜
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`

    return helpMessage.trim()
}

/* =========================================================
   ACCIONES DE LOS BOTONES
========================================================= */

function getMenuButtonAction(buttonId) {

    switch (buttonId) {

        case 'view_full_menu':
            return {
                type: 'send_full_menu'
            }

        default:
            return null
    }
}

/* =========================================================
   MANEJADOR DE BOTONES
========================================================= */

async function handleMenuButton(
    sock,
    chatId,
    buttonId,
    message
) {

    const action =
        getMenuButtonAction(buttonId)

    if (!action) return false

    if (action.type === 'send_full_menu') {

        const fullMenu =
            buildMenuText(
                process.uptime(),
                '2.0.0'
            )

        await sock.sendMessage(
            chatId,
            {
                text: fullMenu
            },
            {
                quoted: message
            }
        )

        return true
    }

    return false
}

/* =========================================================
   COMANDO MENU
========================================================= */

async function helpCommand(
    sock,
    chatId,
    message
) {

    const introCaption = `${buildIntroHeader(
        process.uptime(),
        '2.0.0'
    )}

╭──────────────────────────⬣
│
│ Bienvenido a 𝕱𝖊𝖑𝖇𝖔𝖙 夜.
│
│ Herramientas, administración,
│ entretenimiento y mucho más.
│
│ Selecciona una opción abajo.
│
╰──────────────────────────⬣`

    try {

        const imagePath = path.join(
            __dirname,
            '..',
            'assets',
            'imagenes',
            'admin',
            'admin.png'
        )

        if (!fs.existsSync(imagePath)) {
            throw new Error(
                'Menu image not found'
            )
        }

        const imageBuffer =
            fs.readFileSync(imagePath)

        const preparedImage =
            await prepareWAMessageMedia(
                {
                    image: imageBuffer
                },
                {
                    upload:
                        sock.waUploadToServer
                }
            )

        /*
         * 𝕱𝖊𝖑𝖇𝖔𝖙 夜
         * Se muestra como el primer elemento
         * interactivo y abre directamente la web.
         *
         * No se muestra la URL.
         */

        const buttons = [

            {
                name: 'cta_url',

                buttonParamsJson:
                    JSON.stringify({
                        display_text:
                            '𝕱𝖊𝖑𝖇𝖔𝖙 夜',

                        url:
                            WEB_URL
                    })
            },

            {
                name: 'quick_reply',

                buttonParamsJson:
                    JSON.stringify({
                        display_text:
                            'VER MENU COMPLETO',

                        id:
                            'view_full_menu'
                    })
            },

            {
                name: 'quick_reply',

                buttonParamsJson:
                    JSON.stringify({
                        display_text:
                            'CONTACTAME 夜',

                        id:
                            'owner'
                    })
            },

            {
                name: 'quick_reply',

                buttonParamsJson:
                    JSON.stringify({
                        display_text:
                            'REPORTAR ERROR ❗',

                        id:
                            'report_error'
                    })
            },

            {
                name: 'quick_reply',

                buttonParamsJson:
                    JSON.stringify({
                        display_text:
                            'SOLICITUD DE COMANDO 🕸️',

                        id:
                            'request_command'
                    })
            },

            {
                name: 'quick_reply',

                buttonParamsJson:
                    JSON.stringify({
                        display_text:
                            'ADQUIRIR BOT 💵',

                        id:
                            'buy_bot'
                    })
            }
        ]

        const menuMessage =
            generateWAMessageFromContent(
                chatId,
                {
                    interactiveMessage: {

                        header: {
                            title:
                                '𝕱𝖊𝖑𝖇𝖔𝖙 夜',

                            subtitle:
                                'STREET SYSTEM',

                            hasMediaAttachment:
                                true,

                            ...preparedImage
                        },

                        body: {
                            text:
                                introCaption
                        },

                        footer: {
                            text:
                                '𝕱𝖊𝖑𝖇𝖔𝖙 夜 • Fxlipe 夜'
                        },

                        nativeFlowMessage: {

                            buttons,

                            messageParamsJson:
                                ''
                        }
                    }
                },
                {
                    quoted:
                        message
                }
            )

        await sock.relayMessage(
            menuMessage.key.remoteJid,
            menuMessage.message,
            {
                messageId:
                    menuMessage.key.id,

                additionalNodes: [
                    {
                        tag:
                            'biz',

                        attrs:
                            {},

                        content: [
                            {
                                tag:
                                    'interactive',

                                attrs: {
                                    type:
                                        'native_flow',

                                    v:
                                        '1'
                                },

                                content: [
                                    {
                                        tag:
                                            'native_flow',

                                        attrs: {
                                            v:
                                                '9',

                                            name:
                                                'mixed'
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        )

    } catch (error) {

        console.error(
            'MENU ERROR:',
            error
        )

        await sock.sendMessage(
            chatId,
            {
                text:
                    introCaption
            },
            {
                quoted:
                    message
            }
        )
    }
}

/* =========================================================
   EXPORTS
========================================================= */

helpCommand.buildMenuText =
    buildMenuText

helpCommand.getMenuButtonAction =
    getMenuButtonAction

helpCommand.handleMenuButton =
    handleMenuButton

module.exports =
    helpCommand

module.exports.buildMenuText =
    buildMenuText

module.exports.getMenuButtonAction =
    getMenuButtonAction

module.exports.handleMenuButton =
    handleMenuButton