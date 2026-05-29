const axios = require('axios')
const fs = require('fs')
const path = require('path')
const https = require('https')

// ==========================
// HTTPS AGENT
// ==========================

const agent = new https.Agent({
    keepAlive: true,
    maxSockets: 100,
    maxFreeSockets: 20
})

// ==========================
// AXIOS CONFIG
// ==========================

const axiosConfig = {
    timeout: 8000,
    httpsAgent: agent,
    headers: {
        'User-Agent': 'Mozilla/5.0'
    }
}

// ==========================
// CACHE
// ==========================

const searchCache = new Map()
const dlCache = new Map()

// ==========================
// HELPERS
// ==========================

function safe(text = '') {

    return text
        .replace(/[<>:"/\\|?*]/g, '')
        .slice(0, 80)
}

function clearCache() {

    if (searchCache.size > 100)
        searchCache.clear()

    if (dlCache.size > 100)
        dlCache.clear()

    global.gc?.()
}

// ==========================
// SEARCH APIs
// ==========================

const searchApis = [

    async (query) => {

        const { data } = await axios.get(
            `https://api.agatz.xyz/api/ytsearch?message=${encodeURIComponent(query)}`,
            axiosConfig
        )

        const r = data.data[0]

        return {
            title: r.title,
            url: r.url,
            thumbnail: r.thumbnail,
            duration: r.timestamp,
            channel: r.author?.name || 'Unknown'
        }
    },

    async (query) => {

        const { data } = await axios.get(
            `https://api.siputzx.my.id/api/s/ytsearch?query=${encodeURIComponent(query)}`,
            axiosConfig
        )

        const r = data.data[0]

        return {
            title: r.title,
            url: r.url,
            thumbnail: r.thumbnail,
            duration: r.duration.timestamp,
            channel: r.channel.name
        }
    },

    async (query) => {

        const { data } = await axios.get(
            `https://api.dorratz.com/ytsearch?query=${encodeURIComponent(query)}`,
            axiosConfig
        )

        const r = data.data[0]

        return {
            title: r.title,
            url: r.url,
            thumbnail: r.thumbnail,
            duration: r.duration,
            channel: r.author?.name || 'Unknown'
        }
    }

]

// ==========================
// DOWNLOAD APIs
// ==========================

const downloadApis = [

    async (url) => {

        const { data } = await axios.get(
            `https://api.agatz.xyz/api/ytmp3?url=${encodeURIComponent(url)}`,
            axiosConfig
        )

        return {
            dl: data.data.downloadUrl,
            title: data.data.title
        }
    },

    async (url) => {

        const { data } = await axios.get(
            `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`,
            axiosConfig
        )

        return {
            dl: data.data.dl,
            title: data.data.title
        }
    },

    async (url) => {

        const { data } = await axios.get(
            `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(url)}`,
            axiosConfig
        )

        return {
            dl: data.url,
            title: data.title
        }
    },

    async (url) => {

        const { data } = await axios.get(
            `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(url)}&type=audio&quality=128kbps&apikey=neoxr`,
            axiosConfig
        )

        return {
            dl: data.data.url,
            title: data.data.title
        }
    },

    async (url) => {

        const { data } = await axios.get(
            `https://api.dorratz.com/v2/ytmp3?url=${encodeURIComponent(url)}`,
            axiosConfig
        )

        return {
            dl: data.data.download,
            title: data.data.title
        }
    }

]

// ==========================
// RANDOMIZE APIs
// ==========================

function shuffle(arr) {

    return [...arr].sort(() => Math.random() - 0.5)
}

// ==========================
// FAST SEARCH
// ==========================

async function fastSearch(query) {

    if (searchCache.has(query)) {
        return searchCache.get(query)
    }

    const result = await Promise.any(
        shuffle(searchApis).map(api => api(query))
    )

    searchCache.set(query, result)

    return result
}

// ==========================
// FAST DOWNLOAD
// ==========================

async function fastDownload(url) {

    if (dlCache.has(url)) {
        return dlCache.get(url)
    }

    const result = await Promise.any(
        shuffle(downloadApis).map(api => api(url))
    )

    dlCache.set(url, result)

    return result
}

// ==========================
// COMMAND
// ==========================

async function songCommand(sock, chatId, message) {

    try {

        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            ''

        const query = text.split(' ').slice(1).join(' ').trim()

        if (!query) {

            return await sock.sendMessage(chatId, {
                text: '🎵 Escribe una canción pues gonorrea 😭'
            }, {
                quoted: message
            })
        }

        // ==========================
        // SEARCH
        // ==========================

        let video

        if (
            query.includes('youtube.com') ||
            query.includes('youtu.be')
        ) {

            video = {
                url: query,
                title: 'YouTube Audio',
                thumbnail: 'https://i.imgur.com/8pt6M0D.jpeg',
                duration: 'Unknown',
                channel: 'YouTube'
            }

        } else {

            video = await fastSearch(query)

            if (!video?.url) {

                return await sock.sendMessage(chatId, {
                    text: '❌ No encontré esa mondá 😭'
                }, {
                    quoted: message
                })
            }
        }

        // ==========================
        // MESSAGE
        // ==========================

        await sock.sendMessage(chatId, {

            image: {
                url: video.thumbnail
            },

            caption:
`⚡ *DESCARGA RÁPIDA*

🎵 ${video.title}
👤 ${video.channel}
⏱️ ${video.duration}

🚀 Descargando...`

        }, {
            quoted: message
        })

        // ==========================
        // GET DOWNLOAD
        // ==========================

        const dl = await fastDownload(video.url)

        if (!dl?.dl) {
            throw new Error('No download')
        }

        // ==========================
        // STREAM
        // ==========================

        const response = await axios({

            url: dl.dl,

            method: 'GET',

            responseType: 'stream',

            timeout: 20000,

            httpsAgent: agent

        })

        const filePath = path.join(
            __dirname,
            `../tmp/${Date.now()}.mp3`
        )

        const writer = fs.createWriteStream(filePath)

        response.data.pipe(writer)

        await new Promise((resolve, reject) => {

            writer.on('finish', resolve)
            writer.on('error', reject)

        })

        // ==========================
        // SEND AUDIO
        // ==========================

        await sock.sendMessage(chatId, {

            audio: {
                url: filePath
            },

            mimetype: 'audio/mpeg',

            fileName: `${safe(dl.title || video.title)}.mp3`

        }, {
            quoted: message
        })

        // ==========================
        // DELETE
        // ==========================

        fs.unlink(filePath, () => {})

        clearCache()

        console.log('✅ AUDIO ENVIADO')

    } catch (err) {

        console.log('❌ SONG ERROR:', err)

        try {

            await sock.sendMessage(chatId, {
                text:
`❌ Todas las APIs fallaron 😭

💀 Render seguramente anda trabado otra vez JAJA`
            }, {
                quoted: message
            })

        } catch {}
    }
}

module.exports = songCommand