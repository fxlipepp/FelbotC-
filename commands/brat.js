const axios = require('axios')
const { sticker } = require('../lib/sticker2')

async function bratCommand(sock, chatId, message, text) {
    try {

        const quotedText =
            message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
            message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
            ''

        const input = text || quotedText

        if (!input) {
            await sock.sendMessage(chatId, {
                text: '❌ Escribe un texto o responde un mensaje.'
            }, { quoted: message })

            return
        }

        await sock.sendMessage(chatId, {
            react: {
                text: '🕒',
                key: message.key
            }
        })

        const response = await axios.get(
            'https://skyzxu-brat.hf.space/brat',
            {
                params: {
                    text: input
                },
                responseType: 'arraybuffer'
            }
        )

        const buffer = Buffer.from(response.data)

        const stickerBuffer = await sticker(
            buffer,
            false,
            global.packname,
            global.author
        )

        await sock.sendMessage(chatId, {
            sticker: stickerBuffer
        }, {
            quoted: message
        })

        await sock.sendMessage(chatId, {
            react: {
                text: '✅',
                key: message.key
            }
        })

    } catch (err) {

        console.log('Brat Error:', err)

        await sock.sendMessage(chatId, {
            react: {
                text: '❌',
                key: message.key
            }
        })

        await sock.sendMessage(chatId, {
            text: '❌ Error creando el sticker.'
        }, {
            quoted: message
        })
    }
}

module.exports = bratCommand