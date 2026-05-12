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

            let addedBy = 'Unknown'

            if (author) {
                addedBy = author.split('@')[0]
            }

            let joinMethod = 'Added'

            if (author === participant) {
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

            if (fs.existsSync(imagePath)) {

                await sock.sendMessage(id, {
                    image: fs.readFileSync(imagePath),
                    caption: finalMessage,
                    mentions: [participantId]
                })

            } else {

                await sock.sendMessage(id, {
                    text: finalMessage,
                    mentions: [participantId]
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