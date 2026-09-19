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

function cleanFileName(name) {
    return String(name || 'Felbot Audio')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80) || 'felbot-audio'
}

// ─────────────────────────────────────
// 🔎 BUSCAR YOUTUBE
// ─────────────────────────────────────

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
        (
            entry.id
                ? `https://www.youtube.com/watch?v=${entry.id}`
                : null
        )

    if (!url) {
        throw new Error('El resultado no tiene URL')
    }

    console.log(`✅ SEARCH FUNCIONAL`)
    console.log(`🎯 VIDEO SELECCIONADO: ${url}`)

    return {
        url,
        title: entry.title || 'Audio de YouTube',
        thumbnail: entry.thumbnail || null,
        duration: entry.duration || 0
    }
}

// ─────────────────────────────────────
// ℹ️ INFORMACIÓN DEL VIDEO
// ─────────────────────────────────────

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

// ─────────────────────────────────────
// 🎧 DESCARGAR AUDIO
// ─────────────────────────────────────

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

            // Mantenemos la selección rápida de audio
            format: 'bestaudio[ext=m4a]/bestaudio/best',

            // No convertir aquí.
            // La conversión la hace nuestro converter.
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

// ─────────────────────────────────────
// 🎵 COMANDO PLAY
// ─────────────────────────────────────

async function playCommand(sock, chatId, message) {

    const startTime = Date.now()

    let tempDir = null

    try {

        // ─────────────────────────────
        // OBTENER TEXTO
        // ─────────────────────────────

        const rawText =
            message?.message?.conversation?.trim() ||
            message?.message?.extendedTextMessage?.text?.trim() ||
            message?.message?.imageMessage?.caption?.trim() ||
            message?.message?.videoMessage?.caption?.trim() ||
            ''

        const text = rawText
            .replace(/^\.play\s*/i, '')
            .trim()

        if (!text) {

            await sock.sendMessage(
                chatId,
                {
                    text:
                        `╭━━〔 🎵 PLAY 〕━━⬣\n` +
                        `│\n` +
                        `│ Escribe el nombre de una canción\n` +
                        `│ o pega un enlace de YouTube.\n` +
                        `│\n` +
                        `│ Ejemplo:\n` +
                        `│ .play querer querernos\n` +
                        `│\n` +
                        `╰━━━━━━━━━━━━━━⬣`
                },
                {
                    quoted: message
                }
            )

            return
        }

        console.log(`╭──────────────────────⬣`)
        console.log(`│ 🎶 NUEVA DESCARGA`)
        console.log(`╰──────────────────────⬣`)

        let video

        // ─────────────────────────────
        // 🔗 URL DIRECTA
        // ─────────────────────────────

        if (isYouTubeUrl(text)) {

            console.log(`🔗 URL DIRECTA`)

            video = {
                url: text,
                title: 'Audio de YouTube',
                thumbnail: null,
                duration: 0
            }

        } else {

            // ─────────────────────────
            // 🔎 BUSCAR
            // ─────────────────────────

            console.log(`╭──────────────────────⬣`)
            console.log(`│ 🔎 BUSCANDO CON YT-DLP`)
            console.log(`├──────────────────────⬣`)
            console.log(`│ 🎵 ${text}`)
            console.log(`╰──────────────────────⬣`)

            video = await searchYouTube(text)
        }

        console.log(`🎯 VIDEO SELECCIONADO: ${video.url}`)

        // ─────────────────────────────
        // ℹ️ INFO
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

            console.log(`⚠️ INFO FALLÓ:`)
            console.log(error.message)

        }

        // ─────────────────────────────
        // ⬇️ MENSAJE DE DESCARGA
        // ─────────────────────────────

        await sock.sendMessage(
            chatId,
            {
                text:
                    `╭──────────────────────⬣\n` +
                    `│ 🎶 FELBOT PLAY\n` +
                    `├──────────────────────⬣\n` +
                    `│ 🎧 ${video.title}\n` +
                    `│ 🍪 COOKIES ON\n` +
                    `│ ⚡ DESCARGANDO...\n` +
                    `╰──────────────────────⬣`
            },
            {
                quoted: message
            }
        )

        // ─────────────────────────────
        // 📁 TEMP
        // ─────────────────────────────

        // Usar el temp del proyecto.
        // Tu main.js ya configura TMPDIR.
        const baseTemp =
            process.env.TMPDIR ||
            path.join(process.cwd(), 'temp')

        if (!fs.existsSync(baseTemp)) {
            fs.mkdirSync(baseTemp, {
                recursive: true
            })
        }

        tempDir = fs.mkdtempSync(
            path.join(
                baseTemp,
                'felbot-play-'
            )
        )

        const outputTemplate = path.join(
            tempDir,
            'audio.%(ext)s'
        )

        // ─────────────────────────────
        // 🎧 DESCARGA
        // ─────────────────────────────

        const downloaded =
            await downloadAudio(
                video.url,
                outputTemplate
            )

        let realAudioFile = downloaded

        // yt-dlp puede generar:
        // mp4 / m4a / webm / opus / mp3

        if (!fs.existsSync(realAudioFile)) {

            const files =
                fs.readdirSync(tempDir)

            const possible =
                files.find(file =>
                    /\.(mp4|m4a|webm|opus|mp3)$/i
                        .test(file)
                )

            if (!possible) {
                throw new Error(
                    'No se encontró el archivo descargado'
                )
            }

            realAudioFile =
                path.join(
                    tempDir,
                    possible
                )
        }

        // ─────────────────────────────
        // 🔍 DETECTAR EXTENSIÓN
        // ─────────────────────────────

        const firstBytes =
            fs.readFileSync(realAudioFile)
                .subarray(0, 32)

        console.log(
            `FIRST BYTES: ${firstBytes.toString('hex')}`
        )

        const inputExt =
            path.extname(realAudioFile)
                .replace('.', '')
                .toLowerCase()

        console.log(
            `🔍 INPUT EXT: ${inputExt}`
        )

        // ─────────────────────────────
        // 🎬 CONVERTIR A MP3
        // ─────────────────────────────

        const mp3Path =
            path.join(
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

        const mp3Stats =
            fs.statSync(mp3Path)

        if (mp3Stats.size < 1000) {
            throw new Error(
                'El MP3 generado está vacío'
            )
        }

        const elapsed =
            (
                (Date.now() - startTime) /
                1000
            ).toFixed(1)

        console.log(`╭──────────────────────⬣`)
        console.log(`│ ✅ DESCARGA COMPLETADA`)
        console.log(`├──────────────────────⬣`)
        console.log(`│ 🎧 ${video.title}`)
        console.log(`│ ⏱️ ${elapsed}s`)
        console.log(`│ 📦 ${formatBytes(mp3Stats.size)}`)
        console.log(`╰──────────────────────⬣`)

        // ─────────────────────────────
        // 🎵 ENVIAR MP3
        // ─────────────────────────────

        const fileName =
            `${cleanFileName(video.title)}.mp3`

        await sock.sendMessage(
            chatId,
            {
                audio:
                    fs.readFileSync(mp3Path),

                mimetype:
                    'audio/mpeg',

                fileName,

                ptt: false
            },
            {
                quoted: message
            }
        )

    } catch (error) {

        console.error(`❌ PLAY ERROR:`)
        console.error(error)

        try {

            await sock.sendMessage(
                chatId,
                {
                    text:
                        `╭━━〔 ❌ ERROR PLAY 〕━━⬣\n` +
                        `│\n` +
                        `│ No pude descargar el audio.\n` +
                        `│\n` +
                        `│ ${String(
                            error?.message ||
                            'Error desconocido'
                        ).slice(0, 200)}\n` +
                        `│\n` +
                        `╰━━━━━━━━━━━━━━━━━━⬣`
                },
                {
                    quoted: message
                }
            )

        } catch (sendError) {

            console.error(
                `❌ Error enviando error:`,
                sendError
            )
        }

    } finally {

        // ─────────────────────────────
        // 🧹 LIMPIAR TEMP
        // ─────────────────────────────

        if (
            tempDir &&
            fs.existsSync(tempDir)
        ) {

            try {

                fs.rmSync(
                    tempDir,
                    {
                        recursive: true,
                        force: true
                    }
                )

            } catch (error) {

                console.log(
                    `⚠️ Error limpiando TEMP: ${error.message}`
                )
            }
        }
    }
}

module.exports = playCommand