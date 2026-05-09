const isAdmin = require('../lib/isAdmin')

async function kickCommand(sock, chatId, senderId, mentionedJids, message) {

   try {

      const isOwner = message.key.fromMe

      if (!isOwner) {

         const { isSenderAdmin, isBotAdmin } =
            await isAdmin(sock, chatId, senderId)

         if (!isBotAdmin) {
            return await sock.sendMessage(chatId, {
               text: '❌ Ponme admin primero.'
            }, { quoted: message })
         }

         if (!isSenderAdmin) {
            return await sock.sendMessage(chatId, {
               text: '🚫 Solo admins pueden usar esto.'
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
            text: '⚠️ Menciona o responde a alguien.'
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
            text: '🤖 No me voy a expulsar yo mismo.'
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
            text: '🚫 No puedo expulsar admins.'
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
`❌ Usuario expulsado:
${mentions.join('\n')}

⚡ By:
${executor}`,

         mentions: [...filteredUsers, senderId]

      }, { quoted: message })

   } catch (error) {

      console.error('KICK ERROR:', error)

      await sock.sendMessage(chatId, {
         text: '❌ Error al expulsar usuario.'
      }, { quoted: message })
   }
}

module.exports = kickCommand