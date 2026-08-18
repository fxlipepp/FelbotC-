const fs = require('fs')
const path = require('path')
const Group = require('../models/Group')
const settings = require('../settings')

const welcomePath = path.join(__dirname, '../data/welcome.json')
const PROFILE_PICTURE_TIMEOUT_MS = 0

if (!fs.existsSync(welcomePath)) {
    fs.writeFileSync(welcomePath, JSON.stringify({}, null, 2))
}

function loadWelcome() {
    return JSON.parse(fs.readFileSync(welcomePath))
}

function saveWelcome(data) {
    fs.writeFileSync(welcomePath, JSON.stringify(data, null, 2))
}

function getWelcomeAudioPath() {
    const candidates = [
        settings.welcomeAudioPath,
        process.env.WELCOME_AUDIO_PATH,
        path.join(__dirname, '../assets/welcome.mp3'),
        path.join(__dirname, '../assets/audio/welcome.mp3')
    ]

    for (const candidate of candidates) {
        const cleaned = String(candidate || '').trim()
        if (!cleaned) continue
        if (fs.existsSync(cleaned)) return cleaned
    }

    return String(settings.welcomeAudioPath || process.env.WELCOME_AUDIO_PATH || '').trim() || null
}

function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
        })
    ])
}

async function welcomeCommand(sock, chatId, message) {

    const text =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        ''

    const args = text.split(' ').slice(1)
    const action = args[0]?.toLowerCase()

    let groupData = await Group.findOne({
        groupId: chatId
    })

    if (!groupData) {

        groupData = await Group.create({
            groupId: chatId
        })
    }

    if (!action) {
        return await sock.sendMessage(chatId, {
            text: `
╭─〔 👋 𝖶𝖾𝗅𝖼𝗈𝗆𝖾 𝖲𝗒𝗌𝗍𝖾𝗆 〕─╮

> Mostrar sistema de bienvenidas del bot

✅ \`.welcome on\`
> Activar bienvenidas en el grupo

❌ \`.welcome off\`
> Desactivar sistema de bienvenidas

🛠️ \`.welcome set texto\`
> Personalizar mensaje de bienvenida

📌 Variables:
> {user} usuario
> {group} grupo

╰────────────────╯
`
        }, { quoted: message })
    }

    if (action === 'on') {

        groupData.welcome.enabled = true
        await groupData.save()

        return await sock.sendMessage(chatId, {
            text: '✅ Welcome activado.'
        }, { quoted: message })
    }

    if (action === 'off') {

        groupData.welcome.enabled = false
        await groupData.save()

        return await sock.sendMessage(chatId, {
            text: '❌ Welcome desactivado.'
        }, { quoted: message })
    }

    if (action === 'set') {

        const customText = args.slice(1).join(' ')

        if (!customText) {
            return await sock.sendMessage(chatId, {
                text: '⚠️ Escribe un mensaje.'
            }, { quoted: message })
        }

        groupData.welcome.message = customText
        await groupData.save()

        return await sock.sendMessage(chatId, {
            text: '✅ Mensaje de bienvenida guardado.'
        }, { quoted: message })
    }
}

async function sendWelcomeAudio(sock, groupId) {
    const audioPath = getWelcomeAudioPath();
    if (!audioPath || !fs.existsSync(audioPath)) {
        console.log(`[${new Date().toLocaleTimeString()}] ⚠️ No hay audio de bienvenida disponible para ${groupId}`)
        return;
    }

    try {
        const audioBuffer = fs.readFileSync(audioPath)
        console.log(`[${new Date().toLocaleTimeString()}] 📤 Iniciando envío de audio de bienvenida a ${groupId}`)

        await sock.sendMessage(groupId, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: false
        })

        console.log(`[${new Date().toLocaleTimeString()}] 🔊 Audio de bienvenida enviado al grupo ${groupId}`)
    } catch (error) {
        console.log(`[${new Date().toLocaleTimeString()}] ❌ Welcome audio error:`, error)
    }
}

async function handleJoinEvent(sock, id, participants, author) {

    const groupData = await Group.findOne({
        groupId: id
    })

    if (!groupData?.welcome?.enabled) return

    const metadata = await withTimeout(sock.groupMetadata(id), 2500, 'groupMetadata').catch((err) => {
        console.log(`[${new Date().toLocaleTimeString()}] ⚠️ groupMetadata timeout: ${err.message}`)
        return { subject: 'Fxlbot' }
    })

    const groupName = metadata?.subject || 'Fxlbot'

    for (const participant of participants) {

        try {

            const participantId =
                typeof participant === 'string'
                    ? participant
                    : participant.id

            const userNumber = participantId.split('@')[0]
            const mentions = [participantId]

            let addedBy = 'Unknown'
            let addedByDisplay = ''

            const normalizeName = (value) => {
                if (!value) return ''
                if (value.includes('@')) return value.split('@')[0]
                return value
            }

            if (author && author !== participantId) {
                const authorNumber = normalizeName(author)
                addedByDisplay = authorNumber

                try {
                    const authorParticipant = metadata.participants.find(p => p.id === author)
                    if (authorParticipant) {
                        addedByDisplay = authorParticipant.notify || authorParticipant.name || authorParticipant.vname || addedByDisplay
                    }

                    const authorContact = sock.contacts?.[author]
                    if (authorContact) {
                        addedByDisplay = authorContact.notify || authorContact.name || authorContact.vname || addedByDisplay
                    }

                    if (!addedByDisplay || addedByDisplay === author) {
                        const authorProfile = await sock.getBusinessProfile(author).catch(() => null)
                        if (authorProfile?.name) {
                            addedByDisplay = authorProfile.name
                        }
                    }
                } catch {
                    addedByDisplay = authorNumber
                }

                addedBy = addedByDisplay || `@${authorNumber}`
                mentions.push(author)
            } else if (author === participantId) {
                addedBy = 'Joined via link'
            }

            const customMessage = groupData.welcome.message

            let welcomeText = `El equipo de Fxlbot te da la bienvenida al grupo\nEsperamos que te sientas cómoda/o aqui con nosotros.`

            if (customMessage) {
                welcomeText = customMessage
                    .replace(/{user}/g, `@${userNumber}`)
                    .replace(/{group}/g, groupName)
            }

            const finalMessage = `
｡ ﾟ･ ｡ 夜 ｡ ﾟ･ ｡

*${groupName}*
↳ @${userNumber}

> ${welcomeText}
｡ ﾟ･ ｡ ﾟ ･ ｡ ﾟ ･ ｡
╰─ 𓂃 𓈒𓏸 ─╯
`

            console.log(`[${new Date().toLocaleTimeString()}] 👋 Alguien entró al grupo ${groupName}: ${participantId}`)

            const imagePath = path.join(__dirname, '../assets/imagenes/welcome/welcome.jpg')
            let profilePicUrl = null

            try {
                const profilePromise = sock.profilePictureUrl(participantId, 'image');
                if (PROFILE_PICTURE_TIMEOUT_MS > 0) {
                    profilePicUrl = await withTimeout(profilePromise, PROFILE_PICTURE_TIMEOUT_MS, `profilePictureUrl:${participantId}`);
                } else {
                    profilePicUrl = await profilePromise;
                }
            } catch (err) {
                profilePicUrl = null;
            }

            const hasFallbackImage = fs.existsSync(imagePath)

            if (profilePicUrl) {
                await sock.sendMessage(id, {
                    image: { url: profilePicUrl },
                    caption: finalMessage,
                    mentions
                })
            } else if (hasFallbackImage) {
                await sock.sendMessage(id, {
                    image: fs.readFileSync(imagePath),
                    caption: finalMessage,
                    mentions
                })
            } else {
                await sock.sendMessage(id, {
                    text: finalMessage,
                    mentions
                })
            }

            console.log(`[${new Date().toLocaleTimeString()}] ✅ Bienvenida enviada para ${participantId} en ${groupName}`)

            // Se envía en segundo plano para no bloquear la bienvenida principal.
            sendWelcomeAudio(sock, id).catch((error) => {
                console.log(`[${new Date().toLocaleTimeString()}] ❌ Welcome audio error:`, error)
            })

        } catch (err) {

            console.log('Welcome error:', err)

        }
    }
}

module.exports = {
    welcomeCommand,
    handleJoinEvent
}