
const youtubedl = require('youtube-dl-exec')
const fs = require('fs')
const path = require('path')
const os = require('os')

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

// ======================================================
// LIMPIEZA
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
   '/home/container/cookies.txt'

function getCookiesStatus() {

   try {

      return (
         fs.existsSync(cookiesPath) &&
         fs.statSync(cookiesPath).size > 0
      )

   } catch {

      return false
   }
}

console.log(
   getCookiesStatus()
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
   cookies = false,
   format = null
} = {}) {

   const options = {
      ...BASE_OPTIONS
   }

   // Un solo cliente = menos tiempo
   options.extractorArgs =
      'youtube:player_client=default'

   // Cookies en tiempo real
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
// BUSCAR YOUTUBE
// ======================================================

async function searchYouTube(query) {

   console.log(`
╭──────────────────────⬣
│ 🔎 BUSCANDO YOUTUBE
├──────────────────────⬣
│ 🎵 ${query}
│ ⚡ SEARCH RÁPIDO
╰──────────────────────⬣
`)

   try {

      const results =
         await youtubedl(
            'ytsearch1:' + query,
            {
               ...youtubeOptions({
                  cookies: false
               }),

               flatPlaylist:
                  true,

               dumpSingleJson:
                  true,

               skipDownload:
                  true,

               playlistEnd:
                  1
            }
         )

      if (
         !results ||
         !Array.isArray(results.entries) ||
         !results.entries.length
      ) {

         throw new Error(
            'No se encontraron resultados'
         )
      }

      const selected =
         results.entries[0]

      if (
         !selected ||
         !selected.id
      ) {

         throw new Error(
            'Resultado de YouTube inválido'
         )
      }

      const videoUrl =
         selected.webpage_url ||
         (
            'https://www.youtube.com/watch?v=' +
            selected.id
         )

      console.log(
         '✅ VIDEO:',
         selected.title
      )

      console.log(
         '🎯 URL:',
         videoUrl
      )

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
// DESCARGA ULTRA RÁPIDA
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
            recursive: true
         }
      )
   }

   const fileId =
      Date.now() +
      '-' +
      Math.random()
         .toString(36)
         .slice(2, 8)

   const outputTemplate =
      path.join(
         tempDir,
         fileId + '.%(ext)s'
      )

   const cookiesEnabled =
      getCookiesStatus()

   console.log(`
╭──────────────────────⬣
│ 🚀 DESCARGA RÁPIDA
├──────────────────────⬣
│ 🎵 YT-DLP
│ ⚡ MODO M4A
│ 🍪 COOKIES: ${cookiesEnabled ? 'ON' : 'OFF'}
│ 🎯 CLIENT: default
│ 🚫 SIN CONVERSIÓN
╰──────────────────────⬣
`)

   try {

      const options =
         youtubeOptions({
            cookies:
               cookiesEnabled,

            // M4A directo = no necesita FFmpeg
            format:
               'bestaudio[ext=m4a]/bestaudio'
         })

      options.output =
         outputTemplate

      options.quiet =
         true

      options.noProgress =
         true

      options.noWarnings =
         true

      options.noPlaylist =
         true

      options.concurrentFragments =
         4

      options.retries =
         1

      await youtubedl(
         url,
         options,
         {
            timeout:
               90000
         }
      )

      const files =
         fs.readdirSync(
            tempDir
         ).filter(
            file =>
               file.startsWith(fileId)
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
            'Archivo descargado inexistente'
         )
      }

      const stats =
         fs.statSync(
            outputFile
         )

      if (!stats.size) {

         throw new Error(
            'Archivo descargado vacío'
         )
      }

      const buffer =
         fs.readFileSync(
            outputFile
         )

      console.log(`
╭──────────────────────⬣
│ ✅ DESCARGA COMPLETADA
├──────────────────────⬣
│ 🍪 COOKIES: ${getCookiesStatus() ? 'ON' : 'OFF'}
│ 📦 ${(stats.size / 1024 / 1024).toFixed(2)} MB
│ ⚡ SIN FFMPEG
╰──────────────────────⬣
`)

      // Eliminar temporal inmediatamente
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
            ).filter(
               file =>
                  file.startsWith(fileId)
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

> ⚡ Descarga rápida...
> ${createBar(25)} 25%`
            },
            {
               quoted:
                  message
            }
         )

      // ==================================================
      // DESCARGAR
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

      // ==================================================
      // NOMBRE
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
      // ACTUALIZAR MENSAJE
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
`⚡ *AUDIO LISTO*

> ❀ Título: ${safeTitle}

> 🚀 Enviando audio...
> ${createBar(90)} 90%`
            }
         )

      } catch {}

      // ==================================================
      // ENVIAR M4A
      // ==================================================

      await sock.sendMessage(
         chatId,
         {
            audio:
               audioBuffer,

            mimetype:
               'audio/mp4',

            fileName:
               safeTitle +
               '.m4a',

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

