
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

setInterval(() => {
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
}, 1000 * 60 * 20)

// ======================================================
// PROGRESO
// ======================================================

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

function progressText(percent) {
   return `${createBar(percent)} ${percent}%`
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
         fs.statSync(cookiesPath)

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
   noWarnings: true,
   noPlaylist: true,
   retries: 1,
   noCheckCertificates: true,
   jsRuntimes: 'node',
   userAgent: YOUTUBE_USER_AGENT
}

// ======================================================
// OPCIONES YT-DLP
// ======================================================

function youtubeOptions({
   format = null
} = {}) {

   const options = {
      ...BASE_OPTIONS
   }

   options.extractorArgs =
      'youtube:player_client=default'

   if (cookiesAvailable) {
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
// LIMPIAR TÍTULO
// ======================================================

function sanitizeSongTitle(
   title = 'song'
) {

   return (
      String(title)
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
   )
}

// ======================================================
// REACCIÓN
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

async function searchYouTube(
   query
) {

   console.log(
      `🎶 PLAY | 🔎 ${query} | 🍪 ${cookiesAvailable ? 'ON' : 'OFF'}`
   )

   try {

      const results =
         await youtubedl(
            'ytsearch1:' + query,
            {
               ...youtubeOptions(),

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

      return {

         url:
            videoUrl,

         title:
            selected.title ||
            'YouTube Audio',

         thumbnail:
            selected.thumbnail ||
            'https://i.imgur.com/AfFp7pu.png',

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

async function downloadAudio(
   url,
   onStage
) {

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
         fileId +
         '.%(ext)s'
      )

   console.log(
      `🎵 AUDIO | 🍪 ${cookiesAvailable ? 'ON' : 'OFF'}`
   )

   try {

      if (onStage) {
         await onStage(
            20,
            '🔎 Preparando audio...'
         )
      }

      const options =
         youtubeOptions({
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

      if (onStage) {
         await onStage(
            40,
            '⬇️ Descargando audio...'
         )
      }

      await youtubedl(
         url,
         options,
         {
            timeout:
               90000
         }
      )

      if (onStage) {
         await onStage(
            80,
            '📦 Preparando audio...'
         )
      }

      const files =
         fs.readdirSync(
            tempDir
         ).filter(
            file =>
               file.startsWith(
                  fileId
               ) &&
               !file.endsWith('.part') &&
               !file.endsWith('.ytdl')
         )

      if (!files.length) {

         throw new Error(
            'No se descargó ningún audio'
         )
      }

      const downloadedFile =
         files.find(
            file =>
               file
                  .toLowerCase()
                  .endsWith('.m4a')
         ) ||
         files.find(
            file =>
               file
                  .toLowerCase()
                  .endsWith('.webm')
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
            'Audio inexistente'
         )
      }

      const stats =
         fs.statSync(
            outputFile
         )

      if (!stats.size) {

         throw new Error(
            'Audio vacío'
         )
      }

      const buffer =
         fs.readFileSync(
            outputFile
         )

      if (onStage) {
         await onStage(
            100,
            '📤 Audio listo...'
         )
      }

      console.log(
         `✅ AUDIO | ${(stats.size / 1024 / 1024).toFixed(2)} MB`
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

      return buffer

   } catch (error) {

      console.log(
         '❌ AUDIO ERROR:',
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
// ACTUALIZAR CARGA
// ======================================================

async function updateLoading(
   sock,
   chatId,
   loading,
   selection,
   percent,
   status
) {

   try {

      await sock.sendMessage(
         chatId,
         {
            edit:
               loading.key,

            image: {
               url:
                  selection.thumbnail ||
                  'https://i.imgur.com/AfFp7pu.png'
            },

            caption:
`🎵 *AUDIO*

> ❀ ${selection.title || 'Canción'}
> ❀ ${selection.author?.name || 'Unknown'}
> ❀ ${selection.timestamp || 'Unknown'}

${status}

${progressText(percent)}

> 🍪 Cookies: ${cookiesAvailable ? 'ON' : 'OFF'}
> ⚡ FelbotC`
         }
      )

   } catch {}
}

// ======================================================
// ENVIAR AUDIO
// ======================================================

async function sendSongAudio(
   sock,
   chatId,
   selection,
   message
) {

   const startTime =
      Date.now()

   const safeTitle =
      sanitizeSongTitle(
         selection.title ||
         'song'
      )

   let loading = null

   try {

      await reactToSong(
         sock,
         message,
         '⏳'
      )

      // =================================================
      // MENSAJE DE CARGA
      // =================================================

      loading =
         await sock.sendMessage(
            chatId,
            {
               image: {
                  url:
                     selection.thumbnail ||
                     'https://i.imgur.com/AfFp7pu.png'
               },

               caption:
`🎵 *AUDIO*

> ❀ ${selection.title || 'Canción'}
> ❀ ${selection.author?.name || 'Unknown'}
> ❀ ${selection.timestamp || 'Unknown'}

⏳ Iniciando descarga...

${progressText(10)}

> 🍪 Cookies: ${cookiesAvailable ? 'ON' : 'OFF'}
> ⚡ FelbotC`
            },
            {
               quoted:
                  message
            }
         )

      // =================================================
      // PROGRESO
      // =================================================

      const onStage =
         async (
            percent,
            status
         ) => {

            await updateLoading(
               sock,
               chatId,
               loading,
               selection,
               percent,
               status
            )
         }

      // =================================================
      // DESCARGAR
      // =================================================

      const mediaBuffer =
         await downloadAudio(
            selection.url,
            onStage
         )

      if (
         !mediaBuffer ||
         mediaBuffer.length < 50000
      ) {

         throw new Error(
            'Archivo de audio inválido'
         )
      }

      // =================================================
      // ENVIAR AUDIO
      // =================================================

      await sock.sendMessage(
         chatId,
         {
            audio:
               mediaBuffer,

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

      // =================================================
      // COMPLETADO
      // =================================================

      await reactToSong(
         sock,
         message,
         '✅'
      )

      try {

         await sock.sendMessage(
            chatId,
            {
               edit:
                  loading.key,

               image: {
                  url:
                     selection.thumbnail ||
                     'https://i.imgur.com/AfFp7pu.png'
               },

               caption:
`✅ *AUDIO COMPLETADO*

> ❀ ${selection.title || 'Canción'}

${progressText(100)}

> ⚡ Audio enviado correctamente
> ⏱️ ${(
   (Date.now() - startTime) /
   1000
).toFixed(1)}s

> 🍪 Cookies: ${cookiesAvailable ? 'ON' : 'OFF'}`
            }
         )

      } catch {}

      return true

   } catch (error) {

      console.error(
         '❌ SONG AUDIO ERROR:',
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

         await sock.sendMessage(
            chatId,
            {
               text:
`❌ *No se pudo descargar el audio*

> ${selection?.title || 'Canción'}

Inténtalo nuevamente.`
            },
            {
               quoted:
                  message
            }
         )

      } catch {}

      return false
   }
}

// ======================================================
// COMANDO .PLAY
// ======================================================

async function songCommand(
   sock,
   chatId,
   message
) {

   const startTime =
      Date.now()

   try {

      console.log(
         '🎶 NUEVO .PLAY'
      )

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
`🎵 *Felbot Play*

Escribe una canción.

> Ejemplo:
> .play Canserbero - Es épico`
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

      // =================================================
      // URL DE YOUTUBE
      // =================================================

      if (
         query.includes(
            'youtube.com'
         ) ||
         query.includes(
            'youtu.be'
         )
      ) {

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

         // =================================================
         // CACHE
         // =================================================

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

      // =================================================
      // DESCARGAR DIRECTAMENTE
      // =================================================

      await reactToSong(
         sock,
         message,
         '🎵'
      )

      await sendSongAudio(
         sock,
         chatId,
         video,
         message
      )

      console.log(
         `✅ PLAY LISTO | 🎵 ${video.title || 'Canción'} | ⚡ ${(
            (Date.now() - startTime) /
            1000
         ).toFixed(1)}s`
      )

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

         await sock.sendMessage(
            chatId,
            {
               text:
                  '❌ Error buscando la canción 😭'
            },
            {
               quoted:
                  message
            }
         )

      } catch {}
   }
}

// ======================================================
// EXPORT
// ======================================================

module.exports =
   songCommand

module.exports.songCommand =
   songCommand
