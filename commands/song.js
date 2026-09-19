const youtubedl = require('youtube-dl-exec')
const ffmpegPath = require('ffmpeg-static')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { toAudio } = require('../lib/converter')

const cookiesPath = path.join(process.cwd(), 'cookies.txt')

const BASE_OPTIONS = {
  noWarnings: true,
  noPlaylist: true,
  ffmpegLocation: ffmpegPath,
  jsRuntimes: 'node',
  retries: 2,
  fragmentRetries: 2,
  extractorRetries: 2,
  socketTimeout: 15000,
  concurrentFragments: 4,
  noCheckCertificates: true
}

function youtubeOptions(extra = {}) {
  const options = {
    ...BASE_OPTIONS,
    ...extra
  }

  if (fs.existsSync(cookiesPath)) {
    options.cookies = cookiesPath
  }

  return options
}

function isYouTubeUrl(text) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(text)
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))

  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

async function searchYouTube(query) {
  console.log(`🔎 SEARCH CON COOKIES: ${query}`)

  const result = await youtubedl(
    `ytsearch1:${query}`,
    youtubeOptions({
      dumpSingleJson: true,
      skipDownload: true,
      flatPlaylist: true,
      playlistItems: '1',
      format: 'bestaudio/best'
    })
  )

  const entry = result?.entries?.[0]

  if (!entry) {
    throw new Error('No se encontró ningún resultado')
  }

  const url =
    entry.webpage_url ||
    entry.url ||
    (entry.id
      ? `https://www.youtube.com/watch?v=${entry.id}`
      : null)

  if (!url) {
    throw new Error('El resultado no tiene URL')
  }

  console.log(`✅ SEARCH FUNCIONAL`)
  console.log(`🎯 VIDEO: ${url}`)

  return {
    url,
    title: entry.title || 'Audio de YouTube',
    thumbnail: entry.thumbnail || null,
    duration: entry.duration || 0
  }
}

async function getVideoInfo(url) {
  console.log(`🔎 INFO: COOKIES ON`)

  const info = await youtubedl(
    url,
    youtubeOptions({
      dumpSingleJson: true,
      skipDownload: true,
      format: 'bestaudio/best'
    })
  )

  console.log(`✅ INFO FUNCIONAL: COOKIES ON`)

  return info
}

async function downloadAudio(url, outputPath) {
  console.log(`╭──────────────────────⬣`)
  console.log(`│ 🚀 DESCARGANDO AUDIO`)
  console.log(`├──────────────────────⬣`)
  console.log(`│ 🎵 YT-DLP LOCAL`)
  console.log(`│ 🎬 FFMPEG LOCAL`)
  console.log(`│ 🧠 NODE JS RUNTIME`)
  console.log(`│ 🍪 COOKIES ON`)
  console.log(`│ 🎧 BEST AUDIO`)
  console.log(`╰──────────────────────⬣`)

  console.log(`🎯 DOWNLOAD: COOKIES ON`)

  await youtubedl(
    url,
    youtubeOptions({
      output: outputPath,
      format: 'bestaudio[ext=m4a]/bestaudio/best',
      extractAudio: false,
      noPart: true,
      noContinue: true
    })
  )

  if (!fs.existsSync(outputPath)) {
    throw new Error('El archivo de audio no fue creado')
  }

  const stats = fs.statSync(outputPath)

  if (stats.size < 1000) {
    throw new Error('El archivo descargado está vacío')
  }

  console.log(`╭──────────────────────⬣`)
  console.log(`│ ✅ AUDIO DESCARGADO`)
  console.log(`├──────────────────────⬣`)
  console.log(`│ 🍪 COOKIES: ON`)
  console.log(`│ 📦 ${formatBytes(stats.size)}`)
  console.log(`╰──────────────────────⬣`)

  return outputPath
}

async function sendReply(msg, text) {
  if (typeof msg.reply === 'function') {
    return msg.reply(text)
  }

  const jid = msg?.key?.remoteJid

  if (!jid) {
    throw new Error('No se encontró el chat de destino')
  }

  if (msg?.client?.sendMessage) {
    return msg.client.sendMessage(
      jid,
      { text },
      { quoted: msg }
    )
  }

  throw new Error('No se encontró método para responder')
}

async function sendMessage(msg, content) {
  const jid = msg?.key?.remoteJid

  if (!jid) {
    throw new Error('No se encontró el chat de destino')
  }

  if (!msg?.client?.sendMessage) {
    throw new Error('No se encontró msg.client.sendMessage')
  }

  return msg.client.sendMessage(
    jid,
    content,
    { quoted: msg }
  )
}

async function songCommand({ msg, text, react }) {
  const startTime = Date.now()

  // Seguridad por si text no viene
  const commandText = String(text || '')
    .replace(/^\.play\s*/i, '')
    .trim()

  if (!commandText) {
    return sendReply(
      msg,
      `╭━━〔 🎵 PLAY 〕━━⬣
│
│ Escribe el nombre de una canción
│ o pega un enlace de YouTube.
│
│ Ejemplo:
│ .play querer querernos
│
╰━━━━━━━━━━━━━━⬣`
    )
  }

  let tempDir = null

  try {
    console.log(`╭──────────────────────⬣`)
    console.log(`│ 🎶 NUEVA DESCARGA`)
    console.log(`╰──────────────────────⬣`)

    let video

    // ─────────────────────────────
    // URL DIRECTA
    // ─────────────────────────────

    if (isYouTubeUrl(commandText)) {
      console.log(`🔗 URL DIRECTA`)

      video = {
        url: commandText,
        title: 'Audio de YouTube',
        thumbnail: null,
        duration: 0
      }

    } else {

      // ─────────────────────────
      // BÚSQUEDA
      // ─────────────────────────

      console.log(`╭──────────────────────⬣`)
      console.log(`│ 🔎 BUSCANDO CON YT-DLP`)
      console.log(`├──────────────────────⬣`)
      console.log(`│ 🎵 ${commandText}`)
      console.log(`╰──────────────────────⬣`)

      video = await searchYouTube(commandText)
    }

    console.log(`🎯 VIDEO SELECCIONADO: ${video.url}`)

    // ─────────────────────────────
    // INFO
    // ─────────────────────────────

    try {
      const info = await getVideoInfo(video.url)

      video.title =
        info?.title ||
        video.title ||
        'Audio de YouTube'

      video.thumbnail =
        info?.thumbnail ||
        video.thumbnail ||
        null

      video.duration =
        info?.duration ||
        video.duration ||
        0

    } catch (error) {
      console.log(`⚠️ INFO FALLÓ`)
      console.log(error.message)
    }

    // ─────────────────────────────
    // REACCIÓN
    // ─────────────────────────────

    try {
      if (typeof react === 'function') {
        await react('⬇️')
      }
    } catch {}

    // ─────────────────────────────
    // MENSAJE INICIAL
    // ─────────────────────────────

    await sendReply(
      msg,
      `╭──────────────────────⬣
│ 🎶 FELBOT PLAY
├──────────────────────⬣
│ 🎧 ${video.title}
│ 🍪 COOKIES ON
│ ⚡ DESCARGANDO...
╰──────────────────────⬣`
    )

    // ─────────────────────────────
    // TEMP
    // ─────────────────────────────

    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'felbot-play-')
    )

    const outputTemplate = path.join(
      tempDir,
      'audio.%(ext)s'
    )

    // ─────────────────────────────
    // DESCARGA
    // ─────────────────────────────

    const downloaded = await downloadAudio(
      video.url,
      outputTemplate
    )

    let realAudioFile = downloaded

    // yt-dlp puede cambiar la extensión
    if (!fs.existsSync(realAudioFile)) {
      const files = fs.readdirSync(tempDir)

      const possible = files.find(file =>
        /\.(mp4|m4a|webm|opus|mp3)$/i.test(file)
      )

      if (!possible) {
        throw new Error(
          'No se encontró el archivo descargado'
        )
      }

      realAudioFile = path.join(
        tempDir,
        possible
      )
    }

    // ─────────────────────────────
    // DETECTAR ARCHIVO
    // ─────────────────────────────

    const firstBytes = fs
      .readFileSync(realAudioFile)
      .subarray(0, 32)

    console.log(
      `FIRST BYTES: ${firstBytes.toString('hex')}`
    )

    const inputExt = path
      .extname(realAudioFile)
      .replace('.', '')
      .toLowerCase()

    console.log(`🔍 INPUT EXT: ${inputExt}`)

    // ─────────────────────────────
    // CONVERTIR
    // ─────────────────────────────

    const mp3Path = path.join(
      tempDir,
      'felbot-audio.mp3'
    )

    await toAudio(
      realAudioFile,
      mp3Path,
      ffmpegPath
    )

    if (!fs.existsSync(mp3Path)) {
      throw new Error(
        'FFmpeg no generó el MP3'
      )
    }

    const mp3Stats = fs.statSync(mp3Path)

    if (mp3Stats.size < 1000) {
      throw new Error(
        'El MP3 generado está vacío'
      )
    }

    const elapsed =
      ((Date.now() - startTime) / 1000)
        .toFixed(1)

    console.log(`╭──────────────────────⬣`)
    console.log(`│ ✅ DESCARGA COMPLETADA`)
    console.log(`├──────────────────────⬣`)
    console.log(`│ 🎧 ${video.title}`)
    console.log(`│ ⏱️ ${elapsed}s`)
    console.log(`│ 📦 ${formatBytes(mp3Stats.size)}`)
    console.log(`╰──────────────────────⬣`)

    // ─────────────────────────────
    // ENVIAR MP3
    // ─────────────────────────────

    const cleanTitle = String(
      video.title || 'Felbot Audio'
    )
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80)

    await sendMessage(msg, {
      audio: fs.readFileSync(mp3Path),
      mimetype: 'audio/mpeg',
      fileName: `${cleanTitle || 'felbot-audio'}.mp3`,
      ptt: false
    })

    try {
      if (typeof react === 'function') {
        await react('✅')
      }
    } catch {}

  } catch (error) {

    console.error(`❌ PLAY ERROR:`)
    console.error(error)

    try {
      if (typeof react === 'function') {
        await react('❌')
      }
    } catch {}

    await sendReply(
      msg,
      `╭━━〔 ❌ ERROR PLAY 〕━━⬣
│
│ No pude descargar el audio.
│
│ ${String(
        error?.message ||
        'Error desconocido'
      ).slice(0, 200)}
│
╰━━━━━━━━━━━━━━━━━━⬣`
    )

  } finally {

    // ─────────────────────────────
    // LIMPIAR TEMP
    // ─────────────────────────────

    if (
      tempDir &&
      fs.existsSync(tempDir)
    ) {
      try {
        fs.rmSync(tempDir, {
          recursive: true,
          force: true
        })
      } catch (error) {
        console.log(
          `⚠️ Error limpiando TEMP: ${error.message}`
        )
      }
    }
  }
}

module.exports = songCommand