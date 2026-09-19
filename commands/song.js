
const youtubedl = require('youtube-dl-exec')
const ffmpegPath = require('ffmpeg-static')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { toAudio } = require('../lib/converter')

// ======================================================
// CACHE
// ======================================================

const searchCache = new Map()

function limitMapSize(map, max = 100) {
   while (map.size > max) {
      const firstKey = map.keys().next().value

      if (!firstKey) {
         break
      }

      map.delete(firstKey)
   }
}

// ======================================================
// LIMPIEZA DE MEMORIA
// ======================================================

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
   path.join(
      process.cwd(),
      'cookies.txt'
   )

const hasCookies =
   fs.existsSync(
      cookiesPath
   )

console.log(
   hasCookies
      ? '🍪 YOUTUBE COOKIES: ENCONTRADAS'
      : '⚠️ YOUTUBE COOKIES: NO ENCONTRADAS'
)

// ======================================================
// OPCIONES BASE
// ======================================================

const BASE_OPTIONS = {

   noWarnings:
      true,

   noPlaylist:
      true,

   ffmpegLocation:
      ffmpegPath,

   retries:
      1,

   noCheckCertificates:
      true,

   jsRuntimes:
      'node'
}

// ======================================================
// OPCIONES YT-DLP
// ======================================================

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
         'youtube:player_client=' +
         client
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

// ======================================================
// FORMATO DURACIÓN
// ======================================================

function formatDuration(seconds) {

   if (
      seconds === undefined ||
      seconds === null ||
      Number.isNaN(
         Number(seconds)
      )
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
      String(
         remaining
      ).padStart(
         2,
         '0'
      )
   )
}

// ======================================================
// INFORMACIÓN DEL VIDEO
// ======================================================
//
// IMPORTANTE:
// Se usa directamente cookies.
// No hacemos:
//
// default OFF
// android OFF
// web OFF
// tv_embedded OFF
//
// Tus logs demostraron que:
//
// default + cookies = FUNCIONA
// ======================================================

async function getVideoInfo(url) {

   console.log(
      '🔎 INFO YOUTUBE | 🍪 COOKIES: ' +
      (
         hasCookies
            ? 'ON'
            : 'OFF'
      )
   )

   try {

      const options =
         youtubeOptions({
            client:
               'default',

            cookies:
               hasCookies,

            format:
               'bestaudio/best'
         })

      const info =
         await youtubedl(
            url,
            {
               ...options,

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

// ======================================================
// BUSCAR YOUTUBE
// ======================================================

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
            'ytsearch5:' +
            query,
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
         !Array.isArray(
            results.entries
         ) ||
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
         results.entries.find(
            video =>
               video &&
               video.title &&
               !video.title
                  .toLowerCase()
                  .includes(
                     'playlist'
                  ) &&
               (
                  !video.duration ||
                  (
                     Number(
                        video.duration
                     ) > 30 &&
                     Number(
                        video.duration
                     ) < 1800
                  )
               )
         ) ||
         results.entries.find(
            video =>
               video &&
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
               ? 'https://www.youtube.com/watch?v=' +
                 selected.id
               : null
         )

      if (!videoUrl) {

         throw new Error(
            'No se pudo obtener la URL del video'
         )
      }

      console.log(
         '🎯 VIDEO SELECCIONADO: ' +
         videoUrl
      )

      // ==================================================
      // USAR INFORMACIÓN DEL SEARCH
      // ==================================================
      //
      // Primero devolvemos lo que ya tenemos.
      // Esto evita una consulta adicional lenta.
      //
      // La descarga posteriormente usa cookies.
      // ==================================================

      return {

         url:
            videoUrl,

         title:
            selected.title ||
            'YouTube Audio',

         thumbnail:
            selected.thumbnail ||
            (
               selected.thumbnails &&
               selected.thumbnails.length
                  ? selected.thumbnails[
                       selected.thumbnails.length - 1
                    ].url
                  : 'https://i.imgur.com/AfFp7pu.png'
            ),

         timestamp:
            selected.duration_string ||
            (
               selected.duration
                  ? formatDuration(
                       selected.duration
                    )
                  : 'Unknown'
            ),

         author: {

            name:
               selected.uploader ||
               selected.channel ||
               'Unknown'
         },

         views:
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

// ======================================================
// DESCARGAR AUDIO
// ======================================================
//
// MÉTODO RÁPIDO:
//
// SEARCH
//    ↓
// DOWNLOAD CON COOKIES
//    ↓
// FFMPEG
//
// No hacemos múltiples clientes.
// ======================================================

async function downloadAudio(url) {

   const tempDir =
      path.join(
         os.tmpdir(),
         'felbot-play'
      )

   if (
      !fs.existsSync(
         tempDir
      )
   ) {

      fs.mkdirSync(
         tempDir,
         {
            recursive:
               true
         }
      )
   }

   const fileId =
      Date.now() +
      '-' +
      Math.random()
         .toString(36)
         .slice(2)

   const outputTemplate =
      path.join(
         tempDir,
         fileId +
         '.%(ext)s'
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
         '🎯 DOWNLOAD CLIENT: default | COOKIES: ' +
         (
            hasCookies
               ? 'ON'
               : 'OFF'
         )
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

      const files =
         fs.readdirSync(
            tempDir
         ).filter(
            file =>
               file.startsWith(
                  fileId
               )
         )

      if (!files.length) {

         throw new Error(
            'No se descargó ningún archivo'
         )
      }

      const downloadedFile =
         files[0]

      const outputFile =
         path.join(
            tempDir,
            downloadedFile
         )

      if (
         !fs.existsSync(
            outputFile
         )
      ) {

         throw new Error(
            'El archivo descargado no existe'
         )
      }

      const stats =
         fs.statSync(
            outputFile
         )

      if (
         !stats.size
      ) {

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

      // ================================================
      // LIMPIAR TEMPORALES
      // ================================================

      try {

         const files =
            fs.readdirSync(
               tempDir
            ).filter(
               file =>
                  file.startsWith(
                     fileId
                  )
            )

         for (
            const file of files
         ) {

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

   try {

      console.log(`
╭──────────────────────⬣
│ 🎶 NUEVA DESCARGA
╰──────────────────────⬣
`)

      // ==================================================
      // TEXTO
      // ==================================================

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

      let video

      // ==================================================
      // URL DIRECTA
      // ==================================================

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

         let directInfo = null

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
               directInfo?.title ||
               'YouTube Audio',

            thumbnail:
               directInfo?.thumbnail ||
               'https://i.imgur.com/AfFp7pu.png',

            timestamp:
               directInfo?.duration_string ||
               (
                  directInfo?.duration
                     ? formatDuration(
                          directInfo.duration
                       )
                     : 'Unknown'
               ),

            author: {

               name:
                  directInfo?.uploader ||
                  directInfo?.channel ||
                  'Unknown'
            },

            views:
               directInfo?.view_count ||
               0
         }

      } else {

         // ==================================================
         // CACHE
         // ==================================================

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
               '⚡ USANDO SEARCH CACHE'
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

      // ==================================================
      // LOADING
      // ==================================================

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
> ❀ Vistas: ${Number(
   video.views || 0
).toLocaleString()}

> 🚀 Buscando canción...
> ${createBar(10)} 10%`
            },
            {
               quoted:
                  message
            }
         )

      // ==================================================
      // DESCARGA
      // ==================================================

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

      // ==================================================
      // PROCESAR
      // ==================================================

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
`🔄 *PROCESANDO AUDIO*

> ❀ Título: ${video.title}

> ⚡ Convirtiendo audio...
> ${createBar(90)} 90%`
            }
         )

      } catch {}

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

         // ftyp = MP4 / M4A
         if (
            firstBytes.includes(
               '66747970'
            )
         ) {

            inputExt =
               'mp4'
         }

         console.log(
            '🔍 INPUT EXT: ' +
            inputExt
         )

         finalBuffer =
            await toAudio(
               audioBuffer,
               inputExt
            )

      } catch (error) {

         console.log(
            '⚠️ Conversión no necesaria:',
            error?.message ||
            error
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

      // ==================================================
      // NOMBRE SEGURO
      // ==================================================

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

      // ==================================================
      // ENVIAR AUDIO
      // ==================================================

      await sock.sendMessage(
         chatId,
         {
            audio:
               finalBuffer,

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

      // ==================================================
      // FINALIZADO
      // ==================================================

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

> 🚀 Completado en ${(
   (
      Date.now() -
      startTime
   ) /
   1000
).toFixed(1)}s
> ${createBar(100)} 100%`
            }
         )

      } catch {}

      console.log(`
╭──────────────────────⬣
│ ✅ DESCARGA COMPLETADA
├──────────────────────⬣
│ 🎧 ${safeTitle}
│ ⏱️ ${(
   (
      Date.now() -
      startTime
   ) /
   1000
).toFixed(1)}s
╰──────────────────────⬣
`)

      cleanMemory()

   } catch (error) {

      console.error(
         '❌ SONG ERROR:',
         error?.stderr ||
         error?.message ||
         error
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

// ======================================================
// EXPORT
// ======================================================

module.exports =
   songCommand
