const youtubedl = require('youtube-dl-exec')
const fs = require('fs')
const path = require('path')
const os = require('os')
const {
   generateWAMessageFromContent,
   prepareWAMessageMedia
} = require('@whiskeysockets/baileys')

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
// COOKIES YOUTUBE
// ======================================================

const cookiesPath =
   '/home/container/cookies.txt'

// User-Agent fijo para que búsqueda y descarga
// trabajen con la misma identidad del navegador.
const YOUTUBE_USER_AGENT =
   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36'

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
// VALIDAR FORMATO DE COOKIES
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

   // Un solo cliente = menos intentos y menor latencia
   options.extractorArgs =
      'youtube:player_client=default'

   // SIEMPRE usar las mismas cookies
   // tanto para búsqueda como para descarga.
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

function sanitizeSongTitle(title = 'song') {
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

function getSongSelectionMap() {
   if (!global.songSelections) {
      global.songSelections = new Map()
   }

   return global.songSelections
}

function registerSongSelection(selection) {
   const selections = getSongSelectionMap()
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
// BUSCAR YOUTUBE
// ======================================================

async function searchYouTube(query) {

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

async function downloadVideo(url) {

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

   try {

      const options =
         youtubeOptions({
            format:
               'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
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
            'No se descargó ningún video'
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

      try {
         fs.unlinkSync(
            outputFile
         )
      } catch {}

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

   console.log(`
╭──────────────────────⬣
│ 🚀 DESCARGA RÁPIDA
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
│ 🍪 COOKIES: ${cookiesAvailable ? 'ON' : 'OFF'}
│ 🌐 USER-AGENT: FIJO
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

async function sendSongMedia(sock, chatId, selection, mediaType, message) {
   const safeTitle =
      sanitizeSongTitle(
         selection.title ||
         'song'
      )

   try {
      const mediaBuffer =
         mediaType === 'video'
            ? await downloadVideo(selection.url)
            : await downloadAudio(selection.url)

      if (
         !mediaBuffer ||
         mediaBuffer.length < (
            mediaType === 'video'
               ? 50000
               : 50000
         )
      ) {
         throw new Error(
            'Archivo inválido'
         )
      }

      if (mediaType === 'video') {
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
                  `🎬 *${selection.title || 'Canción'}*\n\n> ❀ Autor: ${selection.author?.name || 'Unknown'}\n> ❀ Duración: ${selection.timestamp || 'Unknown'}`
            },
            {
               quoted:
                  message
            }
         )

         return true
      }

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

      return true
   } catch (error) {
      console.error(
         '❌ SONG MEDIA ERROR:',
         error?.stderr ||
         error?.message ||
         error
      )

      await sock.sendMessage(
         chatId,
         {
            text:
               `❌ Error enviando ${mediaType === 'video' ? 'el video' : 'el audio'} 😭`
         },
         {
            quoted:
               message
         }
      )

      return false
   }
}

async function handleSongButton(sock, chatId, senderId, buttonId, message) {
   const buttonMatch =
      String(buttonId || '')
         .match(
            /^song::(video|audio)::([A-Za-z0-9_-]+)$/
         )

   if (!buttonMatch) {
      return false
   }

   const [, mediaType, selectionId] =
      buttonMatch

   const selections =
      getSongSelectionMap()

   const selection =
      selections.get(
         selectionId
      )

   if (!selection) {
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
         ([display_text, id]) => ({
            name: 'quick_reply',
            buttonParamsJson:
               JSON.stringify({
                  display_text,
                  id
               })
         })
      )

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

      const songMessage =
         generateWAMessageFromContent(
            chatId,
            {
               interactiveMessage: {
                  header: {
                     title:
                        '🎵 ' + (video.title || 'Canción'),
                     subtitle:
                        `${video.author?.name || 'Unknown'} • ${video.timestamp || 'Unknown'} • ${Number(video.views || 0).toLocaleString()} vistas`,
                     hasMediaAttachment:
                        true,
                     ...preparedImage
                  },
                  body: {
                     text:
                        'Elige cómo quieres recibir la canción:'
                  },
                  footer: {
                     text:
                        'FelbotC'
                  },
                  nativeFlowMessage: {
                     buttons
                  }
               }
            },
            {
               quoted: message
            }
         )

      await sock.relayMessage(
         songMessage.key.remoteJid,
         songMessage.message,
         {
            messageId:
               songMessage.key.id,
            additionalNodes: [
               {
                  tag: 'biz',
                  attrs: {},
                  content: [
                     {
                        tag: 'interactive',
                        attrs: {
                           type: 'native_flow',
                           v: '1'
                        },
                        content: [
                           {
                              tag: 'native_flow',
                              attrs: {
                                 v: '9',
                                 name: 'mixed'
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
╭──────────────────────⬣
│ ✅ SELECCIÓN DE CANCIÓN
├──────────────────────⬣
│ 🎵 ${video.title || 'Canción'}
│ 🎬 BOTONES: VIDEO / AUDIO
│ 🍪 COOKIES: ${cookiesAvailable ? 'ON' : 'OFF'}
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

module.exports.songCommand =
   songCommand

module.exports.handleSongButton =
   handleSongButton