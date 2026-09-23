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

      const firstKey =
         map.keys().next().value

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
// BARRA DE PROGRESO
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
// ESTADO DE COOKIES
// ======================================================

function getCookiesStatus() {

   try {

      if (
         !fs.existsSync(
            cookiesPath
         )
      ) {
         return false
      }

      const stats =
         fs.statSync(
            cookiesPath
         )

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

      if (
         !getCookiesStatus()
      ) {
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
   format = null
} = {}) {

   const options = {
      ...BASE_OPTIONS
   }

   // Un solo cliente para reducir latencia
   options.extractorArgs =
      'youtube:player_client=default'

   // Cookies
   if (cookiesAvailable) {

      options.cookies =
         cookiesPath
   }

   // FFmpeg solamente cuando está disponible
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
// SELECCIONES DE BOTONES
// ======================================================

function getSongSelectionMap() {

   if (
      !global.songSelections
   ) {
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

      if (
         !message?.key
      ) {
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
// MENSAJE DE PROGRESO
// ======================================================

async function sendProgress(
   sock,
   chatId,
   loading,
   title,
   author,
   duration,
   type,
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
                  loading.thumbnail ||
                  'https://i.imgur.com/AfFp7pu.png'
            },

            caption:
`╭━━━〔 𝕱𝖊𝖑𝖇𝖔𝖙 夜 〕━━━⬣
│ ${type === 'video' ? '🎬' : '🎵'} *${type === 'video' ? 'VIDEO' : 'AUDIO'}*
╰━━━━━━━━━━━━━━━━━━━━⬣

> ❀ *Título:* ${title}
> ❀ *Autor:* ${author}
> ❀ *Duración:* ${duration}

╭────────────────────⬣
│ ${status}
│
│ ${progressText(percent)}
╰────────────────────⬣

> 🍪 Cookies: ${cookiesAvailable ? 'ON' : 'OFF'}
> ⚡ FelbotC`
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
╭──────────────────────⬣
│ 🔎 BUSCANDO YOUTUBE
├──────────────────────⬣
│ 🎵 ${query}
│ ⚡ SEARCH RÁPIDO
│ 🍪 COOKIES: ${cookiesAvailable ? 'ON' : 'OFF'}
│ 🌐 USER-AGENT: FIJO
│ 🎯 CLIENT: default
╰──────────────────────⬣
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
// DESCARGA VIDEO
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
         .slice(2, 8)

   const outputTemplate =
      path.join(
         tempDir,
         fileId +
         '.%(ext)s'
      )

   console.log(`
╭──────────────────────⬣
│ 🎬 DESCARGA DE VIDEO
├──────────────────────⬣
│ 🎥 YT-DLP
│ ⚡ VIDEO MP4
│ 🍪 COOKIES: ${cookiesAvailable ? 'ON' : 'OFF'}
│ 🌐 USER-AGENT: FIJO
│ 🎯 CLIENT: default
│ 🔧 FFMPEG: ${ffmpegPath ? 'ON' : 'OFF'}
╰──────────────────────⬣
`)

   try {

      if (onStage) {
         await onStage(
            25,
            '🔎 Preparando formatos...'
         )
      }

      const options =
         youtubeOptions({
            format:
               'bestvideo*[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
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

      // Cuando tenga que unir video + audio
      options.mergeOutputFormat =
         'mp4'

      if (onStage) {
         await onStage(
            45,
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
               : '📦 Preparando archivo...'
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

      const preferredFile =
         files.find(
            file =>
               file.endsWith(
                  '.mp4'
               )
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
╭──────────────────────⬣
│ ✅ VIDEO COMPLETADO
├──────────────────────⬣
│ 🍪 COOKIES: ${cookiesAvailable ? 'ON' : 'OFF'}
│ 🌐 USER-AGENT: FIJO
│ 📦 ${(stats.size / 1024 / 1024).toFixed(2)} MB
│ 🎬 ${preferredFile}
│ 🔧 FFMPEG: ${ffmpegPath ? 'ON' : 'OFF'}
╰──────────────────────⬣
`)

      // Eliminar TODOS los archivos generados
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
// DESCARGA AUDIO
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
         .slice(2, 8)

   const outputTemplate =
      path.join(
         tempDir,
         fileId +
         '.%(ext)s'
      )

   console.log(`
╭──────────────────────⬣
│ 🚀 DESCARGA DE AUDIO
├──────────────────────⬣
│ 🎵 YT-DLP
│ ⚡ MODO M4A
│ 🍪 COOKIES: ${cookiesAvailable ? 'ON' : 'OFF'}
│ 🌐 USER-AGENT: FIJO
│ 🎯 CLIENT: default
│ 🚫 SIN CONVERSIÓN
╰──────────────────────⬣
`)

   try {

      if (onStage) {
         await onStage(
            25,
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
            45,
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

      if (onStage) {
         await onStage(
            95,
            '📤 Audio listo para enviar...'
         )
      }

      console.log(`
╭──────────────────────⬣
│ ✅ AUDIO COMPLETADO
├──────────────────────⬣
│ 🍪 COOKIES: ${cookiesAvailable ? 'ON' : 'OFF'}
│ 🌐 USER-AGENT: FIJO
│ 📦 ${(stats.size / 1024 / 1024).toFixed(2)} MB
│ ⚡ SIN FFMPEG
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
// ENVIAR AUDIO / VIDEO
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

      // =================================================
      // REACCIÓN INICIAL
      // =================================================

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
`╭━━━〔 𝕱𝖊𝖑𝖇𝖔𝖙 夜 〕━━━⬣
│ ${mediaType === 'video' ? '🎬' : '🎵'} *${mediaType === 'video' ? 'VIDEO' : 'AUDIO'}*
╰━━━━━━━━━━━━━━━━━━━━⬣

> ❀ *Título:* ${selection.title || 'Canción'}
> ❀ *Autor:* ${selection.author?.name || 'Unknown'}
> ❀ *Duración:* ${selection.timestamp || 'Unknown'}

╭────────────────────⬣
│ ⏳ Iniciando descarga...
│
│ ${progressText(10)}
╰────────────────────⬣

> 🍪 Cookies: ${cookiesAvailable ? 'ON' : 'OFF'}
> ⚡ FelbotC`
            },
            {
               quoted:
                  message
            }
         )

      // Guardar thumbnail para edits
      loading.thumbnail =
         selection.thumbnail

      // =================================================
      // DESCARGA
      // =================================================

      const updateProgress =
         async (
            percent,
            status
         ) => {

            if (!loading) return

            await sendProgress(
               sock,
               chatId,
               loading,
               selection.title ||
                  'Canción',
               selection.author?.name ||
                  'Unknown',
               selection.timestamp ||
                  'Unknown',
               mediaType,
               percent,
               status
            )
         }

      const mediaBuffer =
         mediaType === 'video'
            ? await downloadVideo(
                 selection.url,
                 updateProgress
              )
            : await downloadAudio(
                 selection.url,
                 updateProgress
              )

      if (
         !mediaBuffer ||
         mediaBuffer.length < 50000
      ) {

         throw new Error(
            'Archivo inválido'
         )
      }

      // =================================================
      // 100%
      // =================================================

      await updateProgress(
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
`╭━━━〔 🎬 𝕱𝖊𝖑𝖇𝖔𝖙 夜 〕━━━⬣

> ❀ *${selection.title || 'Canción'}*

> ❀ Autor: ${selection.author?.name || 'Unknown'}
> ❀ Duración: ${selection.timestamp || 'Unknown'}

╰━━━━━━━━━━━━━━━━━━━━⬣
> ⚡ Video descargado
> 🍪 Cookies: ${cookiesAvailable ? 'ON' : 'OFF'}`
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

      // =================================================
      // REACCIÓN FINAL
      // =================================================

      await reactToSong(
         sock,
         message,
         '✅'
      )

      // =================================================
      // EDITAR MENSAJE FINAL
      // =================================================

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
`╭━━━〔 𝕱𝖊𝖑𝖇𝖔𝖙 夜 〕━━━⬣
│ ${mediaType === 'video' ? '🎬' : '🎵'} *COMPLETADO*
╰━━━━━━━━━━━━━━━━━━━━⬣

> ❀ *${selection.title || 'Canción'}*

> ${progressText(100)}
> ✅ ${mediaType === 'video'
      ? 'Video enviado correctamente'
      : 'Audio enviado correctamente'}

> ⚡ Tiempo: ${(
      (Date.now() - startTime) /
      1000
   ).toFixed(1)}s
> 🍪 Cookies: ${cookiesAvailable ? 'ON' : 'OFF'}`
            }
         )

      } catch {}

      console.log(`
╭──────────────────────⬣
│ ✅ MEDIA ENVIADA
├──────────────────────⬣
│ 🎵 ${safeTitle}
│ 📦 ${mediaType.toUpperCase()}
│ 🍪 COOKIES: ${cookiesAvailable ? 'ON' : 'OFF'}
│ ⏱️ ${(
   (Date.now() - startTime) /
   1000
).toFixed(1)}s
╰──────────────────────⬣
`)

      return true

   } catch (error) {

      console.error(
         '❌ SONG MEDIA ERROR:',
         error?.stderr ||
         error?.message ||
         error
      )

      // =================================================
      // REACCIÓN ERROR
      // =================================================

      await reactToSong(
         sock,
         message,
         '❌'
      )

      // =================================================
      // MENSAJE ERROR
      // =================================================

      try {

         await sock.sendMessage(
            chatId,
            {
               text:
`╭━━━〔 ❌ FELBOT 夜 〕━━━⬣

No pude descargar
${mediaType === 'video'
   ? 'el video'
   : 'el audio'}.

> 🎵 ${selection.title || 'Canción'}

> 🔄 Inténtalo nuevamente.

╰━━━━━━━━━━━━━━━━━━━━⬣`
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
// MANEJAR BOTONES
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
               '⏳ Este botón expiró. Busca la canción otra vez.'
         },
         {
            quoted:
               message
         }
      )

      return true
   }

   selections.delete(
      selectionId
   )

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
╭──────────────────────⬣
│ 🎶 NUEVA DESCARGA
╰──────────────────────⬣
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
`╭━━━〔 🎵 FELBOT 夜 〕━━━⬣

Escribe una canción.

> Ejemplo:
> .play Canserbero - Es épico

╰━━━━━━━━━━━━━━━━━━━━⬣`
            },
            {
               quoted:
                  message
            }
         )
      }

      // =================================================
      // REACCIÓN DE BÚSQUEDA
      // =================================================

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
      // REACCIÓN RESULTADO
      // =================================================

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
               video.views
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
      // MENSAJE INTERACTIVO
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
`╭━━━〔 𝕱𝖊𝖑𝖇𝖔𝖙 夜 〕━━━⬣

> 🎵 *${video.title || 'Canción'}*

> ❀ Autor: ${video.author?.name || 'Unknown'}
> ❀ Duración: ${video.timestamp || 'Unknown'}
> ❀ Vistas: ${Number(video.views || 0).toLocaleString()}

╰━━━━━━━━━━━━━━━━━━━━⬣

Selecciona cómo quieres recibirlo:`
                  },

                  footer: {

                     text:
                        '🍪 Cookies ON • ⚡ FelbotC'
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
      // ENVIAR
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

      // =================================================
      // LOG
      // =================================================

      console.log(`
╭──────────────────────⬣
│ ✅ SELECCIÓN DE CANCIÓN
├──────────────────────⬣
│ 🎵 ${video.title || 'Canción'}
│ 🎬 BOTONES: VIDEO / AUDIO
│ 🍪 COOKIES: ${cookiesAvailable ? 'ON' : 'OFF'}
│ ⚡ ${(
   (Date.now() - startTime) /
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
`╭━━━〔 ❌ FELBOT 夜 〕━━━⬣

Ocurrió un error buscando la canción.

> 🔄 Inténtalo nuevamente.

╰━━━━━━━━━━━━━━━━━━━━⬣`
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