
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
   while (map.size > max) {
      const firstKey = map.keys().next().value
      if (!firstKey) break
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
   const filled = Math.max(
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

// ===============================
// COOKIES YOUTUBE
// ===============================

const cookiesPath = path.join(
   process.cwd(),
   'cookies.txt'
)

if (fs.existsSync(cookiesPath)) {
   console.log(
      '🍪 YOUTUBE COOKIES: ENCONTRADAS'
   )
} else {
   console.log(
      '⚠️ YOUTUBE COOKIES: NO ENCONTRADAS'
   )
}

// ===============================
// YT-DLP BASE OPTIONS
// ===============================

const YTDLP_OPTIONS = {
   noWarnings: true,
   noPlaylist: true,
   ffmpegLocation: ffmpegPath,
   retries: 3,
   socketTimeout: 30000,

   // No limitar a un solo cliente.
   // yt-dlp podrá elegir el extractor disponible.
   extractorArgs:
      'youtube:player_client=android,web,tv_embedded',

   ...(fs.existsSync(cookiesPath)
      ? {
           cookies: cookiesPath
        }
      : {})
}

// ===============================
// EXTRAER INFORMACIÓN
// ===============================

async function getVideoInfo(url) {

   return await youtubedl(
      url,
      {
         ...YTDLP_OPTIONS,

         dumpSingleJson:
            true,

         skipDownload:
            true,

         noCheckCertificates:
            true
      }
   )
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
      await youtubedl(
         `ytsearch5:${query}`,
         {
            ...YTDLP_OPTIONS,

            flatPlaylist:
               true,

            dumpSingleJson:
               true,

            skipDownload:
               true
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

   console.log(
      `🎯 VIDEO SELECCIONADO: ${videoUrl}`
   )

   const info =
      await getVideoInfo(
         videoUrl
      )

   return {
      url:
         videoUrl,

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
         info.view_count ||
         0
   }
}

// ===============================
// DESCARGA CON YT-DLP
// ===============================

async function runDownload(
   url,
   outputTemplate,
   format
) {

   const options = {
      ...YTDLP_OPTIONS,

      format,

      output:
         outputTemplate,

      quiet:
         true,

      noPlaylist:
         true,

      // Permitir que yt-dlp escoja
      // cualquier extensión disponible.
      mergeOutputFormat:
         'mp4',

      noPart:
         true,

      continuedl:
         false,

      retries:
         3,

      fragmentRetries:
         3,

      extractorRetries:
         3
   }

   console.log(
      `🎧 YT-DLP FORMAT: ${format}`
   )

   return await youtubedl(
      url,
      options,
      {
         timeout:
            180000
      }
   )
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
            recursive:
               true
         }
      )
   }

   const fileId =
      `${Date.now()}-` +
      `${Math.random()
         .toString(36)
         .slice(2)}`

   const outputTemplate =
      path.join(
         tempDir,
         `${fileId}.%(ext)s`
      )

   console.log(`
╭──────────────────────⬣
│ 🚀 DESCARGANDO AUDIO
├──────────────────────⬣
│ 🎵 YT-DLP LOCAL
│ 🍪 COOKIES YOUTUBE
│ 🎬 FFMPEG LOCAL
│ 🎧 AUTO FORMAT
╰──────────────────────⬣
`)

   const start =
      Date.now()

   if (!fs.existsSync(cookiesPath)) {
      throw new Error(
         'Se requiere cookies.txt de YouTube para extraer audio.'
      )
   }

   // ===============================
   // FORMATOS FALLBACK
   // ===============================

   const formats = [
      'bestaudio',
      'bestaudio/best',
      'best',
      'worstaudio/worst'
   ]

   let lastError = null
   let downloadedFile = null

   for (
      const format of formats
   ) {

      try {

         await runDownload(
            url,
            outputTemplate,
            format
         )

         downloadedFile =
            fs.readdirSync(
               tempDir
            ).find(file =>
               file.startsWith(
                  fileId
               )
            )

         if (
            downloadedFile
         ) {
            console.log(
               `✅ FORMATO FUNCIONAL: ${format}`
            )

            break
         }

      } catch (error) {

         lastError =
            error

         console.log(
            `⚠️ FORMATO FALLÓ: ${format}`
         )

         console.log(
            error?.stderr ||
            error?.message ||
            ''
         )

         // Limpiar cualquier archivo
         // parcial antes del siguiente intento.
         try {

            const files =
               fs.readdirSync(
                  tempDir
               )

            for (
               const file of files
            ) {

               if (
                  file.startsWith(
                     fileId
                  )
               ) {

                  fs.unlinkSync(
                     path.join(
                        tempDir,
                        file
                     )
                  )
               }
            }

         } catch {}
      }
   }

   if (!downloadedFile) {
      throw (
         lastError ||
         new Error(
            'YT-DLP no pudo descargar ningún formato disponible'
         )
      )
   }

   const outputFile =
      path.join(
         tempDir,
         downloadedFile
      )

   const stats =
      fs.statSync(
         outputFile
      )

   if (!stats.size) {

      try {
         fs.unlinkSync(
            outputFile
         )
      } catch {}

      throw new Error(
         'El audio descargado está vacío'
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
               quoted:
                  message
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

         console.log(
            '🔗 URL DIRECTA DE YOUTUBE'
         )

         const directInfo =
            await getVideoInfo(
               query
            )

         video = {
            url:
               query,

            title:
               directInfo.title ||
               'YouTube Audio',

            thumbnail:
               directInfo.thumbnail ||
               'https://i.imgur.com/AfFp7pu.png',

            timestamp:
               directInfo.duration_string ||
               'Unknown',

            author: {
               name:
                  directInfo.uploader ||
                  directInfo.channel ||
                  'Unknown'
            },

            views:
               directInfo.view_count ||
               0
         }

      } else {

         // ===============================
         // CACHE
         // ===============================

         if (
            searchCache.has(
               query
            )
         ) {

            console.log(
               '⚡ USANDO SEARCH CACHE'
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
               quoted:
                  message
            }
         )

      // ===============================
      // DOWNLOAD
      // ===============================

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

      console.log(
         'FIRST BYTES:',
         audioBuffer
            .slice(
               0,
               32
            )
            .toString(
               'hex'
            )
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
               .slice(
                  0,
                  64
               )
               .toString(
                  'hex'
               )

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

module.exports = songCommand