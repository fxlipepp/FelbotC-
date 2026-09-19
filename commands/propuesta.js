const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const { ButtonV2 } = require('../lib/airich')
const Marriage = require('../models/Marriage')

const propuestas = new Map()
const matrimonios = new Map()

function normalizeId(value) {
    return String(value || '').trim()
}

function buildProposalKey(chatId, targetId) {
    return `${normalizeId(chatId)}:${normalizeId(targetId)}`
}

async function getMarriedPartner(chatId, userId) {
    const chatKey = normalizeId(chatId)
    const userKey = normalizeId(userId)
    const chatMarriage = matrimonios.get(chatKey)

    if (chatMarriage && chatMarriage.has(userKey)) {
        return chatMarriage.get(userKey)
    }

    if (mongoose.connection.readyState !== 1) {
        if (chatMarriage) {
            for (const [personA, personB] of chatMarriage.entries()) {
                if (personB === userKey) return personA
            }
        }
        return null
    }

    try {
        const record = await Marriage.findOne({
            chatId: chatKey,
            $or: [{ personA: userKey }, { personB: userKey }]
        }).lean()

        if (!record) {
            if (chatMarriage) {
                for (const [personA, personB] of chatMarriage.entries()) {
                    if (personB === userKey) return personA
                }
            }
            return null
        }

        const partner = record.personA === userKey ? record.personB : record.personA
        const current = matrimonios.get(chatKey) || new Map()
        current.set(record.personA, record.personB)
        current.set(record.personB, record.personA)
        matrimonios.set(chatKey, current)

        return partner
    } catch (error) {
        console.error('Error loading marriage from Mongo:', error)
        return chatMarriage ? (chatMarriage.get(userKey) || null) : null
    }
}

async function isUserMarriedInChat(chatId, userId) {
    return Boolean(await getMarriedPartner(chatId, userId))
}

async function setMarriage(chatId, personA, personB) {
    const chatKey = normalizeId(chatId)
    const a = normalizeId(personA)
    const b = normalizeId(personB)

    const current = matrimonios.get(chatKey) || new Map()
    current.set(a, b)
    current.set(b, a)
    matrimonios.set(chatKey, current)

    if (mongoose.connection.readyState !== 1) return

    try {
        await Marriage.findOneAndUpdate(
            {
                chatId: chatKey,
                $or: [
                    { personA: a, personB: b },
                    { personA: b, personB: a }
                ]
            },
            { chatId: chatKey, personA: a, personB: b },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )
    } catch (error) {
        console.error('Error saving marriage in Mongo:', error)
    }
}

async function removeMarriage(chatId, personA, personB) {
    const chatKey = normalizeId(chatId)
    const a = normalizeId(personA)
    const b = normalizeId(personB)
    const current = matrimonios.get(chatKey)

    if (current) {
        current.delete(a)
        current.delete(b)
        if (current.size === 0) matrimonios.delete(chatKey)
        else matrimonios.set(chatKey, current)
    }

    if (mongoose.connection.readyState !== 1) return

    try {
        await Marriage.deleteOne({
            chatId: chatKey,
            $or: [
                { personA: a, personB: b },
                { personA: b, personB: a }
            ]
        })
    } catch (error) {
        console.error('Error deleting marriage from Mongo:', error)
    }
}

function getRandomGif(folder) {
    if (!fs.existsSync(folder)) return null

    const files = fs.readdirSync(folder)
        .filter(file =>
            file.endsWith('.gif') ||
            file.endsWith('.mp4')
        )

    if (!files.length) return null

    return path.join(
        folder,
        files[Math.floor(Math.random() * files.length)]
    )
}

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

async function propuestaCommand(sock, chatId, senderId, message) {
    const target =
        message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

    if (!target) {
        await sock.sendMessage(chatId, {
            text:
`╭━━━〔 💍 PROUESTA DE MATRIMONIO 💍 〕━━━⬣

💡 Uso correcto:
.propuesta @usuario

╰━━━━━━━━━━━━━━━━━━━━⬣`
        }, { quoted: message })
        return false
    }

    if (target === senderId) {
        await sock.sendMessage(chatId, {
            text:
`╭━━━〔 🤨 ERROR 〕━━━⬣

No puedes proponerte matrimonio a ti mismo.

╰━━━━━━━━━━━━━━⬣`
        }, { quoted: message })
        return false
    }

    if (await isUserMarriedInChat(chatId, senderId)) {
        const spouse = await getMarriedPartner(chatId, senderId)
        await sock.sendMessage(chatId, {
            text:
`╭━━━〔 💔 YA ESTÁS CASADO 〕━━━⬣

@${senderId.split('@')[0]} ya está casado/a con @${spouse.split('@')[0]}.

Debes divorciarte antes de poder proponer a otra persona.

╰━━━━━━━━━━━━━━━━━━━━⬣`,
            mentions: [senderId, spouse]
        }, { quoted: message })
        return false
    }

    if (await isUserMarriedInChat(chatId, target)) {
        const spouse = await getMarriedPartner(chatId, target)
        await sock.sendMessage(chatId, {
            text:
`╭━━━〔 💔 NO SE PUEDE 〕━━━⬣

@${target.split('@')[0]} ya está casado/a con @${spouse.split('@')[0]}.

No puedes proponerle matrimonio hasta que se divorcie.

╰━━━━━━━━━━━━━━━━━━━━⬣`,
            mentions: [target, spouse]
        }, { quoted: message })
        return false
    }

    const proposalKey = buildProposalKey(chatId, target)
    if (propuestas.has(proposalKey)) {
        await sock.sendMessage(chatId, {
            text:
`╭━━━〔 ⏳ ESPERA 〕━━━⬣

💍 Esa persona ya tiene una propuesta pendiente.

╰━━━━━━━━━━━━━━⬣`
        }, { quoted: message })
        return false
    }

    propuestas.set(proposalKey, {
        proposer: senderId,
        target,
        chatId,
        proposalKey
    })

    const buttonMenu = new ButtonV2(sock)
        .setBody(
`╭〔 💍 PROPUESTA MATRIMONIO 💍 〕⬣

💖 @${senderId.split('@')[0]} ha reunido todo su valor para hacer una gran pregunta...

✨ @${target.split('@')[0]}
¿Aceptas compartir tu vida junto a esta persona?

💞 El destino está en tus manos.

╰━━━━━━━━━━━━━━⬣`
        )
        .setFooter('FelbotC • Propuesta')
        .addButton('✅ Aceptar', `propuesta::accept::${proposalKey}`)
        .addButton('❌ Rechazar', `propuesta::reject::${proposalKey}`)

    await buttonMenu.send(chatId, { quoted: message, mentions: [senderId, target] })
    return true
}

async function handleProposalButton(sock, chatId, senderId, buttonId) {
    if (!buttonId || !String(buttonId).startsWith('propuesta::')) return false

    const parts = String(buttonId).split('::')
    const action = parts[1]
    const proposalKey = parts[2]

    if (!proposalKey) return false

    if (action === 'accept') {
        return await aceptarPropuesta(sock, chatId, senderId, proposalKey)
    }

    if (action === 'reject') {
        return await rechazarPropuesta(sock, chatId, senderId, proposalKey)
    }

    return false
}

async function aceptarPropuesta(sock, chatId, senderId, proposalKey = buildProposalKey(chatId, senderId)) {
    const proposal = propuestas.get(proposalKey) || propuestas.get(buildProposalKey(chatId, senderId))

    if (!proposal) return false

    if (proposal.target !== senderId) {
        return false
    }

    const proposer = proposal.proposer
    const target = proposal.target

    if (await isUserMarriedInChat(chatId, proposer) || await isUserMarriedInChat(chatId, target)) {
        propuestas.delete(proposalKey)
        return false
    }

    propuestas.delete(proposalKey)
    await setMarriage(chatId, proposer, target)

    const gif = getRandomGif(
        path.join(__dirname, '../assets/gifs/besar')
    )

    const frases = [
        '💞 El destino los ha unido.',
        '✨ Una nueva historia de amor comienza.',
        '🌹 El grupo celebra esta hermosa unión.',
        '🥂 Que sean muy felices juntos.',
        '💖 El amor ha triunfado hoy.',
        '💕 Dos corazones, un mismo camino.'
    ]

    const texto =
`╭〔 COMPROMISO OFICIAL 💍 〕⬣

🎉 ¡LA RESPUESTA FUE SÍ!

🤵 @${proposer.split('@')[0]}
👰 @${target.split('@')[0]}

💖 Ahora están oficialmente casados y comprometidos.

💋 ¡Ya pueden darse un beso frente al grupo!

${random(frases)}

╰━━━━━━━━━━━━━━⬣`

    if (gif) {
        await sock.sendMessage(chatId, {
            video: fs.readFileSync(gif),
            gifPlayback: true,
            caption: texto,
            mentions: [proposer, target]
        })
    } else {
        await sock.sendMessage(chatId, {
            text: texto,
            mentions: [proposer, target]
        })
    }

    return true
}

async function rechazarPropuesta(sock, chatId, senderId, proposalKey = buildProposalKey(chatId, senderId)) {
    const proposal = propuestas.get(proposalKey) || propuestas.get(buildProposalKey(chatId, senderId))

    if (!proposal || proposal.target !== senderId) return false

    propuestas.delete(proposalKey)

    const gif = getRandomGif(
        path.join(__dirname, '../assets/gifs/rechazo')
    )

    const frases = [
        '🍂 A veces el amor toma caminos diferentes.',
        '💔 No todas las historias tienen final feliz.',
        '😔 Quizás en otra vida.',
        '🥀 El corazón deberá recuperarse.',
        '🫂 Mucha fuerza para seguir adelante.'
    ]

    const texto =
`╭〔 💔 CORAZÓN ROTO 💔 〕⬣

😢 @${proposal.target.split('@')[0]}
ha rechazado la propuesta de

💔 @${proposal.proposer.split('@')[0]}

${random(frases)}

╰━━━━━━━━━━━━━━⬣`

    if (gif) {
        await sock.sendMessage(chatId, {
            video: fs.readFileSync(gif),
            gifPlayback: true,
            caption: texto,
            mentions: [proposal.proposer, proposal.target]
        })
    } else {
        await sock.sendMessage(chatId, {
            text: texto,
            mentions: [proposal.proposer, proposal.target]
        })
    }

    return true
}

async function divorcioCommand(sock, chatId, senderId, message = {}, targetId = null) {
    const target = targetId || message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, {
            text: '❌ Este comando solo funciona en grupos.'
        }, { quoted: message })
        return false
    }

    const spouse = await getMarriedPartner(chatId, senderId)

    if (!spouse && target) {
        const spouseTarget = await getMarriedPartner(chatId, target)
        if (spouseTarget) {
            await sock.sendMessage(chatId, {
                text: `@${senderId.split('@')[0]} no está casado/a con @${target.split('@')[0]}.`,
                mentions: [senderId, target]
            }, { quoted: message })
            return false
        }
    }

    if (!spouse) {
        await sock.sendMessage(chatId, {
            text: `@${senderId.split('@')[0]} no tienes un matrimonio activo en este grupo.`,
            mentions: [senderId]
        }, { quoted: message })
        return false
    }

    const finalTarget = target && spouse === target ? target : spouse

    if (target && target !== finalTarget) {
        await sock.sendMessage(chatId, {
            text: `@${senderId.split('@')[0]} no está casado/a con @${target.split('@')[0]}.`,
            mentions: [senderId, target]
        }, { quoted: message })
        return false
    }

    await removeMarriage(chatId, senderId, finalTarget)

    await sock.sendMessage(chatId, {
        text:
`╭━━━〔 💔 DIVORCIO 💔 〕━━━⬣

💔 @${senderId.split('@')[0]} y @${finalTarget.split('@')[0]} han decidido poner fin a su matrimonio.

✨ Que ambos puedan seguir adelante con paz y tranquilidad.

╰━━━━━━━━━━━━━━━━━━━━⬣`,
        mentions: [senderId, finalTarget]
    }, { quoted: message })

    return true
}

const divortioCommand = divorcioCommand

module.exports = {
    propuestaCommand,
    aceptarPropuesta,
    rechazarPropuesta,
    handleProposalButton,
    divorcioCommand,
    divortioCommand,
    propuestas,
    matrimonios,
    getMarriedPartner,
    isUserMarriedInChat,
    setMarriage,
    removeMarriage
}