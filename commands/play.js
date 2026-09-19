const yts = require('yt-search')
const { execFile } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { promisify } = require('util')

const execFileAsync = promisify(execFile)

const searchCache = new Map()

async function playCommand(sock, chatId, message) {
   let tempFile = null

   try {
      // 📝 OBTENER TEXTO DEL MENSAJE
      const text =
         message.message?.conversation ||
         message.message?.extendedTextMessage?.text ||
         ''

      const searchQuery = text.split(' ').slice(1).join(' ').trim()

      // ❌ SIN CANCIÓN
      if (!searchQuery) {
         return sock.sendMessage(
            chatId,
            {
               text:
                  '🎵 Escribe el nombre de una canción.\n\n' +
                  'Ejemplo:\n' +
                  '.play Canserbero - Es épico'
            },
            { quoted: message }
         )
      }

      // 🔎 BUSCAR EN CACHÉ
      let video = searchCache.get(searchQuery)

      // 🔎 BUSCAR EN YOUTUBE
      if (!video) {
         const search = await yts(searchQuery)

         if (!search.videos?.length) {
            return sock.sendMessage(
               chatId,
               {
                  text: '❌ No encontré esa canción.'
               },
               { quoted: message }
            )
         }

         // 🎯 BUSCAR UN RESULTADO ADECUADO
         video =
            search.videos.find(v =>
               v.seconds > 30 &&
               v.seconds < 900 &&
               v.title &&
               !v.title.toLowerCase().includes('playlist')
            ) || search.videos[0]

         // 💾 GUARDAR EN CACHÉ
         searchCache.set(searchQuery, video)

         setTimeout(() => {
            searchCache.delete(searchQuery)
         }, 10 * 60 * 1000)
      }

      // 📁 CARPETA TEMPORAL
      const tempDir = path.join(os.tmpdir(), 'felbot-play')

      if (!fs.existsSync(tempDir)) {
         fs.mkdirSync(tempDir, { recursive: true })
      }

      // 🆔 NOMBRE ÚNICO
      const fileId =
         `${Date.now()}-` +
         `${Math.random().toString(36).slice(2)}`

      tempFile = path.join(tempDir, `${fileId}.%(ext)s`)

      // 📥 DESCARGAR CON YT-DLP
      console.log(`🎵 Descargando: ${video.title}`)

      const cookieArg = fs.existsSync(path.join(process.cwd(), 'cookies.txt'))
         ? ['--cookies', path.join(process.cwd(), 'cookies.txt')]
         : []

      if (!cookieArg.length) {
         throw new Error(
            'Se requiere cookies.txt de YouTube para extraer audio. Exporta las cookies del navegador y colócalas en la raíz del proyecto.'
         )
      }

      await execFileAsync(
         'yt-dlp',
         [
            '--no-playlist',
            '--format',
            'bestaudio/best',
            '--output',
            tempFile,
            '--no-warnings',
            '--quiet',
            '--retries',
            '3',
            '--ffmpeg-location',
            process.env.FFMPEG_PATH || 'ffmpeg',
            '--extractor-args',
            'youtube:player_client=android,web;player_skip=webpage',
            ...cookieArg,
            video.url
         ],
         {
            timeout: 120000,
            maxBuffer: 10 * 1024 * 1024
         }
      )

      const actualFile =
         fs.readdirSync(tempDir)
            .find(file => file.startsWith(fileId))

      if (!actualFile) {
         throw new Error('yt-dlp no generó un archivo de audio')
      }

      tempFile = path.join(tempDir, actualFile)

      // 🔍 VERIFICAR ARCHIVO
      if (!fs.existsSync(tempFile)) {
         throw new Error('yt-dlp no generó el archivo de audio')
      }

      const stats = fs.statSync(tempFile)

      if (!stats.size) {
         throw new Error('El archivo de audio está vacío')
      }

      console.log(
         `✅ Audio descargado: ${(stats.size / 1024 / 1024).toFixed(2)} MB`
      )

      // 🎵 ENVIAR AUDIO
      await sock.sendMessage(
         chatId,
         {
            audio: fs.createReadStream(tempFile),
            mimetype: 'audio/mpeg',
            fileName: `${video.title}.mp3`,
            ptt: false,

            contextInfo: {
               externalAdReply: {
                  title: video.title,
                  body:
                     `⏱️ ${video.timestamp || 'N/A'} • ` +
                     `👀 ${video.views?.toLocaleString() || 0} vistas`,
                  thumbnailUrl: video.thumbnail,
                  mediaType: 1,
                  renderLargerThumbnail: true,
                  showAdAttribution: false,
                  sourceUrl: video.url
               }
            }
         },
         { quoted: message }
      )

      console.log(`✅ .play enviado: ${video.title}`)

   } catch (error) {
      console.error('❌ PLAY ERROR:', error)

      try {
         await sock.sendMessage(
            chatId,
            {
               text:
                  '❌ No pude descargar esa canción.\n\n' +
                  'Intenta nuevamente en unos segundos.'
            },
            { quoted: message }
         )
      } catch (sendError) {
         console.error('❌ PLAY ERROR AL ENVIAR:', sendError)
      }

   } finally {
      // 🧹 ELIMINAR ARCHIVO TEMPORAL
      if (tempFile) {
         try {
            if (fs.existsSync(tempFile)) {
               fs.unlinkSync(tempFile)
               console.log('🧹 Archivo temporal eliminado')
            }
         } catch (cleanupError) {
            console.error(
               '❌ PLAY CLEANUP ERROR:',
               cleanupError
            )
         }
      }
   }
}

module.exports = playCommand