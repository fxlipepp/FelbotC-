const isAdmin = require('../lib/isAdmin')

async function kickCommand(sock, chatId, senderId, mentionedJids, message) {

   try {
      if (!chatId.endsWith('@g.us')) {
         return await sock.sendMessage(chatId, {
            text: '❌ Este comando funciona solo dentro de un grupo. Por favor, úsalo en un chat grupal.'
         }, { quoted: message })
      }

      const isOwner = message.key.fromMe

      if (!isOwner) {

         const { isSenderAdmin, isBotAdmin } =
            await isAdmin(sock, chatId, senderId)

         if (!isBotAdmin) {
            return await sock.sendMessage(chatId, {
               text: '⚠️ Necesito ser administrador para poder expulsar usuarios. Por favor, dame admin primero.'
            }, { quoted: message })
         }

         if (!isSenderAdmin) {
            return await sock.sendMessage(chatId, {
               text: '🚫 Solo los administradores del grupo pueden usar este comando.'
            }, { quoted: message })
         }
      }

      let usersToKick = []

      if (mentionedJids && mentionedJids.length > 0) {
         usersToKick = mentionedJids
      }

      else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
         usersToKick = [
            message.message.extendedTextMessage.contextInfo.participant
         ]
      }

      if (!usersToKick.length) {
         return await sock.sendMessage(chatId, {
            text: '⚠️ Por favor menciona o responde a alguien para expulsar.'
         }, { quoted: message })
      }

      const botId = sock.user?.id || ''
      const botNumber = botId.split(':')[0].split('@')[0]

      const tryingKickBot = usersToKick.some(user => {
         const userNumber = user.split(':')[0].split('@')[0]
         return userNumber === botNumber
      })

      if (tryingKickBot) {
         return await sock.sendMessage(chatId, {
            text: '🤖 No puedo expulsarme a mí mismo.'
         }, { quoted: message })
      }

      const metadata = await sock.groupMetadata(chatId)
      const participants = metadata.participants || []

      const filteredUsers = usersToKick.filter(user => {
         const participant = participants.find(p => p.id === user)
         return !participant?.admin
      })

      if (!filteredUsers.length) {
         return await sock.sendMessage(chatId, {
            text: '🚫 No puedo expulsar a otro administrador.'
         }, { quoted: message })
      }

      await sock.groupParticipantsUpdate(
         chatId,
         filteredUsers,
         'remove'
      )

      const mentions = filteredUsers.map(
         user => `@${user.split('@')[0]}`
      )

      const executor = `@${senderId.split('@')[0]}`

      await sock.sendMessage(chatId, {
         text:
`✅ Expulsión realizada con éxito.

Usuarios removidos:
${mentions.join('\n')}

👤 Ejecutado por:
${executor}`,
         mentions: [...filteredUsers, senderId]
      }, { quoted: message })

   } catch (error) {

      console.error('KICK ERROR:', error)

      await sock.sendMessage(chatId, {
         text: '❌ No pude expulsar al usuario. Intenta de nuevo en un momento.'
      }, { quoted: message })
   }
}

module.exports = kickCommand