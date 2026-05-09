const isAdmin = require('../lib/isAdmin')
const { downloadContentFromMessage } = require('@whiskeysockets/baileys')
const fs = require('fs')
const path = require('path')

async function downloadMediaMessage(message, mediaType) {

    const stream = await downloadContentFromMessage(message, mediaType)

    let buffer = Buffer.from([])

    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
    }

    const extension = mediaType === 'image'
        ? 'jpg'
        : mediaType === 'video'
        ? 'mp4'
        : 'bin'

    const filePath = path.join(__dirname, '../temp/', `${Date.now()}.${extension}`)

    fs.writeFileSync(filePath, buffer)

    return filePath
}

async function nCommand(sock, chatId, senderId, messageText, replyMessage, message) {

    try {

        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId)

        if (!isBotAdmin) {
            return await sock.sendMessage(chatId, {
                text: '⚠️ El bot necesita ser administrador primero.'
            }, { quoted: message })
        }

        if (!isSenderAdmin) {
            return await sock.sendMessage(chatId, {
                text: '❌ Solo los administradores pueden usar este comando.'
            }, { quoted: message })
        }

        const groupMetadata = await sock.groupMetadata(chatId)
        const participants = groupMetadata.participants

        const mentionedJidList = participants.map(p => p.id)

        let messageContent = {}

        if (replyMessage) {

            // 📸 IMAGEN
            if (replyMessage.imageMessage) {

                const filePath = await downloadMediaMessage(replyMessage.imageMessage, 'image')

                messageContent = {
                    image: { url: filePath },
                    caption: messageText || replyMessage.imageMessage.caption || '',
                    mentions: mentionedJidList,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363409628624676@newsletter',
                            newsletterName: '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕮𝖆𝖓𝖆𝖑 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 ✧'
                        }
                    }
                }

                await sock.sendMessage(chatId, messageContent)

                fs.unlinkSync(filePath)
            }

            // 🎥 VIDEO
            else if (replyMessage.videoMessage) {

                const filePath = await downloadMediaMessage(replyMessage.videoMessage, 'video')

                messageContent = {
                    video: { url: filePath },
                    gifPlayback: true,
                    caption: messageText || replyMessage.videoMessage.caption || '',
                    mentions: mentionedJidList,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363409628624676@newsletter',
                            newsletterName: '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕮𝖆𝖓𝖆𝖑 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 ✧'
                        }
                    }
                }

                await sock.sendMessage(chatId, messageContent)

                fs.unlinkSync(filePath)
            }

            // 💬 TEXTO
            else if (replyMessage.conversation || replyMessage.extendedTextMessage) {

                messageContent = {
                    text: messageText || replyMessage.conversation || replyMessage.extendedTextMessage.text,
                    mentions: mentionedJidList,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363409628624676@newsletter',
                            newsletterName: '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕮𝖆𝖓𝖆𝖑 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 ✧'
                        }
                    }
                }

                await sock.sendMessage(chatId, messageContent)
            }

            // 📄 DOCUMENTO
            else if (replyMessage.documentMessage) {

                const filePath = await downloadMediaMessage(replyMessage.documentMessage, 'document')

                messageContent = {
                    document: { url: filePath },
                    fileName: replyMessage.documentMessage.fileName,
                    caption: messageText || '',
                    mentions: mentionedJidList,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363409628624676@newsletter',
                            newsletterName: '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕮𝖆𝖓𝖆𝖑 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 ✧'
                        }
                    }
                }

                await sock.sendMessage(chatId, messageContent)

                fs.unlinkSync(filePath)
            }

        } else {

            await sock.sendMessage(chatId, {
                text: messageText || '',
                mentions: mentionedJidList,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363409628624676@newsletter',
                        newsletterName: '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕮𝖆𝖓𝖆𝖑 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 ✧'
                    }
                }
            }, { quoted: message })
        }

    } catch (error) {

        console.error('Error en comando .n:', error)

        await sock.sendMessage(chatId, {
            text: '❌ Ocurrió un error al ejecutar el comando.'
        }, { quoted: message })
    }
}

module.exports = nCommand