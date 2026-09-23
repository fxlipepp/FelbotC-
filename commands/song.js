const youtubedl = require('youtube-dl-exec')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execFile } = require('child_process')

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

setInterval(
   () => {
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
   },
   1000 * 60 * 20
)

// ======================================================
// BARRA
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
// COOKIES YOUTUBE
// ======================================================

const cookiesPath =
   '/home/container/cookies.txt'

const YOUTUBE_USER_AGENT =
   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36'

// ======================================================
// VALIDAR COOKIES
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
// USUARIO
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
// DESCARGAR + CONVERTIR VIDEO MP4
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

   const downloadTemplate =
      path.join(
         tempDir,
         fileId +
         '.%(ext)s'
      )

   const finalFile =
      path.join(
         tempDir,
         fileId +
         '-whatsapp.mp4'
      )

   console.log(
      `🎬 VIDEO | 🍪 ${cookiesAvailable ? 'ON' : 'OFF'} | 🔧 FFMPEG ${ffmpegPath ? 'ON' : 'OFF'}`
   )

   try {

      if (!ffmpegPath) {
         throw new Error(
            'FFmpeg no está disponible'
         )
      }

      // =================================================
      // ANALIZAR
      // =================================================

      if (onStage) {
         await onStage(
            15,
            '🔎 Analizando formatos...'
         )
      }

      // =================================================
      // DESCARGAR
      // =================================================

      const options =
         youtubeOptions({
            format:
               'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b'
         })

      options.output =
         downloadTemplate

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

      options.ffmpegLocation =
         ffmpegPath

      options.mergeOutputFormat =
         'mp4'

      if (onStage) {
         await onStage(
            35,
            '⬇️ Descargando video...'
         )
      }

      await youtubedl(
         url,
         options,
         {
            timeout:
               180000
         }
      )

      // =================================================
      // BUSCAR ARCHIVO
      // =================================================

      const downloadedFiles =
         fs.readdirSync(
            tempDir
         ).filter(
            file =>
               file.startsWith(
                  fileId
               ) &&
               !file.includes(
                  '-whatsapp.mp4'
               ) &&
               !file.endsWith('.part') &&
               !file.endsWith('.ytdl')
         )

      if (
         !downloadedFiles.length
      ) {
         throw new Error(
            'yt-dlp no generó ningún archivo'
         )
      }

      const sourceFile =
         downloadedFiles.find(
            file =>
               file
                  .toLowerCase()
                  .endsWith('.mp4')
         )

      if (!sourceFile) {
         throw new Error(
            `No se encontró MP4 descargado: ${downloadedFiles.join(', ')}`
         )
      }

      const sourcePath =
         path.join(
            tempDir,
            sourceFile
         )

      if (
         !fs.existsSync(
            sourcePath
         )
      ) {
         throw new Error(
            'Archivo descargado inexistente'
         )
      }

      const sourceStats =
         fs.statSync(
            sourcePath
         )

      if (!sourceStats.size) {
         throw new Error(
            'Archivo descargado vacío'
         )
      }

      console.log(
         `📦 DESCARGADO | ${(sourceStats.size / 1024 / 1024).toFixed(2)} MB`
      )

      // =================================================
      // CONVERSIÓN WHATSAPP
      // =================================================

      if (onStage) {
         await onStage(
            60,
            '🔧 Convirtiendo a MP4 compatible...'
         )
      }

      console.log(
         '🔧 CONVERSIÓN | H.264 + AAC + YUV420P'
      )

      await new Promise(
         (
            resolve,
            reject
         ) => {

            const args = [

               '-y',

               '-i',
               sourcePath,

               // VIDEO
               '-c:v',
               'libx264',

               '-preset',
               'veryfast',

               '-crf',
               '23',

               // COMPATIBILIDAD
               '-pix_fmt',
               'yuv420p',

               // AUDIO
               '-c:a',
               'aac',

               '-b:a',
               '128k',

               // OPTIMIZAR PARA STREAMING
               '-movflags',
               '+faststart',

               finalFile
            ]

            execFile(
               ffmpegPath,
               args,
               {
                  timeout:
                     180000,

                  maxBuffer:
                     20 * 1024 * 1024
               },
               (
                  error,
                  stdout,
                  stderr
               ) => {

                  if (error) {

                     console.log(
                        '❌ FFMPEG CONVERSION ERROR:'
                     )

                     console.log(
                        stderr ||
                        error.message
                     )

                     return reject(
                        error
                     )
                  }

                  resolve()
               }
            )
         }
      )

      // =================================================
      // VALIDAR MP4 FINAL
      // =================================================

      if (
         !fs.existsSync(
            finalFile
         )
      ) {
         throw new Error(
            'FFmpeg no creó el MP4 final'
         )
      }

      const finalStats =
         fs.statSync(
            finalFile
         )

      if (!finalStats.size) {
         throw new Error(
            'MP4 final vacío'
         )
      }

      const buffer =
         fs.readFileSync(
            finalFile
         )

      if (!buffer.length) {
         throw new Error(
            'Buffer MP4 vacío'
         )
      }

      console.log(
         `✅ VIDEO MP4 COMPATIBLE | ${(finalStats.size / 1024 / 1024).toFixed(2)} MB`
      )

      if (onStage) {
         await onStage(
            95,
            '📤 MP4 listo para WhatsApp...'
         )
      }

      // =================================================
      // LIMPIAR DESCARGA ORIGINAL
      // =================================================

      for (
         const file of downloadedFiles
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

      // =================================================
      // DEVOLVER BUFFER
      // =================================================

      const finalBuffer =
         Buffer.from(
            buffer
         )

      // Borramos el archivo después
      // de tenerlo completamente en memoria.

      try {
         fs.unlinkSync(
            finalFile
         )
      } catch {}

      return finalBuffer

   } catch (error) {

      console.log(
         '❌ VIDEO MP4 ERROR:',
         error?.stderr ||
         error?.message ||
         error
      )

      // =================================================
      // LIMPIEZA
      // =================================================

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
               !file.endsWith('.part')
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

      await reactToSong(
         sock,
         message,
         '⏳'
      )

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
            'Archivo multimedia inválido'
         )
      }

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

      }

      // =================================================
      // AUDIO
      // =================================================

      else {

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
`✅ *COMPLETADO*

> ❀ ${selection.title || 'Canción'}

${progressText(100)}

> ⚡ ${mediaType === 'video'
   ? 'Video MP4 enviado correctamente'
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

   // =================================================
   // BOTÓN EXPIRADO
   // =================================================

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

   // =================================================
   // DUEÑO DEL BOTÓN
   // =================================================

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

Solo puede utilizarlo la persona que ejecutó el comando.`
         },
         {
            quoted:
               message
         }
      )

      return true
   }

   // =================================================
   // DESCARGAR
   // =================================================

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
      // USUARIO
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
      // REGISTRAR
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

      console.log(
         `✅ PLAY LISTO | 🎵 ${video.title || 'Canción'} | 🔒 PRIVADO | ⚡ ${(
            (Date.now() - startTime) /
            1000
         ).toFixed(1)}s`
      )

      // Limpiar memoria
      if (searchCache.size > 70) {
         searchCache.clear()
      }

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
// EXPORTS
// ======================================================

module.exports =
   songCommand

module.exports.songCommand =
   songCommand

module.exports.handleSongButton =
   handleSongButton