const { execFile } = require('child_process')
const { promisify } = require('util')
const youtubedl = require('youtube-dl-exec')
const yts = require('yt-search')
const fs = require('fs')
const path = require('path')
const os = require('os')

const execFileAsync = promisify(execFile)

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
// COOKIES
// ======================================================

const cookiesPath =
   '/home/container/cookies.txt'

const YOUTUBE_USER_AGENT =
   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36'

function getCookiesStatus() {

   try {

      if (!fs.existsSync(cookiesPath)) {
         return false
      }

      const stats =
         fs.statSync(
            cookiesPath
         )

      return (
         stats.isFile() &&
         stats.size > 100
      )

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

   noWarnings:
      true,

   noPlaylist:
      true,

   retries:
      1,

   noCheckCertificates:
      true,

   jsRuntimes:
      'node:/usr/local/bin/node',

   userAgent:
      YOUTUBE_USER_AGENT
}

// ======================================================
// OPCIONES YT-DLP
// ======================================================

function youtubeOptions({
   cookies = false,
   format = null
} = {}) {

   const options = {
      ...BASE_OPTIONS
   }

   // Dejar que yt-dlp seleccione automáticamente los clientes de YouTube.
   // Forzar web_embedded/default aquí provocaba respuestas sin formatos disponibles.

   if (
      cookies &&
      getCookiesStatus()
   ) {

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

// ======================================================
// REACCIONES
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

async function searchYouTube(query) {
   console.log('🔎 BUSCANDO YOUTUBE:', query)
   const results = await yts(query)
   const selected = results.videos?.[0]
   if (!selected?.url) throw new Error('No se encontraron resultados en YouTube')
   console.log('✅ VIDEO:', selected.title)
   console.log('🎯 URL:', selected.url)
   return {
      url: selected.url,
      title: selected.title || 'YouTube Audio',
      thumbnail: selected.thumbnail || 'https://i.imgur.com/AfFp7pu.png',
      timestamp: selected.timestamp || 'Unknown',
      author: { name: selected.author?.name || 'Unknown' },
      views: selected.views || 0
   }
}

// ======================================================
// ======================================================
// DESCARGA DIRECTA CON YT-DLP (M4A SIN CONVERSIÓN)
// ======================================================

function getYtDlpPath() {
   const possiblePaths = []

   try {
      const resolved = require.resolve('youtube-dl-exec')
      const packageDir = path.dirname(resolved)

      possiblePaths.push(
         path.join(packageDir, 'bin', 'yt-dlp'),
         path.join(packageDir, '..', 'bin', 'yt-dlp'),
         path.join(packageDir, '..', '..', 'bin', 'yt-dlp')
      )
   } catch {}

   possiblePaths.push(
      path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp'),
      path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe')
   )

   if (youtubedl.path) possiblePaths.push(youtubedl.path)

   for (const candidate of possiblePaths) {
      try {
         if (candidate && fs.existsSync(candidate)) return candidate
      } catch {}
   }

   return null
}

async function downloadAudio(videoUrl) {
   const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'felbot-play-'))
   const outputTemplate = path.join(tempDir, 'audio.%(ext)s')
   const ytDlpPath = getYtDlpPath()
   const cookiesEnabled = validateCookiesFile()

   try {
      if (!ytDlpPath) {
         throw new Error('No se encontró yt-dlp dentro de youtube-dl-exec')
      }

      const args = [
         '--no-warnings',
         '--no-progress',
         '--no-playlist',
         '--no-part',
         '--retries', '2',
         '--fragment-retries', '2',
         '--concurrent-fragments', '4',
         '--js-runtimes', `node:${process.execPath}`,
         '--format', 'bestaudio[ext=m4a]/bestaudio',
         '--output', outputTemplate
      ]

      if (cookiesEnabled) args.push('--cookies', cookiesPath)
      args.push(videoUrl)

      console.log(`🚀 YT-DLP DIRECTO | COOKIES: ${cookiesEnabled ? 'ON' : 'OFF'}`)

      const { stdout, stderr } = await execFileAsync(ytDlpPath, args, {
         timeout: 120000,
         maxBuffer: 20 * 1024 * 1024,
         windowsHide: true
      })

      if (stdout?.trim()) console.log('[YT-DLP]', stdout.trim())
      if (stderr?.trim()) console.log('[YT-DLP]', stderr.trim())

      const downloadedFiles = fs.readdirSync(tempDir).filter(file =>
         file.startsWith('audio.') &&
         !file.endsWith('.part') &&
         !file.endsWith('.ytdl') &&
         !file.endsWith('.json')
      )

      if (!downloadedFiles.length) {
         throw new Error('YT-DLP terminó sin generar un archivo de audio')
      }

      const selectedFile =
         downloadedFiles.find(file => file.toLowerCase().endsWith('.m4a')) ||
         downloadedFiles[0]

      const outputFile = path.join(tempDir, selectedFile)
      const stats = fs.statSync(outputFile)

      if (!stats.isFile() || stats.size < 10000) {
         throw new Error('YT-DLP generó un archivo vacío o incompleto')
      }

      const extension = path.extname(selectedFile).slice(1).toLowerCase()
      const mimeTypes = {
         m4a: 'audio/mp4',
         mp3: 'audio/mpeg',
         webm: 'audio/webm',
         opus: 'audio/ogg',
         ogg: 'audio/ogg'
      }

      const buffer = fs.readFileSync(outputFile)

      console.log(`✅ AUDIO DESCARGADO: ${(stats.size / 1024 / 1024).toFixed(2)} MB | .${extension}`)

      return {
         buffer,
         extension: extension || 'm4a',
         mimetype: mimeTypes[extension] || 'application/octet-stream'
      }
   } catch (error) {
      console.error('[YT-DLP] DOWNLOAD ERROR:', error?.stderr || error?.message || error)
      throw error
   } finally {
      try {
         fs.rmSync(tempDir, { recursive: true, force: true })
      } catch (cleanupError) {
         console.error('[YT-DLP] No se pudo limpiar el temporal:', cleanupError.message)
      }
   }
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

   let loading = null

   try {

      console.log(`
╭──────────────────────⬣
│ 🎶 NUEVA DESCARGA
╰──────────────────────⬣
`)

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

      await reactToSong(
         sock,
         message,
         '🔎'
      )

      let video

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

      loading =
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
> ❀ Vistas: ${Number(
   video.views || 0
).toLocaleString()}

> ⚡ Descargando audio...
> ${createBar(25)} 25%`
            },
            {
               quoted:
                  message
            }
         )

      const audioResult = await downloadAudio(video.url)
      const audioBuffer = audioResult.buffer

      if (
         !audioBuffer ||
         audioBuffer.length < 50000
      ) {

         throw new Error(
            'Audio inválido'
         )
      }

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

      try {

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
`⚡ *AUDIO LISTO*

> ❀ Título: ${safeTitle}

> 🚀 Enviando audio...
> ${createBar(90)} 90%`
            }
         )

      } catch {}

      await sock.sendMessage(
         chatId,
         {
            audio:
               audioBuffer,

            mimetype:
               audioResult.mimetype,

            fileName:
               safeTitle +
               '.' +
               audioResult.extension,

            ptt:
               false
         },
         {
            quoted:
               message
         }
      )

      await reactToSong(
         sock,
         message,
         '✅'
      )

      const totalTime =
         (
            (
               Date.now() -
               startTime
            ) /
            1000
         ).toFixed(1)

      try {

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

> ⚡ Completado en ${totalTime}s
> ${createBar(100)} 100%`
            }
         )

      } catch {}

      console.log(`
╭──────────────────────⬣
│ ✅ PLAY COMPLETADO
├──────────────────────⬣
│ 🎧 ${safeTitle}
│ ⚡ MODO RÁPIDO
│ 📦 ${audioResult.extension.toUpperCase()} DIRECTO
│ ⏱️ ${totalTime}s
╰──────────────────────⬣
`)

      cleanMemory()

      return true

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

         if (loading) {

            await sock.sendMessage(
               chatId,
               {
                  edit:
                     loading.key,

                  image: {
                     url:
                        'https://i.imgur.com/AfFp7pu.png'
                  },

                  caption:
`❌ *ERROR EN LA DESCARGA*

> No se pudo obtener el audio.

> 🔄 Inténtalo nuevamente.`
               }
            )

         } else {

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
         }

      } catch {}

      cleanMemory()

      return false
   }
}

// ======================================================
// EXPORT
// ======================================================

module.exports =
   songCommand