const fs = require('fs')
const path = require('path')
const os = require('os')
const ytdl = require('youtube-dl-exec')

const COOKIES_PATH = '/home/container/cookies.txt'
const TEMP_DIR = path.join(os.tmpdir(), 'felbot-play')

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
}

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36'

const BASE_OPTIONS = {
    noWarnings: true,
    noPlaylist: true,
    retries: 1,
    noCheckCertificates: true,
    jsRuntimes: 'node',
    userAgent: USER_AGENT,
    socketTimeout: 90000
}

function cookiesAvailable() {
    try {
        return (
            fs.existsSync(COOKIES_PATH) &&
            fs.statSync(COOKIES_PATH).size > 100
        )
    } catch {
        return false
    }
}

function youtubeOptions(extra = {}) {
    const options = {
        ...BASE_OPTIONS,
        extractorArgs: 'youtube:player_client=default',
        ...extra
    }

    if (cookiesAvailable()) {
        options.cookies = COOKIES_PATH
    }

    return options
}

function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) {
        return 'Desconocida'
    }

    seconds = Math.floor(Number(seconds))

    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60

    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }

    return `${m}:${String(s).padStart(2, '0')}`
}

function formatViews(views) {
    const number = Number(views || 0)

    if (!number) {
        return 'Desconocidas'
    }

    return number.toLocaleString('es-CO')
}

function progressBar(percent) {
    const total = 10
    const filled = Math.round((percent / 100) * total)
    const empty = total - filled

    return `${'▰'.repeat(filled)}${'▱'.repeat(empty)} ${percent}%`
}

function safeName(name) {
    return String(name || 'audio')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100)
}

function getThumbnail(id, thumbnail) {
    if (id) {
        return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    }

    return thumbnail || null
}

function getCaption(video, status, percent, elapsed = null) {
    const title = video.title || 'Canción'
    const author = video.author?.name || 'YouTube'
    const duration = video.timestamp || formatDuration(video.duration)
    const views = formatViews(video.views)

    let caption =
`🎵 *${title}*

> 👤 ${author}
> ⏱️ ${duration}
> 👁️ ${views} vistas

${status}
${progressBar(percent)}`

    if (elapsed !== null) {
        caption += `\n> ⚡ ${elapsed}s`
    }

    caption += `\n\n> 𝕱𝖊𝖑𝖇𝖔𝖙 夜`

    return caption
}

async function react(sock, chatId, message, emoji) {
    try {
        if (!message?.key) return

        await sock.sendMessage(chatId, {
            react: {
                text: emoji,
                key: message.key
            }
        })
    } catch {}
}

async function searchYouTube(query) {
    console.log(`🔎 SEARCH: ${query}`)

    const result = await ytdl(
        `ytsearch1:${query}`,
        youtubeOptions({
            flatPlaylist: true,
            dumpSingleJson: true,
            skipDownload: true,
            playlistEnd: 1
        })
    )

    const video =
        result?.entries?.[0] ||
        result

    if (!video || !video.id) {
        throw new Error('No se encontró la canción')
    }

    return {
        id: video.id,
        url:
            video.webpage_url ||
            `https://www.youtube.com/watch?v=${video.id}`,
        title: video.title || 'Canción',
        author: {
            name:
                video.uploader ||
                video.channel ||
                'YouTube'
        },
        timestamp:
            video.duration_string ||
            formatDuration(video.duration),
        duration: video.duration || 0,
        views: video.view_count || 0,
        thumbnail: getThumbnail(
            video.id,
            video.thumbnail
        )
    }
}

async function getVideoInfo(url) {
    const result = await ytdl(
        url,
        youtubeOptions({
            dumpSingleJson: true,
            skipDownload: true
        })
    )

    if (!result?.id) {
        throw new Error('No se pudo obtener la información del video')
    }

    return {
        id: result.id,
        url:
            result.webpage_url ||
            url,
        title:
            result.title ||
            'Canción',
        author: {
            name:
                result.uploader ||
                result.channel ||
                'YouTube'
        },
        timestamp:
            result.duration_string ||
            formatDuration(result.duration),
        duration:
            result.duration || 0,
        views:
            result.view_count || 0,
        thumbnail:
            getThumbnail(
                result.id,
                result.thumbnail
            )
    }
}

async function downloadAudio(url, onProgress) {
    const fileId =
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const output =
        path.join(
            TEMP_DIR,
            `${fileId}.%(ext)s`
        )

    const options = youtubeOptions({
        format: 'bestaudio[ext=m4a]/bestaudio',
        output,
        concurrentFragments: 4,
        noPart: true,
        progress: true,
        newline: true
    })

    try {
        const process = ytdl.exec(
            url,
            options
        )

        const parseProgress = data => {
            const text = data.toString()

            const match =
                text.match(/(\d+(?:\.\d+)?)%/)

            if (!match) return

            let percent =
                Math.floor(
                    Number(match[1])
                )

            percent =
                Math.max(
                    10,
                    Math.min(95, percent)
                )

            if (onProgress) {
                onProgress(percent)
            }
        }

        process.stdout?.on(
            'data',
            parseProgress
        )

        process.stderr?.on(
            'data',
            parseProgress
        )

        await process

    } catch (error) {
        console.error(
            '[PLAY DOWNLOAD ERROR]',
            error?.stderr ||
            error?.message ||
            error
        )

        throw error
    }

    const files =
        fs.readdirSync(TEMP_DIR)
            .filter(file =>
                file.startsWith(`${fileId}.`)
            )

    if (!files.length) {
        throw new Error(
            'No se encontró el audio descargado'
        )
    }

    const audioFile =
        files.find(file =>
            file.endsWith('.m4a')
        ) || files[0]

    return path.join(
        TEMP_DIR,
        audioFile
    )
}

function deleteFile(file) {
    try {
        if (
            file &&
            fs.existsSync(file)
        ) {
            fs.unlinkSync(file)
        }
    } catch {}
}

async function updateMessage(
    sock,
    chatId,
    loading,
    video,
    status,
    percent,
    elapsed
) {
    try {
        await sock.sendMessage(
            chatId,
            {
                image: {
                    url:
                        video.thumbnail
                },
                caption:
                    getCaption(
                        video,
                        status,
                        percent,
                        elapsed
                    )
            },
            {
                edit: loading.key
            }
        )
    } catch (error) {
        console.log(
            '[PLAY UPDATE]',
            error.message
        )
    }
}

async function songCommand(
    sock,
    chatId,
    message
) {
    const start = Date.now()

    try {
        const text =
            message?.message?.conversation ||
            message?.message?.extendedTextMessage?.text ||
            message?.message?.imageMessage?.caption ||
            message?.message?.videoMessage?.caption ||
            ''

        const query =
            text
                .replace(/^\.play\b/i, '')
                .trim()

        if (!query) {
            await sock.sendMessage(
                chatId,
                {
                    text:
`🎵 *Uso de .play*

> .play nombre de la canción

Ejemplo:
> .play Querer Querernos

> 𝕱𝖊𝖑𝖇𝖔𝖙 夜`
                },
                {
                    quoted: message
                }
            )

            return
        }

        await react(
            sock,
            chatId,
            message,
            '🔎'
        )

        let video

        if (
            /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i
                .test(query)
        ) {
            video =
                await getVideoInfo(query)
        } else {
            video =
                await searchYouTube(query)
        }

        console.log(
            `🎵 ${video.title}`
        )

        const loading =
            await sock.sendMessage(
                chatId,
                {
                    image: {
                        url:
                            video.thumbnail
                    },
                    caption:
                        getCaption(
                            video,
                            '⏳ Preparando audio...',
                            5
                        )
                },
                {
                    quoted: message
                }
            )

        await react(
            sock,
            chatId,
            message,
            '⬇️'
        )

        let lastUpdate = 0

        const onProgress =
            async percent => {
                const now = Date.now()

                if (
                    now - lastUpdate < 1500 &&
                    percent < 95
                ) {
                    return
                }

                lastUpdate = now

                const elapsed =
                    (
                        (now - start) /
                        1000
                    ).toFixed(1)

                await updateMessage(
                    sock,
                    chatId,
                    loading,
                    video,
                    '⬇️ Descargando audio...',
                    percent,
                    elapsed
                )
            }

        const file =
            await downloadAudio(
                video.url,
                onProgress
            )

        const elapsed =
            (
                (Date.now() - start) /
                1000
            ).toFixed(1)

        await react(
            sock,
            chatId,
            message,
            '🎧'
        )

        await updateMessage(
            sock,
            chatId,
            loading,
            video,
            '🎧 Audio preparado',
            100,
            elapsed
        )

        await sock.sendMessage(
            chatId,
            {
                audio: {
                    url: file
                },
                mimetype: 'audio/mp4',
                fileName:
                    `${safeName(video.title)}.m4a`,
                ptt: false
            },
            {
                quoted: message
            }
        )

        await react(
            sock,
            chatId,
            message,
            '✅'
        )

        await updateMessage(
            sock,
            chatId,
            loading,
            video,
            '✅ Audio enviado correctamente',
            100,
            (
                (Date.now() - start) /
                1000
            ).toFixed(1)
        )

        setTimeout(() => {
            deleteFile(file)
        }, 5000)

        console.log(
            `✅ PLAY LISTO | ${video.title}`
        )

    } catch (error) {
        console.error(
            '[PLAY ERROR]',
            error?.stderr ||
            error?.message ||
            error
        )

        await react(
            sock,
            chatId,
            message,
            '❌'
        )

        try {
            await sock.sendMessage(
                chatId,
                {
                    text:
`❌ *No se pudo descargar el audio.*

> ${error?.message || 'Error desconocido'}

> 𝕱𝖊𝖑𝖇𝖔𝖙 夜`
                },
                {
                    quoted: message
                }
            )
        } catch {}
    }
}

module.exports = songCommand
module.exports.songCommand = songCommand

// Compatibilidad con main.js antiguo
module.exports.handleSongButton = async () => false