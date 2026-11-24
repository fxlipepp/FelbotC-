const axios = require('axios')
const yts = require('yt-search')
const fs = require('fs')
const path = require('path')
const os = require('os')

const API_BASE = (process.env.API_BASE || 'https://api.orbitxspace.com').replace(/\\/+$/, '')
const API_KEY = process.env.API_KEY || 'Russellxz'
const API_RESOLVE = `${API_BASE}/youtube/resolve`
const API_TIMEOUT = 300000

// ======================================================
// CACHE
// ======================================================

const searchCache = new Map()

function limitMapSize(map, max = 100) {
   while (map.size > max) {
      const firstKey = map.keys().next().value

      if (!firstKey) break

      map.delete(firstKey)
   }
}

function cleanMemory() {
   try {

      if (searchCache.size > 70) {
         searchCache.clear()
      }

      if (
         global.gc &&
         typeof global.gc === 'function'
      ) {
         global.gc()
      }

   } catch {}
}

setInterval(
   cleanMemory,
   1000 * 60 * 20
)

// ======================================================
// BARRA
// ======================================================

function createBar(percent) {

   const total = 10

   const filled =
      Math.max(
         0,
         Math.min(
            total,
            Math.round(percent / 10)
         )
      )

   return (
      '▰'.repeat(filled) +
      '▱'.repeat(total - filled)
   )
}

// ======================================================
// COOKIES
// ======================================================

const cookiesPath =
   '/home/container/cookies.txt'

const YOUTUBE_USER_AGENT =
   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36'

function getCookiesStatus() {

   try {

      if (!fs.existsSync(cookiesPath)) {
         return false
      }

      const stats =
         fs.statSync(
            cookiesPath
         )

      return (
         stats.isFile() &&
         stats.size > 100
      )

   } catch {

      return false
   }
}

function validateCookiesFile() {

   try {

      if (!getCookiesStatus()) {
         return false
      }

      const content =
         fs.readFileSync(
            cookiesPath,
            'utf8'
         )

      const firstLine =
         content
            .split(/\r?\n/)
            .find(
               line =>
                  line.trim().length > 0
            )

      return (
         firstLine === '# HTTP Cookie File' ||
         firstLine === '# Netscape HTTP Cookie File'
      )

   } catch {

      return false
   }
}

const cookiesAvailable =
   validateCookiesFile()

console.log(
   cookiesAvailable
      ? '🍪 YOUTUBE COOKIES: ON'
      : '⚠️ YOUTUBE COOKIES: OFF'
)

// ======================================================
// OPCIONES BASE
// ======================================================

const BASE_OPTIONS = {

   noWarnings:
      true,

   noPlaylist:
      true,

   retries:
      1,

   noCheckCertificates:
      true,

   jsRuntimes:
      'node:/usr/local/bin/node',

   userAgent:
      YOUTUBE_USER_AGENT
}

// ======================================================
// OPCIONES YT-DLP
// ======================================================

function youtubeOptions({
   cookies = false,
   format = null
} = {}) {

   const options = {
      ...BASE_OPTIONS
   }

   // Dejar que yt-dlp seleccione automáticamente los clientes de YouTube.
   // Forzar web_embedded/default aquí provocaba respuestas sin formatos disponibles.

   if (
      cookies &&
      getCookiesStatus()
   ) {

      options.cookies =
         cookiesPath
   }

   if (format) {

      options.format =
         format
   }

   return options
}

// ======================================================
// DURACIÓN
// ======================================================

function formatDuration(seconds) {

   if (
      seconds === undefined ||
      seconds === null ||
      Number.isNaN(Number(seconds))
   ) {
      return 'Unknown'
   }

   const total =
      Math.floor(
         Number(seconds)
      )

   const minutes =
      Math.floor(
         total / 60
      )

   const remaining =
      total % 60

   return (
      String(minutes) +
      ':' +
      String(remaining).padStart(
         2,
         '0'
      )
   )
}

// ======================================================
// REACCIONES
// ======================================================

async function reactToSong(
   sock,
   message,
   emoji
) {

   try {

      if (!message?.key) {
         return
      }

      await sock.sendMessage(
         message.key.remoteJid,
         {
            react: {
               text: emoji,
               key: message.key
            }
         }
      )

   } catch {}
}

// ======================================================
// BUSCAR YOUTUBE
// ======================================================

async function searchYouTube(query) {
   console.log('🔎 BUSCANDO YOUTUBE:', query)
   const results = await yts(query)
   const selected = results.videos?.[0]
   if (!selected?.url) throw new Error('No se encontraron resultados en YouTube')
   console.log('✅ VIDEO:', selected.title)
   console.log('🎯 URL:', selected.url)
   return {
      url: selected.url,
      title: selected.title || 'YouTube Audio',
      thumbnail: selected.thumbnail || 'https://i.imgur.com/AfFp7pu.png',
      timestamp: selected.timestamp || 'Unknown',
      author: { name: selected.author?.name || 'Unknown' },
      views: selected.views || 0
   }
}

// ======================================================
// DESCARGA ULTRA RÁPIDA
// ======================================================

function absolutizarApiUrl(value) {
   if (!value || typeof value !== 'string') return ''
   return value.startsWith('/') ? API_BASE + value : value
}

function esUrlDeLaApi(value) {
   try {
      return new URL(value).host === new URL(API_BASE).host
   } catch {
      return false
   }
}

async function downloadAudio(videoUrl) {
   console.log('🚀 RESOLVIENDO AUDIO CON ORBITXSPACE')
   const response = await axios.post(
      API_RESOLVE,
      { url: videoUrl, type: 'audio', format: 'mp3' },
      {
         timeout: API_TIMEOUT,
         headers: {
            'Content-Type': 'application/json',
            apikey: API_KEY,
            Accept: 'application/json, */*'
         },
         validateStatus: () => true
      }
   )

   const data = response.data
   if (!data || typeof data !== 'object') throw new Error('La API devolvió una respuesta no válida')
   const ok = data.status === true || data.status === 'true' || data.ok === true || data.success === true
   if (!ok) throw new Error(data.message || data.error || `API HTTP_${response.status}`)

   const result = data.result || data.data || data
   const media = result.media
   const candidates = typeof media === 'string'
      ? [absolutizarApiUrl(media)]
      : [
           absolutizarApiUrl(media?.direct),
           absolutizarApiUrl(media?.dl_download),
           absolutizarApiUrl(media?.dl_inline),
           absolutizarApiUrl(media?.url || media?.download),
           absolutizarApiUrl(result.url || result.download)
        ]

   const urls = [...new Set(candidates.filter(Boolean))]
   if (!urls.length) throw new Error('OrbitXSpace no devolvió enlaces de descarga')

   let lastError
   for (const mediaUrl of urls) {
      try {
         const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
            Accept: '*/*'
         }
         if (esUrlDeLaApi(mediaUrl)) headers.apikey = API_KEY

         const fileResponse = await axios.get(mediaUrl, {
            responseType: 'arraybuffer',
            timeout: API_TIMEOUT,
            headers,
            maxRedirects: 5,
            validateStatus: () => true
         })
         if (fileResponse.status >= 400) throw new Error(`Descarga HTTP_${fileResponse.status}`)

         const contentType = String(fileResponse.headers?.['content-type'] || '')
         if (/text\/html|application\/json/i.test(contentType)) {
            throw new Error(`El enlace devolvió ${contentType.split(';')[0]}, no un audio`)
         }

         const buffer = Buffer.from(fileResponse.data)
         if (buffer.length < 10000) throw new Error('El archivo recibido está vacío o incompleto')

         console.log(`✅ AUDIO RECIBIDO: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`)
         return buffer
      } catch (error) {
         lastError = error
         console.error('[OrbitXSpace] enlace falló:', error.message)
      }
   }

   throw lastError || new Error('No se pudo descargar el audio desde OrbitXSpace')
}

// ======================================================
// COMMAND
// ======================================================

async function songCommand(
   sock,
   chatId,
   message
) {

   const startTime =
      Date.now()

   let loading = null

   try {

      console.log(`
╭──────────────────────⬣
│ 🎶 NUEVA DESCARGA
╰──────────────────────⬣
`)

      const text =
         message?.message?.conversation ||
         message?.message?.extendedTextMessage?.text ||
         ''

      const query =
         text
            .split(' ')
            .slice(1)
            .join(' ')
            .trim()

      if (!query) {

         return await sock.sendMessage(
            chatId,
            {
               text:
                  '🎵 Escribe una canción 😭\n\n' +
                  'Ejemplo:\n' +
                  '.play Canserbero - Es épico'
            },
            {
               quoted:
                  message
            }
         )
      }

      await reactToSong(
         sock,
         message,
         '🔎'
      )

      let video

      if (
         query.includes('youtube.com') ||
         query.includes('youtu.be')
      ) {

         console.log(
            '🔗 URL DIRECTA'
         )

         video = {

            url:
               query,

            title:
               'YouTube Audio',

            thumbnail:
               'https://i.imgur.com/AfFp7pu.png',

            timestamp:
               'Unknown',

            author: {
               name:
                  'YouTube'
            },

            views:
               0
         }

      } else {

         const cacheKey =
            query
               .toLowerCase()
               .trim()

         if (
            searchCache.has(
               cacheKey
            )
         ) {

            console.log(
               '⚡ SEARCH CACHE'
            )

            video =
               searchCache.get(
                  cacheKey
               )

         } else {

            video =
               await searchYouTube(
                  query
               )

            searchCache.set(
               cacheKey,
               video
            )

            limitMapSize(
               searchCache
            )

            setTimeout(
               () => {

                  searchCache.delete(
                     cacheKey
                  )

               },
               1000 * 60 * 5
            )
         }
      }

      await reactToSong(
         sock,
         message,
         '🎵'
      )

      loading =
         await sock.sendMessage(
            chatId,
            {
               image: {
                  url:
                     video.thumbnail
               },

               caption:
`🎶 *DESCARGANDO AUDIO*

> ❀ Título: ${video.title}
> ❀ Autor: ${video.author?.name || 'Unknown'}
> ❀ Duración: ${video.timestamp || 'Unknown'}
> ❀ Vistas: ${Number(
   video.views || 0
).toLocaleString()}

> ⚡ Descargando audio...
> ${createBar(25)} 25%`
            },
            {
               quoted:
                  message
            }
         )

      const audioBuffer =
         await downloadAudio(
            video.url
         )

      if (
         !audioBuffer ||
         audioBuffer.length < 50000
      ) {

         throw new Error(
            'Audio inválido'
         )
      }

      const safeTitle =
         (
            video.title ||
            'song'
         )
            .replace(
               /[^\w\s-]/g,
               ''
            )
            .trim()
            .slice(
               0,
               100
            ) ||
         'song'

      try {

         await sock.sendMessage(
            chatId,
            {
               edit:
                  loading.key,

               image: {
                  url:
                     video.thumbnail
               },

               caption:
`⚡ *AUDIO LISTO*

> ❀ Título: ${safeTitle}

> 🚀 Enviando audio...
> ${createBar(90)} 90%`
            }
         )

      } catch {}

      await sock.sendMessage(
         chatId,
         {
            audio:
               audioBuffer,

            mimetype:
               'audio/mpeg',

            fileName:
               safeTitle +
               '.mp3',

            ptt:
               false
         },
         {
            quoted:
               message
         }
      )

      await reactToSong(
         sock,
         message,
         '✅'
      )

      const totalTime =
         (
            (
               Date.now() -
               startTime
            ) /
            1000
         ).toFixed(1)

      try {

         await sock.sendMessage(
            chatId,
            {
               edit:
                  loading.key,

               image: {
                  url:
                     video.thumbnail
               },

               caption:
`✅ *AUDIO ENVIADO*

> ❀ Título: ${safeTitle}
> ❀ Autor: ${video.author?.name || 'Unknown'}
> ❀ Duración: ${video.timestamp || 'Unknown'}

> ⚡ Completado en ${totalTime}s
> ${createBar(100)} 100%`
            }
         )

      } catch {}

      console.log(`
╭──────────────────────⬣
│ ✅ PLAY COMPLETADO
├──────────────────────⬣
│ 🎧 ${safeTitle}
│ ⚡ MODO RÁPIDO
│ 📦 M4A DIRECTO
│ ⏱️ ${totalTime}s
╰──────────────────────⬣
`)

      cleanMemory()

      return true

   } catch (error) {

      console.error(
         '❌ SONG ERROR:',
         error?.stderr ||
         error?.message ||
         error
      )

      await reactToSong(
         sock,
         message,
         '❌'
      )

      try {

         if (loading) {

            await sock.sendMessage(
               chatId,
               {
                  edit:
                     loading.key,

                  image: {
                     url:
                        'https://i.imgur.com/AfFp7pu.png'
                  },

                  caption:
`❌ *ERROR EN LA DESCARGA*

> No se pudo obtener el audio.

> 🔄 Inténtalo nuevamente.`
               }
            )

         } else {

            await sock.sendMessage(
               chatId,
               {
                  text:
                     '❌ Error descargando el audio 😭'
               },
               {
                  quoted:
                     message
               }
            )
         }

      } catch {}

      cleanMemory()

      return false
   }
}

// ======================================================
// EXPORT
// ======================================================

module.exports =
   songCommand