const fs = require('fs')
const path = require('path')
const { execFile } = require('child_process')
const youtubedl = require('youtube-dl-exec')

const COOKIES_PATH = '/home/container/cookies.txt'

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36'

function getCookies() {
    try {
        if (!fs.existsSync(COOKIES_PATH)) return null

        const stat = fs.statSync(COOKIES_PATH)

        if (stat.size < 100) return null

        const content = fs.readFileSync(COOKIES_PATH, 'utf8')

        if (
            !content.includes('# HTTP Cookie File') &&
            !content.includes('# Netscape HTTP Cookie File')
        ) {
            return null
        }

        return COOKIES_PATH
    } catch {
        return null
    }
}

function getYtDlpPath() {
    try {
        // youtube-dl-exec normalmente expone el ejecutable mediante su paquete
        const packageMain = require.resolve('youtube-dl-exec')
        const packageDir = path.dirname(packageMain)

        const possible = [
            path.join(packageDir, 'bin', 'yt-dlp'),
            path.join(packageDir, '..', 'bin', 'yt-dlp'),
            path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp')
        ]

        for (const file of possible) {
            if (fs.existsSync(file)) {
                return file
            }
        }

        // Último intento: propiedad interna
        if (youtubedl && youtubedl.path) {
            return youtubedl.path
        }

        return null
    } catch (error) {
        console.log('[FORMATOS] ERROR BUSCANDO YT-DLP:', error.message)
        return null
    }
}

function runYtDlp(args) {
    return new Promise((resolve, reject) => {
        const ytDlpPath = getYtDlpPath()

        if (!ytDlpPath) {
            return reject(
                new Error(
                    'No se encontró el ejecutable yt-dlp dentro de youtube-dl-exec'
                )
            )
        }

        console.log('[FORMATOS] YT-DLP:', ytDlpPath)

        execFile(
            ytDlpPath,
            args,
            {
                maxBuffer: 20 * 1024 * 1024
            },
            (error, stdout, stderr) => {
                if (error) {
                    const details = stderr || stdout || error.message
                    return reject(new Error(details))
                }

                resolve(stdout)
            }
        )
    })
}

function parseFormats(output) {
    const lines = output.split('\n')

    const formats = []

    let insideTable = false

    for (const line of lines) {
        if (
            line.includes('ID') &&
            line.includes('EXT') &&
            line.includes('RESOLUTION')
        ) {
            insideTable = true
            continue
        }

        if (!insideTable) continue

        if (!line.trim()) continue

        if (
            line.includes('---') ||
            line.includes('Available formats')
        ) {
            continue
        }

        const clean = line.replace(/\x1b\[[0-9;]*m/g, '').trim()

        const match = clean.match(
            /^(\S+)\s+(\S+)\s+(.+?)\s+(\S+)\s+(.+)$/
        )

        if (!match) continue

        const id = match[1]
        const ext = match[2]
        const resolution = match[3]
        const fps = match[4]
        const rest = match[5]

        formats.push({
            id,
            ext,
            resolution,
            fps,
            info: rest
        })
    }

    return formats
}

function formatOutput(videoUrl, rawOutput) {
    const formats = parseFormats(rawOutput)

    let text = `╭─「 📋 FORMATOS YOUTUBE 」\n`
    text += `│ 🎬 VIDEO\n`
    text += `│ ${videoUrl}\n`
    text += `│ 🍪 COOKIES: ${getCookies() ? 'ON' : 'OFF'}\n`
    text += `╰────────────────────⬣\n\n`

    if (!formats.length) {
        text += `❌ No pude interpretar la tabla de formatos.\n\n`
        text += `📄 SALIDA ORIGINAL:\n`
        text += rawOutput.slice(0, 12000)

        return text
    }

    const video = []
    const audio = []
    const other = []

    for (const format of formats) {
        const info = format.info.toLowerCase()

        const isAudio =
            info.includes('audio only') ||
            info.includes('audio')

        const isVideo =
            info.includes('video only') ||
            /\d+x\d+/.test(format.resolution)

        if (isAudio) {
            audio.push(format)
        } else if (isVideo) {
            video.push(format)
        } else {
            other.push(format)
        }
    }

    text += `🎥 VIDEO: ${video.length}\n`
    text += `🎵 AUDIO: ${audio.length}\n`
    text += `📦 OTROS: ${other.length}\n\n`

    if (video.length) {
        text += `╭─「 🎥 VIDEO 」\n`

        for (const f of video) {
            text += `│ ${f.id} | ${f.ext} | ${f.resolution} | ${f.fps}\n`
            text += `│    ${f.info.slice(0, 100)}\n`
        }

        text += `╰────────────────────⬣\n\n`
    }

    if (audio.length) {
        text += `╭─「 🎵 AUDIO 」\n`

        for (const f of audio) {
            text += `│ ${f.id} | ${f.ext} | ${f.resolution}\n`
            text += `│    ${f.info.slice(0, 100)}\n`
        }

        text += `╰────────────────────⬣\n\n`
    }

    if (other.length) {
        text += `╭─「 📦 OTROS 」\n`

        for (const f of other) {
            text += `│ ${f.id} | ${f.ext} | ${f.resolution}\n`
            text += `│    ${f.info.slice(0, 100)}\n`
        }

        text += `╰────────────────────⬣\n\n`
    }

    text += `🔎 FORMATO TOTAL: ${formats.length}\n`

    return text
}

async function formatosCommand(msg, text) {
    try {
        if (!text || !text.trim()) {
            return msg.reply(
                '❌ Usa:\n.formatos https://www.youtube.com/watch?v=ID'
            )
        }

        let url = text.trim()

        // Si pasan solamente el ID
        if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
            url = `https://www.youtube.com/watch?v=${url}`
        }

        console.log('')
        console.log('╭────────────────────────────')
        console.log('│ 📋 FELBOT FORMATOS')
        console.log('├────────────────────────────')
        console.log('│ 🎬 URL:', url)
        console.log('│ 🍪 COOKIES:', getCookies() ? 'ON' : 'OFF')
        console.log('╰────────────────────────────')

        await msg.reply('🔎 Consultando formatos disponibles...')

        const cookies = getCookies()

        const args = [
            '--list-formats',
            '--no-playlist',
            '--no-warnings',
            '--ignore-config',
            '--no-check-certificates',
            '--user-agent',
            USER_AGENT,
            '--extractor-args',
            'youtube:player_client=default'
        ]

        if (cookies) {
            args.push('--cookies', cookies)
        }

        args.push(url)

        console.log('[FORMATOS] Ejecutando lista real de formatos...')

        const output = await runYtDlp(args)

        console.log('[FORMATOS] LISTA OBTENIDA')

        const response = formatOutput(url, output)

        return msg.reply(response)

    } catch (error) {
        console.log('[FORMATOS] ERROR:', error.message)

        return msg.reply(
            `❌ ERROR OBTENIENDO FORMATOS\n\n${error.message.slice(0, 5000)}`
        )
    }
}

module.exports = formatosCommand
module.exports.formatosCommand = formatosCommand