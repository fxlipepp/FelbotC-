// commands/unmute.js

const User = require('../models/User')
const isAdmin = require('../lib/isAdmin')

async function unmuteCommand(sock, chatId, senderId, message) {

   if (!chatId.endsWith('@g.us')) {
      return sock.sendMessage(chatId, {
         text: '❌ Este comando funciona solo dentro de un grupo. Por favor, úsalo allí.'
      }, { quoted: message })
   }

   const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId)

   if (!isBotAdmin) {
      return sock.sendMessage(chatId, {
         text: '❌ El bot debe ser admin.'
      }, { quoted: message })
   }

   if (!isSenderAdmin) {
      return sock.sendMessage(chatId, {
         text: '🚫 Solo administradores pueden usar este comando.'
      }, { quoted: message })
   }

   const ctx = message.message?.extendedTextMessage?.contextInfo

   let user

   // mencionar
   if (ctx?.mentionedJid?.length) {
      user = ctx.mentionedJid[0]
   }

   // responder
   else if (ctx?.participant) {
      user = ctx.participant
   }

   if (!user) {
      return sock.sendMessage(chatId, {
         text: '⚠️ Menciona o responde a alguien.'
      }, { quoted: message })
   }

   const senderNumber = senderId.split('@')[0]
   const targetNumber = user.split('@')[0]

   let userData = await User.findOne({ userId: user })

   if (!userData || !userData.muted) {
      return sock.sendMessage(chatId, {
         text: `⚠️ @${targetNumber} no está muteado.`,
         mentions: [user]
      }, { quoted: message })
   }

   userData.muted = false
   await userData.save()

   await sock.sendMessage(chatId, {
      text:
`🔊 *Usuario desmuteado*

👤 Usuario: @${targetNumber}
🛡️ Admin: @${senderNumber}`,
      mentions: [user, senderId],

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

module.exports = unmuteCommand