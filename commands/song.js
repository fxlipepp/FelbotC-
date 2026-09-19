const youtubedl = require('youtube-dl-exec')
const ffmpegPath = require('ffmpeg-static')
const fs = require('fs')
const path = require('path')
const { toAudio } = require('../lib/converter')

const cookiesPath = path.join(process.cwd(), 'cookies.txt')
const tempBase = process.env.TMPDIR || path.join(process.cwd(), 'temp')

if (!fs.existsSync(tempBase)) {
    fs.mkdirSync(tempBase, { recursive: true })
}

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

    // Las cookies se mantienen activas para evitar el bloqueo de YouTube
    if (fs.existsSync(cookiesPath)) {
        options.cookies = cookiesPath
    }

    return options
}

async function searchYouTube(query) {
    const result = await youtubedl(
        `ytsearch1:${query}`,
        youtubeOptions({
            dumpSingleJson: true,
            skipDownload: true,
            flatPlaylist: true,
            playlistItems: '1'
        })
    )

    if (!result) {
        throw new Error('No se encontraron resultados')
    }

    const entry = result.entries?.[0] || result

    if (!entry?.webpage_url && !entry?.url) {
        throw new Error('No se pudo obtener el video')
    }

    return {
        url: entry.webpage_url || entry.url,
        title: entry.title || query,
        thumbnail: entry.thumbnail || null,
        duration: entry.duration || 0
    }
}

async function getVideoInfo(url) {
    return await youtubedl(
        url,
        youtubeOptions({
            dumpSingleJson: true,
            skipDownload: true,
            format: 'bestaudio/best'
        })
    )
}

async function downloadAudio(url, outputPath) {
    await youtubedl(
        url,
        youtubeOptions({
            output: outputPath,
            format: 'bestaudio[ext=m4a]/bestaudio/best',
            noPart: true,
            noContinue: true
        })
    )

    const directory = path.dirname(outputPath)
    const files = fs.readdirSync(directory)

    const audioFile = files.find(file => {
        return /\.(m4a|mp4|webm|opus|mp3|aac|wav)$/i.test(file)
    })

    if (!audioFile) {
        throw new Error('yt-dlp no generó ningún archivo de audio')
    }

    return path.join(directory, audioFile)
}

function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '—'

    seconds = Number(seconds)

    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }

    return `${m}:${String(s).padStart(2, '0')}`
}

async function playCommand(sock, chatId, message) {
    const startTime = Date.now()

    let workDir = null

    try {
        const rawText =
            message?.message?.conversation?.trim() ||
            message?.message?.extendedTextMessage?.text?.trim() ||
            message?.message?.imageMessage?.caption?.trim() ||
            message?.message?.videoMessage?.caption?.trim() ||
            ''

        const text = rawText.replace(/^\.play\s*/i, '').trim()

        if (!text) {
            return await sock.sendMessage(
                chatId,
                {
                    text:
`╭━━〔 🎶 FELBOT PLAY 〕━━⬣
│
│ ❌ Escribe el nombre de una canción.
│
│ 💡 Ejemplo:
│ .play hola beba
│
╰━━━━━━━━━━━━━━━━━━━━⬣`
                },
                { quoted: message }
            )
        }

        console.log('\n─────────────────────⬣')
        console.log('│ 🎶 NUEVA DESCARGA')
        console.log('╰─────────────────────⬣')

        console.log('╭─────────────────────⬣')
        console.log('│ 🔎 BUSCANDO CON YT-DLP')
        console.log('├─────────────────────⬣')
        console.log(`│ 🎵 ${text}`)
        console.log('╰─────────────────────⬣')

        const video = await searchYouTube(text)

        console.log(`🎯 VIDEO SELECCIONADO: ${video.url}`)

        /*
         * Solo hacemos INFO cuando realmente hace falta.
         * Para búsquedas ya tenemos título, duración y thumbnail.
         * Esto ahorra una petición completa a YouTube.
         */
        let title = video.title
        let duration = video.duration

        if (!title || title === text || !duration) {
            try {
                const info = await getVideoInfo(video.url)

                title = info.title || title
                duration = info.duration || duration
            } catch (infoError) {
                console.log('⚠️ INFO OMITIDA:', infoError.message)
            }
        }

        console.log('🎯 VIDEO:', video.url)

        workDir = fs.mkdtempSync(
            path.join(tempBase, 'felbot-play-')
        )

        const inputPath = path.join(
            workDir,
            'audio.%(ext)s'
        )

        console.log('╭─────────────────────⬣')
        console.log('│ 🚀 DESCARGANDO AUDIO')
        console.log('├─────────────────────⬣')
        console.log('│ 🎵 YT-DLP LOCAL')
        console.log('│ 🎬 FFMPEG LOCAL')
        console.log('│ 🧠 NODE JS RUNTIME')
        console.log('│ 🍪 COOKIES ON')
        console.log('│ 🎧 BEST AUDIO')
        console.log('╰─────────────────────⬣')

        const downloadedFile = await downloadAudio(
            video.url,
            inputPath
        )

        const mp3Path = path.join(
            workDir,
            'felbot-audio.mp3'
        )

        await toAudio(
            downloadedFile,
            mp3Path,
            ffmpegPath
        )

        if (!fs.existsSync(mp3Path)) {
            throw new Error('FFmpeg no generó el MP3')
        }

        const stats = fs.statSync(mp3Path)
        const fileSizeMB = (
            stats.size / 1024 / 1024
        ).toFixed(2)

        const elapsed = (
            (Date.now() - startTime) / 1000
        ).toFixed(1)

        console.log('╭─────────────────────⬣')
        console.log('│ ✅ AUDIO DESCARGADO')
        console.log('├─────────────────────⬣')
        console.log(`│ 🎵 ${title}`)
        console.log(`│ ⏱️ ${formatDuration(duration)}`)
        console.log(`│ 📦 ${fileSizeMB} MB`)
        console.log(`│ ⚡ ${elapsed}s`)
        console.log('╰─────────────────────⬣')

        await sock.sendMessage(
            chatId,
            {
                audio: fs.readFileSync(mp3Path),
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`,
                ptt: false
            },
            { quoted: message }
        )

    } catch (error) {
        console.error('❌ PLAY ERROR:', error)

        await sock.sendMessage(
            chatId,
            {
                text:
`╭━━〔 🎶 FELBOT PLAY 〕━━⬣
│
│ ❌ No se pudo descargar el audio.
│
│ ⚠️ ${error?.message || 'Error desconocido'}
│
╰━━━━━━━━━━━━━━━━━━━━⬣`
            },
            { quoted: message }
        )

    } finally {
        if (workDir && fs.existsSync(workDir)) {
            try {
                fs.rmSync(workDir, {
                    recursive: true,
                    force: true
                })
            } catch (cleanupError) {
                console.log(
                    '⚠️ No se pudo limpiar temporal:',
                    cleanupError.message
                )
            }
        }
    }
}

module.exports = playCommand