const { downloadMediaMessage } = require('@whiskeysockets/baileys')
const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const settings = require('../settings')
const webp = require('node-webpmux')
const crypto = require('crypto')

async function stickerCommand(sock, chatId, message) {

    const messageToQuote = message

    let targetMessage = message

    // 📌 Detectar mensaje respondido
    if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {

        const quotedInfo =
            message.message.extendedTextMessage.contextInfo

        targetMessage = {

            key: {
                remoteJid: chatId,
                id: quotedInfo.stanzaId,
                participant: quotedInfo.participant
            },

            message: quotedInfo.quotedMessage
        }
    }

    // 📌 Detectar multimedia
    const mediaMessage =
        targetMessage.message?.imageMessage ||
        targetMessage.message?.videoMessage ||
        targetMessage.message?.documentMessage

    // ❌ Sin multimedia
    if (!mediaMessage) {

        await sock.sendMessage(chatId, {

            text:
'❌ Responde a una imagen/video con *.sticker* o envía una imagen/video con el comando.',

            contextInfo: {

                forwardingScore: 999,
                isForwarded: true,

                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363409628624676@newsletter',
                    newsletterName:
'✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕮𝖆𝖓𝖆𝖑 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 ✧'
                }
            }

        }, { quoted: messageToQuote })

        return
    }

    try {

        // 📥 Descargar media
        const mediaBuffer = await downloadMediaMessage(

            targetMessage,

            'buffer',

            {},

            {
                logger: undefined,
                reuploadRequest: sock.updateMediaMessage
            }
        )

        if (!mediaBuffer) {

            await sock.sendMessage(chatId, {

                text: '❌ No pude descargar el archivo.',

                contextInfo: {

                    forwardingScore: 999,
                    isForwarded: true,

                    forwardedNewsletterMessageInfo: {
                        newsletterJid:
'120363409628624676@newsletter',

                        newsletterName:
'✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕮𝖆𝖓𝖆𝖑 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 ✧'
                    }
                }

            })

            return
        }

        // 📂 Carpeta temporal
        const tmpDir = path.join(process.cwd(), 'tmp')

        if (!fs.existsSync(tmpDir)) {

            fs.mkdirSync(tmpDir, { recursive: true })
        }

        // 📌 Archivos temporales
        const tempInput =
            path.join(tmpDir, `temp_${Date.now()}`)

        const tempOutput =
            path.join(tmpDir, `sticker_${Date.now()}.webp`)

        fs.writeFileSync(tempInput, mediaBuffer)

        // 🎞️ Detectar si es animado
        const isAnimated =
            mediaMessage.mimetype?.includes('gif') ||
            mediaMessage.mimetype?.includes('video') ||
            mediaMessage.seconds > 0

        // ⚡ Comando ffmpeg
        const ffmpegCommand = isAnimated

            ? `ffmpeg -i "${tempInput}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`

            : `ffmpeg -i "${tempInput}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`

        // ⚙️ Ejecutar ffmpeg
        await new Promise((resolve, reject) => {

            exec(ffmpegCommand, (error) => {

                if (error) {

                    console.error('FFmpeg Error:', error)

                    reject(error)

                } else {

                    resolve()
                }
            })
        })

        // 📌 Leer sticker
        let webpBuffer = fs.readFileSync(tempOutput)

        // 📌 Metadata
        const img = new webp.Image()

        await img.load(webpBuffer)

        const json = {

            'sticker-pack-id':
                crypto.randomBytes(32).toString('hex'),

            'sticker-pack-name':
                settings.packname || 'Felbot 夜',

            'emojis': ['⚡']
        }

        const exifAttr = Buffer.from([
            0x49,0x49,0x2A,0x00,
            0x08,0x00,0x00,0x00,
            0x01,0x00,0x41,0x57,
            0x07,0x00,0x00,0x00,
            0x00,0x00,0x16,0x00,
            0x00,0x00
        ])

        const jsonBuffer =
            Buffer.from(JSON.stringify(json), 'utf8')

        const exif =
            Buffer.concat([exifAttr, jsonBuffer])

        exif.writeUIntLE(jsonBuffer.length, 14, 4)

        img.exif = exif

        const finalBuffer = await img.save(null)

        // 📤 Enviar sticker
        await sock.sendMessage(chatId, {

            sticker: finalBuffer,

            contextInfo: {

                forwardingScore: 999,
                isForwarded: true,

                forwardedNewsletterMessageInfo: {

                    newsletterJid:
'120363409628624676@newsletter',

                    newsletterName:
'✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕮𝖆𝖓𝖆𝖑 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 ✧'
                }
            }

        }, { quoted: messageToQuote })

        // 🧹 Limpiar archivos
        try {

            fs.unlinkSync(tempInput)
            fs.unlinkSync(tempOutput)

        } catch (err) {

            console.error('Error limpiando archivos:', err)
        }

    } catch (error) {

        console.error('Error en sticker command:', error)

        await sock.sendMessage(chatId, {

            text:
'❌ No pude crear el sticker. Intenta nuevamente.',

            contextInfo: {

                forwardingScore: 999,
                isForwarded: true,

                forwardedNewsletterMessageInfo: {

                    newsletterJid:
'120363409628624676@newsletter',

                    newsletterName:
'✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕮𝖆𝖓𝖆𝖑 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 ✧'
                }
            }

        })
    }
}

module.exports = stickerCommand