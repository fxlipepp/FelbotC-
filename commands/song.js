const yts = require('yt-search')
const { execFile } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { promisify } = require('util')
const { toAudio } = require('../lib/converter')

const execFileAsync = promisify(execFile)

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

   return '▰'.repeat(filled) + '▱'.repeat(total - filled)
}

// ===============================
// YT-DLP DOWNLOAD
// ===============================

async function downloadAudio(url) {

   const tempDir = path.join(
      os.tmpdir(),
      'felbot-play'
   )

   if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, {
         recursive: true
      })
   }

   const fileId =
      `${Date.now()}-` +
      `${Math.random().toString(36).slice(2)}`

   const outputFile = path.join(
      tempDir,
      `${fileId}.mp3`
   )

   console.log(`
╭──────────────────────⬣
│ 🚀 USANDO YT-DLP
├──────────────────────⬣
│ 🎵 Descargando audio...
╰──────────────────────⬣
`)

   const start = Date.now()

   try {

      await execFileAsync(
         'yt-dlp',
         [
            '--no-playlist',

            '--extract-audio',
            '--audio-format',
            'mp3',
            '--audio-quality',
            '128K',

            '--output',
            outputFile,

            '--no-warnings',
            '--quiet',

            '--ffmpeg-location',
            process.env.FFMPEG_PATH || 'ffmpeg',

            url
         ],
         {
            timeout: 120000,
            maxBuffer: 20 * 1024 * 1024
         }
      )

      if (!fs.existsSync(outputFile)) {
         throw new Error(
            'yt-dlp no generó el archivo MP3'
         )
      }

      const stats = fs.statSync(outputFile)

      if (!stats.size) {
         throw new Error(
            'El archivo MP3 está vacío'
         )
      }

      console.log(`
╭──────────────────────⬣
│ ✅ YT-DLP COMPLETADO
├──────────────────────⬣
│ 📦 Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB
│ ⚡ Tiempo: ${((Date.now() - start) / 1000).toFixed(1)}s
╰──────────────────────⬣
`)

      const buffer = fs.readFileSync(outputFile)

      // 🧹 BORRAR ARCHIVO TEMPORAL
      try {
         fs.unlinkSync(outputFile)
      } catch {}

      return {
         buffer,
         title: null
      }

   } catch (error) {

      // 🧹 BORRAR SI QUEDÓ ARCHIVO
      try {
         if (fs.existsSync(outputFile)) {
            fs.unlinkSync(outputFile)
         }
      } catch {}

      console.error(
         '❌ YT-DLP ERROR:',
         error?.stderr ||
         error?.message ||
         error
      )

      throw error
   }
}

// ===============================
// COMMAND
// ===============================

async function songCommand(sock, chatId, message) {

   const startTime = Date.now()

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

      const query = text
         .split(' ')
         .slice(1)
         .join(' ')
         .trim()

      // ===============================
      // VALIDAR QUERY
      // ===============================

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
               quoted: message
            }
         )
      }

      let video

      // ===============================
      // DIRECT YOUTUBE URL
      // ===============================

      if (
         query.includes('youtube.com') ||
         query.includes('youtu.be')
      ) {

         video = {
            url: query,
            title: 'YouTube Audio',
            thumbnail:
               'https://i.imgur.com/AfFp7pu.png',
            timestamp: 'Unknown',
            author: {
               name: 'Unknown'
            },
            views: 0,
            ago: 'Unknown'
         }

      } else {

         // ===============================
         // SEARCH CACHE
         // ===============================

         if (searchCache.has(query)) {

            console.log(
               '⚡ Usando search cache'
            )

            video = searchCache.get(query)

         } else {

            console.log(
               `🔎 Buscando: ${query}`
            )

            const search = await yts(query)

            if (!search?.videos?.length) {

               return await sock.sendMessage(
                  chatId,
                  {
                     text:
                        '❌ No encontré resultados 😭'
                  },
                  {
                     quoted: message
                  }
               )
            }

            video =
               search.videos.find(v =>
                  v.seconds > 30 &&
                  v.seconds < 1800 &&
                  v.title &&
                  !v.title
                     .toLowerCase()
                     .includes('playlist')
               ) ||
               search.videos[0]

            searchCache.set(
               query,
               video
            )

            limitMapSize(
               searchCache
            )

            setTimeout(() => {
               searchCache.delete(query)
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
                  url: video.thumbnail
               },

               caption:
`🎶 *DESCARGANDO AUDIO*

> ❀ Título: ${video.title}
> ❀ Autor: ${video.author?.name || 'Unknown'}
> ❀ Duración: ${video.timestamp || 'Unknown'}
> ❀ Vistas: ${video.views?.toLocaleString() || '0'}

> 🚀 Usando servidor local...
> ${createBar(10)} 10%`
            },
            {
               quoted: message
            }
         )

      // ===============================
      // DOWNLOAD
      // ===============================

      const download =
         await downloadAudio(
            video.url
         )

      let audioBuffer =
         download.buffer

      // ===============================
      // VALIDATE AUDIO
      // ===============================

      if (
         !audioBuffer ||
         audioBuffer.length < 50000
      ) {
         throw new Error(
            'Audio inválido o demasiado pequeño'
         )
      }

      console.log(
         'AUDIO SIZE:',
         `${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`
      )

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
            edit: loading.key,

            image: {
               url: video.thumbnail
            },

            caption:
`🔄 *PROCESANDO AUDIO*

> ❀ Título: ${video.title}

> ⚡ Preparando audio...
> ${createBar(90)} 90%`
         }
      )

      let finalBuffer

      try {

         const firstBytes =
            audioBuffer
               .slice(0, 64)
               .toString('hex')

         let inputExt = 'mp3'

         if (
            firstBytes.includes('66747970')
         ) {
            inputExt = 'mp4'
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
            err?.message || err
         )

         finalBuffer =
            audioBuffer
      }

      // ===============================
      // VALIDATE FINAL BUFFER
      // ===============================

      if (
         !finalBuffer ||
         finalBuffer.length < 50000
      ) {
         throw new Error(
            'Conversion failed'
         )
      }

      // ===============================
      // TITLE
      // ===============================

      const safeTitle = (
         video.title ||
         'song'
      )
         .replace(/[^\w\s-]/g, '')
         .trim()
         .slice(0, 100) ||
         'song'

      // ===============================
      // SEND AUDIO
      // ===============================

      await sock.sendMessage(
         chatId,
         {
            audio: finalBuffer,
            mimetype: 'audio/mpeg',
            fileName:
               `${safeTitle}.mp3`,
            ptt: false
         },
         {
            quoted: message
         }
      )

      // ===============================
      // FINAL
      // ===============================

      await sock.sendMessage(
         chatId,
         {
            edit: loading.key,

            image: {
               url: video.thumbnail
            },

            caption:
`✅ *AUDIO ENVIADO*

> ❀ Título: ${safeTitle}
> ❀ Autor: ${video.author?.name || 'Unknown'}
> ❀ Duración: ${video.timestamp || 'Unknown'}

> 🚀 Completado en ${(
   (Date.now() - startTime) /
   1000
).toFixed(1)}s
> ${createBar(100)} 100%`
         }
      )

      cleanMemory()

      console.log(`
╭──────────────────────⬣
│ ✅ DESCARGA COMPLETADA
├──────────────────────⬣
│ 🎧 ${safeTitle}
│ ⏱️ ${(
   (Date.now() - startTime) /
   1000
).toFixed(1)}s
╰──────────────────────⬣
`)

   } catch (err) {

      console.error(
         '❌ SONG ERROR:',
         err
      )

      let errorMessage =
         '❌ Error descargando el audio 😭'

      if (
         err?.message?.includes(
            'Video unavailable'
         ) ||
         err?.message?.includes(
            'Private video'
         )
      ) {
         errorMessage =
            '❌ Ese video no está disponible 😭'
      }

      if (
         err?.message?.includes(
            'Sign in'
         )
      ) {
         errorMessage =
            '❌ YouTube rechazó la descarga. Intenta otra canción 😭'
      }

      await sock.sendMessage(
         chatId,
         {
            text: errorMessage
         },
         {
            quoted: message
         }
      )

      cleanMemory()
   }
}

module.exports = songCommand