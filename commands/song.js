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

   return '▰'.repeat(filled) +
      '▱'.repeat(total - filled)
}

// ===============================
// BUSCAR CON YT-DLP
// ===============================

async function searchYouTube(query) {

   console.log(`
╭──────────────────────⬣
│ 🔎 BUSCANDO CON YT-DLP
├──────────────────────⬣
│ 🎵 ${query}
╰──────────────────────⬣
`)

   const { stdout } = await execFileAsync(
      'yt-dlp',
      [
         `ytsearch10:${query}`,

         '--flat-playlist',

         '--dump-single-json',

         '--skip-download',

         '--no-warnings',

         '--quiet'
      ],
      {
         timeout: 60000,
         maxBuffer: 20 * 1024 * 1024
      }
   )

   const data = JSON.parse(stdout)

   if (
      !data ||
      !data.entries ||
      !data.entries.length
   ) {
      throw new Error(
         'No se encontraron resultados'
      )
   }

   // Buscar una canción adecuada
   const result =
      data.entries.find(v =>
         v.title &&
         !v.title
            .toLowerCase()
            .includes('playlist')
      ) ||
      data.entries[0]

   if (!result?.url && !result?.id) {
      throw new Error(
         'Resultado de YouTube inválido'
      )
   }

   const videoUrl =
      result.webpage_url ||
      result.url ||
      `https://www.youtube.com/watch?v=${result.id}`

   // Obtener información completa del video
   const { stdout: infoOutput } =
      await execFileAsync(
         'yt-dlp',
         [
            videoUrl,

            '--dump-single-json',

            '--skip-download',

            '--no-warnings',

            '--quiet'
         ],
         {
            timeout: 60000,
            maxBuffer: 20 * 1024 * 1024
         }
      )

   const info =
      JSON.parse(infoOutput)

   return {
      url: videoUrl,
      title:
         info.title ||
         result.title ||
         'YouTube Audio',

      thumbnail:
         info.thumbnail ||
         result.thumbnail ||
         'https://i.imgur.com/AfFp7pu.png',

      timestamp:
         info.duration_string ||
         'Unknown',

      author: {
         name:
            info.uploader ||
            info.channel ||
            'Unknown'
      },

      views:
         info.view_count || 0,

      ago:
         'Unknown'
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
         { recursive: true }
      )
   }

   const fileId =
      `${Date.now()}-` +
      `${Math.random()
         .toString(36)
         .slice(2)}`

   const outputFile =
      path.join(
         tempDir,
         `${fileId}.mp3`
      )

   console.log(`
╭──────────────────────⬣
│ 🚀 DESCARGANDO AUDIO
├──────────────────────⬣
│ 🎵 YT-DLP + FFMPEG
╰──────────────────────⬣
`)

   const start =
      Date.now()

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
            process.env.FFMPEG_PATH ||
               'ffmpeg',

            url
         ],
         {
            timeout: 120000,
            maxBuffer:
               20 * 1024 * 1024
         }
      )

      if (!fs.existsSync(outputFile)) {
         throw new Error(
            'yt-dlp no generó el MP3'
         )
      }

      const stats =
         fs.statSync(outputFile)

      if (!stats.size) {
         throw new Error(
            'El MP3 está vacío'
         )
      }

      const buffer =
         fs.readFileSync(outputFile)

      console.log(`
╭──────────────────────⬣
│ ✅ AUDIO DESCARGADO
├──────────────────────⬣
│ 📦 ${(stats.size / 1024 / 1024).toFixed(2)} MB
│ ⚡ ${((Date.now() - start) / 1000).toFixed(1)}s
╰──────────────────────⬣
`)

      try {
         fs.unlinkSync(outputFile)
      } catch {}

      return buffer

   } catch (error) {

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

      // ===============================
      // VALIDAR
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
      // URL DIRECTA
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
            views: 0
         }

      } else {

         // ===============================
         // CACHE
         // ===============================

         if (
            searchCache.has(query)
         ) {

            console.log(
               '⚡ Usando search cache'
            )

            video =
               searchCache.get(query)

         } else {

            // ===============================
            // SEARCH
            // ===============================

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
                  url: video.thumbnail
               },

               caption:
`🎶 *DESCARGANDO AUDIO*

> ❀ Título: ${video.title}
> ❀ Autor: ${video.author?.name || 'Unknown'}
> ❀ Duración: ${video.timestamp || 'Unknown'}
> ❀ Vistas: ${video.views?.toLocaleString() || '0'}

> 🚀 Buscando servidor...
> ${createBar(10)} 10%`
            },
            {
               quoted: message
            }
         )

      // ===============================
      // DOWNLOAD
      // ===============================

      let audioBuffer =
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
            edit: loading.key,

            image: {
               url: video.thumbnail
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
               .slice(0, 64)
               .toString('hex')

         let inputExt = 'mp3'

         if (
            firstBytes.includes(
               '66747970'
            )
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
            .slice(0, 100) ||
         'song'

      // ===============================
      // SEND
      // ===============================

      await sock.sendMessage(
         chatId,
         {
            audio: finalBuffer,
            mimetype:
               'audio/mpeg',
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

      await sock.sendMessage(
         chatId,
         {
            text:
               '❌ Error descargando el audio 😭'
         },
         {
            quoted: message
         }
      )

      cleanMemory()
   }
}

module.exports = songCommand