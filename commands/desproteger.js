const User = require('../models/User')
const isAdmin = require('../lib/isAdmin')
const isOwnerOrSudo = require('../lib/isOwner')

async function desprotegerCommand(sock, chatId, senderId, message) {
   if (!chatId.endsWith('@g.us')) {
      return sock.sendMessage(chatId, {
         text: '❌ Este comando funciona solo dentro de un grupo.'
      }, { quoted: message })
   }

   const { isBotAdmin } = await isAdmin(sock, chatId, senderId)

   if (!isBotAdmin) {
      return sock.sendMessage(chatId, {
         text: '❌ El bot debe ser admin.'
      }, { quoted: message })
   }

   const isOwner = await isOwnerOrSudo(senderId, sock)

   if (!isOwner) {
      return sock.sendMessage(chatId, {
         text: '🚫 Solo el owner puede desproteger usuarios.'
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
   const targetUserId = targetLid || target

   await User.findOneAndUpdate(
      { userId: targetUserId },
      { $set: { protected: false } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
   )

   return sock.sendMessage(chatId, {
      text: `🛡️ @${targetUserId.split('@')[0]} fue desprotegido.`,
      mentions: [targetUserId]
   }, { quoted: message })
}

module.exports = desprotegerCommand
