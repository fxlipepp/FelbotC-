// ===============================
// 📁 commands/xnxx.js
// ===============================

const axios = require('axios')
const cheerio = require('cheerio')
const nsfwCheck = require('../lib/nsfwCheck')
const Group = require('../models/Group')



// ===============================
// 🔥 SESSION STORAGE
// ===============================

global.xnxxSearches = global.xnxxSearches || {}

// ===============================
// 🔥 COMMAND
// ===============================

async function xnxxCommand(sock, chatId, message, args) {

    const allowed =
    await nsfwCheck(
        sock,
        chatId,
        message
    )

if (!allowed) return

    const groupData = await Group.findOne({
        groupId: chatId
    })

    // 🔞 CHECK NSFW

    if (
        chatId.endsWith('@g.us') &&
        !groupData?.nsfw?.enabled
    ) {

        return await sock.sendMessage(chatId, {
            text:
`🔞 El NSFW está desactivado.

Usa:
.nsfw on`
        }, { quoted: message })

    }

    const text = args.join(' ')

    if (!text) {

        return await sock.sendMessage(chatId, {
            text:
'❌ Ingresa búsqueda o URL.'
        }, { quoted: message })

    }

    // ===============================
    // 📥 DOWNLOAD URL
    // ===============================

    if (text.includes('xnxx.com')) {

        return await downloadXNXX(
            sock,
            chatId,
            message,
            text
        )

    }

    // ===============================
    // 🔎 SEARCH
    // ===============================

    try {

        await sock.sendMessage(chatId, {
            react: {
                text: '🔎',
                key: message.key
            }
        })

        const results = await xnxxSearch(text)

        if (!results.length) {

            return await sock.sendMessage(chatId, {
                text: '❌ No encontré resultados.'
            }, { quoted: message })

        }

        // 🔥 SAVE SESSION

       const sender =
    message.key.participant ||
    message.key.remoteJid

global.xnxxSearches[sender] = results

        let txt = '╭─〔 🔞 XNXX SEARCH 〕─╮\n\n'

        results.slice(0, 10).forEach((v, i) => {

            txt +=
`${i + 1}. ${v.title}

🔗 ${v.link}

`

        })

        txt +=
`╰────────────────╯

> Responde con un número para descargar.`

        await sock.sendMessage(chatId, {
            text: txt
        }, { quoted: message })

    } catch (e) {

        console.log(e)

        await sock.sendMessage(chatId, {
            text: '❌ Error buscando videos.'
        }, { quoted: message })

    }

}

// ===============================
// 🔥 HANDLE NUMBER RESPONSE
// ===============================

async function xnxxNumberReply(sock, chatId, message, text) {

    const sender =
        message.key.participant || chatId

    const searches =
        global.xnxxSearches[sender]

    if (!searches) return false

    const number = parseInt(text)

    if (isNaN(number)) return false

    const selected = searches[number - 1]

    if (!selected) {

        await sock.sendMessage(chatId, {
            text: '❌ Número inválido.'
        }, { quoted: message })

        return true

    }

    await downloadXNXX(
        sock,
        chatId,
        message,
        selected.link
    )

    delete global.xnxxSearches[sender]

    return true

}

// ===============================
// 📥 DOWNLOAD VIDEO
// ===============================

async function downloadXNXX(sock, chatId, message, url) {

    try {

        await sock.sendMessage(chatId, {
            react: {
                text: '🕒',
                key: message.key
            }
        })

        const data = await xnxxDownload(url)

        const caption =
`╭─〔 🔞 XNXX DOWNLOAD 〕─╮

🎬 ${data.title}

⏱️ Duración:
${data.duration}

👀 Views:
${data.views}

╰────────────────╯`

        await sock.sendMessage(chatId, {

            video: {
                url: data.video
            },

            caption

        }, { quoted: message })

        await sock.sendMessage(chatId, {
            react: {
                text: '✅',
                key: message.key
            }
        })

    } catch (e) {

        console.log(e)

        await sock.sendMessage(chatId, {
            text: '❌ Error descargando video.'
        }, { quoted: message })

    }

}

// ===============================
// 🔎 SEARCH FUNCTION
// ===============================

async function xnxxSearch(query) {

    const base = 'https://www.xnxx.com'

    const { data } = await axios.get(
        `${base}/search/${encodeURIComponent(query)}/1`
    )

    const $ = cheerio.load(data)

    const results = []

    $('div.mozaique div.thumb-under').each((i, el) => {

        const title =
            $(el).find('a').attr('title')

        const href =
            $(el).find('a').attr('href')

        if (!title || !href) return

        results.push({
            title,
            link: base + href
        })

    })

    return results

}

// ===============================
// 📥 DOWNLOAD FUNCTION
// ===============================

async function xnxxDownload(url) {

    const { data } = await axios.get(url)

    const $ = cheerio.load(data)

    const title =
        $('meta[property="og:title"]').attr('content')

    const duration =
        $('meta[property="og:duration"]').attr('content')

    const views =
        $('span.metadata').text().trim()

    const scripts = $('script')

    let videoUrl = null

    scripts.each((i, el) => {

        const html = $(el).html()

        if (!html) return

        const matchHigh =
            html.match(/html5player\.setVideoUrlHigh\('(.*?)'\)/)

        const matchLow =
            html.match(/html5player\.setVideoUrlLow\('(.*?)'\)/)

        videoUrl =
            matchHigh?.[1] ||
            matchLow?.[1] ||
            videoUrl

    })

    return {

        title,

        duration: duration || 'Desconocida',

        views: views || 'Desconocidas',

        video: videoUrl

    }

}

module.exports = {
    xnxxCommand,
    xnxxNumberReply
}