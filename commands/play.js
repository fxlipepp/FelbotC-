const yts = require('yt-search')
const { execFile } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { promisify } = require('util')

const execFileAsync = promisify(execFile)

const searchCache = new Map()

const YOUTUBE_CLIENTS = [
   ['player_client=android', 'player_skip=webpage'],
   ['player_client=tv_embedded', 'player_skip=webpage'],
   ['player_client=ios', 'player_skip=webpage']
]

function getYtDlpBaseOptions(extra = {}) {
   const cookiesPath = process.env.YOUTUBE_COOKIES || path.join(process.cwd(), 'cookies.txt')
   const cookies = fs.existsSync(cookiesPath)
      ? { cookies: cookiesPath }
      : {}

   return {
      noWarnings: true,
      noPlaylist: true,
      ffmpegLocation: process.env.FFMPEG_PATH || 'ffmpeg',
      preferFreeFormats: true,
      addHeader: [
         'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
         'Accept-Language: es-ES,es;q=0.9,en;q=0.8'
      ],
      ...cookies,
      ...extra
   }
}

async function runYtDlpWithFallback(input, args = [], options = {}) {
   let lastError

   for (const clientArgs of YOUTUBE_CLIENTS) {
      try {
         return await execFileAsync(
            'yt-dlp',
            [
               ...args,
               '--extractor-args',
               `youtube:${clientArgs.join(',')}`,
               '--ffmpeg-location',
               process.env.FFMPEG_PATH || 'ffmpeg',
               input
            ],
            {
               ...options,
               env: {
                  ...process.env,
                  ...(fs.existsSync(process.env.YOUTUBE_COOKIES || path.join(process.cwd(), 'cookies.txt'))
                     ? { YT_DLP_COOKIES: process.env.YOUTUBE_COOKIES || path.join(process.cwd(), 'cookies.txt') }
                     : {})
               }
            }
         )
      } catch (error) {
         lastError = error
         const rawError = error?.stderr || error?.message || ''

         if (!/sign in to confirm|not a bot|cookies-from-browser|cookies/i.test(rawError)) {
            throw error
         }
      }
   }

   throw lastError
}

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

      tempFile = path.join(tempDir, `${fileId}.mp3`)

      // 📥 DESCARGAR CON YT-DLP
      console.log(`🎵 Descargando: ${video.title}`)

      await runYtDlpWithFallback(
         video.url,
         [
            '--no-playlist',
            '--extract-audio',
            '--audio-format',
            'mp3',
            '--audio-quality',
            '128K',
            '--output',
            tempFile,
            '--no-warnings',
            '--quiet'
         ],
         {
            timeout: 120000,
            maxBuffer: 10 * 1024 * 1024
         }
      )

      // 🔍 VERIFICAR ARCHIVO
      if (!fs.existsSync(tempFile)) {
         throw new Error('yt-dlp no generó el archivo MP3')
      }

      const stats = fs.statSync(tempFile)

      if (!stats.size) {
         throw new Error('El archivo MP3 está vacío')
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