const youtubedl = require('youtube-dl-exec')
const fs = require('fs')
const path = require('path')
const os = require('os')

const {
   generateWAMessageFromContent,
   prepareWAMessageMedia
} = require('@whiskeysockets/baileys')

// ======================================================
// FFMPEG
// ======================================================

let ffmpegPath = null

try {
   ffmpegPath = require('ffmpeg-static')
   console.log('🎬 FFMPEG: DISPONIBLE')
} catch {
   console.log('⚠️ FFMPEG: NO DISPONIBLE')
}

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

function progressText(percent) {
   return `${createBar(percent)} ${percent}%`
}

// ======================================================
// COOKIES YOUTUBE
// ======================================================

const cookiesPath =
   '/home/container/cookies.txt'

const YOUTUBE_USER_AGENT =
   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36'

// ======================================================
// ESTADO COOKIES
// ======================================================

function getCookiesStatus() {
   try {
      if (!fs.existsSync(cookiesPath)) {
         return false
      }

      const stats =
         fs.statSync(cookiesPath)

      if (!stats.isFile()) {
         return false
      }

      if (stats.size <= 100) {
         return false
      }

      return true
   } catch {
      return false
   }
}

// ======================================================
// VALIDAR COOKIES
// ======================================================

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

      if (!firstLine) {
         return false
      }

      const validHeader =
         firstLine === '# HTTP Cookie File' ||
         firstLine === '# Netscape HTTP Cookie File'

      if (!validHeader) {
         console.log(
            '⚠️ COOKIES: encabezado Netscape inválido'
         )

         return false
      }

      return true

   } catch {
      return false
   }
}

const cookiesAvailable =
   validateCookiesFile()

console.log(
   cookiesAvailable
      ? '🍪 YOUTUBE COOKIES: ENCONTRADAS Y VÁLIDAS'
      : '⚠️ YOUTUBE COOKIES: NO DISPONIBLES O INVÁLIDAS'
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

   if (ffmpegPath) {
      options.ffmpegLocation =
         ffmpegPath
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
      String(
         remaining
      ).padStart(
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
// OBTENER USUARIO
// ======================================================

function getUserId(message) {

   return (
      message?.key?.participant ||
      message?.participant ||
      message?.key?.remoteJid ||
      ''
   )
}

// ======================================================
// SELECCIONES
// ======================================================

function getSongSelectionMap() {

   if (!global.songSelections) {
      global.songSelections =
         new Map()
   }

   return global.songSelections
}

function registerSongSelection(
   selection
) {

   const selections =
      getSongSelectionMap()

   const selectionId =
      Date.now() +
      '-' +
      Math.random()
         .toString(36)
         .slice(2, 8)

   selections.set(
      selectionId,
      selection
   )

   setTimeout(
      () => {
         selections.delete(
            selectionId
         )
      },
      1000 * 60 * 10
   )

   return selectionId
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

   console.log(`
🎶 FELBOT PLAY
├─ 🔎 ${query}
├─ ⚡ SEARCH RÁPIDO
├─ 🍪 COOKIES: ${cookiesAvailable ? 'ON' : 'OFF'}
├─ 🌐 USER-AGENT: FIJO
└─ 🎯 CLIENT: default
`)

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
// DESCARGAR VIDEO
// ======================================================

async function downloadVideo(
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

   console.log(`
🎬 FELBOT VIDEO
├─ ⚡ MODO VIDEO
├─ 🍪 COOKIES: ${cookiesAvailable ? 'ON' : 'OFF'}
├─ 🌐 USER-AGENT: FIJO
├─ 🎯 CLIENT: default
└─ 🔧 FFMPEG: ${ffmpegPath ? 'ON' : 'OFF'}
`)

   try {

      if (onStage) {
         await onStage(
            20,
            '🔎 Analizando formatos...'
         )
      }

      /*
       * bv* = mejor formato que contenga video
       * ba  = mejor audio
       * /b  = fallback a formato combinado
       *
       * Esta es la selección general recomendada
       * por yt-dlp para video.
       */
      const options =
         youtubeOptions({
            format:
               'bv*+ba/b'
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

      /*
       * Si yt-dlp necesita unir video + audio,
       * el resultado será MP4.
       */
      if (ffmpegPath) {
         options.mergeOutputFormat =
            'mp4'
      }

      if (onStage) {
         await onStage(
            40,
            '⬇️ Descargando video...'
         )
      }

      await youtubedl(
         url,
         options,
         {
            timeout:
               120000
         }
      )

      if (onStage) {
         await onStage(
            80,
            ffmpegPath
               ? '🔧 Preparando MP4...'
               : '📦 Preparando video...'
         )
      }

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
            'No se descargó ningún video'
         )
      }

      /*
       * Preferimos MP4 si existe.
       */
      const preferredFile =
         files.find(
            file =>
               file.endsWith('.mp4')
         ) ||
         files.find(
            file =>
               !file.endsWith('.part')
         ) ||
         files[0]

      const outputFile =
         path.join(
            tempDir,
            preferredFile
         )

      if (
         !fs.existsSync(
            outputFile
         )
      ) {
         throw new Error(
            'Video descargado inexistente'
         )
      }

      const stats =
         fs.statSync(
            outputFile
         )

      if (!stats.size) {
         throw new Error(
            'Video descargado vacío'
         )
      }

      const buffer =
         fs.readFileSync(
            outputFile
         )

      if (onStage) {
         await onStage(
            95,
            '📤 Video listo para enviar...'
         )
      }

      console.log(`
✅ VIDEO COMPLETADO
├─ 📦 ${(stats.size / 1024 / 1024).toFixed(2)} MB
├─ 🎬 ${preferredFile}
├─ 🍪 COOKIES: ${cookiesAvailable ? 'ON' : 'OFF'}
└─ 🔧 FFMPEG: ${ffmpegPath ? 'ON' : 'OFF'}
`)

      /*
       * Limpiar todos los archivos de esta descarga.
       */
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
         '❌ VIDEO DOWNLOAD ERROR:',
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

   console.log(`
🎵 FELBOT AUDIO
├─ ⚡ MODO M4A
├─ 🍪 COOKIES: ${cookiesAvailable ? 'ON' : 'OFF'}
├─ 🌐 USER-AGENT: FIJO
└─ 🎯 CLIENT: default
`)

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
               )
         )

      if (!files.length) {
         throw new Error(
            'No se descargó ningún audio'
         )
      }

      const downloadedFile =
         files.find(
            file =>
               !file.endsWith('.part')
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
            95,
            '📤 Audio listo para enviar...'
         )
      }

      console.log(`
✅ AUDIO COMPLETADO
├─ 📦 ${(stats.size / 1024 / 1024).toFixed(2)} MB
├─ 🍪 COOKIES: ${cookiesAvailable ? 'ON' : 'OFF'}
└─ ⚡ SIN CONVERSIÓN
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
         '❌ AUDIO DOWNLOAD ERROR:',
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
// ACTUALIZAR MENSAJE
// ======================================================

async function updateLoading(
   sock,
   chatId,
   loading,
   selection,
   mediaType,
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
`${mediaType === 'video' ? '🎬' : '🎵'} *${mediaType === 'video' ? 'VIDEO' : 'AUDIO'}*

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
// ENVIAR MEDIA
// ======================================================

async function sendSongMedia(
   sock,
   chatId,
   selection,
   mediaType,
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

      // Reacción inicial
      await reactToSong(
         sock,
         message,
         '⏳'
      )

      // Mensaje inicial
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
`${mediaType === 'video' ? '🎬' : '🎵'} *${mediaType === 'video' ? 'VIDEO' : 'AUDIO'}*

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
               mediaType,
               percent,
               status
            )
         }

      // Descargar
      const mediaBuffer =
         mediaType === 'video'
            ? await downloadVideo(
                 selection.url,
                 onStage
              )
            : await downloadAudio(
                 selection.url,
                 onStage
              )

      if (
         !mediaBuffer ||
         mediaBuffer.length < 50000
      ) {
         throw new Error(
            'Archivo inválido'
         )
      }

      // 100%
      await onStage(
         100,
         '✅ Descarga completada'
      )

      // =================================================
      // VIDEO
      // =================================================

      if (
         mediaType === 'video'
      ) {

         await sock.sendMessage(
            chatId,
            {
               video:
                  mediaBuffer,

               mimetype:
                  'video/mp4',

               fileName:
                  safeTitle +
                  '.mp4',

               caption:
`🎬 *${selection.title || 'Canción'}*

> ❀ Autor: ${selection.author?.name || 'Unknown'}
> ❀ Duración: ${selection.timestamp || 'Unknown'}

⚡ Video enviado por Felbot`
            },
            {
               quoted:
                  message
            }
         )

      } else {

         // =================================================
         // AUDIO
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
      }

      // Reacción final
      await reactToSong(
         sock,
         message,
         '✅'
      )

      // Editar estado
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
`✅ *COMPLETADO*

> ❀ ${selection.title || 'Canción'}

${progressText(100)}

> ⚡ ${mediaType === 'video'
   ? 'Video enviado correctamente'
   : 'Audio enviado correctamente'}

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
         '❌ SONG MEDIA ERROR:',
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
`❌ *No se pudo descargar*

> ${selection.title || 'Canción'}

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
// BOTONES
// ======================================================

async function handleSongButton(
   sock,
   chatId,
   senderId,
   buttonId,
   message
) {

   const buttonMatch =
      String(
         buttonId || ''
      ).match(
         /^song::(video|audio)::([A-Za-z0-9_-]+)$/
      )

   if (!buttonMatch) {
      return false
   }

   const [
      ,
      mediaType,
      selectionId
   ] =
      buttonMatch

   const selections =
      getSongSelectionMap()

   const selection =
      selections.get(
         selectionId
      )

   // ===================================================
   // BOTÓN EXPIRADO
   // ===================================================

   if (!selection) {

      await reactToSong(
         sock,
         message,
         '❌'
      )

      await sock.sendMessage(
         chatId,
         {
            text:
               '⏳ Este botón expiró. Usa `.play` nuevamente.'
         },
         {
            quoted:
               message
         }
      )

      return true
   }

   // ===================================================
   // VERIFICAR DUEÑO
   // ===================================================

   const clickedBy =
      senderId ||
      getUserId(message)

   const owner =
      selection.owner

   if (
      owner &&
      clickedBy !== owner
   ) {

      await reactToSong(
         sock,
         message,
         '🔒'
      )

      await sock.sendMessage(
         chatId,
         {
            text:
`🔒 *Este botón no es tuyo.*

Solo puede utilizarlo la persona que ejecutó:

> .play ${selection.title || 'la canción'}`
         },
         {
            quoted:
               message
         }
      )

      return true
   }

   // ===================================================
   // ELIMINAR SELECCIÓN
   // ===================================================

   selections.delete(
      selectionId
   )

   // ===================================================
   // DESCARGAR
   // ===================================================

   await sendSongMedia(
      sock,
      chatId,
      selection,
      mediaType,
      message
   )

   return true
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
🎶 NUEVA DESCARGA
`)

      // =================================================
      // TEXTO
      // =================================================

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

      // =================================================
      // USUARIO QUE EJECUTÓ PLAY
      // =================================================

      const ownerId =
         getUserId(message)

      await reactToSong(
         sock,
         message,
         '🔎'
      )

      let video

      // =================================================
      // URL DIRECTA
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

      await reactToSong(
         sock,
         message,
         '🎵'
      )

      // =================================================
      // REGISTRAR SELECCIÓN
      // =================================================

      const selectionId =
         registerSongSelection({

            url:
               video.url,

            title:
               video.title,

            thumbnail:
               video.thumbnail,

            author:
               video.author,

            timestamp:
               video.timestamp,

            views:
               video.views,

            // IMPORTANTE
            owner:
               ownerId
         })

      // =================================================
      // BOTONES
      // =================================================

      const buttons = [

         [
            '🎬 Video',
            `song::video::${selectionId}`
         ],

         [
            '🎵 Audio',
            `song::audio::${selectionId}`
         ]

      ].map(
         (
            [
               display_text,
               id
            ]
         ) => ({

            name:
               'quick_reply',

            buttonParamsJson:
               JSON.stringify({

                  display_text,

                  id
               })
         })
      )

      // =================================================
      // IMAGEN
      // =================================================

      let preparedImage = {}

      try {

         preparedImage =
            await prepareWAMessageMedia(
               {
                  image: {
                     url:
                        video.thumbnail
                  }
               },
               {
                  upload:
                     sock.waUploadToServer
               }
            )

      } catch {}

      // =================================================
      // MENSAJE
      // =================================================

      const songMessage =
         generateWAMessageFromContent(
            chatId,
            {

               interactiveMessage: {

                  header: {

                     title:
                        '🎵 ' +
                        (
                           video.title ||
                           'Canción'
                        ),

                     subtitle:
                        `${video.author?.name || 'Unknown'} • ${video.timestamp || 'Unknown'} • ${Number(video.views || 0).toLocaleString()} vistas`,

                     hasMediaAttachment:
                        true,

                     ...preparedImage
                  },

                  body: {

                     text:
`🎵 *${video.title || 'Canción'}*

> ❀ ${video.author?.name || 'Unknown'}
> ❀ ${video.timestamp || 'Unknown'}
> ❀ ${Number(video.views || 0).toLocaleString()} vistas

Selecciona una opción:`
                  },

                  footer: {

                     text:
                        '⚡ FelbotC • 🍪 Cookies ON'
                  },

                  nativeFlowMessage: {

                     buttons
                  }
               }

            },
            {
               quoted:
                  message
            }
         )

      // =================================================
      // RELAY
      // =================================================

      await sock.relayMessage(
         songMessage.key.remoteJid,
         songMessage.message,
         {

            messageId:
               songMessage.key.id,

            additionalNodes: [

               {

                  tag:
                     'biz',

                  attrs: {},

                  content: [

                     {

                        tag:
                           'interactive',

                        attrs: {

                           type:
                              'native_flow',

                           v:
                              '1'
                        },

                        content: [

                           {

                              tag:
                                 'native_flow',

                              attrs: {

                                 v:
                                    '9',

                                 name:
                                    'mixed'
                              }
                           }

                        ]
                     }

                  ]
               }

            ]
         }
      )

      console.log(`
✅ PLAY LISTO
├─ 🎵 ${video.title || 'Canción'}
├─ 🎬 VIDEO / AUDIO
├─ 🔒 BOTONES PRIVADOS
├─ 🍪 COOKIES: ${cookiesAvailable ? 'ON' : 'OFF'}
└─ ⚡ ${(
   (Date.now() - startTime) /
   1000
).toFixed(1)}s
`)

      cleanMemory()

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

      cleanMemory()
   }
}

// ======================================================
// EXPORT
// ======================================================

module.exports =
   songCommand

module.exports.songCommand =
   songCommand

module.exports.handleSongButton =
   handleSongButton