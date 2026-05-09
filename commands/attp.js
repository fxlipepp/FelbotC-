const { spawn } = require('child_process')
const fs = require('fs')
const { writeExifVid } = require('../lib/exif')

async function attpCommand(sock, chatId, message) {

    const userMessage =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        ''

    const text =
        userMessage.split(' ').slice(1).join(' ')

    // 📌 Sin texto
    if (!text) {

        await sock.sendMessage(chatId, {

            text:
'❌ Escribe un texto después de *.attp*',

            contextInfo: {

                forwardingScore: 999,
                isForwarded: true,

                forwardedNewsletterMessageInfo: {

                    newsletterJid:
'120363409628624676@newsletter',

                    newsletterName:
'✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕮𝖆𝖓𝖆𝖑 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 ✧'
                }
            }

        }, { quoted: message })

        return
    }

    try {

        // 🎬 Generar video ATT
        const mp4Buffer =
            await renderBlinkingVideoWithFfmpeg(text)

        // 📌 Convertir a sticker
        const webpPath =
            await writeExifVid(mp4Buffer, {

                packname:
                    'Felbot 夜'
            })

        const webpBuffer =
            fs.readFileSync(webpPath)

        // 🧹 Borrar temporal
        try {

            fs.unlinkSync(webpPath)

        } catch (_) {}

        // 📤 Enviar sticker
        await sock.sendMessage(chatId, {

            sticker: webpBuffer,

            contextInfo: {

                forwardingScore: 999,
                isForwarded: true,

                forwardedNewsletterMessageInfo: {

                    newsletterJid:
'120363409628624676@newsletter',

                    newsletterName:
'✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕮𝖆𝖓𝖆𝖑 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 ✧'
                }
            }

        }, { quoted: message })

    } catch (error) {

        console.error(
            '❌ Error generando ATT:',
            error
        )

        await sock.sendMessage(chatId, {

            text:
'❌ No pude generar el sticker animado.',

            contextInfo: {

                forwardingScore: 999,
                isForwarded: true,

                forwardedNewsletterMessageInfo: {

                    newsletterJid:
'120363409628624676@newsletter',

                    newsletterName:
'✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕮𝖆𝖓𝖆𝖑 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 ✧'
                }
            }

        }, { quoted: message })
    }
}

module.exports = attpCommand

// 🎨 Render PNG
function renderTextToPngWithFfmpeg(text) {

    return new Promise((resolve, reject) => {

        const fontPath =
            process.platform === 'win32'
                ? 'C:/Windows/Fonts/arialbd.ttf'
                : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

        // 📌 Escapar texto
        const escapeDrawtextText = (s) => s
            .replace(/\\/g, '\\\\')
            .replace(/:/g, '\\:')
            .replace(/'/g, "\\'")
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/%/g, '\\%')

        const safeText =
            escapeDrawtextText(text)

        const safeFontPath =
            process.platform === 'win32'
                ? fontPath.replace(/\\/g, '/').replace(':', '\\:')
                : fontPath

        const args = [

            '-y',

            '-f', 'lavfi',

            '-i',
            'color=c=#00000000:s=512x512',

            '-vf',

            `drawtext=fontfile='${safeFontPath}':text='${safeText}':fontcolor=white:fontsize=56:borderw=2:bordercolor=black@0.6:x=(w-text_w)/2:y=(h-text_h)/2`,

            '-frames:v', '1',

            '-f', 'image2',

            'pipe:1'
        ]

        const ff = spawn('ffmpeg', args)

        const chunks = []
        const errors = []

        ff.stdout.on('data',
            d => chunks.push(d))

        ff.stderr.on('data',
            e => errors.push(e))

        ff.on('error', reject)

        ff.on('close', code => {

            if (code === 0)
                return resolve(
                    Buffer.concat(chunks)
                )

            reject(
                new Error(
                    Buffer.concat(errors).toString() ||
                    `ffmpeg salió con código ${code}`
                )
            )
        })
    })
}

// 🎬 Render video ATT
function renderBlinkingVideoWithFfmpeg(text) {

    return new Promise((resolve, reject) => {

        const fontPath =
            process.platform === 'win32'
                ? 'C:/Windows/Fonts/arialbd.ttf'
                : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

        // 📌 Escapar texto
        const escapeDrawtextText = (s) => s
            .replace(/\\/g, '\\\\')
            .replace(/:/g, '\\:')
            .replace(/,/g, '\\,')
            .replace(/'/g, "\\'")
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/%/g, '\\%')

        const safeText =
            escapeDrawtextText(text)

        const safeFontPath =
            process.platform === 'win32'
                ? fontPath.replace(/\\/g, '/').replace(':', '\\:')
                : fontPath

        // ⚡ Velocidad parpadeo
        const cycle = 0.3
        const dur = 1.8

        // 🔴🔵🟢 Colores
        const drawRed =
`drawtext=fontfile='${safeFontPath}':text='${safeText}':fontcolor=red:borderw=2:bordercolor=black@0.6:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2:enable='lt(mod(t\\,${cycle})\\,0.1)'`

        const drawBlue =
`drawtext=fontfile='${safeFontPath}':text='${safeText}':fontcolor=blue:borderw=2:bordercolor=black@0.6:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(mod(t\\,${cycle})\\,0.1\\,0.2)'`

        const drawGreen =
`drawtext=fontfile='${safeFontPath}':text='${safeText}':fontcolor=lime:borderw=2:bordercolor=black@0.6:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2:enable='gte(mod(t\\,${cycle})\\,0.2)'`

        const filter =
`${drawRed},${drawBlue},${drawGreen}`

        const args = [

            '-y',

            '-f', 'lavfi',

            '-i',
`color=c=black:s=512x512:d=${dur}:r=20`,

            '-vf',
            filter,

            '-c:v',
            'libx264',

            '-pix_fmt',
            'yuv420p',

            '-movflags',
            '+faststart+frag_keyframe+empty_moov',

            '-t',
            String(dur),

            '-f',
            'mp4',

            'pipe:1'
        ]

        const ff = spawn('ffmpeg', args)

        const chunks = []
        const errors = []

        ff.stdout.on('data',
            d => chunks.push(d))

        ff.stderr.on('data',
            e => errors.push(e))

        ff.on('error', reject)

        ff.on('close', code => {

            if (code === 0)
                return resolve(
                    Buffer.concat(chunks)
                )

            reject(
                new Error(
                    Buffer.concat(errors).toString() ||
                    `ffmpeg salió con código ${code}`
                )
            )
        })
    })
}