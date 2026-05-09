const { downloadMediaMessage } = require('@whiskeysockets/baileys')
const webp = require('node-webpmux')
const crypto = require('crypto')

async function takeCommand(sock, chatId, message, args) {

    try {

        // 📌 Verificar sticker respondido
        const quotedMessage =
            message.message?.extendedTextMessage?.contextInfo?.quotedMessage

        if (!quotedMessage?.stickerMessage) {

            await sock.sendMessage(chatId, {

                text:
'❌ Responde a un sticker usando *.take <nombre del pack>*',

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

            }, { quoted: message })

            return
        }

        // 📌 Nombre del pack
        const rawPackname =
            args.join(' ').trim() || 'Felbot 夜'

        // 📌 Limitar longitud para evitar bugs
        const packname =
            rawPackname.length > 32
                ? rawPackname.substring(0, 32)
                : rawPackname

        try {

            // 📥 Descargar sticker
            const stickerBuffer =
                await downloadMediaMessage(

                    {
                        key: {
                            remoteJid: chatId,
                            id:
                                message.message
                                .extendedTextMessage
                                .contextInfo
                                .stanzaId,

                            participant:
                                message.message
                                .extendedTextMessage
                                .contextInfo
                                .participant
                        },

                        message: quotedMessage

                    },

                    'buffer',

                    {},

                    {
                        logger: undefined,
                        reuploadRequest:
                            sock.updateMediaMessage
                    }
                )

            if (!stickerBuffer) {

                await sock.sendMessage(chatId, {

                    text:
'❌ No pude descargar el sticker.',

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

            // 📌 Cargar sticker
            const img = new webp.Image()

            await img.load(stickerBuffer)

            // 📌 Metadata EXIF
            const json = {

                'sticker-pack-id':
                    crypto.randomBytes(32).toString('hex'),

                // ⚡ Unicode invisible para evitar
                // que WhatsApp quite la primera letra
                'sticker-pack-name':
                    '\u200E' + packname,

                'sticker-pack-publisher':
                    'Felbot 夜',

                'emojis': ['⚡']
            }

            // 📌 Crear EXIF correctamente
            const exifAttr = Buffer.from([
                0x49,0x49,0x2A,0x00,
                0x08,0x00,0x00,0x00,
                0x01,0x00,0x41,0x57,
                0x07,0x00,0x00,0x00,
                0x00,0x00,0x16,0x00,
                0x00,0x00
            ])

            const jsonBuffer =
                Buffer.from(
                    JSON.stringify(json),
                    'utf8'
                )

            const exif =
                Buffer.concat([
                    exifAttr,
                    jsonBuffer
                ])

            exif.writeUIntLE(
                jsonBuffer.length,
                14,
                4
            )

            // 📌 Aplicar metadata
            img.exif = exif

            // 📌 Sticker final
            const finalBuffer =
                await img.save(null)

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

            }, {

                quoted: message
            })

        } catch (error) {

            console.error(
                '❌ Error procesando sticker:',
                error
            )

            await sock.sendMessage(chatId, {

                text:
'❌ Error procesando el sticker.',

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

    } catch (error) {

        console.error(
            '❌ Error en take command:',
            error
        )

        await sock.sendMessage(chatId, {

            text:
'❌ Ocurrió un error usando el comando.',

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

module.exports = takeCommand