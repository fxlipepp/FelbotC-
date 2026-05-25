const axios = require('axios')
const yts = require('yt-search')
const { toAudio } = require('../lib/converter')

const searchCache = new Map()

const AXIOS_DEFAULTS = {
   timeout: 20000,
   headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': '*/*'
   }
}

// ===============================
// FAST RETRY
// ===============================

async function tryRequest(getter, attempts = 2) {

   let lastError

   for (let i = 0; i < attempts; i++) {

      try {
         return await getter()
      } catch (err) {
         lastError = err
      }
   }

   throw lastError
}

// ===============================
// APIS
// ===============================

async function elite(url) {

   const { data } = await tryRequest(() =>
      axios.get(
         `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(url)}&format=mp3`,
         AXIOS_DEFAULTS
      )
   )

   if (!data?.downloadURL) {
      throw new Error('Elite failed')
   }

   return {
      download: data.downloadURL,
      title: data.title
   }
}

async function yupra(url) {

   const { data } = await tryRequest(() =>
      axios.get(
         `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(url)}`,
         AXIOS_DEFAULTS
      )
   )

   if (!data?.data?.download_url) {
      throw new Error('Yupra failed')
   }

   return {
      download: data.data.download_url,
      title: data.data.title,
      thumbnail: data.data.thumbnail
   }
}

async function okatsu(url) {

   const { data } = await tryRequest(() =>
      axios.get(
         `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(url)}`,
         AXIOS_DEFAULTS
      )
   )

   if (!data?.dl) {
      throw new Error('Okatsu failed')
   }

   return {
      download: data.dl,
      title: data.title,
      thumbnail: data.thumb
   }
}

// ===============================
// CHECK MP3
// ===============================

function isRealMp3(buffer) {

   return (
      buffer.slice(0, 3).toString() === 'ID3' ||
      (
         buffer[0] === 0xff &&
         (buffer[1] & 0xe0) === 0xe0
      )
   )
}

// ===============================
// COMMAND
// ===============================

async function songCommand(sock, chatId, message) {

   try {

      const text =
         message.message?.conversation ||
         message.message?.extendedTextMessage?.text ||
         ''

      const query = text.split(' ').slice(1).join(' ').trim()

      if (!query) {

         return await sock.sendMessage(chatId, {
            text: '🎵 Escribe el nombre de una canción.'
         }, { quoted: message })
      }

      // ===============================
      // SEARCH
      // ===============================

      let video

      if (
         query.includes('youtube.com') ||
         query.includes('youtu.be')
      ) {

         video = {
            url: query,
            title: 'YouTube Audio',
            thumbnail: 'https://i.imgur.com/AfFp7pu.png',
            timestamp: 'Unknown',
            author: { name: 'Unknown' },
            views: 0,
            ago: 'Unknown'
         }

      } else {

         if (searchCache.has(query)) {

            video = searchCache.get(query)

         } else {

            const search = await yts(query)

            if (!search?.videos?.length) {

               return await sock.sendMessage(chatId, {
                  text: '❌ No encontré resultados.'
               }, { quoted: message })
            }

            video =
               search.videos.find(v =>
                  v.seconds > 30 &&
                  v.seconds < 1800 &&
                  !v.title.toLowerCase().includes('playlist')
               ) || search.videos[0]

            searchCache.set(query, video)

            setTimeout(() => {
               searchCache.delete(query)
            }, 1000 * 60 * 5)
         }
      }

      // ===============================
      // LOADING
      // ===============================

      const loading = await sock.sendMessage(chatId, {
         image: { url: video.thumbnail },
         caption:
`🎵 *${video.title}*

👤 Autor: ${video.author?.name || 'Unknown'}
⏱️ Duración: ${video.timestamp || 'Unknown'}
👀 Vistas: ${video.views?.toLocaleString() || '0'}
📅 Subido: ${video.ago || 'Unknown'}
👍 Likes: Desconocidos

⬇️ Descargando audio...

▰▱▱▱▱▱▱▱▱▱ 10%`
      }, { quoted: message })

      // ===============================
      // FASTEST API
      // ===============================

      const audioData = await Promise.any([
         elite(video.url),
         yupra(video.url),
         okatsu(video.url)
      ])

      if (!audioData?.download) {
         throw new Error('No download URL')
      }

      // ===============================
      // UPDATE
      // ===============================

      await sock.sendMessage(chatId, {
         edit: loading.key,
         image: { url: video.thumbnail },
         caption:
`🎵 *${video.title}*

👤 Autor: ${video.author?.name || 'Unknown'}
⏱️ Duración: ${video.timestamp || 'Unknown'}
👀 Vistas: ${video.views?.toLocaleString() || '0'}
📅 Subido: ${video.ago || 'Unknown'}
👍 Likes: Desconocidos

📥 Procesando audio...

▰▰▰▰▰▰▱▱▱▱ 60%`
      })

      // ===============================
      // DOWNLOAD
      // ===============================

      const audioResponse = await axios.get(
         audioData.download,
         {
            responseType: 'arraybuffer',
            timeout: 35000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            headers: {
               'User-Agent': 'Mozilla/5.0'
            }
         }
      )

      const audioBuffer = Buffer.from(audioResponse.data)

      if (!audioBuffer || audioBuffer.length < 10000) {
         throw new Error('Invalid audio buffer')
      }

      // ===============================
      // FAST MP3 CHECK
      // ===============================

      let finalBuffer

      if (isRealMp3(audioBuffer)) {

         // NO conversion needed
         finalBuffer = audioBuffer

      } else {

         // Convert ONLY if needed
         try {

            finalBuffer = await toAudio(audioBuffer, 'mp4')

         } catch {

            try {

               finalBuffer = await toAudio(audioBuffer, 'webm')

            } catch {

               finalBuffer = await toAudio(audioBuffer, 'mp3')
            }
         }
      }

      if (!finalBuffer || finalBuffer.length < 10000) {
         throw new Error('Conversion failed')
      }

      // ===============================
      // TITLE
      // ===============================

      const safeTitle = (
         audioData.title ||
         video.title ||
         'song'
      )
         .replace(/[^\w\s-]/g, '')
         .trim()

      // ===============================
      // SEND AUDIO
      // ===============================

      await sock.sendMessage(
         chatId,
         {
            audio: finalBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${safeTitle}.mp3`,
            ptt: false
         },
         { quoted: message }
      )

      // ===============================
      // FINAL UPDATE
      // ===============================

      await sock.sendMessage(chatId, {
         edit: loading.key,
         image: { url: video.thumbnail },
         caption:
`🎵 *${safeTitle}*

👤 Autor: ${video.author?.name || 'Unknown'}
⏱️ Duración: ${video.timestamp || 'Unknown'}
👀 Vistas: ${video.views?.toLocaleString() || '0'}
📅 Subido: ${video.ago || 'Unknown'}
👍 Likes: Desconocidos

✅ Audio enviado correctamente

▰▰▰▰▰▰▰▰▰▰ 100%`
      })

   } catch (err) {

      console.error('SONG ERROR:', err)

      let msg = '❌ Error descargando el audio.'

      if (
         err?.response?.status === 451 ||
         err?.message?.includes('451')
      ) {
         msg = '❌ Contenido bloqueado o restringido.'
      }

      await sock.sendMessage(chatId, {
         text: msg
      }, { quoted: message })
   }
}

module.exports = songCommand