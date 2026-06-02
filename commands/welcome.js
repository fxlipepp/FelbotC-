const fs = require('fs')
const path = require('path')
const Group = require('../models/Group')

const welcomePath = path.join(__dirname, '../data/welcome.json')

if (!fs.existsSync(welcomePath)) {
    fs.writeFileSync(welcomePath, JSON.stringify({}, null, 2))
}

function loadWelcome() {
    return JSON.parse(fs.readFileSync(welcomePath))
}

function saveWelcome(data) {
    fs.writeFileSync(welcomePath, JSON.stringify(data, null, 2))
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

async function handleJoinEvent(sock, id, participants, author) {

    const groupData = await Group.findOne({
        groupId: id
    })

    if (!groupData?.welcome?.enabled) return

    const metadata = await sock.groupMetadata(id)
    const groupName = metadata.subject

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

            let joinMethod = 'Added'

            if (author === participantId) {
                joinMethod = 'Joined via link'
            }

            const customMessage = groupData.welcome.message

            let welcomeText = `El equipo de \`𝖥𝖾𝗅𝖻𝗈𝗍\` 𝗍𝖾 𝖽𝖺 𝗅𝖺 𝖻𝗂𝖾𝗇𝗏𝖾𝗇𝗂𝖽𝖺 a *${groupName}*`

            if (customMessage) {

                welcomeText = customMessage
                    .replace(/{user}/g, `@${userNumber}`)
                    .replace(/{group}/g, groupName)
            }

            let finalMessage = `
╭👋 BIENVENID@ A \`${groupName}\`╮

> ${welcomeText}

👤 \`𝖴𝗌𝖾𝗋\`
❀ @${userNumber}

👥 \`𝖦𝗋𝗈𝗎𝗉\`
❀ ${groupName}

👑 \`𝖠𝖽𝖽𝖾𝖽 𝖡𝗒\`
❀ ${addedBy}

📊 𝖬𝖾𝗆𝖻𝖾𝗋𝗌
❀ ${metadata.participants.length}

🔗 \`𝖩𝗈𝗂𝗇 𝖬𝖾𝗍𝗁𝗈𝖽\`
❀ ${joinMethod}

🛠️ 𝖳𝗒𝗉𝖾 \`.menu\`
> 𝖯𝖺𝗋𝖺 𝗏𝖾𝗋 𝗍𝗈𝖽𝗈𝗌 𝗅𝗈𝗌 𝖼𝗈𝗆𝖺𝗇𝖽𝗈𝗌

╰─────────────╯
`

            const imagePath = path.join(__dirname, '../assets/imagenes/welcome/welcome.jpg')
            let profilePicUrl = null

            try {
                profilePicUrl = await sock.profilePictureUrl(participantId, 'image')
            } catch (err) {
                profilePicUrl = null
            }

            if (profilePicUrl) {
                await sock.sendMessage(id, {
                    image: { url: profilePicUrl },
                    caption: finalMessage,
                    mentions
                })
            } else if (fs.existsSync(imagePath)) {
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

        } catch (err) {

            console.log('Welcome error:', err)

        }
    }
}

module.exports = {
    welcomeCommand,
    handleJoinEvent
}