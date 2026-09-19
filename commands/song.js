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
  return {
    ...BASE_OPTIONS,
    cookies: cookiesPath,
    ...extra
  }
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
  console.log(`🔎 SEARCH: ${query}`)

  try {
    const result = await youtubedl(`ytsearch1:${query}`, youtubeOptions({
      dumpSingleJson: true,
      skipDownload: true,
      flatPlaylist: true,
      playlistItems: '1',
      format: 'bestaudio/best'
    }))

    const entry = result?.entries?.[0]

    if (!entry) {
      throw new Error('No se encontró ningún resultado')
    }

    const videoUrl =
      entry.webpage_url ||
      entry.url ||
      (entry.id ? `https://www.youtube.com/watch?v=${entry.id}` : null)

    if (!videoUrl) {
      throw new Error('Resultado sin URL')
    }

    console.log(`✅ SEARCH OK`)
    console.log(`🎯 VIDEO: ${videoUrl}`)

    return {
      url: videoUrl,
      title: entry.title || 'Audio de YouTube',
      thumbnail: entry.thumbnail || null,
      duration: entry.duration || 0
    }

  } catch (error) {
    console.log(`⚠️ SEARCH FALLÓ: ${error.message}`)

    // Fallback sin forzar cliente específico
    const result = await youtubedl(`ytsearch1:${query}`, {
      ...BASE_OPTIONS,
      dumpSingleJson: true,
      skipDownload: true,
      flatPlaylist: true,
      playlistItems: '1',
      format: 'bestaudio/best'
    })

    const entry = result?.entries?.[0]

    if (!entry) {
      throw new Error('No se encontró el video')
    }

    return {
      url:
        entry.webpage_url ||
        entry.url ||
        `https://www.youtube.com/watch?v=${entry.id}`,
      title: entry.title || 'Audio de YouTube',
      thumbnail: entry.thumbnail || null,
      duration: entry.duration || 0
    }
  }
}

async function getVideoInfo(url) {
  console.log(`🔎 INFO: COOKIES ON`)

  try {
    const info = await youtubedl(url, youtubeOptions({
      dumpSingleJson: true,
      skipDownload: true,
      format: 'bestaudio/best'
    }))

    console.log(`✅ INFO FUNCIONAL CON COOKIES`)

    return info

  } catch (error) {
    console.log(`⚠️ INFO CON COOKIES FALLÓ`)
    console.log(error.message)

    console.log(`🔄 INFO FALLBACK`)

    return await youtubedl(url, {
      ...BASE_OPTIONS,
      dumpSingleJson: true,
      skipDownload: true,
      format: 'bestaudio/best'
    })
  }
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

  try {
    console.log(`🎯 DOWNLOAD: COOKIES ON`)

    await youtubedl(url, youtubeOptions({
      output: outputPath,
      format: 'bestaudio[ext=m4a]/bestaudio/best',
      extractAudio: false,
      noPart: true,
      noContinue: true
    }))

    if (!fs.existsSync(outputPath)) {
      throw new Error('El archivo no fue creado')
    }

    const stats = fs.statSync(outputPath)

    if (stats.size < 1000) {
      throw new Error('El archivo descargado está vacío o incompleto')
    }

    console.log(`╭──────────────────────⬣`)
    console.log(`│ ✅ AUDIO DESCARGADO`)
    console.log(`├──────────────────────⬣`)
    console.log(`│ 🍪 COOKIES: ON`)
    console.log(`│ 📦 ${formatBytes(stats.size)}`)
    console.log(`╰──────────────────────⬣`)

    return outputPath

  } catch (error) {
    console.log(`⚠️ DOWNLOAD CON COOKIES FALLÓ`)
    console.log(error.message)

    console.log(`🔄 DOWNLOAD FALLBACK`)

    await youtubedl(url, {
      ...BASE_OPTIONS,
      output: outputPath,
      format: 'bestaudio/best',
      extractAudio: false,
      noPart: true,
      noContinue: true
    })

    if (!fs.existsSync(outputPath)) {
      throw new Error('No se pudo descargar el audio')
    }

    return outputPath
  }
}

async function songCommand({ msg, text, reply, react }) {
  const startTime = Date.now()

  if (!text || !text.trim()) {
    return reply(
      '╭━━〔 🎵 PLAY 〕━━⬣\n' +
      '│\n' +
      '│ Escribe el nombre de una canción\n' +
      '│ o pega un enlace de YouTube.\n' +
      '│\n' +
      '│ Ejemplo:\n' +
      '│ .play querer querernos\n' +
      '│\n' +
      '╰━━━━━━━━━━━━━━⬣'
    )
  }

  let tempDir = null
  let audioFile = null

  try {
    console.log(`╭──────────────────────⬣`)
    console.log(`│ 🎶 NUEVA DESCARGA`)
    console.log(`╰──────────────────────⬣`)

    let video

    // ─────────────────────────────
    // URL DIRECTA
    // ─────────────────────────────

    if (isYouTubeUrl(text.trim())) {
      console.log(`🔗 URL DIRECTA`)

      video = {
        url: text.trim(),
        title: 'Audio de YouTube',
        thumbnail: null
      }

      try {
        const info = await getVideoInfo(video.url)

        video.title = info.title || video.title
        video.thumbnail = info.thumbnail || null
        video.duration = info.duration || 0

      } catch (error) {
        console.log(`⚠️ No se pudo obtener metadata`)
      }

    } else {

      // ─────────────────────────────
      // BÚSQUEDA
      // ─────────────────────────────

      console.log(`╭──────────────────────⬣`)
      console.log(`│ 🔎 BUSCANDO CON YT-DLP`)
      console.log(`├──────────────────────⬣`)
      console.log(`│ 🎵 ${text}`)
      console.log(`╰──────────────────────⬣`)

      video = await searchYouTube(text.trim())
    }

    console.log(`🎯 VIDEO SELECCIONADO: ${video.url}`)

    // ─────────────────────────────
    // OBTENER INFO
    // ─────────────────────────────

    let info

    try {
      info = await getVideoInfo(video.url)

      video.title = info.title || video.title
      video.thumbnail = info.thumbnail || video.thumbnail
      video.duration = info.duration || video.duration

    } catch (error) {
      console.log(`⚠️ INFO FINAL FALLÓ`)
    }

    // ─────────────────────────────
    // MENSAJE DE DESCARGA
    // ─────────────────────────────

    try {
      if (react) await react('⬇️')
    } catch {}

    if (video.thumbnail) {
      try {
        await msg.client.sendMessage(
          from,
          {
            image: { url: video.thumbnail },
            caption:
              `╭──────────────────────⬣\n` +
              `│ 🎵 FELBOT PLAY\n` +
              `├──────────────────────⬣\n` +
              `│ 🎧 ${video.title}\n` +
              `│ 🍪 COOKIES ON\n` +
              `│ ⚡ DESCARGANDO...\n` +
              `╰──────────────────────⬣`
          },
          { quoted: msg }
        )
      } catch {
        await reply(
          `🎵 ${video.title}\n` +
          `⬇️ Descargando audio...`
        )
      }
    } else {
      await reply(
        `🎵 ${video.title}\n` +
        `⬇️ Descargando audio...`
      )
    }

    // ─────────────────────────────
    // TEMP
    // ─────────────────────────────

    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'felbot-play-')
    )

    audioFile = path.join(
      tempDir,
      'audio.%(ext)s'
    )

    // ─────────────────────────────
    // DESCARGAR
    // ─────────────────────────────

    const downloaded = await downloadAudio(
      video.url,
      audioFile
    )

    // yt-dlp puede crear .mp4 / .m4a / .webm
    let realAudioFile = downloaded

    if (!fs.existsSync(realAudioFile)) {
      const files = fs.readdirSync(tempDir)

      const possible = files.find(file =>
        /\.(mp4|m4a|webm|opus|mp3)$/i.test(file)
      )

      if (!possible) {
        throw new Error('No se encontró el audio descargado')
      }

      realAudioFile = path.join(tempDir, possible)
    }

    const firstBytes = fs
      .readFileSync(realAudioFile)
      .subarray(0, 32)

    console.log(
      `FIRST BYTES: ${firstBytes.toString('hex')}`
    )

    const inputExt =
      path.extname(realAudioFile)
        .replace('.', '')
        .toLowerCase()

    console.log(`🔍 INPUT EXT: ${inputExt}`)

    // ─────────────────────────────
    // CONVERTIR A MP3
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
      throw new Error('FFmpeg no generó el MP3')
    }

    const mp3Stats = fs.statSync(mp3Path)

    if (mp3Stats.size < 1000) {
      throw new Error('MP3 inválido o vacío')
    }

    const elapsed =
      ((Date.now() - startTime) / 1000).toFixed(1)

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

    await msg.client.sendMessage(
      from,
      {
        audio: fs.readFileSync(mp3Path),
        mimetype: 'audio/mpeg',
        fileName:
          `${video.title}`
            .replace(/[\\/:*?"<>|]/g, '')
            .slice(0, 80) +
          '.mp3',
        ptt: false
      },
      { quoted: msg }
    )

    try {
      if (react) await react('✅')
    } catch {}

  } catch (error) {

    console.error(`❌ PLAY ERROR:`)
    console.error(error)

    try {
      if (react) await react('❌')
    } catch {}

    await reply(
      `╭━━〔 ❌ ERROR PLAY 〕━━⬣\n` +
      `│\n` +
      `│ No pude descargar el audio.\n` +
      `│\n` +
      `│ ${error.message?.slice(0, 180) || 'Error desconocido'}\n` +
      `│\n` +
      `╰━━━━━━━━━━━━━━━━━━⬣`
    )

  } finally {

    // ─────────────────────────────
    // LIMPIAR TEMP
    // ─────────────────────────────

    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, {
          recursive: true,
          force: true
        })
      } catch (error) {
        console.log(
          `⚠️ No se pudo limpiar TEMP: ${error.message}`
        )
      }
    }
  }
}

module.exports = songCommand