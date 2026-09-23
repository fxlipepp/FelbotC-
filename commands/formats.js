const fs = require('fs')
const path = require('path')
const youtubedl = require('youtube-dl-exec')

const cookiesPath = '/home/container/cookies.txt'

const USER_AGENT =
   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36'

// ======================================================
// COOKIES
// ======================================================

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

// ======================================================
// OPCIONES BASE
// ======================================================

function buildOptions() {

   const options = {

      noWarnings:
         true,

      noPlaylist:
         true,

      noCheckCertificates:
         true,

      skipDownload:
         true,

      quiet:
         true,

      noProgress:
         true,

      extractorArgs:
         'youtube:player_client=default',

      userAgent:
         USER_AGENT

   }

   if (
      getCookiesStatus()
   ) {
      options.cookies =
         cookiesPath
   }

   return options
}

// ======================================================
// BUSCAR VIDEO
// ======================================================

async function resolveVideo(query) {

   if (
      query.includes(
         'youtube.com'
      ) ||
      query.includes(
         'youtu.be'
      )
   ) {

      return {
         url:
            query,

         title:
            'YouTube'
      }
   }

   const result =
      await youtubedl(
         'ytsearch1:' + query,
         {
            ...buildOptions(),

            dumpSingleJson:
               true,

            flatPlaylist:
               true,

            playlistEnd:
               1
         }
      )

   if (
      !result ||
      !result.entries ||
      !result.entries.length
   ) {
      throw new Error(
         'No se encontró el video'
      )
   }

   const video =
      result.entries[0]

   return {

      url:
         video.webpage_url ||
         `https://www.youtube.com/watch?v=${video.id}`,

      title:
         video.title ||
         query
   }
}

// ======================================================
// OBTENER FORMATOS
// ======================================================

async function getFormats(url) {

   /*
    * IMPORTANTE:
    *
    * No usamos:
    *
    * execFileSync('yt-dlp')
    *
    * porque en Sky no existe el binario
    * yt-dlp en el PATH.
    *
    * youtube-dl-exec utiliza su propio
    * ejecutable.
    */

   const options = {

      ...buildOptions(),

      dumpSingleJson:
         true,

      skipDownload:
         true,

      noPlaylist:
         true,

      /*
       * No seleccionar ningún formato.
       */

      format:
         undefined
   }

   const info =
      await youtubedl(
         url,
         options
      )

   if (
      !info ||
      !Array.isArray(
         info.formats
      )
   ) {

      throw new Error(
         'yt-dlp no devolvió información de formatos'
      )
   }

   return info
}

// ======================================================
// TAMAÑO
// ======================================================

function formatSize(bytes) {

   if (
      !bytes ||
      Number.isNaN(
         Number(bytes)
      )
   ) {
      return '—'
   }

   const value =
      Number(bytes)

   if (
      value >=
      1024 * 1024 * 1024
   ) {

      return (
         (
            value /
            1024 /
            1024 /
            1024
         ).toFixed(1) +
         ' GB'
      )
   }

   if (
      value >=
      1024 * 1024
   ) {

      return (
         (
            value /
            1024 /
            1024
         ).toFixed(1) +
         ' MB'
      )
   }

   if (
      value >=
      1024
   ) {

      return (
         (
            value /
            1024
         ).toFixed(1) +
         ' KB'
      )
   }

   return (
      value +
      ' B'
   )
}

// ======================================================
// TIPO
// ======================================================

function getType(format) {

   const video =
      format.vcodec &&
      format.vcodec !== 'none'

   const audio =
      format.acodec &&
      format.acodec !== 'none'

   if (
      video &&
      audio
   ) {
      return 'VIDEO+AUDIO'
   }

   if (video) {
      return 'VIDEO'
   }

   if (audio) {
      return 'AUDIO'
   }

   return 'UNKNOWN'
}

// ======================================================
// FORMATO PARA MOSTRAR
// ======================================================

function formatRow(format) {

   const id =
      format.format_id ||
      '—'

   const ext =
      format.ext ||
      '—'

   let resolution =
      '—'

   if (
      format.height
   ) {

      resolution =
         `${format.height}p`
   }

   const fps =
      format.fps ||
      '—'

   const vcodec =
      format.vcodec &&
      format.vcodec !== 'none'
         ? format.vcodec
         : '—'

   const acodec =
      format.acodec &&
      format.acodec !== 'none'
         ? format.acodec
         : '—'

   const size =
      format.filesize ||
      format.filesize_approx

   const sizeText =
      formatSize(size)

   const type =
      getType(format)

   return {
      id,
      ext,
      resolution,
      fps,
      vcodec,
      acodec,
      size:
         sizeText,
      type
   }
}

// ======================================================
// SELECCIONAR FORMATOS RELEVANTES
// ======================================================

function getRelevantFormats(
   formats
) {

   return formats
      .filter(
         format =>
            format &&
            format.format_id
      )
      .map(
         formatRow
      )
}

// ======================================================
// CANDIDATOS
// ======================================================

function getCandidates(
   formats
) {

   const videos =
      formats
         .filter(
            format =>
               format.format_id &&
               format.vcodec &&
               format.vcodec !== 'none'
         )
         .filter(
            format => {

               const ext =
                  String(
                     format.ext ||
                     ''
                  ).toLowerCase()

               return (
                  ext === 'mp4' ||
                  ext === 'webm'
               )
            }
         )
         .sort(
            (
               a,
               b
            ) =>
               Number(
                  b.height ||
                  0
               ) -
               Number(
                  a.height ||
                  0
               )
         )

   const audios =
      formats
         .filter(
            format =>
               format.format_id &&
               format.acodec &&
               format.acodec !== 'none'
         )
         .filter(
            format => {

               const ext =
                  String(
                     format.ext ||
                     ''
                  ).toLowerCase()

               return (
                  ext === 'm4a' ||
                  ext === 'webm'
               )
            }
         )
         .sort(
            (
               a,
               b
            ) =>
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

   const result = []

   for (
      const video of
      videos.slice(0, 10)
   ) {

      const audio =
         audios.find(
            item =>
               item.ext ===
               'm4a'
         ) ||
         audios[0]

      if (!audio) {
         continue
      }

      result.push({

         video:
            video.format_id,

         audio:
            audio.format_id,

         videoExt:
            video.ext,

         audioExt:
            audio.ext,

         videoCodec:
            video.vcodec,

         audioCodec:
            audio.acodec,

         resolution:
            video.height
               ? `${video.height}p`
               : '—'
      })
   }

   return result
}

// ======================================================
// COMANDO
// ======================================================

async function formatsCommand(
   sock,
   chatId,
   message
) {

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

      await sock.sendMessage(
         chatId,
         {
            text:
`🔬 *FELBOT FORMAT TEST*

Escribe una canción o URL de YouTube.

Ejemplo:

.formatos figaratto buhodermia

o

.formatos https://www.youtube.com/watch?v=...`
         },
         {
            quoted:
               message
         }
      )

      return true
   }

   try {

      await sock.sendMessage(
         chatId,
         {
            text:
               '🔬 Analizando formatos disponibles...'
         },
         {
            quoted:
               message
         }
      )

      // =================================================
      // BUSCAR
      // =================================================

      const target =
         await resolveVideo(
            query
         )

      console.log(
         '[FORMATOS] VIDEO:',
         target.url
      )

      // =================================================
      // FORMATOS
      // =================================================

      const info =
         await getFormats(
            target.url
         )

      const allFormats =
         getRelevantFormats(
            info.formats
         )

      if (
         !allFormats.length
      ) {

         throw new Error(
            'No se encontraron formatos'
         )
      }

      // =================================================
      // CANDIDATOS
      // =================================================

      const candidates =
         getCandidates(
            info.formats
         )

      // =================================================
      // SEPARAR
      // =================================================

      const videoFormats =
         allFormats.filter(
            item =>
               item.type ===
                  'VIDEO' ||
               item.type ===
                  'VIDEO+AUDIO'
         )

      const audioFormats =
         allFormats.filter(
            item =>
               item.type ===
                  'AUDIO' ||
               item.type ===
                  'VIDEO+AUDIO'
         )

      // =================================================
      // MENSAJE
      // =================================================

      const lines = []

      lines.push(
         '🔬 *FELBOT FORMAT TEST*'
      )

      lines.push('')

      lines.push(
         `🎵 *${target.title}*`
      )

      lines.push('')

      lines.push(
         `📦 FORMATOS ENCONTRADOS: ${allFormats.length}`
      )

      lines.push(
         `🍪 COOKIES: ${getCookiesStatus() ? 'ON' : 'OFF'}`
      )

      lines.push('')

      lines.push(
         '━━━━━━━━━━━━━━━━━━'
      )

      // =================================================
      // VIDEO
      // =================================================

      lines.push(
         '🎬 *VIDEO*'
      )

      lines.push('')

      for (
         const item of
         videoFormats
            .slice(0, 25)
      ) {

         lines.push(
            `${item.id} | ${item.ext} | ${item.resolution} | ${item.fps}fps | ${item.vcodec} | ${item.size}`
         )
      }

      // =================================================
      // AUDIO
      // =================================================

      lines.push('')

      lines.push(
         '━━━━━━━━━━━━━━━━━━'
      )

      lines.push(
         '🎵 *AUDIO*'
      )

      lines.push('')

      for (
         const item of
         audioFormats
            .slice(0, 15)
      ) {

         lines.push(
            `${item.id} | ${item.ext} | ${item.acodec} | ${item.size}`
         )
      }

      // =================================================
      // CANDIDATOS
      // =================================================

      lines.push('')

      lines.push(
         '━━━━━━━━━━━━━━━━━━'
      )

      lines.push(
         '🧪 *CANDIDATOS PARA PROBAR*'
      )

      lines.push('')

      if (
         candidates.length
      ) {

         for (
            const candidate of
            candidates.slice(
               0,
               10
            )
         ) {

            lines.push(
               `${candidate.video} + ${candidate.audio} → ${candidate.videoExt} + ${candidate.audioExt}`
            )

            lines.push(
               `   🎬 ${candidate.videoCodec} | 🎵 ${candidate.audioCodec} | ${candidate.resolution}`
            )
         }

      } else {

         lines.push(
            'No se encontraron combinaciones.'
         )
      }

      // =================================================
      // FLAGS
      // =================================================

      const codecs =
         new Set()

      for (
         const item of
         allFormats
      ) {

         if (
            item.vcodec !==
            '—'
         ) {
            codecs.add(
               item.vcodec
            )
         }

         if (
            item.acodec !==
            '—'
         ) {
            codecs.add(
               item.acodec
            )
         }
      }

      lines.push('')

      lines.push(
         '━━━━━━━━━━━━━━━━━━'
      )

      lines.push(
         '🔎 *CODECS DETECTADOS*'
      )

      lines.push('')

      lines.push(
         [...codecs]
            .slice(0, 20)
            .join('\n')
      )

      const finalText =
         lines.join('\n')

      // =================================================
      // DIVIDIR MENSAJE
      // =================================================

      const chunks = []

      let current =
         ''

      for (
         const line of
         finalText.split('\n')
      ) {

         if (
            (
               current +
               line +
               '\n'
            ).length >
            3500
         ) {

            chunks.push(
               current.trim()
            )

            current =
               line +
               '\n'

         } else {

            current +=
               line +
               '\n'
         }
      }

      if (
         current.trim()
      ) {

         chunks.push(
            current.trim()
         )
      }

      for (
         const chunk of
         chunks
      ) {

         await sock.sendMessage(
            chatId,
            {
               text:
                  chunk
            },
            {
               quoted:
                  message
            }
         )
      }

      console.log(
         `[FORMATOS] ${allFormats.length} formatos encontrados`
      )

      return true

   } catch (error) {

      console.error(
         '[FORMATOS] ERROR:',
         error?.stderr ||
         error?.message ||
         error
      )

      await sock.sendMessage(
         chatId,
         {
            text:
`❌ *No se pudieron obtener los formatos.*

> ${error?.message || 'Error desconocido'}

🍪 Cookies: ${getCookiesStatus() ? 'ON' : 'OFF'}`
         },
         {
            quoted:
               message
         }
      )

      return true
   }
}

// ======================================================
// EXPORTS
// ======================================================

module.exports =
   formatsCommand

module.exports.formatsCommand =
   formatsCommand