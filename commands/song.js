
const youtubedl = require('youtube-dl-exec')
const ffmpegPath = require('ffmpeg-static')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { toAudio } = require('../lib/converter')

// ===============================
// CACHE
// ===============================

const searchCache = new Map()

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

   return '▰'.repeat(filled) +
      '▱'.repeat(total - filled)
}

// ===============================
// YT-DLP OPTIONS
// ===============================

const YOUTUBE_CLIENTS = [
   ['player_client=android', 'player_skip=webpage'],
   ['player_client=tv_embedded', 'player_skip=webpage'],
   ['player_client=ios', 'player_skip=webpage']
]

function getYtDlpBaseOptions(extra = {}) {

   const cookiesPath =
      process.env.YOUTUBE_COOKIES ||
      path.join(process.cwd(), 'cookies.txt')

   const cookiesExists =
      fs.existsSync(cookiesPath)

   console.log(`
╭──────────────────────⬣
│ 🍪 YOUTUBE COOKIES
├──────────────────────⬣
│ 📁 Ruta: ${cookiesPath}
│ ${cookiesExists
      ? '✅ Archivo encontrado'
      : '❌ Archivo NO encontrado'}
╰──────────────────────⬣
`)

   const cookies =
      cookiesExists
         ? { cookies: cookiesPath }
         : {}

   return {
      noWarnings: true,
      noPlaylist: true,
      ffmpegLocation: ffmpegPath,
      preferFreeFormats: true,

      addHeader: [
         'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
         'Accept-Language: es-ES,es;q=0.9,en;q=0.8'
      ],

      ...cookies,
      ...extra
   }
}

async function runYtDlpWithFallback(
   input,
   options = {},
   execOptions = {}
) {

   let lastError

   for (const clientArgs of YOUTUBE_CLIENTS) {

      try {

         return await youtubedl(
            input,
            {
               ...getYtDlpBaseOptions(),
               ...options,

               extractorArgs: {
                  youtube: clientArgs
               }
            },
            execOptions
         )

      } catch (error) {

         lastError = error

         const rawError =
            error?.stderr ||
            error?.message ||
            ''

         if (
            !/sign in to confirm|not a bot|cookies-from-browser|cookies/i
               .test(rawError)
         ) {
            throw error
         }
      }
   }

   throw lastError
}

// ===============================
// BUSCAR YOUTUBE
// ===============================

async function searchYouTube(query) {

   console.log(`
╭──────────────────────⬣
│ 🔎 BUSCANDO CON YT-DLP
├──────────────────────⬣
│ 🎵 ${query}
╰──────────────────────⬣
`)

   const results =
      await runYtDlpWithFallback(
         `ytsearch5:${query}`,
         {
            flatPlaylist: true,
            dumpSingleJson: true,
            skipDownload: true
         }
      )

   if (
      !results ||
      !results.entries ||
      !results.entries.length
   ) {
      throw new Error(
         'No se encontraron resultados'
      )
   }

   const selected =
      results.entries.find(video =>
         video.title &&
         !video.title
            .toLowerCase()
            .includes('playlist') &&
         (
            !video.duration ||
            (
               video.duration > 30 &&
               video.duration < 1800
            )
         )
      ) ||
      results.entries.find(video =>
         video.title
      ) ||
      results.entries[0]

   if (!selected) {
      throw new Error(
         'No se encontró una canción'
      )
   }

   const videoUrl =
      selected.webpage_url ||
      selected.url ||
      (
         selected.id
            ? `https://www.youtube.com/watch?v=${selected.id}`
            : null
      )

   if (!videoUrl) {
      throw new Error(
         'No se pudo obtener la URL del video'
      )
   }

   const info =
      await runYtDlpWithFallback(
         videoUrl,
         {
            dumpSingleJson: true,
            skipDownload: true
         }
      )

   return {
      url: videoUrl,

      title:
         info.title ||
         selected.title ||
         'YouTube Audio',

      thumbnail:
         info.thumbnail ||
         selected.thumbnail ||
         'https://i.imgur.com/AfFp7pu.png',

      timestamp:
         info.duration_string ||
         'Unknown',

      author: {
         name:
            info.uploader ||
            info.channel ||
            'Unknown'
      },

      views:
         info.view_count || 0
   }
}

// ===============================
// DESCARGAR AUDIO
// ===============================

async function downloadAudio(url) {

   const tempDir =
      path.join(
         os.tmpdir(),
         'felbot-play'
      )

   if (!fs.existsSync(tempDir)) {

      fs.mkdirSync(
         tempDir,
         {
            recursive: true
         }
      )
   }

   const fileId =
      `${Date.now()}-` +
      `${Math.random()
         .toString(36)
         .slice(2)}`

   const outputFile =
      path.join(
         tempDir,
         `${fileId}.mp3`
      )

   console.log(`
╭──────────────────────⬣
│ 🚀 DESCARGANDO AUDIO
├──────────────────────⬣
│ 🎵 YT-DLP LOCAL
│ 🎬 FFMPEG LOCAL
╰──────────────────────⬣
`)

   const start =
      Date.now()

   try {

      await runYtDlpWithFallback(
         url,
         {
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: '128K',
            output: outputFile,
            quiet: true
         },
         {
            timeout: 120000
         }
      )

      if (!fs.existsSync(outputFile)) {

         throw new Error(
            'No se generó el MP3'
         )
      }

      const stats =
         fs.statSync(
            outputFile
         )

      if (!stats.size) {

         throw new Error(
            'El MP3 está vacío'
         )
      }

      const buffer =
         fs.readFileSync(
            outputFile
         )

      console.log(`
╭──────────────────────⬣
│ ✅ AUDIO DESCARGADO
├──────────────────────⬣
│ 📦 ${(stats.size / 1024 / 1024).toFixed(2)} MB
│ ⚡ ${(
   (Date.now() - start) /
   1000
).toFixed(1)}s
╰──────────────────────⬣
`)

      try {
         fs.unlinkSync(
            outputFile
         )
      } catch {}

      return buffer

   } catch (error) {

      try {

         if (
            fs.existsSync(
               outputFile
            )
         ) {
            fs.unlinkSync(
               outputFile
            )
         }

      } catch {}

      console.error(
         '❌ YT-DLP ERROR:',
         error?.stderr ||
         error?.message ||
         error
      )

      throw error
   }
}

// ===============================
// COMMAND
// ===============================

async function songCommand(
   sock,
   chatId,
   message
) {

   const startTime =
      Date.now()

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

      const query =
         text
            .split(' ')
            .slice(1)
            .join(' ')
            .trim()

      // ===============================
      // VALIDAR
      // ===============================

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
               quoted: message
            }
         )
      }

      let video

      // ===============================
      // URL DIRECTA
      // ===============================

      if (
         query.includes(
            'youtube.com'
         ) ||
         query.includes(
            'youtu.be'
         )
      ) {

         video =
            await runYtDlpWithFallback(
               query,
               {
                  dumpSingleJson: true,
                  skipDownload: true
               }
            )

         video = {

            url: query,

            title:
               video.title ||
               'YouTube Audio',

            thumbnail:
               video.thumbnail ||
               'https://i.imgur.com/AfFp7pu.png',

            timestamp:
               video.duration_string ||
               'Unknown',

            author: {
               name:
                  video.uploader ||
                  video.channel ||
                  'Unknown'
            },

            views:
               video.view_count || 0
         }

      } else {

         // ===============================
         // CACHE
         // ===============================

         if (
            searchCache.has(query)
         ) {

            console.log(
               '⚡ Usando search cache'
            )

            video =
               searchCache.get(
                  query
               )

         } else {

            video =
               await searchYouTube(
                  query
               )

            searchCache.set(
               query,
               video
            )

            limitMapSize(
               searchCache
            )

            setTimeout(() => {

               searchCache.delete(
                  query
               )

            }, 1000 * 60 * 5)
         }
      }

      // ===============================
      // LOADING
      // ===============================

      const loading =
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
> ❀ Vistas: ${video.views?.toLocaleString() || '0'}

> 🚀 Buscando canción...
> ${createBar(10)} 10%`
            },
            {
               quoted: message
            }
         )

      // ===============================
      // DOWNLOAD
      // ===============================

      let audioBuffer =
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

      console.log(
         'FIRST BYTES:',
         audioBuffer
            .slice(0, 32)
            .toString('hex')
      )

      // ===============================
      // PROCESS
      // ===============================

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
`🔄 *PROCESANDO AUDIO*

> ❀ Título: ${video.title}

> ⚡ Convirtiendo audio...
> ${createBar(90)} 90%`
         }
      )

      let finalBuffer

      try {

         const firstBytes =
            audioBuffer
               .slice(0, 64)
               .toString('hex')

         let inputExt =
            'mp3'

         if (
            firstBytes.includes(
               '66747970'
            )
         ) {
            inputExt =
               'mp4'
         }

         console.log(
            `🔍 INPUT EXT: ${inputExt}`
         )

         finalBuffer =
            await toAudio(
               audioBuffer,
               inputExt
            )

      } catch (err) {

         console.log(
            '⚠️ Conversión no necesaria:',
            err?.message ||
            err
         )

         finalBuffer =
            audioBuffer
      }

      if (
         !finalBuffer ||
         finalBuffer.length < 50000
      ) {

         throw new Error(
            'Conversion failed'
         )
      }

      // ===============================
      // TITLE
      // ===============================

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

      // ===============================
      // SEND AUDIO
      // ===============================

      await sock.sendMessage(
         chatId,
         {
            audio:
               finalBuffer,

            mimetype:
               'audio/mpeg',

            fileName:
               `${safeTitle}.mp3`,

            ptt:
               false
         },
         {
            quoted:
               message
         }
      )

      // ===============================
      // FINAL
      // ===============================

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

> 🚀 Completado en ${(
   (Date.now() -
      startTime) /
   1000
).toFixed(1)}s
> ${createBar(100)} 100%`
         }
      )

      console.log(`
╭──────────────────────⬣
│ ✅ DESCARGA COMPLETADA
├──────────────────────⬣
│ 🎧 ${safeTitle}
│ ⏱️ ${(
   (Date.now() -
      startTime) /
   1000
).toFixed(1)}s
╰──────────────────────⬣
`)

      cleanMemory()

   } catch (err) {

      console.error(
         '❌ SONG ERROR:',
         err?.stderr ||
         err?.message ||
         err
      )

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

      cleanMemory()
   }
}

