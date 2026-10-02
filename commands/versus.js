const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { ButtonV2 } = require('../lib/airich')
const versusFile = path.join(__dirname, '../data/versus.json')

// En estos grupos el VS usa reacciones y edita siempre el mismo mensaje.
// Fuera de ellos se mantiene el sistema clásico con botones.
const REACTION_VERSUS_GROUPS = new Set([
    '120363411245707852@g.us',
    '120363425282487642@g.us'
])

function usesReactionVersus(chatId) {
    return REACTION_VERSUS_GROUPS.has(chatId)
}

function loadVersusData() {
    try {
        if (!fs.existsSync(versusFile)) {
            fs.writeFileSync(versusFile, JSON.stringify({}, null, 2))
        }
        return JSON.parse(fs.readFileSync(versusFile, 'utf8'))
    } catch (error) {
        console.error('Error loading versus data:', error)
        return {}
    }
}

function saveVersusData(data) {
    try {
        fs.writeFileSync(versusFile, JSON.stringify(data, null, 2))
        return true
    } catch (error) {
        console.error('Error saving versus data:', error)
        return false
    }
}

function normalizeCommand(cmd) {
    const map = {
        '.2vs2': '2vs2',
        '.2v2': '2vs2',
        '.4vs4': '4vs4',
        '.4v4': '4vs4',
        '.6vs6': '6vs6',
        '.6v6': '6vs6',
        '.int2': 'int2',
        '.int4': 'int4',
        '.int6': 'int6'
    }
    return map[cmd] || null
}

function getMatchInfo(type) {
    const isInt = type.startsWith('int')
    const size = parseInt(type.replace('int', ''), 10)

    return {
        title: type === '6vs6' ? '6 VS 6 BY' : `${size} VS ${size} CLK`,
        size,
        maxTitular: size,
        maxSuplentes: Math.max(1, Math.floor(size / 2))
    }
}

function getMatchKey(chatId, messageId) {
    return `${chatId}|${messageId}`
}

function removeOtherMatches(data, chatId, keepMatchId) {
    for (const key of Object.keys(data)) {
        const match = data[key]
        if (
            match &&
            match.chatId === chatId &&
            match.matchId !== keepMatchId
        ) {
            delete data[key]
        }
    }
}

function getActiveMatch(data, chatId) {
    const matches = Object.values(data)
        .filter(match => match && match.chatId === chatId)

    if (!matches.length) return null

    matches.sort((a, b) =>
        Number(b.updatedAt || b.createdAt || 0) -
        Number(a.updatedAt || a.createdAt || 0)
    )

    return matches[0]
}

function formatSlotList(users, slots, emoji = '🥷') {
    return Array.from({ length: slots }, (_, index) => {
        const user = users[index]
        return `${emoji} │ ${user ? `@${user.split('@')[0]}` : 'Vacío'}`
    }).join('\n')
}

function parseVersusButtonId(buttonId) {
    if (typeof buttonId !== 'string') return null

    const parts = buttonId.split('::')
    if (parts.length !== 3) return null
    if (parts[0] !== 'versus') return null

    const matchId = parts[1]?.trim()
    const action = parts[2]?.trim()

    if (!matchId || !['titular', 'suplente', 'remove'].includes(action)) {
        return null
    }

    return { matchId, action }
}

function parseVersusMeta(rawText) {
    const trimmed = (rawText || '').trim()
    if (!trimmed) {
        return { time: null, rival: '??' }
    }

    const parts = trimmed.split(/\s+/)
    const time = parts[0] || null
    const rivalRaw = parts.slice(1).join(' ').trim()
    const rival = rivalRaw ? rivalRaw.replace(/^\((.*)\)$/, '$1').trim() : '??'

    return { time, rival: rival || '??' }
}

function buildVersusText(match) {

    const esInterna = match.type.startsWith('int')
    const rivalName = match.rival || '??'

const titulares = formatSlotList(
    match.titular,
    match.maxTitular,
    '🥷'
)

const suplentes = formatSlotList(
    match.suplentes,
    match.maxSuplentes,
    '❕'
)

const equipo2 = formatSlotList(
    match.equipo2 || [],
    match.maxTitular,
    '🥷'
)

    const hora = match.time
        ? `⏰ ${match.time}`
        : '⏰ Hora por definir'

    return `
╭━━━〔 ⚔️ ${match.title} ⚔️ 〕━━━╮

🏴‍☠️ 𝐑𝐢𝐯𝐚𝐥: ${rivalName}
${hora}

╰━━━━━━━━━━━━━━━━━━╯

🛡️ 𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀 (${match.titular.length}/${match.maxTitular})

${titulares}

━━━━━━━━━━━━━━━━━━

${esInterna
? `⚔️ 𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀 2 (${match.equipo2.length}/${match.maxTitular})

${equipo2}`
: `🧤 𝐒𝐔𝐏𝐋𝐄𝐍𝐓𝐄𝐒 (${match.suplentes.length}/${match.maxSuplentes})

${suplentes}`
}

━━━━━━━━━━━━━━━━━━

${esInterna
? '❤️ │ Escuadra 1\n👍 │ Escuadra 2'
: '❤️ │ Entrar a Escuadra\n👍 │ Entrar a Suplentes'
}
💔 │ Salir de la Lista

> 🏴‍☠️ *${match.groupName}*
> Usa .up para volver a mandar la ultima lista creada
`.trim()
}

const mentionsForMatch = (match) => [
    ...new Set([
        ...match.titular,
        ...match.suplentes,
        ...(match.equipo2 || [])
    ])
]

function getReactionEmoji(event) {
    return event.reaction?.text || event.reaction?.emoji || null
}

function getReactingUser(event) {
    return (
        event.reaction?.key?.participant ||
        event.reaction?.key?.remoteJid ||
        event.key?.participant ||
        event.key?.remoteJid ||
        null
    )
}

function removeUserFromMatch(match, userId) {

    const titularIndex = match.titular.indexOf(userId)

    if (titularIndex !== -1) {
        match.titular.splice(titularIndex, 1)
    }

    const suplenteIndex = match.suplentes.indexOf(userId)

    if (suplenteIndex !== -1) {
        match.suplentes.splice(suplenteIndex, 1)
    }

    const equipo2Index = (match.equipo2 || []).indexOf(userId)

    if (equipo2Index !== -1) {
        match.equipo2.splice(equipo2Index, 1)
    }
}

async function versusCommand(sock, chatId, senderId, message) {
    try {
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            ''

        const parts = text.trim().split(/\s+/)
        const command = parts[0].toLowerCase()
        const normalized = normalizeCommand(command)
        const meta = parseVersusMeta(parts.slice(1).join(' '))
        const time = meta.time
        const rival = meta.rival

        if (!normalized) {
            return await sock.sendMessage(chatId, {
                text: '⚠️ Usa: .2v2, .4v4, .6v6, .int2, .int4 o .int6'
            }, { quoted: message })
        }

       

        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❌ Este comando solo funciona en grupos.'
            }, { quoted: message })
        }

        const metadata = await sock.groupMetadata(chatId)
        const groupName = metadata.subject || 'Grupo'

        const info = getMatchInfo(normalized)

        const match = {
            matchId: crypto.randomUUID(),
            chatId,
            messageId: null,
            key: null,
            type: normalized,
            title: info.title,
            time,
            rival,
            groupName,
            maxTitular: info.maxTitular,
            maxSuplentes: info.maxSuplentes,
            titular: [],
            suplentes: [],
            equipo2: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        }

        let sent

        if (usesReactionVersus(chatId)) {
            sent = await sock.sendMessage(chatId, {
                text: buildVersusText(match),
                mentions: mentionsForMatch(match)
            }, { quoted: message })
        } else {
            const buttonMenu = new ButtonV2(sock)
                .setBody(buildVersusText(match))
                .setFooter('FelbotC - Registro Versus')
                .addButton('❤️ Titular', `versus::${match.matchId}::titular`)
                .addButton(match.type.startsWith('int') ? '👍 Equipo 2' : '👍 Suplente', `versus::${match.matchId}::suplente`)
                .addButton('💔 Salir', `versus::${match.matchId}::remove`)

            sent = await buttonMenu.send(chatId, {
                quoted: message,
                viewOnce: false
            })
        }

        match.messageId = sent.key.id
        match.key = sent.key

        const data = loadVersusData()
        removeOtherMatches(data, chatId, match.matchId)
        data[getMatchKey(chatId, sent.key.id)] = match
        saveVersusData(data)

    } catch (error) {
        console.error('Error en versusCommand:', error)

        await sock.sendMessage(chatId, {
            text: '❌ Error al crear la lista.'
        }, { quoted: message })
    }
}

async function handleVersusReaction(sock, status) {
    try {
        const original = status.key

        if (!original?.remoteJid || !original?.id) return
        if (!usesReactionVersus(original.remoteJid)) return

        const emoji = getReactionEmoji(status)
        if (!['❤️', '👍', '💔'].includes(emoji)) return

        const userId = getReactingUser(status)
        if (!userId) return

        const key = getMatchKey(original.remoteJid, original.id)
        const data = loadVersusData()
        const match = data[key]
        if (!match) return

        if (!match.equipo2) match.equipo2 = []
        if (userId === sock.user?.id) return

        let updated = false

        if (emoji === '💔') {
            if (
                match.titular.includes(userId) ||
                match.suplentes.includes(userId) ||
                (match.equipo2 || []).includes(userId)
            ) {
                removeUserFromMatch(match, userId)
                updated = true
            }
        } else if (emoji === '❤️') {
            if (
                !match.titular.includes(userId) &&
                match.titular.length < match.maxTitular
            ) {
                removeUserFromMatch(match, userId)
                match.titular.push(userId)
                updated = true
            }
        } else if (emoji === '👍') {
            if (match.type.startsWith('int')) {
                if (
                    !match.equipo2.includes(userId) &&
                    match.equipo2.length < match.maxTitular
                ) {
                    removeUserFromMatch(match, userId)
                    match.equipo2.push(userId)
                    updated = true
                }
            } else if (
                !match.suplentes.includes(userId) &&
                match.suplentes.length < match.maxSuplentes
            ) {
                removeUserFromMatch(match, userId)
                match.suplentes.push(userId)
                updated = true
            }
        }

        if (!updated) return

        match.updatedAt = Date.now()
        data[key] = match
        saveVersusData(data)

        await sock.sendMessage(match.chatId, {
            text: buildVersusText(match),
            mentions: mentionsForMatch(match),
            edit: match.key
        })
    } catch (error) {
        console.error('Error en handleVersusReaction:', error)
    }
}

async function handleVersusButton(sock, senderId, buttonId, message) {
    try {
        const parsed = parseVersusButtonId(buttonId)
        if (!parsed) return

        const { matchId, action } = parsed
        const data = loadVersusData()
        const match = Object.values(data).find((m) => m.matchId === matchId)
        if (!match) return
        if (!match.equipo2) match.equipo2 = []
        if (senderId === sock.user?.id) return

        let updated = false

        if (action === 'remove') {
            if (
                match.titular.includes(senderId) ||
                match.suplentes.includes(senderId) ||
                match.equipo2.includes(senderId)
            ) {
                removeUserFromMatch(match, senderId)
                updated = true
            }
        } else if (action === 'titular') {
            if (
                !match.titular.includes(senderId) &&
                match.titular.length < match.maxTitular
            ) {
                removeUserFromMatch(match, senderId)
                match.titular.push(senderId)
                updated = true
            }
        } else if (action === 'suplente') {
            if (match.type.startsWith('int')) {
                if (
                    !match.equipo2.includes(senderId) &&
                    match.equipo2.length < match.maxTitular
                ) {
                    removeUserFromMatch(match, senderId)
                    match.equipo2.push(senderId)
                    updated = true
                }
            } else if (
                !match.suplentes.includes(senderId) &&
                match.suplentes.length < match.maxSuplentes
            ) {
                removeUserFromMatch(match, senderId)
                match.suplentes.push(senderId)
                updated = true
            }
        }

        if (!updated) return

        const oldKey = getMatchKey(match.chatId, match.messageId)

        const buttonMenu = new ButtonV2(sock)
            .setBody(buildVersusText(match))
            .setFooter('FelbotC - Registro Versus')
            .addButton('❤️ Titular', `versus::${match.matchId}::titular`)
            .addButton(
                match.type.startsWith('int') ? '👍 Equipo 2' : '👍 Suplente',
                `versus::${match.matchId}::suplente`
            )
            .addButton('💔 Salir', `versus::${match.matchId}::remove`)

        const sent = await buttonMenu.send(match.chatId, {
            quoted: message,
            mentions: mentionsForMatch(match),
            viewOnce: false
        })

        delete data[oldKey]

        match.messageId = sent.key.id
        match.key = sent.key
        match.updatedAt = Date.now()

        data[getMatchKey(match.chatId, sent.key.id)] = match
        saveVersusData(data)
    } catch (error) {
        console.error('Error en handleVersusButton:', error)
    }
}

async function upVersusCommand(sock, chatId, message) {
    try {

        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❌ Este comando solo funciona en grupos.'
            }, { quoted: message })
        }

        const data = loadVersusData()

        const match = getActiveMatch(data, chatId)

        if (!match) {
            return await sock.sendMessage(chatId, {
                text: '⚠️ No hay ninguna lista activa en este grupo.'
            }, { quoted: message })
        }

        const mentions = mentionsForMatch(match)

        if (usesReactionVersus(chatId)) {
            // En estos grupos .up conserva la misma publicación y solo la actualiza.
            try {
                await sock.sendMessage(chatId, {
                    text: buildVersusText(match),
                    mentions,
                    edit: match.key
                })
                return
            } catch (error) {
                console.error('Error editando VS con .up:', error)
                // Si WhatsApp ya no permite editar ese mensaje, se crea uno nuevo.
            }

            const sent = await sock.sendMessage(chatId, {
                text: buildVersusText(match),
                mentions
            }, { quoted: message })

            delete data[getMatchKey(match.chatId, match.messageId)]
            match.messageId = sent.key.id
            match.key = sent.key
            data[getMatchKey(chatId, sent.key.id)] = match
            saveVersusData(data)
            return
        }

        const buttonMenu = new ButtonV2(sock)
            .setBody(buildVersusText(match))
            .setFooter('FelbotC - Registro Versus')
            .addButton('❤️ Titular', `versus::${match.matchId}::titular`)
            .addButton(match.type.startsWith('int') ? '👍 Equipo 2' : '👍 Suplente', `versus::${match.matchId}::suplente`)
            .addButton('💔 Salir', `versus::${match.matchId}::remove`)

        const sent = await buttonMenu.send(chatId, {
            quoted: message,
            mentions,
            viewOnce: false
        })

        const oldKey = getMatchKey(
            match.chatId,
            match.messageId
        )

        delete data[oldKey]

        match.messageId = sent.key.id
        match.key = sent.key

        data[getMatchKey(chatId, sent.key.id)] = match

        saveVersusData(data)

    } catch (error) {
        console.error('Error en upVersusCommand:', error)
    }
}


module.exports = {
    versusCommand,
    handleVersusReaction,
    handleVersusButton,
    upVersusCommand
}