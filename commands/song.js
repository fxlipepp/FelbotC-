
const fs = require('fs')
const path = require('path')
const os = require('os')
const ytdl = require('youtube-dl-exec')

const COOKIES_PATH = '/home/container/cookies.txt'

const TEMP_DIR = path.join(os.tmpdir(), 'felbot-play')

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
}

// ─────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36'

const BASE_OPTIONS = {
    noWarnings: true,
    noPlaylist: true,
    retries: 1,
    noCheckCertificates: true,
    jsRuntimes: 'node',
    userAgent: USER_AGENT
}

// ─────────────────────────────────────────────
// COOKIES
// ─────────────────────────────────────────────

function cookiesAvailable() {
    try {
        return fs.existsSync(COOKIES_PATH) &&
            fs.statSync(COOKIES_PATH).size > 100
    } catch {
        return false
    }
}

// ─────────────────────────────────────────────
// OPCIONES YT-DLP
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// FORMATO DE TIEMPO
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// BARRA DE PROGRESO
// ─────────────────────────────────────────────

function progressText(percent) {

    const total = 12

    const filled = Math.round((percent / 100) * total)

    const empty = total - filled

    return `${'▰'.repeat(filled)}${'▱'.repeat(empty)} ${percent}%`
}

// ─────────────────────────────────────────────
// LIMPIAR NOMBRE
// ─────────────────────────────────────────────

function safeName(name) {

    return String(name || 'felbot-audio')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120)
}

// ─────────────────────────────────────────────
// FORMATEAR VISTAS
// ─────────────────────────────────────────────

function formatViews(views) {

    const number = Number(views || 0)

    if (!number) {
        return 'Desconocidas'
    }

    return number.toLocaleString('en-US')
}

// ─────────────────────────────────────────────
// BUSCAR EN YOUTUBE
// ─────────────────────────────────────────────

async function searchYouTube(query) {

    console.log(`🔎 SEARCH YOUTUBE: ${query}`)

    const result = await ytdl(
        `ytsearch1:${query}`,
        youtubeOptions({
            flatPlaylist: true,
            dumpSingleJson: true,
            skipDownload: true,
            playlistEnd: 1
        })
    )

    let video = null

    if (result?.entries?.length) {
        video = result.entries[0]
    } else if (result?.id) {
        video = result
    }

    if (!video) {
        throw new Error('No se encontró ningún resultado')
    }

    let thumbnail = video.thumbnail

    if (!thumbnail && video.id) {
        thumbnail = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`
    }

    return {
        id: video.id,
        url: video.webpage_url ||
            video.original_url ||
            `https://www.youtube.com/watch?v=${video.id}`,

        title: video.title || 'Canción',

        author: {
            name:
                video.uploader ||
                video.channel ||
                video.uploader_id ||
                'YouTube'
        },

        timestamp:
            video.duration_string ||
            formatDuration(video.duration),

        duration: video.duration || 0,

        views: video.view_count || 0,

        thumbnail
    }
}

// ─────────────────────────────────────────────
// OBTENER INFORMACIÓN DE URL
// ─────────────────────────────────────────────

async function getVideoInfo(url) {

    const result = await ytdl(
        url,
        youtubeOptions({
            dumpSingleJson: true,
            skipDownload: true
        })
    )

    let thumbnail = result.thumbnail

    if (!thumbnail && result.id) {
        thumbnail =
            `https://i.ytimg.com/vi/${result.id}/hqdefault.jpg`
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

        thumbnail
    }
}

// ─────────────────────────────────────────────
// DESCARGAR AUDIO
// ─────────────────────────────────────────────

async function downloadAudio(url, onProgress) {

    const fileId =
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const outputTemplate =
        path.join(
            TEMP_DIR,
            `${fileId}.%(ext)s`
        )

    const options = youtubeOptions({

        format:
            'bestaudio[ext=m4a]/bestaudio',

        output: outputTemplate,

        concurrentFragments: 4,

        noPart: true,

        timeout: 90000,

        progress: true,

        newline: true
    })

    try {

        const process = ytdl.exec(
            url,
            options
        )

        process.stdout?.on('data', data => {

            const text = data.toString()

            const match =
                text.match(/(\d+(?:\.\d+)?)%/)

            if (match && onProgress) {

                let percent =
                    Math.floor(Number(match[1]))

                percent =
                    Math.max(
                        10,
                        Math.min(95, percent)
                    )

                onProgress(percent)
            }
        })

        process.stderr?.on('data', data => {

            const text = data.toString()

            const match =
                text.match(/(\d+(?:\.\d+)?)%/)

            if (match && onProgress) {

                let percent =
                    Math.floor(Number(match[1]))

                percent =
                    Math.max(
                        10,
                        Math.min(95, percent)
                    )

                onProgress(percent)
            }
        })

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
                file.startsWith(fileId + '.')
            )

    if (!files.length) {
        throw new Error(
            'No se encontró el archivo descargado'
        )
    }

    const file =
        files.find(file =>
            file.endsWith('.m4a')
        ) || files[0]

    return path.join(
        TEMP_DIR,
        file
    )
}

// ─────────────────────────────────────────────
// ELIMINAR ARCHIVO
// ─────────────────────────────────────────────

function deleteFile(file) {

    try {

        if (
            file &&
            fs.existsSync(file)
        ) {
            fs.unlinkSync(file)
        }

    } catch (error) {

        console.error(
            '[PLAY CLEANUP]',
            error.message
        )
    }
}

// ─────────────────────────────────────────────
// LIMPIAR TEMPORAL
// ─────────────────────────────────────────────

function cleanTemp() {

    try {

        const files =
            fs.readdirSync(TEMP_DIR)

        for (const file of files) {

            const full =
                path.join(TEMP_DIR, file)

            try {

                fs.unlinkSync(full)

            } catch {}
        }

    } catch {}
}

// ─────────────────────────────────────────────
// MENSAJE VISUAL
// ─────────────────────────────────────────────

function createCaption(
    selection,
    status,
    percent,
    elapsed = null
) {

    const title =
        selection.title ||
        'Canción'

    const author =
        selection.author?.name ||
        'YouTube'

    const duration =
        selection.timestamp ||
        formatDuration(selection.duration)

    const views =
        formatViews(selection.views)

    let extra = ''

    if (elapsed !== null) {

        extra =
            `\n│ ⚡ Tiempo: ${elapsed}s`
    }

    return (
`╭─〔 🎵 𝐅𝐄𝐋𝐁𝐎𝐓 𝐏𝐋𝐀𝐘 〕─╮
│
│ 🎶 *${title}*
│
│ 👤 ${author}
│ ⏱️ ${duration}
│ 👁️ ${views} vistas
│
│ ${status}
│
│ ${progressText(percent)}${extra}
│
╰────────────────────╯
> ⚡ 𝕱𝖊𝖑𝖇𝖔𝖙 夜`
    )
}

// ─────────────────────────────────────────────
// ACTUALIZAR MENSAJE
// ─────────────────────────────────────────────

async function updateLoading(
    sock,
    chatId,
    loading,
    selection,
    status,
    percent,
    elapsed = null
) {

    try {

        await sock.sendMessage(
            chatId,
            {
                image: {
                    url:
                        selection.thumbnail ||
                        'https://i.imgur.com/AfFp7pu.png'
                },

                caption:
                    createCaption(
                        selection,
                        status,
                        percent,
                        elapsed
                    )
            },
            {
                edit:
                    loading.key
            }
        )

    } catch (error) {

        console.error(
            '[PLAY UPDATE]',
            error.message
        )
    }
}

// ─────────────────────────────────────────────
// ENVIAR AUDIO
// ─────────────────────────────────────────────

async function sendSongAudio(
    sock,
    chatId,
    message,
    file,
    selection
) {

    const fileName =
        `${safeName(selection.title)}.m4a`

    await sock.sendMessage(
        chatId,
        {
            audio: {
                url: file
            },

            mimetype:
                'audio/mp4',

            fileName,

            ptt: false
        },
        {
            quoted: message
        }
    )
}

// ─────────────────────────────────────────────
// COMANDO .PLAY
// ─────────────────────────────────────────────

async function songCommand(
    sock,
    chatId,
    message
) {

    const startTime = Date.now()

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
                        `╭─〔 🎵 𝐅𝐄𝐋𝐁𝐎𝐓 𝐏𝐋𝐀𝐘 〕─╮
│
│ ❌ Escribe el nombre de una canción.
│
│ Ejemplo:
│ .play Querer Querernos
│
╰────────────────────╯`
                },
                {
                    quoted: message
                }
            )

            return
        }

        console.log(
            `🎶 PLAY | 🔎 ${query}`
        )

        let selection

        // ─────────────────────────────
        // URL DIRECTA
        // ─────────────────────────────

        if (
            /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i
                .test(query)
        ) {

            selection =
                await getVideoInfo(query)

        } else {

            // ─────────────────────────
            // BÚSQUEDA
            // ─────────────────────────

            selection =
                await searchYouTube(query)
        }

        console.log(
            `✅ VIDEO: ${selection.title}`
        )

        // ─────────────────────────────
        // MENSAJE DE CARGA
        // ─────────────────────────────

        const loading =
            await sock.sendMessage(
                chatId,
                {
                    image: {
                        url:
                            selection.thumbnail ||
                            'https://i.imgur.com/AfFp7pu.png'
                    },

                    caption:
                        createCaption(
                            selection,
                            '⏳ Preparando audio...',
                            10
                        )
                },
                {
                    quoted: message
                }
            )

        // ─────────────────────────────
        // PROGRESO
        // ─────────────────────────────

        let lastUpdate = 0

        const onProgress =
            async percent => {

                const now =
                    Date.now()

                // Evita editar demasiadas veces
                if (
                    now - lastUpdate < 1200 &&
                    percent < 95
                ) {
                    return
                }

                lastUpdate = now

                const elapsed =
                    (
                        (now - startTime) /
                        1000
                    ).toFixed(1)

                await updateLoading(
                    sock,
                    chatId,
                    loading,
                    selection,
                    '⬇️ Descargando audio...',
                    percent,
                    elapsed
                )
            }

        // ─────────────────────────────
        // DESCARGA
        // ─────────────────────────────

        const file =
            await downloadAudio(
                selection.url,
                onProgress
            )

        const elapsed =
            (
                (Date.now() - startTime) /
                1000
            ).toFixed(1)

        // ─────────────────────────────
        // ACTUALIZAR A LISTO
        // ─────────────────────────────

        await updateLoading(
            sock,
            chatId,
            loading,
            selection,
            '✅ Audio preparado',
            100,
            elapsed
        )

        // ─────────────────────────────
        // ENVIAR AUDIO
        // ─────────────────────────────

        await sendSongAudio(
            sock,
            chatId,
            message,
            file,
            selection
        )

        // ─────────────────────────────
        // MENSAJE FINAL
        // ─────────────────────────────

        await updateLoading(
            sock,
            chatId,
            loading,
            selection,
            '🎧 Audio enviado correctamente',
            100,
            (
                (Date.now() - startTime) /
                1000
            ).toFixed(1)
        )

        // ─────────────────────────────
        // LIMPIAR
        // ─────────────────────────────

        setTimeout(() => {

            deleteFile(file)

        }, 5000)

        console.log(
            `✅ PLAY LISTO | ${selection.title} | ⚡ ${
                (
                    (Date.now() - startTime) /
                    1000
                ).toFixed(1)
            }s`
        )

    } catch (error) {

        console.error(
            '[PLAY ERROR]',
            error?.stderr ||
            error?.message ||
            error
        )

        try {

            await sock.sendMessage(
                chatId,
                {
                    text:
                        `╭─〔 ❌ 𝐅𝐄𝐋𝐁𝐎𝐓 𝐏𝐋𝐀𝐘 〕─╮
│
│ No pude descargar el audio.
│
│ 🔎 ${error?.message || 'Error desconocido'}
│
╰────────────────────╯`
                },
                {
                    quoted: message
                }
            )

        } catch {}

    }
}

// ─────────────────────────────────────────────
// EXPORTACIÓN
// ─────────────────────────────────────────────

module.exports = songCommand
