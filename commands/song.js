const axios = require('axios')
const yts = require('yt-search')
const https = require('https')
const { toAudio } = require('../lib/converter')

// ===============================
// HTTPS AGENT
// ===============================

const httpsAgent = new https.Agent({
   keepAlive: true,
   keepAliveMsecs: 10000,
   maxSockets: 50,
   maxFreeSockets: 20,
   timeout: 60000
})

// ===============================
// AXIOS CONFIG
// ===============================

const AXIOS_DEFAULTS = {
   timeout: 20000,
   httpsAgent,
   maxRedirects: 5,
   headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': '*/*',
      'Connection': 'keep-alive'
   }
}

// ===============================
// CACHE
// ===============================

const searchCache = new Map()
const downloadCache = new Map()

function limitMapSize(map, max = 100) {

   if (map.size > max) {

      const firstKey = map.keys().next().value

      map.delete(firstKey)
   }
}

// ===============================
// RAM CLEANER
// ===============================

function cleanMemory() {

   try {

      if (searchCache.size > 70) {
         searchCache.clear()
      }

      if (downloadCache.size > 70) {
         downloadCache.clear()
      }

      if (global.gc) {
         global.gc()
      }

   } catch {}
}

setInterval(() => {

   cleanMemory()

}, 1000 * 60 * 20)

// ===============================
// HELPERS
// ===============================

function createBar(percent) {

   const total = 10

   const filled = Math.round(percent / 10)

   return '▰'.repeat(filled) + '▱'.repeat(total - filled)
}

function formatBytes(bytes) {

   if (!bytes) return 'Desconocido'

   const sizes = ['B', 'KB', 'MB', 'GB']

   const i = Math.floor(
      Math.log(bytes) / Math.log(1024)
   )

   return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

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
// RETRY
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
// APIs
// ===============================

async function elite(url, signal) {

   const { data } = await tryRequest(() =>
      axios.get(
         `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(url)}&format=mp3`,
         {
            ...AXIOS_DEFAULTS,
            signal
         }
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

async function yupra(url, signal) {

   const { data } = await tryRequest(() =>
      axios.get(
         `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(url)}`,
         {
            ...AXIOS_DEFAULTS,
            signal
         }
      )
   )

   if (!data?.data?.download_url) {
      throw new Error('Yupra failed')
   }

   return {
      download: data.data.download_url,
      title: data.data.title
   }
}

async function okatsu(url, signal) {

   const { data } = await tryRequest(() =>
      axios.get(
         `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(url)}`,
         {
            ...AXIOS_DEFAULTS,
            signal
         }
      )
   )

   if (!data?.dl) {
      throw new Error('Okatsu failed')
   }

   return {
      download: data.dl,
      title: data.title
   }
}

// ===============================
// DOWNLOAD AUDIO
// ===============================

async function downloadAudio(url) {

   const apis = [
      {
         name: 'Elite',
         fn: elite
      },
      {
         name: 'Yupra',
         fn: yupra
      },
      {
         name: 'Okatsu',
         fn: okatsu
      }
   ]

   let lastError

   for (const api of apis) {

      try {

         console.log(`
╭──────────────────────⬣
│ 🚀 PROBANDO API
├──────────────────────⬣
│ 🌐 API: ${api.name}
╰──────────────────────⬣
`)

         const start = Date.now()

         const data = await api.fn(url)

         if (!data?.download) {
            throw new Error('No download URL')
         }

         console.log(`
╭──────────────────────⬣
│ ✅ API RESPONDIÓ
├──────────────────────⬣
│ 🌐 API: ${api.name}
│ ⚡ Tiempo: ${Date.now() - start}ms
╰──────────────────────⬣
`)

         const response = await axios({
            url: data.download,
            method: 'GET',
            responseType: 'stream',
            timeout: 40000,
            httpsAgent,
            validateStatus: status =>
               status >= 200 && status < 400,
            headers: {
               'User-Agent': 'Mozilla/5.0',
               'Accept': '*/*',
               'Connection': 'keep-alive',
               'Referer': 'https://youtube.com/'
            }
         })

         console.log(`
╭──────────────────────⬣
│ ✅ DESCARGA INICIADA
├──────────────────────⬣
│ 🌐 API: ${api.name}
│ 📥 Status: ${response.status}
╰──────────────────────⬣
`)

         return {
            response,
            data
         }

      } catch (err) {

         console.log(`
╭──────────────────────⬣
│ ❌ API FAILED
├──────────────────────⬣
│ 🌐 API: ${api.name}
│ 📄 Status: ${err?.response?.status || 'UNKNOWN'}
│ 💀 Error: ${err.message}
╰──────────────────────⬣
`)

         lastError = err
      }
   }

   console.log(`
╭──────────────────────⬣
│ 💀 TODAS LAS APIs FALLARON
╰──────────────────────⬣
`)

   throw lastError
}

// ===============================
// COMMAND
// ===============================

async function songCommand(sock, chatId, message) {

   const startTime = Date.now()

   try {

      console.log(`
╭──────────────────────⬣
│ 🎶 NUEVA DESCARGA
╰──────────────────────⬣
`)

      const text =
         message.message?.conversation ||
         message.message?.extendedTextMessage?.text ||
         ''

      const query = text.split(' ').slice(1).join(' ').trim()

      if (!query) {

         return await sock.sendMessage(chatId, {
            text: '🎵 Escribe una canción 😭'
         }, {
            quoted: message
         })
      }

      let video

      // ===============================
      // SEARCH
      // ===============================

      if (
         query.includes('youtube.com') ||
         query.includes('youtu.be')
      ) {

         video = {
            url: query,
            title: 'YouTube Audio',
            thumbnail: 'https://i.imgur.com/AfFp7pu.png',
            timestamp: 'Unknown',
            author: {
               name: 'Unknown'
            },
            views: 0,
            ago: 'Unknown'
         }

      } else {

         if (searchCache.has(query)) {

            console.log('⚡ Usando search cache')

            video = searchCache.get(query)

         } else {

            const search = await yts(query)

            if (!search?.videos?.length) {

               return await sock.sendMessage(chatId, {
                  text: '❌ No encontré resultados 😭'
               }, {
                  quoted: message
               })
            }

            video =
               search.videos.find(v =>
                  v.seconds > 30 &&
                  v.seconds < 1800 &&
                  !v.title.toLowerCase().includes('playlist')
               ) || search.videos[0]

            searchCache.set(query, video)

            limitMapSize(searchCache)

            setTimeout(() => {

               searchCache.delete(query)

            }, 1000 * 60 * 5)
         }
      }

      // ===============================
      // LOADING
      // ===============================

      const loading = await sock.sendMessage(chatId, {
         image: {
            url: video.thumbnail
         },
         caption:
`🎶 *DESCARGANDO AUDIO*

> ❀ Título: ${video.title}
> ❀ Autor: ${video.author?.name || 'Unknown'}
> ❀ Duración: ${video.timestamp || 'Unknown'}
> ❀ Vistas: ${video.views?.toLocaleString() || '0'}

> 🚀 Buscando servidor...
> ${createBar(5)} 5%`
      }, {
         quoted: message
      })

      // ===============================
      // DOWNLOAD
      // ===============================

      const {
         response: audioResponse,
         data: audioData
      } = await downloadAudio(video.url)

      const total = Number(
         audioResponse.headers['content-length']
      ) || 0

      let downloaded = 0
      let lastPercent = 0
      let chunks = []

      audioResponse.data.on('data', async chunk => {

         chunks.push(chunk)

         downloaded += chunk.length

         if (!total) return

         const percent = Math.floor(
            (downloaded / total) * 100
         )

         if (percent >= lastPercent + 15) {

            lastPercent = percent

            try {

               await sock.sendMessage(chatId, {
                  edit: loading.key,
                  image: {
                     url: video.thumbnail
                  },
                  caption:
`📥 *DESCARGANDO AUDIO*

> ❀ Título: ${video.title}
> ❀ Autor: ${video.author?.name || 'Unknown'}
> ❀ Peso: ${formatBytes(total)}

> ⚡ Descargando...
> ${createBar(percent)} ${percent}%`
               })

            } catch {}
         }
      })

      await new Promise((resolve, reject) => {

         audioResponse.data.on('end', resolve)
         audioResponse.data.on('error', reject)

      })

      const audioBuffer = Buffer.concat(chunks)

      chunks = null

      if (!audioBuffer || audioBuffer.length < 50000) {
         throw new Error('Invalid audio buffer')
      }

      // ===============================
      // PROCESS
      // ===============================

      await sock.sendMessage(chatId, {
         edit: loading.key,
         image: {
            url: video.thumbnail
         },
         caption:
`🔄 *PROCESANDO AUDIO*

> ❀ Título: ${video.title}

> ⚡ Convirtiendo audio...
> ${createBar(90)} 90%`
      })

      let finalBuffer

      if (isRealMp3(audioBuffer)) {

         finalBuffer = audioBuffer

      } else {

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

      if (!finalBuffer || finalBuffer.length < 50000) {
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
         {
            quoted: message
         }
      )

      // ===============================
      // FINAL
      // ===============================

      await sock.sendMessage(chatId, {
         edit: loading.key,
         image: {
            url: video.thumbnail
         },
         caption:
`✅ *AUDIO ENVIADO*

> ❀ Título: ${safeTitle}
> ❀ Autor: ${video.author?.name || 'Unknown'}
> ❀ Duración: ${video.timestamp || 'Unknown'}

> 🚀 Completado en ${((Date.now() - startTime) / 1000).toFixed(1)}s
> ${createBar(100)} 100%`
      })

      cleanMemory()

      console.log(`
╭──────────────────────⬣
│ ✅ DESCARGA COMPLETADA
├──────────────────────⬣
│ 🎧 ${safeTitle}
│ ⏱️ ${((Date.now() - startTime) / 1000).toFixed(1)}s
╰──────────────────────⬣
`)

   } catch (err) {

      console.error('❌ SONG ERROR:', err)

      let msg = '❌ Error descargando el audio 😭'

      if (
         err?.response?.status === 451 ||
         err?.message?.includes('451')
      ) {
         msg = '❌ Contenido bloqueado o restringido 😭'
      }

      await sock.sendMessage(chatId, {
         text: msg
      }, {
         quoted: message
      })

      cleanMemory()
   }
}

module.exports = songCommand