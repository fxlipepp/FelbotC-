const yts = require('yt-search')
const axios = require('axios')

async function playCommand(sock, chatId, message) {
   try {

      const text =
         message.message?.conversation ||
         message.message?.extendedTextMessage?.text || ''

      const searchQuery = text.split(' ').slice(1).join(' ').trim()

      if (!searchQuery) {
         return await sock.sendMessage(chatId, {
            text: '🎵 Escribe el nombre de una canción.'
         })
      }

      // Buscar canción
      const search = await yts(searchQuery)

      if (!search.videos.length) {
         return await sock.sendMessage(chatId, {
            text: '❌ No encontré esa canción.'
         })
      }

      // Agarrar SOLO videos cortos
      const video = search.videos.find(v => v.seconds < 900) || search.videos[0]

      const urlYt = video.url

      await sock.sendMessage(chatId, {
         text: `🎶 Descargando *${video.title}*...`
      })

      // Request rápido
      const { data } = await axios.get(
         'https://apis-keith.vercel.app/download/dlmp3',
         {
            params: {
               url: urlYt
            },
            timeout: 30000,
            headers: {
               'User-Agent': 'Mozilla/5.0'
            }
         }
      )

      if (
         !data ||
         !data.status ||
         !data.result ||
         !data.result.downloadUrl
      ) {
         return await sock.sendMessage(chatId, {
            text: '❌ Error descargando audio.'
         })
      }

      const audioUrl = data.result.downloadUrl

      // Enviar audio directo
      await sock.sendMessage(
         chatId,
         {
            audio: {
               url: audioUrl
            },
            mimetype: 'audio/mpeg',
            fileName: `${video.title}.mp3`,
            ptt: false,
            contextInfo: {
               externalAdReply: {
                  title: video.title,
                  body: video.author.name,
                  thumbnailUrl: video.thumbnail,
                  mediaType: 1,
                  renderLargerThumbnail: true,
                  sourceUrl: urlYt
               }
            }
         },
         { quoted: message }
      )

   } catch (error) {

      console.error('PLAY ERROR:', error)

      await sock.sendMessage(chatId, {
         text: '❌ Se jodió la descarga de la canción.'
      })
   }
}

module.exports = playCommand