const fs = require('fs')
const path = require('path')
const { execFile } = require('child_process')
const youtubedl = require('youtube-dl-exec')

const COOKIES_PATH = '/home/container/cookies.txt'

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36'


function cookiesAvailable() {
    try {
        if (!fs.existsSync(COOKIES_PATH)) return false

        const stat = fs.statSync(COOKIES_PATH)

        if (stat.size < 100) return false

        const firstLines = fs
            .readFileSync(COOKIES_PATH, 'utf8')
            .split(/\r?\n/)
            .filter(Boolean)
            .slice(0, 5)

        return firstLines.some(line =>
            line.includes('# HTTP Cookie File') ||
            line.includes('# Netscape HTTP Cookie File')
        )
    } catch {
        return false
    }
}


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

    if (youtubedl.path) {
        possiblePaths.push(youtubedl.path)
    }

    for (const file of possiblePaths) {
        try {
            if (file && fs.existsSync(file)) {
                return file
            }
        } catch {}
    }

    return null
}


function runYtDlp(args) {
    return new Promise((resolve, reject) => {
        const ytDlpPath = getYtDlpPath()

        if (!ytDlpPath) {
            return reject(
                new Error('No se encontró el ejecutable de yt-dlp de youtube-dl-exec')
            )
        }

        execFile(
            ytDlpPath,
            args,
            {
                maxBuffer: 30 * 1024 * 1024
            },
            (error, stdout, stderr) => {
                if (error) {
                    const details =
                        stderr?.trim() ||
                        stdout?.trim() ||
                        error.message

                    return reject(new Error(details))
                }

                resolve(stdout)
            }
        )
    })
}


function cleanFormatOutput(output) {
    const lines = output
        .split(/\r?\n/)
        .map(line => line.trimEnd())
        .filter(Boolean)

    const useful = []

    for (const line of lines) {
        if (
            line.includes('ID') &&
            line.includes('EXT') &&
            line.includes('RESOLUTION')
        ) {
            useful.push(line)
            continue
        }

        if (
            /^\d+\s+/.test(line) ||
            line.startsWith('────────────────')
        ) {
            useful.push(line)
        }
    }

    return useful.length ? useful.join('\n') : output.trim()
}


async function formatosCommand(sock, chatId, message, input = '') {
    try {
        const url = input.trim()

        if (!url) {
            return await sock.sendMessage(
                chatId,
                {
                    text:
                        '📋 *FELBOT FORMATOS*\n\n' +
                        'Usa:\n' +
                        '`.formatos <URL de YouTube>`'
                },
                { quoted: message }
            )
        }

        if (
            !url.includes('youtube.com/') &&
            !url.includes('youtu.be/')
        ) {
            return await sock.sendMessage(
                chatId,
                {
                    text: '❌ Esa no parece ser una URL válida de YouTube.'
                },
                { quoted: message }
            )
        }

        const hasCookies = cookiesAvailable()

        console.log('\n────────────────────────────')
        console.log('📋 FELBOT FORMATOS')
        console.log('├────────────────────────────')
        console.log(`│ 🎬 URL: ${url}`)
        console.log(`│ 🍪 COOKIES: ${hasCookies ? 'ON' : 'OFF'}`)
        console.log('╰────────────────────────────')

        await sock.sendMessage(
            chatId,
            {
                text:
                    '🔎 *CONSULTANDO FORMATOS...*\n\n' +
                    `🍪 Cookies: ${hasCookies ? 'ON' : 'OFF'}`
            },
            { quoted: message }
        )

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

        if (hasCookies) {
            args.push('--cookies', COOKIES_PATH)
        }

        args.push(url)

        const output = await runYtDlp(args)

        const formats = cleanFormatOutput(output)

        console.log('[FORMATOS] LISTA OBTENIDA')

        const maxLength = 11000

        let finalText =
            '📋 *FORMATOS DISPONIBLES*\n' +
            '────────────────────────────\n' +
            `🎬 ${url}\n` +
            `🍪 Cookies: ${hasCookies ? 'ON' : 'OFF'}\n` +
            '────────────────────────────\n\n' +
            formats

        if (finalText.length > maxLength) {
            finalText =
                finalText.slice(0, maxLength) +
                '\n\n⚠️ Lista recortada por límite de WhatsApp.'
        }

        await sock.sendMessage(
            chatId,
            {
                text: finalText
            },
            { quoted: message }
        )

    } catch (error) {
        console.error('[FORMATOS] ERROR:', error.message)

        await sock.sendMessage(
            chatId,
            {
                text:
                    '❌ *ERROR AL CONSULTAR FORMATOS*\n\n' +
                    `\`\`\`${error.message.slice(0, 6000)}\`\`\``
            },
            { quoted: message }
        )
    }
}


module.exports = formatosCommand