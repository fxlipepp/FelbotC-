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
      2,

   noCheckCertificates:
      true,

   // Importante para YouTube moderno
   jsRuntimes:
      'node'
}

// ===============================
// CREAR OPCIONES
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
// CLIENTES
// ===============================

// Primero intentamos sin cookies.
// Si falla, probamos con cookies.
// Esto evita que unas cookies incompatibles
// bloqueen todos los formatos.

const CLIENTS = [
   {
      name: 'default',
      cookies: false
   },
   {
      name: 'android',
      cookies: false
   },
   {
      name: 'web',
      cookies: false
   },
   {
      name: 'tv_embedded',
      cookies: false
   },
   {
      name: 'default',
      cookies: true
   },
   {
      name: 'web_safari',
      cookies: true
   },
   {
      name: 'android',
      cookies: true
   },
   {
      name: 'web',
      cookies: true
   }
]

// ===============================
// OBTENER INFO
// ===============================

async function getVideoInfo(url) {

   let lastError = null

   for (const config of CLIENTS) {

      try {

         console.log(
            `🔎 INFO CLIENT: ${config.name} | COOKIES: ${config.cookies ? 'ON' : 'OFF'}`
         )

         const info =
            await youtubedl(
               url,
               {
                  ...youtubeOptions({
                     client:
                        config.name,

                     cookies:
                        config.cookies,

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
               `✅ INFO FUNCIONAL: ${config.name} | COOKIES: ${config.cookies ? 'ON' : 'OFF'}`
            )

            return info
         }

      } catch (error) {

         lastError =
            error

         console.log(
            `⚠️ INFO FALLÓ: ${config.name} | COOKIES: ${config.cookies ? 'ON' : 'OFF'}`
         )

         console.log(
            error?.stderr ||
            error?.message ||
            ''
         )
      }
   }

   throw (
      lastError ||
      new Error(
         'No se pudo obtener información de YouTube'
      )
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

   let results = null
   let lastError = null

   const searchClients = [
      {
         name: 'default',
         cookies: false
      },
      {
         name: 'android',
         cookies: false
      },
      {
         name: 'web',
         cookies: false
      },
      {
         name: 'default',
         cookies: true
      }
   ]

   for (const config of searchClients) {

      try {

         console.log(
            `🔎 SEARCH CLIENT: ${config.name} | COOKIES: ${config.cookies ? 'ON' : 'OFF'}`
         )

         results =
            await youtubedl(
               `ytsearch5:${query}`,
               {
                  ...youtubeOptions({
                     client:
                        config.name,

                     cookies:
                        config.cookies
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
            results &&
            results.entries &&
            results.entries.length
         ) {

            console.log(
               `✅ SEARCH FUNCIONAL: ${config.name}`
            )

            break
         }

      } catch (error) {

         lastError =
            error

         console.log(
            `⚠️ SEARCH FALLÓ: ${config.name}`
         )

         console.log(
            error?.stderr ||
            error?.message ||
            ''
         )
      }
   }

   if (
      !results ||
      !results.entries ||
      !results.entries.length
   ) {
      throw (
         lastError ||
         new Error(
            'No se encontraron resultados'
         )
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

   let info = {}

   try {

      info =
         await getVideoInfo(
            videoUrl
         )

   } catch (error) {

      console.log(
         '⚠️ INFO COMPLETA NO DISPONIBLE'
      )

      console.log(
         error?.stderr ||
         error?.message ||
         ''
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
         'Unknown',

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
│ 🎬 FFMPEG LOCAL
│ 🧠 NODE JS RUNTIME
│ 🎧 BEST AUDIO
╰──────────────────────⬣
`)

   let lastError = null

   for (const config of CLIENTS) {

      try {

         console.log(
            `🎯 DOWNLOAD CLIENT: ${config.name} | COOKIES: ${config.cookies ? 'ON' : 'OFF'}`
         )

         const options =
            youtubeOptions({
               client:
                  config.name,

               cookies:
                  config.cookies,

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

         const downloadedFile =
            fs.readdirSync(
               tempDir
            ).find(file =>
               file.startsWith(
                  fileId
               )
            )

         if (!downloadedFile) {
            throw new Error(
               'No se descargó ningún archivo'
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
│ 🎯 CLIENT: ${config.name}
│ 🍪 COOKIES: ${config.cookies ? 'ON' : 'OFF'}
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

         lastError =
            error

         console.log(
            `⚠️ DOWNLOAD FALLÓ: ${config.name} | COOKIES: ${config.cookies ? 'ON' : 'OFF'}`
         )

         console.log(
            error?.stderr ||
            error?.message ||
            ''
         )

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
      }
   }

   throw (
      lastError ||
      new Error(
         'Todos los métodos de descarga fallaron'
      )
   )
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

         } catch (error) {

            console.log(
               '⚠️ INFO DIRECTA FALLÓ'
            )

            console.log(
               error?.stderr ||
               error?.message ||
               ''
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
               .slice(
                  0,
                  64
               )
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