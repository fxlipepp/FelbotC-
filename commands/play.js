const yts = require('yt-search')
const axios = require('axios')

// Cache simple para evitar búsquedas repetidas
const searchCache = new Map()

async function playCommand(sock, chatId, message) {
   try {

      const text =
         message.message?.conversation ||
         message.message?.extendedTextMessage?.text ||
         ''

      const searchQuery = text.split(' ').slice(1).join(' ').trim()

      if (!searchQuery) {
         return await sock.sendMessage(chatId, {
            text: '🎵 Escribe el nombre de una canción.\n\nEjemplo:\n.play Canserbero - Es épico'
         }, { quoted: message })
      }

      // MENSAJE DE CARGA
      const loadingMsg = await sock.sendMessage(chatId, {
         text:
`╭━━━〔 🎶 PLAY MUSIC 〕━━━⬣
┃
┃ 🔎 Buscando canción...
┃
┃ ▱▱▱▱▱▱▱▱▱▱ 0%
┃
╰━━━━━━━━━━━━━━━━⬣`
      }, { quoted: message })

      // CACHE
      let video

      if (searchCache.has(searchQuery)) {
         video = searchCache.get(searchQuery)
      } else {

         const search = await yts(searchQuery)

         if (!search.videos.length) {
            return await sock.sendMessage(chatId, {
               text: '❌ No encontré esa canción.'
            }, { quoted: message })
         }

         // Mejor filtro
         video =
            search.videos.find(v =>
               v.seconds > 30 &&
               v.seconds < 900 &&
               v.title &&
               !v.title.toLowerCase().includes('playlist')
            ) || search.videos[0]

         searchCache.set(searchQuery, video)

         // Limpiar cache
         setTimeout(() => {
            searchCache.delete(searchQuery)
         }, 1000 * 60 * 10)
      }

      // UPDATE 30%
      await sock.sendMessage(chatId, {
         edit: loadingMsg.key,
         text:
`╭━━━〔 🎶 PLAY MUSIC 〕━━━⬣
┃
┃ ✅ Canción encontrada
┃ 🎵 ${video.title}
┃
┃ ▰▰▰▱▱▱▱▱▱▱ 30%
┃
╰━━━━━━━━━━━━━━━━⬣`
      })

      const urlYt = video.url

      // API MÁS RÁPIDA
      const { data } = await axios.get(
         'https://apis-keith.vercel.app/download/dlmp3',
         {
            params: {
               url: urlYt
            },
            timeout: 45000,
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
         throw new Error('API ERROR')
      }

      // UPDATE 70%
      await sock.sendMessage(chatId, {
         edit: loadingMsg.key,
         text:
`╭━━━〔 🎶 PLAY MUSIC 〕━━━⬣
┃
┃ 📥 Descargando audio...
┃
┃ ▰▰▰▰▰▰▰▱▱▱ 70%
┃
╰━━━━━━━━━━━━━━━━⬣`
      })

      const audioUrl = data.result.downloadUrl

      // ENVIAR AUDIO
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
                  body: `⏱️ ${video.timestamp} • 👀 ${video.views.toLocaleString()} vistas`,
                  thumbnailUrl: video.thumbnail,
                  mediaType: 1,
                  renderLargerThumbnail: true,
                  showAdAttribution: false,
                  sourceUrl: urlYt
               }
            }
         },
         { quoted: message }
      )

      // UPDATE FINAL
      await sock.sendMessage(chatId, {
         edit: loadingMsg.key,
         text:
`╭━━━〔 🎶 PLAY MUSIC 〕━━━⬣
┃
┃ ✅ Audio enviado correctamente
┃ 🎵 ${video.title}
┃
┃ ▰▰▰▰▰▰▰▰▰▰ 100%
┃
╰━━━━━━━━━━━━━━━━⬣`
      })

   } catch (error) {

      console.error('PLAY ERROR:', error)

      await sock.sendMessage(chatId, {
         text:
`❌ Error descargando la canción.

📌 Posibles causas:
• La API murió
• YouTube bloqueó
• Audio demasiado pesado
• Mala conexión`
      }, { quoted: message })
   }
}

module.exports = playCommand