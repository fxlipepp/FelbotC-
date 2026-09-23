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
      'node',

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

   options.extractorArgs =
      'youtube:player_client=default'

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
         !Array.isArray(
            results.entries
         ) ||
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
               file.startsWith(fileId) &&
               !file.endsWith('.part') &&
               !file.endsWith('.ytdl')
         )

      if (!files.length) {

         throw new Error(
            'No se descargó ningún archivo'
         )
      }

      const downloadedFile =
         files.find(
            file =>
               file
                  .toLowerCase()
                  .endsWith('.m4a')
         ) ||
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

      return buffer

   } catch (error) {

      console.log(
         '❌ DOWNLOAD ERROR:',
         error?.stderr ||
         error?.message ||
         error
      )

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

> ⚡ Descarga rápida...
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