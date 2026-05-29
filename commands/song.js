const axios = require('axios')
const play = require('play-dl')
const fs = require('fs')
const path = require('path')
const https = require('https')
const ffmpeg = require('fluent-ffmpeg')

// ===============================
// KEEP ALIVE
// ===============================

const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 20
})

// ===============================
// AXIOS
// ===============================

const axiosConfig = {
    timeout: 20000,
    httpsAgent,
    headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*'
    }
}

// ===============================
// CACHE
// ===============================

const searchCache = new Map()
const downloadCache = new Map()

// ===============================
// HELPERS
// ===============================

function createBar(percent) {

    const total = 10
    const filled = Math.round(percent / 10)

    return '▰'.repeat(filled) + '▱'.repeat(total - filled)
}

function formatBytes(bytes) {

    if (!bytes) return 'Desconocido'

    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))

    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

function safeFilename(name) {

    return name
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

function limitMapSize(map, max = 100) {

    if (map.size > max) {

        const firstKey = map.keys().next().value

        map.delete(firstKey)

        console.log(`🧹 Cache limpiada automáticamente (${map.size}/${max})`)
    }
}

// ===============================
// CLEAN MEMORY
// ===============================

function cleanMemory() {

    try {

        // CLEAR MAPS

        if (searchCache.size > 50) {
            searchCache.clear()
            console.log('🧠 Search cache liberada')
        }

        if (downloadCache.size > 50) {
            downloadCache.clear()
            console.log('⚡ Download cache liberada')
        }

        // TMP CLEAN

        const tmpDir = path.join(__dirname, '../tmp')

        fs.readdir(tmpDir, (err, files) => {

            if (err) return

            let deleted = 0

            files.forEach(file => {

                const filePath = path.join(tmpDir, file)

                fs.unlink(filePath, err => {

                    if (!err) {

                        deleted++

                        console.log(`🗑️ TMP eliminado: ${file}`)
                    }
                })
            })

            if (deleted > 0) {
                console.log(`✨ Limpieza completada (${deleted} archivos eliminados)`)
            }
        })

        // FORCE GC

        if (global.gc) {

            global.gc()

            console.log('🧠 Garbage Collector ejecutado')
        }

        // RAM STATUS

        const memory = process.memoryUsage()

        console.log(`
╭──────────────────────⬣
│ 🧠 RAM OPTIMIZATION
├──────────────────────⬣
│ RSS: ${(memory.rss / 1024 / 1024).toFixed(2)} MB
│ Heap Used: ${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB
│ Heap Total: ${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB
│ External: ${(memory.external / 1024 / 1024).toFixed(2)} MB
╰──────────────────────⬣
`)

    } catch (e) {

        console.log('❌ Error limpiando memoria:', e)
    }
}

// ===============================
// AUTO CLEAN EVERY 30 MIN
// ===============================

setInterval(() => {

    console.log('⏰ Ejecutando limpieza automática...')

    cleanMemory()

}, 1000 * 60 * 30)

// ===============================
// CONVERT MP3
// ===============================

async function convertToMp3(input, output) {

    return new Promise((resolve, reject) => {

        ffmpeg(input)
            .audioCodec('libmp3lame')
            .audioBitrate(128)
            .audioFrequency(44100)
            .audioChannels(2)
            .outputOptions([
                '-preset ultrafast',
                '-movflags +faststart'
            ])
            .format('mp3')
            .save(output)
            .on('start', () => {
                console.log('🎵 Iniciando conversión FFmpeg...')
            })
            .on('end', () => {
                console.log('✅ Conversión completada')
                resolve()
            })
            .on('error', err => {
                console.log('❌ FFmpeg Error:', err)
                reject(err)
            })

    })
}

// ===============================
// APIS
// ===============================

async function elite(url, signal) {

    const start = Date.now()

    const { data } = await axios.get(
        `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(url)}&format=mp3`,
        {
            ...axiosConfig,
            signal
        }
    )

    console.log(`⚡ Elite respondió en ${Date.now() - start}ms`)

    if (!data?.downloadURL) {
        throw new Error('Elite failed')
    }

    return {
        download: data.downloadURL,
        title: data.title
    }
}

async function yupra(url, signal) {

    const start = Date.now()

    const { data } = await axios.get(
        `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(url)}`,
        {
            ...axiosConfig,
            signal
        }
    )

    console.log(`⚡ Yupra respondió en ${Date.now() - start}ms`)

    if (!data?.data?.download_url) {
        throw new Error('Yupra failed')
    }

    return {
        download: data.data.download_url,
        title: data.data.title
    }
}

async function okatsu(url, signal) {

    const start = Date.now()

    const { data } = await axios.get(
        `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(url)}`,
        {
            ...axiosConfig,
            signal
        }
    )

    console.log(`⚡ Okatsu respondió en ${Date.now() - start}ms`)

    if (!data?.dl) {
        throw new Error('Okatsu failed')
    }

    return {
        download: data.dl,
        title: data.title
    }
}

// ===============================
// FASTEST API
// ===============================

async function getFastestDownload(url) {

    if (downloadCache.has(url)) {

        console.log('⚡ Usando download cache')

        return downloadCache.get(url)
    }

    const controllers = [
        new AbortController(),
        new AbortController(),
        new AbortController()
    ]

    const promises = [
        elite(url, controllers[0].signal),
        yupra(url, controllers[1].signal),
        okatsu(url, controllers[2].signal)
    ]

    const result = await Promise.any(promises)

    controllers.forEach(c => c.abort())

    downloadCache.set(url, result)

    limitMapSize(downloadCache)

    return result
}

// ===============================
// COMMAND
// ===============================

async function songCommand(sock, chatId, message) {

    const startTime = Date.now()

    try {

        console.log('\n🎶 Nueva descarga iniciada')

        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            ''

        const query = text.split(' ').slice(1).join(' ').trim()

        if (!query) {

            return await sock.sendMessage(chatId, {
                text: '🎵 Escribe una canción 😭'
            }, {
                quoted: message
            })
        }

        let video

        // ===============================
        // SEARCH
        // ===============================

        if (
            query.includes('youtube.com') ||
            query.includes('youtu.be')
        ) {

            const info = await play.video_basic_info(query)

            video = {
                url: query,
                title: info.video_details.title,
                thumbnail: info.video_details.thumbnails?.pop()?.url,
                durationRaw: info.video_details.durationRaw,
                views: info.video_details.views,
                channel: {
                    name: info.video_details.channel?.name
                }
            }

        } else {

            if (searchCache.has(query)) {

                console.log('⚡ Usando search cache')

                video = searchCache.get(query)

            } else {

                const results = await play.search(query, {
                    limit: 1
                })

                if (!results.length) {

                    return await sock.sendMessage(chatId, {
                        text: '❌ No encontré resultados 😭'
                    }, {
                        quoted: message
                    })
                }

                const r = results[0]

                video = {
                    url: r.url,
                    title: r.title,
                    thumbnail: r.thumbnails?.[0]?.url,
                    durationRaw: r.durationRaw,
                    views: r.views,
                    channel: {
                        name: r.channel?.name
                    }
                }

                searchCache.set(query, video)

                limitMapSize(searchCache)
            }
        }

        // ===============================
        // LOADING
        // ===============================

        const loading = await sock.sendMessage(chatId, {
            image: {
                url: video.thumbnail
            },
            caption:
`🎶 *DESCARGANDO AUDIO*

> ❀ Título: ${video.title}
> ❀ Autor: ${video.channel?.name || 'Unknown'}
> ❀ Duración: ${video.durationRaw || 'Unknown'}
> ❀ Vistas: ${Number(video.views || 0).toLocaleString()}

> 🚀 Buscando servidor...
> ${createBar(5)} 5%`
        }, {
            quoted: message
        })

        // ===============================
        // GET DOWNLOAD
        // ===============================

        const audioData = await getFastestDownload(video.url)

        const response = await axios({
            url: audioData.download,
            method: 'GET',
            responseType: 'stream',
            timeout: 40000,
            httpsAgent,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        })

        const total = Number(response.headers['content-length']) || 0

        const safeTitle = safeFilename(
            audioData.title ||
            video.title ||
            'song'
        )

        const inputPath = path.join(
            __dirname,
            `../tmp/${Date.now()}_${safeTitle}.tmp`
        )

        const outputPath = path.join(
            __dirname,
            `../tmp/${Date.now()}_${safeTitle}.mp3`
        )

        const writer = fs.createWriteStream(inputPath)

        let downloaded = 0
        let lastPercent = 0

        response.data.on('data', async chunk => {

            downloaded += chunk.length

            if (!total) return

            const percent = Math.floor(
                (downloaded / total) * 100
            )

            if (
                percent >= lastPercent + 25
            ) {

                lastPercent = percent

                try {

                    await sock.sendMessage(chatId, {
                        edit: loading.key,
                        image: {
                            url: video.thumbnail
                        },
                        caption:
`📥 *DESCARGANDO AUDIO*

> ❀ Título: ${video.title}
> ❀ Autor: ${video.channel?.name || 'Unknown'}
> ❀ Peso: ${formatBytes(total)}

> ⚡ Descargando...
> ${createBar(percent)} ${percent}%`
                    })

                } catch {}
            }
        })

        response.data.pipe(writer)

        await new Promise((resolve, reject) => {

            writer.on('finish', resolve)
            writer.on('error', reject)

        })

        // ===============================
        // CONVERT
        // ===============================

        await sock.sendMessage(chatId, {
            edit: loading.key,
            image: {
                url: video.thumbnail
            },
            caption:
`🔄 *PROCESANDO AUDIO*

> ❀ Título: ${video.title}

> ⚡ Convirtiendo a MP3...
> ${createBar(90)} 90%`
        })

        await convertToMp3(inputPath, outputPath)

        // ===============================
        // SEND AUDIO
        // ===============================

        await sock.sendMessage(chatId, {
            audio: {
                url: outputPath
            },
            mimetype: 'audio/mpeg',
            fileName: `${safeTitle}.mp3`,
            ptt: false
        }, {
            quoted: message
        })

        // ===============================
        // FINAL
        // ===============================

        await sock.sendMessage(chatId, {
            edit: loading.key,
            image: {
                url: video.thumbnail
            },
            caption:
`✅ *AUDIO ENVIADO*

> ❀ Título: ${safeTitle}
> ❀ Autor: ${video.channel?.name || 'Unknown'}
> ❀ Duración: ${video.durationRaw || 'Unknown'}
> ❀ Peso: ${formatBytes(total)}

> 🚀 Completado
> ${createBar(100)} 100%`
        })

        // ===============================
        // CLEAN FILES
        // ===============================

        fs.unlink(inputPath, () => {
            console.log(`🗑️ Eliminado: ${path.basename(inputPath)}`)
        })

        fs.unlink(outputPath, () => {
            console.log(`🗑️ Eliminado: ${path.basename(outputPath)}`)
        })

        // ===============================
        // CLEAN RAM
        // ===============================

        cleanMemory()

        console.log(`
╭──────────────────────⬣
│ ✅ DESCARGA COMPLETADA
├──────────────────────⬣
│ 🎧 ${safeTitle}
│ ⏱️ ${((Date.now() - startTime) / 1000).toFixed(1)}s
╰──────────────────────⬣
`)

    } catch (err) {

        console.error('❌ SONG ERROR:', err)

        await sock.sendMessage(chatId, {
            text: '❌ Error descargando el audio 😭'
        }, {
            quoted: message
        })

        cleanMemory()
    }
}

module.exports = songCommand