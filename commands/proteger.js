const User = require('../models/User')
const isAdmin = require('../lib/isAdmin')

async function protegerCommand(sock, chatId, senderId, message) {
   if (!chatId.endsWith('@g.us')) {
      return sock.sendMessage(chatId, {
         text: '❌ Este comando funciona solo dentro de un grupo.'
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
   const target = ctx?.mentionedJid?.[0] || ctx?.participant

   if (!target) {
      return sock.sendMessage(chatId, {
         text: '⚠️ Menciona o responde a alguien.'
      }, { quoted: message })
   }

   const metadata = await sock.groupMetadata(chatId)
   const participant = metadata.participants?.find(item =>
      item.id === target || item.phoneNumber === target || item.lid === target
   )
   const targetLid = target.endsWith('@lid') ? target : participant?.lid

   if (!targetLid) {
      return sock.sendMessage(chatId, {
         text: '❌ No se pudo obtener el LID del usuario.'
      }, { quoted: message })
   }

   await User.findOneAndUpdate(
      { userId: targetLid },
      { $set: { protected: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
   )

   return sock.sendMessage(chatId, {
      text: `🛡️ @${targetLid.split('@')[0]} ahora está protegido.`,
      mentions: [targetLid]
   }, { quoted: message })
}

module.exports = protegerCommand