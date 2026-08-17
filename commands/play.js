const yts = require('yt-search')
const axios = require('axios')

const searchCache = new Map()

async function playCommand(sock, chatId, message) {
   try {
      const text =
         message.message?.conversation ||
         message.message?.extendedTextMessage?.text ||
         ''

      const searchQuery = text.split(' ').slice(1).join(' ').trim()

      if (!searchQuery) {
         return sock.sendMessage(chatId, {
            text: '🎵 Escribe el nombre de una canción.\n\nEjemplo:\n.play Canserbero - Es épico'
         }, { quoted: message })
      }

      // 🔎 BUSCAR
      let video = searchCache.get(searchQuery)

      if (!video) {
         const search = await yts(searchQuery)

         if (!search.videos?.length) {
            return sock.sendMessage(chatId, {
               text: '❌ No encontré esa canción.'
            }, { quoted: message })
         }

         video =
            search.videos.find(v =>
               v.seconds > 30 &&
               v.seconds < 900 &&
               v.title &&
               !v.title.toLowerCase().includes('playlist')
            ) || search.videos[0]

         searchCache.set(searchQuery, video)

         setTimeout(() => {
            searchCache.delete(searchQuery)
         }, 10 * 60 * 1000)
      }

      // 📥 DESCARGAR DIRECTAMENTE
      const { data } = await axios.get(
         'https://apis-keith.vercel.app/download/dlmp3',
         {
            params: {
               url: video.url
            },
            timeout: 30000,
            headers: {
               'User-Agent': 'Mozilla/5.0'
            }
         }
      )

      const audioUrl = data?.result?.downloadUrl

      if (!data?.status || !audioUrl) {
         throw new Error('No se obtuvo el audio')
      }

      // 🎵 ENVIAR AUDIO
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
                  body: `⏱️ ${video.timestamp} • 👀 ${video.views?.toLocaleString() || 0} vistas`,
                  thumbnailUrl: video.thumbnail,
                  mediaType: 1,
                  renderLargerThumbnail: true,
                  showAdAttribution: false,
                  sourceUrl: video.url
               }
            }
         },
         { quoted: message }
      )

   } catch (error) {
      console.error('PLAY ERROR:', error)

      await sock.sendMessage(chatId, {
         text: '❌ No pude descargar esa canción. Intenta nuevamente.'
      }, { quoted: message })
   }
}

module.exports = playCommand
