
const youtubedl = require('youtube-dl-exec')
const ffmpegPath = require('ffmpeg-static')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { toAudio } = require('../lib/converter')

// ===============================
// CACHE
// ===============================

const searchCache = new Map()

function limitMapSize(map, max = 100) {
   while (map.size > max) {
      const firstKey = map.keys().next().value
      if (!firstKey) break
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

// ===============================
// COOKIES
// ===============================

const cookiesPath = path.join(
   process.cwd(),
   'cookies.txt'
)

if (fs.existsSync(cookiesPath)) {
   console.log(
      '🍪 YOUTUBE COOKIES: ENCONTRADAS'
   )
} else {
   console.log(
      '⚠️ YOUTUBE COOKIES: NO ENCONTRADAS'
   )
}

// ===============================
// YT-DLP OPTIONS
// ===============================

const YTDLP_OPTIONS = {
   noWarnings: true,
   noPlaylist: true,
   ffmpegLocation: ffmpegPath,

   retries: 3,
   fragmentRetries: 3,
   extractorRetries: 3,

   socketTimeout: 30000,

   extractorArgs:
      'youtube:player_client=android,web,tv_embedded',

   ...(fs.existsSync(cookiesPath)
      ? {
           cookies: cookiesPath
        }
      : {})
}

// ===============================
// INFORMACIÓN DEL VIDEO
// ===============================

async function getVideoInfo(url) {

   return await youtubedl(
      url,
      {
         ...YTDLP_OPTIONS,

         dumpSingleJson:
            true,

         skipDownload:
            true,

         noCheckCertificates:
            true
      }
   )
}

// ===============================
// BUSCAR YOUTUBE
// ===============================

async function searchYouTube(query) {

   console.log(`
╭──────────────────────⬣
│ 🔎 BUSCANDO CON YT-DLP
├──────────────────────⬣
│ 🎵 ${query}
╰──────────────────────⬣
`)

   const results =
      await youtubedl(
         `ytsearch5:${query}`,
         {
            ...YTDLP_OPTIONS,

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
      !results.entries ||
      !results.entries.length
   ) {
      throw new Error(
         'No se encontraron resultados'
      )
   }

   const selected =
      results.entries.find(video =>
         video.title &&
         !video.title
            .toLowerCase()
            .includes('playlist') &&
         (
            !video.duration ||
            (
               video.duration > 30 &&
               video.duration < 1800
            )
         )
      ) ||
      results.entries.find(video =>
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
      selected.url ||
      (
         selected.id
            ? `https://www.youtube.com/watch?v=${selected.id}`
            : null
      )

   if (!videoUrl) {
      throw new Error(
         'No se pudo obtener la URL del video'
      )
   }

   console.log(
      `🎯 VIDEO SELECCIONADO: ${videoUrl}`
   )

   const info =
      await getVideoInfo(
         videoUrl
      )

   return {
      url:
         videoUrl,

      title:
         info.title ||
         selected.title ||
         'YouTube Audio',

      thumbnail:
         info.thumbnail ||
         selected.thumbnail ||
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
         info.view_count ||
         0
   }
}

// ===============================
// SELECCIONAR FORMATO REAL
// ===============================

function selectFormat(info) {

   if (
      !info ||
      !Array.isArray(
         info.formats
      )
   ) {
      throw new Error(
         'YT-DLP no devolvió formatos disponibles'
      )
   }

   const formats =
      info.formats.filter(
         format =>
            format &&
            format.format_id
      )

   if (!formats.length) {
      throw new Error(
         'No hay formatos disponibles para este video'
      )
   }

   console.log(
      `🎛️ FORMATOS DETECTADOS: ${formats.length}`
   )

   // ===============================
   // AUDIO PURO
   // ===============================

   const audioFormats =
      formats
         .filter(format =>
            format.vcodec === 'none' &&
            format.acodec &&
            format.acodec !== 'none'
         )
         .sort((a, b) => {

            const abrA =
               Number(
                  a.abr ||
                  a.tbr ||
                  0
               )

            const abrB =
               Number(
                  b.abr ||
                  b.tbr ||
                  0
               )

            return abrB - abrA
         })

   if (
      audioFormats.length
   ) {

      const selected =
         audioFormats[0]

      console.log(`
╭──────────────────────⬣
│ 🎧 AUDIO FORMAT
├──────────────────────⬣
│ ID: ${selected.format_id}
│ EXT: ${selected.ext || 'unknown'}
│ CODEC: ${selected.acodec || 'unknown'}
│ ABR: ${selected.abr || selected.tbr || 'unknown'}
╰──────────────────────⬣
`)

      return selected.format_id
   }

   // ===============================
   // VIDEO + AUDIO
   // ===============================

   const combinedFormats =
      formats
         .filter(format =>
            format.acodec &&
            format.acodec !== 'none' &&
            format.vcodec &&
            format.vcodec !== 'none'
         )
         .sort((a, b) => {

            const sizeA =
               Number(
                  a.filesize ||
                  a.filesize_approx ||
                  0
               )

            const sizeB =
               Number(
                  b.filesize ||
                  b.filesize_approx ||
                  0
               )

            if (
               sizeA &&
               sizeB
            ) {
               return sizeA - sizeB
            }

            return (
               Number(b.height || 0) -
               Number(a.height || 0)
            )
         })

   if (
      combinedFormats.length
   ) {

      const selected =
         combinedFormats[0]

      console.log(`
╭──────────────────────⬣
│ 🎬 VIDEO + AUDIO
├──────────────────────⬣
│ ID: ${selected.format_id}
│ EXT: ${selected.ext || 'unknown'}
│ RES: ${selected.resolution || 'unknown'}
│ CODEC: ${selected.acodec || 'unknown'}
╰──────────────────────⬣
`)

      return selected.format_id
   }

   throw new Error(
      'No se encontró un formato compatible'
   )
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
         {
            recursive:
               true
         }
      )
   }

   const fileId =
      `${Date.now()}-` +
      `${Math.random()
         .toString(36)
         .slice(2)}`

   const outputTemplate =
      path.join(
         tempDir,
         `${fileId}.%(ext)s`
      )

   console.log(`
╭──────────────────────⬣
│ 🚀 DESCARGANDO AUDIO
├──────────────────────⬣
│ 🎵 YT-DLP LOCAL
│ 🍪 COOKIES YOUTUBE
│ 🎬 FFMPEG LOCAL
│ 🎧 AUTO FORMAT ID
╰──────────────────────⬣
`)

   const start =
      Date.now()

   if (!fs.existsSync(cookiesPath)) {
      throw new Error(
         'Se requiere cookies.txt de YouTube para extraer audio.'
      )
   }

   let info

   // ===============================
   // OBTENER FORMATOS
   // ===============================

   try {

      info =
         await getVideoInfo(
            url
         )

   } catch (error) {

      console.error(
         '❌ ERROR OBTENIENDO FORMATOS:',
         error?.stderr ||
         error?.message ||
         error
      )

      throw error
   }

   // ===============================
   // ELEGIR FORMAT ID REAL
   // ===============================

   const formatId =
      selectFormat(
         info
      )

   let lastError = null
   let downloadedFile = null

   // ===============================
   // PRIMER INTENTO
   // ===============================

   try {

      console.log(
         `🎯 DESCARGANDO FORMAT ID: ${formatId}`
      )

      await youtubedl(
         url,
         {
            ...YTDLP_OPTIONS,

            format:
               formatId,

            output:
               outputTemplate,

            quiet:
               true,

            noPlaylist:
               true,

            noPart:
               true,

            mergeOutputFormat:
               'mp4'
         },
         {
            timeout:
               180000
         }
      )

      downloadedFile =
         fs.readdirSync(
            tempDir
         ).find(file =>
            file.startsWith(
               fileId
            )
         )

   } catch (error) {

      lastError =
         error

      console.log(
         '⚠️ PRIMER FORMATO FALLÓ'
      )

      console.log(
         error?.stderr ||
         error?.message ||
         ''
      )
   }

   // ===============================
   // FALLBACK: OTROS FORMATOS
   // ===============================

   if (!downloadedFile) {

      const formats =
         Array.isArray(
            info.formats
         )
            ? info.formats
            : []

      const alternatives =
         formats
            .filter(format =>
               format &&
               format.format_id &&
               (
                  (
                     format.vcodec === 'none' &&
                     format.acodec &&
                     format.acodec !== 'none'
                  ) ||
                  (
                     format.acodec &&
                     format.acodec !== 'none' &&
                     format.vcodec &&
                     format.vcodec !== 'none'
                  )
               )
            )
            .sort((a, b) => {

               const audioA =
                  a.vcodec === 'none'
                     ? 1
                     : 0

               const audioB =
                  b.vcodec === 'none'
                     ? 1
                     : 0

               if (
                  audioA !== audioB
               ) {
                  return audioB - audioA
               }

               return (
                  Number(
                     b.abr ||
                     b.tbr ||
                     0
                  ) -
                  Number(
                     a.abr ||
                     a.tbr ||
                     0
                  )
               )
            })

      for (
         const alternative
         of alternatives
      ) {

         if (
            alternative.format_id ===
            formatId
         ) {
            continue
         }

         try {

            console.log(
               `🔁 FALLBACK FORMAT: ${alternative.format_id}`
            )

            await youtubedl(
               url,
               {
                  ...YTDLP_OPTIONS,

                  format:
                     alternative.format_id,

                  output:
                     outputTemplate,

                  quiet:
                     true,

                  noPlaylist:
                     true,

                  noPart:
                     true
               },
               {
                  timeout:
                     180000
               }
            )

            downloadedFile =
               fs.readdirSync(
                  tempDir
               ).find(file =>
                  file.startsWith(
                     fileId
                  )
               )

            if (
               downloadedFile
            ) {
               break
            }

         } catch (error) {

            lastError =
               error

            console.log(
               `⚠️ FORMAT ${alternative.format_id} FALLÓ`
            )

            try {

               const partial =
                  fs.readdirSync(
                     tempDir
                  ).filter(file =>
                     file.startsWith(
                        fileId
                     )
                  )

               for (
                  const file
                  of partial
               ) {

                  fs.unlinkSync(
                     path.join(
                        tempDir,
                        file
                     )
                  )
               }

            } catch {}
         }
      }
   }

   if (!downloadedFile) {
      throw (
         lastError ||
         new Error(
            'No se pudo descargar ningún formato disponible'
         )
      )
   }

   // ===============================
   // LEER ARCHIVO
   // ===============================

   const outputFile =
      path.join(
         tempDir,
         downloadedFile
      )

   const stats =
      fs.statSync(
         outputFile
      )

   if (!stats.size) {

      try {
         fs.unlinkSync(
            outputFile
         )
      } catch {}

      throw new Error(
         'El audio descargado está vacío'
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
│ 📦 ${(stats.size / 1024 / 1024).toFixed(2)} MB
│ ⚡ ${(
   (Date.now() - start) /
   1000
).toFixed(1)}s
╰──────────────────────⬣
`)

   try {
      fs.unlinkSync(
         outputFile
      )
   } catch {}

   return buffer
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
               quoted:
                  message
            }
         )
      }

      let video

      // ===============================
      // URL DIRECTA
      // ===============================

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

         const directInfo =
            await getVideoInfo(
               query
            )

         video = {
            url:
               query,

            title:
               directInfo.title ||
               'YouTube Audio',

            thumbnail:
               directInfo.thumbnail ||
               'https://i.imgur.com/AfFp7pu.png',

            timestamp:
               directInfo.duration_string ||
               'Unknown',

            author: {
               name:
                  directInfo.uploader ||
                  directInfo.channel ||
                  'Unknown'
            },

            views:
               directInfo.view_count ||
               0
         }

      } else {

         // ===============================
         // CACHE
         // ===============================

         if (
            searchCache.has(
               query
            )
         ) {

            console.log(
               '⚡ USANDO SEARCH CACHE'
            )

            video =
               searchCache.get(
                  query
               )

         } else {

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
                  url:
                     video.thumbnail
               },

               caption:
`🎶 *DESCARGANDO AUDIO*

> ❀ Título: ${video.title}
> ❀ Autor: ${video.author?.name || 'Unknown'}
> ❀ Duración: ${video.timestamp || 'Unknown'}
> ❀ Vistas: ${video.views?.toLocaleString() || '0'}

> 🚀 Buscando canción...
> ${createBar(10)} 10%`
            },
            {
               quoted:
                  message
            }
         )

      // ===============================
      // DOWNLOAD
      // ===============================

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

      // ===============================
      // PROCESS
      // ===============================

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

         if (
            firstBytes.includes(
               '66747970'
            )
         ) {
            inputExt =
               'mp4'
         } else if (
            firstBytes.startsWith(
               '1a45dfa3'
            )
         ) {
            inputExt =
               'webm'
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
            err?.message ||
            err
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
            .slice(
               0,
               100
            ) ||
         'song'

      // ===============================
      // SEND AUDIO
      // ===============================

      await sock.sendMessage(
         chatId,
         {
            audio:
               finalBuffer,

            mimetype:
               'audio/mpeg',

            fileName:
               `${safeTitle}.mp3`,

            ptt:
               false
         },
         {
            quoted:
               message
         }
      )

      // ===============================
      // FINAL
      // ===============================

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
            quoted:
               message
         }
      )

      cleanMemory()
   }
}

module.exports = songCommand
