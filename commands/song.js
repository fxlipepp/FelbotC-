```javascript
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

   return (
      '▰'.repeat(filled) +
      '▱'.repeat(total - filled)
   )
}

// ===============================
// COOKIES
// ===============================

const cookiesPath = path.join(
   process.cwd(),
   'cookies.txt'
)

const hasCookies =
   fs.existsSync(cookiesPath)

console.log(
   hasCookies
      ? '🍪 YOUTUBE COOKIES: ENCONTRADAS'
      : '⚠️ YOUTUBE COOKIES: NO ENCONTRADAS'
)

// ===============================
// BASE OPTIONS
// ===============================

const BASE_OPTIONS = {
   noWarnings: true,
   noPlaylist: true,

   ffmpegLocation:
      ffmpegPath,

   retries:
      1,

   noCheckCertificates:
      true,

   jsRuntimes:
      'node'
}

// ===============================
// OPCIONES YT-DLP
// ===============================

function youtubeOptions({
   client = null,
   cookies = false,
   format = null
} = {}) {

   const options = {
      ...BASE_OPTIONS
   }

   if (client) {
      options.extractorArgs =
         `youtube:player_client=${client}`
   }

   if (
      cookies &&
      hasCookies
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

// ===============================
// OBTENER INFO
// ===============================
//
// IMPORTANTE:
// Ya no hacemos:
// default OFF
// android OFF
// web OFF
// tv_embedded OFF
//
// Usamos cookies directamente porque
// tus logs demostraron que ese método funciona.
// ===============================

async function getVideoInfo(url) {

   console.log(
      `🔎 INFO YOUTUBE | 🍪 COOKIES: ${hasCookies ? 'ON' : 'OFF'}`
   )

   try {

      const info =
         await youtubedl(
            url,
            {
               ...youtubeOptions({
                  client:
                     'default',

                  cookies:
                     hasCookies,

                  format:
                     'bestaudio/best'
               }),

               dumpSingleJson:
                  true,

               skipDownload:
                  true
            }
         )

      if (
         info &&
         info.title
      ) {

         console.log(
            '✅ INFO FUNCIONAL'
         )

         return info
      }

      throw new Error(
         'Información de YouTube vacía'
      )

   } catch (error) {

      console.log(
         '⚠️ INFO YOUTUBE FALLÓ'
      )

      console.log(
         error?.stderr ||
         error?.message ||
         ''
      )

      throw error
   }
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

   try {

      console.log(
         '🔎 SEARCH CLIENT: default'
      )

      const results =
         await youtubedl(
            `ytsearch5:${query}`,
            {
               ...youtubeOptions({
                  client:
                     'default',

                  cookies:
                     false
               }),

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

      console.log(
         '✅ SEARCH FUNCIONAL'
      )

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

      // ===============================
      // INFO
      // ===============================
      //
      // Intentamos obtener información completa
      // solamente cuando realmente la necesitamos.
      // Si falla, usamos la información del search.
      // ===============================

      let info = selected

      try {

         info =
            await getVideoInfo(
               videoUrl
            )

      } catch {

         console.log(
            '⚡ USANDO INFO DEL SEARCH'
         )

         info =
            selected
      }

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
            selected.duration_string ||
            (
               info.duration
                  ? formatDuration(
                       info.duration
                    )
                  : 'Unknown'
            ),

         author: {
            name:
               info.uploader ||
               info.channel ||
               selected.uploader ||
               selected.channel ||
               'Unknown'
         },

         views:
            info.view_count ||
            selected.view_count ||
            0
      }

   } catch (error) {

      console.log(
         '❌ SEARCH ERROR:',
         error?.stderr ||
         error?.message ||
         error
      )

      throw error
   }
}

// ===============================
// DURACIÓN
// ===============================

function formatDuration(seconds) {

   if (!seconds) {
      return 'Unknown'
   }

   seconds =
      Math.floor(
         Number(seconds)
      )

   const minutes =
      Math.floor(
         seconds / 60
      )

   const remaining =
      seconds % 60

   return (
      `${minutes}:` +
      `${String(
         remaining
      ).padStart(2, '0')}`
   )
}

// ===============================
// DESCARGAR AUDIO
// ===============================
//
// DIRECTO CON COOKIES
//
// Ya no hacemos:
// OFF → OFF → OFF → OFF → ON
//
// Ahora:
// ON → descarga
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
│ 🎬 FFMPEG LOCAL
│ 🧠 NODE JS RUNTIME
│ 🍪 COOKIES DIRECTAS
│ 🎧 BEST AUDIO
╰──────────────────────⬣
`)

   try {

      console.log(
         `🎯 DOWNLOAD CLIENT: default | COOKIES: ${hasCookies ? 'ON' : 'OFF'}`
      )

      const options =
         youtubeOptions({
            client:
               'default',

            cookies:
               hasCookies,

            format:
               'bestaudio[ext=m4a]/bestaudio/best'
         })

      options.output =
         outputTemplate

      options.quiet =
         true

      options.noPlaylist =
         true

      await youtubedl(
         url,
         options,
         {
            timeout:
               120000
         }
      )

      const downloadedFiles =
         fs.readdirSync(
            tempDir
         ).filter(file =>
            file.startsWith(
               fileId
            )
         )

      if (!downloadedFiles.length) {
         throw new Error(
            'No se descargó ningún archivo'
         )
      }

      const downloadedFile =
         downloadedFiles[0]

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
         throw new Error(
            'El archivo descargado está vacío'
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
│ 🎯 CLIENT: default
│ 🍪 COOKIES: ${hasCookies ? 'ON' : 'OFF'}
│ 📦 ${(stats.size / 1024 / 1024).toFixed(2)} MB
╰──────────────────────⬣
`)

      try {
         fs.unlinkSync(
            outputFile
         )
      } catch {}

      return buffer

   } catch (error) {

      console.log(
         '❌ DOWNLOAD ERROR:',
         error?.stderr ||
         error?.message ||
         error
      )

      // Limpiar archivos temporales
      try {

         const files =
            fs.readdirSync(
               tempDir
            ).filter(file =>
               file.startsWith(
                  fileId
               )
            )

         for (const file of files) {

            try {
               fs.unlinkSync(
                  path.join(
                     tempDir,
                     file
                  )
               )
            } catch {}
         }

      } catch {}

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
         query.includes('youtube.com') ||
         query.includes('youtu.be')
      ) {

         console.log(
            '🔗 URL DIRECTA DE YOUTUBE'
         )

         let directInfo = {}

         try {

            directInfo =
               await getVideoInfo(
                  query
               )

         } catch {

            console.log(
               '⚡ INFO DIRECTA NO DISPONIBLE'
            )
         }

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
               (
                  directInfo.duration
                     ? formatDuration(
                          directInfo.duration
                       )
                     : 'Unknown'
               ),

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
               .slice(
                  0,
                  64
               )
               .toString('hex')

         let inputExt =
            'mp3'

         // MP4 / M4A
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
      // SAFE TITLE
      // ===============================

      const safeTitle =
         (video.title || 'song')
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
      // FINISHED
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

      try {

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

      } catch {}

      cleanMemory()
   }
}

module.exports = songCommand
```
