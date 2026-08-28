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

    return `︶꒦꒷━━━━━━━ 𓆩 𝕱𝖊𝖑𝖇𝖔𝖙 夜 𓆪 ━━━━━━━꒷꒦︶

𓆩 👑 𓆪 Creador  ╰┈➤ Fxlipe 夜
𓆩 ⚙️ 𓆪 Versión  ╰┈➤ v${version}
𓆩 📚 𓆪 Comandos ╰┈➤ 120+
𓆩 ⏳ 𓆪 Uptime   ╰┈➤ ${uptime}

𓆩 📢 𓆪 Canal Oficial
╰┈➤ ✧ FELBOT 夜 | Oficial ✧

︶꒦꒷━━━━━━━━━━━━━━━━━━꒷꒦︶`
}

function buildMenuText(uptimeSeconds, version = '2.0.0') {
    const header = buildIntroHeader(uptimeSeconds, version)

    return `${header}

𓆩━━━━━━━━〔 👑 OWNER 〕━━━━━━━━𓆪

𓆩✦𓆪 Comandos de administración principal.

╰┈➤ ❀ .felbot on
     𓆩 Activar Felbot en el grupo.

╰┈➤ ❀ .felbot off
     𓆩 Desactivar Felbot en el grupo.

︶꒦꒷━━━━━━━━༺✦༻━━━━━━━━꒷꒦︶


𓆩━━━━━━━━〔 🌐 GENERAL 〕━━━━━━━━𓆪

𓆩✦𓆪 Información y comandos principales.

╰┈➤ ❀ .menu › .help
     𓆩 Mostrar el menú completo.

╰┈➤ ❀ .ping
     𓆩 Ver velocidad y respuesta.

╰┈➤ ❀ .alive
     𓆩 Comprobar si el bot está activo.

╰┈➤ ❀ .info
     𓆩 Ver información de los creadores.

╰┈➤ ❀ .owner
     𓆩 Ver el contacto del creador.

╰┈➤ ❀ .jid
     𓆩 Obtener tu ID de WhatsApp.

╰┈➤ ❀ .groupinfo
     𓆩 Mostrar información del grupo.

╰┈➤ ❀ .staff › .admins
     𓆩 Ver lista de administradores.

︶꒦꒷━━━━━━━━༺✦༻━━━━━━━━꒷꒦︶


𓆩━━━━━━━━〔 🛠️ UTILIDADES 〕━━━━━━━━𓆪

𓆩✦𓆪 Herramientas y funciones extras.

╰┈➤ ❀ .tts + <texto>
     𓆩 Convertir texto a voz.

╰┈➤ ❀ .trt + <texto>
     𓆩 Traducir texto automáticamente.

╰┈➤ ❀ .vv
     𓆩 Ver mensajes de visualización única.

╰┈➤ ❀ .8ball + <pregunta>
     𓆩 Respuestas de bola mágica.

︶꒦꒷━━━━━━━━༺✦༻━━━━━━━━꒷꒦︶


𓆩━━━━━━━━〔 👮 ADMIN 〕━━━━━━━━𓆪

𓆩✦𓆪 Herramientas de administración para grupos.

╰┈➤ ❀ .ban + <@usuario>
     𓆩 Banear un usuario del bot.

╰┈➤ ❀ .unban + <@usuario>
     𓆩 Desbanear un usuario.

╰┈➤ ❀ .kick + <@usuario>
     𓆩 Expulsar un miembro del grupo.

╰┈➤ ❀ .warn + <@usuario>
     𓆩 Dar una advertencia.

╰┈➤ ❀ .warnings + <@usuario>
     𓆩 Ver advertencias acumuladas.

╰┈➤ ❀ .mute
     𓆩 Silenciar el grupo temporalmente.

╰┈➤ ❀ .unmute
     𓆩 Volver a activar mensajes.

╰┈➤ ❀ .promote + <@usuario>
     𓆩 Dar administrador.

╰┈➤ ❀ .demote + <@usuario>
     𓆩 Quitar administrador.

╰┈➤ ❀ .delete › .del
     𓆩 Eliminar mensajes enviados.

╰┈➤ ❀ .antilink on/off
     𓆩 Activar o desactivar anti enlaces.

╰┈➤ ❀ .modoadmin on/off
     𓆩 Activar o desactivar modo admin.

╰┈➤ ❀ .welcome on/off
     𓆩 Activar o desactivar bienvenidas.

╰┈➤ ❀ .n + <texto>
     𓆩 Mencionar a todos los miembros.

╰┈➤ ❀ .todos
     𓆩 Etiquetar a todos los participantes.

╰┈➤ ❀ .setgname + <texto>
     𓆩 Cambiar nombre del grupo.

╰┈➤ ❀ .setgpp + <imagen>
     𓆩 Cambiar foto del grupo.

╰┈➤ ❀ .setgdesc + <texto>
     𓆩 Cambiar descripción del grupo.

╰┈➤ ❀ .abrir
     𓆩 Abrir el grupo.

╰┈➤ ❀ .cerrar
     𓆩 Cerrar el grupo.

︶꒦꒷━━━━━━━━༺✦༻━━━━━━━━꒷꒦︶


𓆩━━━━━━━━〔 🔫 FREE FIRE 〕━━━━━━━━𓆪

𓆩✦𓆪 Comandos para Free Fire.

╰┈➤ ❀ .2vs2 + <hora>
     𓆩 Lista de 2vs2.

╰┈➤ ❀ .4vs4 + <hora>
     𓆩 Lista de 4vs4.

╰┈➤ ❀ .6vs6 + <hora>
     𓆩 Lista de 6vs6.

╰┈➤ ❀ .int2
     𓆩 Lista interna de 2vs2.

╰┈➤ ❀ .int4
     𓆩 Lista interna de 4vs4.

╰┈➤ ❀ .int6
     𓆩 Lista interna de 6vs6.

︶꒦꒷━━━━━━━━༺✦༻━━━━━━━━꒷꒦︶


𓆩━━━━━━━━〔 🎨 STICKERS 〕━━━━━━━━𓆪

𓆩✦𓆪 Herramientas de stickers e imágenes.

╰┈➤ ❀ .s
     𓆩 Convertir imagen o video en sticker.

╰┈➤ ❀ .crop
     𓆩 Imagen/video a sticker centrado.

╰┈➤ ❀ .brat
     𓆩 Convertir texto en sticker.

╰┈➤ ❀ .wm
     𓆩 Cambiar packname de un sticker.

╰┈➤ ❀ .attp + <texto>
     𓆩 Crear sticker animado con texto.

╰┈➤ ❀ .emojimix + <emoji+emoji>
     𓆩 Combinar emojis en stickers.

╰┈➤ ❀ .removebg
     𓆩 Eliminar fondo de imágenes.

︶꒦꒷━━━━━━━━༺✦༻━━━━━━━━꒷꒦︶


𓆩━━━━━━━━〔 🔤 TEXTMAKER 〕━━━━━━━━𓆪

𓆩✦𓆪 Crea textos con estilos especiales.

╰┈➤ ❀ .metallic + <texto>
     𓆩 Texto metálico brillante.

╰┈➤ ❀ .ice + <texto>
     𓆩 Texto congelado estilo hielo.

╰┈➤ ❀ .snow + <texto>
     𓆩 Texto cubierto de nieve.

╰┈➤ ❀ .impressive + <texto>
     𓆩 Texto impresionante decorado.

╰┈➤ ❀ .matrix + <texto>
     𓆩 Texto estilo Matrix.

╰┈➤ ❀ .light + <texto>
     𓆩 Texto iluminado.

╰┈➤ ❀ .neon + <texto>
     𓆩 Texto con efecto neón.

╰┈➤ ❀ .devil + <texto>
     𓆩 Texto estilo demoníaco.

╰┈➤ ❀ .purple + <texto>
     𓆩 Texto morado brillante.

╰┈➤ ❀ .thunder + <texto>
     𓆩 Texto con rayos eléctricos.

╰┈➤ ❀ .leaves + <texto>
     𓆩 Texto decorado con hojas.

╰┈➤ ❀ .1917 + <texto>
     𓆩 Texto estilo película 1917.

╰┈➤ ❀ .arena + <texto>
     𓆩 Texto estilo arena/desierto.

╰┈➤ ❀ .hacker + <texto>
     𓆩 Texto estilo hacker oscuro.

╰┈➤ ❀ .sand + <texto>
     𓆩 Texto de arena caliente.

╰┈➤ ❀ .blackpink + <texto>
     𓆩 Texto estilo BLACKPINK.

╰┈➤ ❀ .glitch + <texto>
     𓆩 Texto con efecto glitch.

╰┈➤ ❀ .fire + <texto>
     𓆩 Texto en llamas 🔥

︶꒦꒷━━━━━━━━༺✦༻━━━━━━━━꒷꒦︶


𓆩━━━━━━━━〔 🖼️ ANIME 〕━━━━━━━━𓆪

𓆩✦𓆪 Reacciones y gifs estilo anime.

╰┈➤ ❀ .nom
     𓆩 Comer cariñosamente a alguien.

╰┈➤ ❀ .poke
     𓆩 Picar/molestar a alguien.

╰┈➤ ❀ .cry
     𓆩 Llorar estilo anime.

╰┈➤ ❀ .besar + <@usuario>
     𓆩 Besar a un usuario.

╰┈➤ ❀ .pat
     𓆩 Dar palmadas en la cabeza.

╰┈➤ ❀ .hug
     𓆩 Abrazar a alguien.

╰┈➤ ❀ .wink
     𓆩 Guiñar el ojo.

╰┈➤ ❀ .facepalm
     𓆩 Hacer facepalm anime.

︶꒦꒷━━━━━━━━༺✦༻━━━━━━━━꒷꒦︶


𓆩━━━━━━━━〔 🎮 JUEGOS 〕━━━━━━━━𓆪

𓆩✦𓆪 Juegos y entretenimiento interactivo.

╰┈➤ ❀ .tictactoe
     𓆩 Jugar tres en raya.

╰┈➤ ❀ .hangman
     𓆩 Jugar ahorcado.

╰┈➤ ❀ .guess
     𓆩 Juego de adivinar palabras.

╰┈➤ ❀ .trivia
     𓆩 Responder preguntas de trivia.

╰┈➤ ❀ .truth
     𓆩 Preguntas de verdad.

╰┈➤ ❀ .dare
     𓆩 Retos aleatorios.

︶꒦꒷━━━━━━━━༺✦༻━━━━━━━━꒷꒦︶


𓆩━━━━━━━━〔 🎯 DIVERSIÓN 〕━━━━━━━━𓆪

𓆩✦𓆪 Comandos sociales y entretenimiento.

╰┈➤ ❀ .parejas
     𓆩 Top 5 parejas del grupo.

╰┈➤ ❀ .compliment + <@usuario>
     𓆩 Enviar cumplidos.

╰┈➤ ❀ .propuesta + <@usuario>
     𓆩 Enviar propuesta de matrimonio.

╰┈➤ ❀ .top + <texto>
     𓆩 Crear un Top 5.

╰┈➤ ❀ .piropo + <@usuario>
     𓆩 Enviar piropos.

╰┈➤ ❀ .insult + <@usuario>
     𓆩 Insultar amistosamente.

╰┈➤ ❀ .flirt
     𓆩 Coquetear con un usuario.

╰┈➤ ❀ .ship
     𓆩 Ver porcentaje de compatibilidad.

╰┈➤ ❀ .simp + <@usuario>
     𓆩 Mostrar tarjeta Simp.

╰┈➤ ❀ .stupid + <@usuario>
     𓆩 Usuario más despistado.

︶꒦꒷━━━━━━━━༺✦༻━━━━━━━━꒷꒦︶


𓆩━━━━━━━━〔 📥 DESCARGAS 〕━━━━━━━━𓆪

𓆩✦𓆪 Descarga contenido multimedia.

╰┈➤ ❀ .play + <nombre>
     𓆩 Buscar y descargar música.

╰┈➤ ❀ .video + <nombre>
     𓆩 Buscar y descargar videos.

╰┈➤ ❀ .song + <nombre>
     𓆩 Descargar canciones en MP3.

╰┈➤ ❀ .spotify + <link>
     𓆩 Descargar audio de Spotify.

╰┈➤ ❀ .tiktok + <link>
     𓆩 Descargar videos de TikTok.

╰┈➤ ❀ .facebook + <link>
     𓆩 Descargar videos de Facebook.

╰┈➤ ❀ .instagram + <link>
     𓆩 Descargar reels y publicaciones.

╰┈➤ ❀ .ytmp4 + <link>
     𓆩 Descargar videos de YouTube.

︶꒦꒷━━━━━━━━༺✦༻━━━━━━━━꒷꒦︶


︶꒦꒷━━━━━━━ 𓆩 𝕱𝖊𝖑𝖇𝖔𝖙 夜 𓆪 ━━━━━━━꒷꒦︶

𓆩 🚀 𓆪 Powered By Fxlipe 夜
𓆩 💜 𓆪 Gracias por utilizar Felbot

︶꒦꒷━━━━━━━━━━━━━━━━━━꒷꒦︶`
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

        await sock.sendMessage(
            chatId,
            { text: fullMenu },
            { quoted: message }
        )

        return true
    }

    return false
}

async function helpCommand(sock, chatId, message) {
    const fullMenu = buildMenuText(process.uptime(), '2.0.0')

    const introCaption = `${buildIntroHeader(process.uptime(), '2.0.0')}

𓆩━━━━━━━━〔 ✨ BIENVENIDO 〕━━━━━━━━𓆪

𓆩♡𓆪 Bienvenido a 𝕱𝖊𝖑𝖇𝖔𝖙 夜.

╰┈➤ Aquí encontrarás:

𓆩✦𓆪 Administración
𓆩✦𓆪 Utilidades
𓆩✦𓆪 Stickers
𓆩✦𓆪 Juegos
𓆩✦𓆪 Descargas
𓆩✦𓆪 Diversión
𓆩✦𓆪 Y mucho más...

︶꒦꒷━━━━━━━━༺✦༻━━━━━━━━꒷꒦︶

𓆩👇𓆪 Selecciona una opción para continuar.`

    try {
        const imagePath = path.join(
            __dirname,
            '..',
            'assets',
            'imagenes',
            'admin',
            'admin.png'
        )

        const imageBuffer = fs.existsSync(imagePath)
            ? fs.readFileSync(imagePath)
            : null

        if (imageBuffer) {
            await sock.sendMessage(
                chatId,
                {
                    image: imageBuffer,
                    mimetype: 'image/png',
                    caption: introCaption
                },
                { quoted: message }
            )
        }

        const buttonMenu = new ButtonV2(sock)
            .setBody(
                '︶꒦꒷━━━━ 𓆩 𝕱𝖊𝖑𝖇𝖔𝖙 夜 𓆪 ━━━━꒷꒦︶\n\n' +
                '𓆩✦𓆪 Selecciona una opción\n' +
                '╰┈➤ para continuar.\n\n' +
                '︶꒦꒷━━━━━━━━༺✦༻━━━━━━━━꒷꒦︶'
            )
            .setFooter('𓆩 𝕱𝖊𝖑𝖇𝖔𝖙 夜 • Fxlipe 𓆪')
            .addButton('📚 VER MENÚ COMPLETO', 'view_full_menu')
            .addButton('👑 CONTACTAME', 'owner')
            .addButton('❗ REPORTAR ERROR', 'report_error')
            .addButton('🕸️ SOLICITAR COMANDO', 'request_command')
            .addButton('💵 ADQUIRIR BOT', 'buy_bot')

        await buttonMenu.send(chatId, { quoted: message })

    } catch (error) {
        console.error(error)

        await sock.sendMessage(
            chatId,
            { text: fullMenu },
            { quoted: message }
        )
    }
}

helpCommand.buildMenuText = buildMenuText
helpCommand.getMenuButtonAction = getMenuButtonAction
helpCommand.handleMenuButton = handleMenuButton

module.exports = helpCommand
module.exports.buildMenuText = buildMenuText
module.exports.getMenuButtonAction = getMenuButtonAction
module.exports.handleMenuButton = handleMenuButton