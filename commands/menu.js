const fs = require('fs')
const path = require('path')

const {
    generateWAMessageFromContent,
    prepareWAMessageMedia
} = require('@whiskeysockets/baileys')

function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    return `${h}h ${m}m ${s}s`
}

function buildIntroHeader(uptimeSeconds, version = '3.0.7') {
    return `╭────────────────────────╮
│        𝕱𝖊𝖑𝖇𝖔𝖙 夜
│
│  👑 Fxlipe 夜
│  ⚙️ v${version}  •  🟢 Online
│  📚 120+ comandos
│  ⏱️ ${formatUptime(uptimeSeconds)}
╰────────────────────────╯`
}

function buildMenuText(uptimeSeconds, version = '3.0.7') {
    const header = buildIntroHeader(uptimeSeconds, version)

    return `${header}

       𝑴𝑨𝑰𝑵 𝑴𝑬𝑵𝑼
──────────────────────────

01 • 👑 𝑶𝑾𝑵𝑬𝑹
    .felbot on
    .felbot off

02 • 🌐 𝑮𝑬𝑵𝑬𝑹𝑨𝑳
    .menu  .help  .ping  .alive
    .info  .owner  .jid
    .groupinfo  .staff  .admins

03 • 🛠️ 𝑼𝑻𝑰𝑳𝑰𝑫𝑨𝑫𝑬𝑺
    .tts  .trt  .vv  .8ball

04 • 🛡️ 𝑨𝑫𝑴𝑰𝑵
    .ban  .unban  .kick
    .warn  .warnings  .mute
    .unmute  .promote  .demote
    .delete  .del  .antilink
    .modoadmin  .welcome
    .setwelcome  .resetwelcome
    .setbye  .resetbye
    .n  .todos
    .setgname  .setgpp  .setgdesc
    .abrir  .cerrar

05 • 🔥 𝑭𝑹𝑬𝑬 𝑭𝑰𝑹𝑬
    .2vs2  .4vs4  .6vs6
    .int2  .int4  .int6

06 • 🎨 𝑺𝑻𝑰𝑪𝑲𝑬𝑹𝑺
    .s  .crop  .brat  .wm
    .attp  .emojimix  .removebg

07 • 🔤 𝑻𝑬𝑿𝑻𝑴𝑨𝑲𝑬𝑹
    .metallic  .ice  .snow
    .impressive  .matrix  .light
    .neon  .devil  .purple
    .thunder  .parejas  .1917
    .arena  .hacker  .sand
    .blackpink  .glitch  .fire

08 • 🖼️ 𝑨𝑵𝑰𝑴𝑬
    .nom  .poke  .cry  .besar
    .pat  .hug  .wink  .facepalm

09 • 🎮 𝑱𝑼𝑬𝑮𝑶𝑺
    .ppt  .dados  .moneda
    .ruleta  .adivina  .quiz
    .duelo  .blackjack  .slots
    .memoria  .tictactoe
    .hangman  .guess  .trivia
    .truth  .dare  .perfil  .rank

10 • 🎯 𝑫𝑰𝑽𝑬𝑹𝑺𝑰Ó𝑵
    .Parejas  .compliment  .propuesta
    .divorcio  .top  .piropo
    .insult  .flirt  .ship
    .simp  .stupid

11 • 📥 𝑫𝑬𝑺𝑪𝑨𝑹𝑮𝑨𝑺
    .play  .video  .song
    .spotify  .tiktok
    .facebook  .instagram  .ytmp4

12 • 🔞 𝑵𝑺𝑭𝑾
    .xxnx  .follar  .cum
    .masturbarsef  .masturbarsem

──────────────────────────
          夜 𝕱𝖊𝖑𝖇𝖔𝖙 夜
     𝑷𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 𝑭𝒙𝒍𝒊𝒑𝒆
──────────────────────────`
}

function getMenuButtonAction(buttonId) {
    switch (buttonId) {
        case 'view_full_menu':
            return { type: 'send_full_menu' }
        case 'owner':
            return { type: 'owner' }
        case 'report_error':
            return { type: 'report_error' }
        case 'request_command':
            return { type: 'request_command' }
        case 'buy_bot':
            return { type: 'buy_bot' }
        default:
            return null
    }
}

async function handleMenuButton(sock, chatId, buttonId, message) {
    const action = getMenuButtonAction(buttonId)
    if (!action) return false

    if (action.type === 'send_full_menu') {
        const fullMenu = buildMenuText(process.uptime(), '3.0.7')

        try {
            const gifsPath = path.join(
                __dirname,
                '..',
                'assets',
                'gifs',
                'menucompleto',
                'menu.mp4'
            )

            if (!fs.existsSync(gifsPath)) {
                throw new Error(`No existe el archivo: ${gifsPath}`)
            }

            const videoBuffer = fs.readFileSync(gifsPath)

            await sock.sendMessage(
                chatId,
                {
                    video: videoBuffer,
                    gifPlayback: true,
                    caption: fullMenu
                },
                { quoted: message }
            )
        } catch (error) {
            console.error('❌ ERROR EN MENU COMPLETO:', error)

            await sock.sendMessage(
                chatId,
                { text: fullMenu },
                { quoted: message }
            )
        }

        return true
    }

    return false
}

async function helpCommand(sock, chatId, message) {
    const introCaption = `${buildIntroHeader(
        process.uptime(),
        '3.0.7'
    )}

Bienvenido a 𝕱𝖊𝖑𝖇𝖔𝖙 夜.

Un bot creado para combinar
administración, entretenimiento,
multimedia y herramientas para tu grupo.

Selecciona una opción para continuar.`

    try {
        const gifsPath = path.join(
            __dirname,
            '..',
            'assets',
            'gifs',
            'menucompleto',
            'menu.mp4'
        )

        if (!fs.existsSync(gifsPath)) {
            throw new Error(`No existe el archivo del menú: ${gifsPath}`)
        }

        const videoBuffer = fs.readFileSync(gifsPath)

        const preparedVideo = await prepareWAMessageMedia(
            {
                video: videoBuffer,
                gifPlayback: true
            },
            {
                upload: sock.waUploadToServer
            }
        )

        const buttons = [
            ['VER MENU COMPLETO', 'view_full_menu'],
            ['CONTACTAR A FXLIPE 夜', 'owner'],
            ['REPORTAR ERROR', 'report_error'],
            ['PEDIR COMANDO', 'request_command'],
            ['ADQUIRIR FELBOT', 'buy_bot']
        ].map(([display_text, id]) => ({
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
                display_text,
                id
            })
        }))

        const menuMessage = generateWAMessageFromContent(
            chatId,
            {
                interactiveMessage: {
                    header: {
                        title: '𝕱𝖊𝖑𝖇𝖔𝖙 夜',
                        subtitle: '𝑴𝒆𝒏𝒖́ 𝒑𝒓𝒊𝒏𝒄𝒊𝒑𝒂𝒍',
                        hasMediaAttachment: true,
                        ...preparedVideo
                    },
                    body: {
                        text: introCaption
                    },
                    footer: {
                        text: '夜 𝕱𝖊𝖑𝖇𝖔𝖙 夜 • Fxlipe'
                    },
                    nativeFlowMessage: {
                        buttons
                    }
                }
            },
            {
                quoted: message
            }
        )

        await sock.relayMessage(
            menuMessage.key.remoteJid,
            menuMessage.message,
            {
                messageId: menuMessage.key.id,
                additionalNodes: [
                    {
                        tag: 'biz',
                        attrs: {},
                        content: [
                            {
                                tag: 'interactive',
                                attrs: {
                                    type: 'native_flow',
                                    v: '1'
                                },
                                content: [
                                    {
                                        tag: 'native_flow',
                                        attrs: {
                                            v: '9',
                                            name: 'mixed'
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
        console.error('❌ ERROR EN MENU:', error)

        await sock.sendMessage(
            chatId,
            { text: introCaption },
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
