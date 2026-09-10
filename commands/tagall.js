
const isAdmin = require('../lib/isAdmin')
const { parsePhoneNumberFromString } = require('libphonenumber-js')

// Función para obtener bandera por código de país ISO
function getCountryFlag(countryCode) {
    if (!countryCode || countryCode.length !== 2) {
        return '🌍'
    }

    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt())

    return String.fromCodePoint(...codePoints)
}

// Función para obtener el país de un número telefónico
function extractCountryCode(phoneNumber) {
    if (!phoneNumber) return null

    try {
        const cleaned = String(phoneNumber)
            .trim()
            .replace(/[^\d+]/g, '')

        if (!cleaned) return null

        const internationalNumber = cleaned.startsWith('+')
            ? cleaned
            : `+${cleaned}`

        const parsed = parsePhoneNumberFromString(internationalNumber)

        if (parsed && parsed.isValid() && parsed.country) {
            return parsed.country
        }

    } catch (error) {
        // Ignorar números no válidos
    }

    return null
}

// Obtener el número telefónico real disponible del participante
function getParticipantPhone(participant) {
    if (!participant) return null

    if (participant.phoneNumber) {
        return participant.phoneNumber
    }

    if (participant.id && participant.id.endsWith('@s.whatsapp.net')) {
        return participant.id.split('@')[0]
    }

    if (participant.id && /^\d+$/.test(participant.id.split('@')[0])) {
        return participant.id.split('@')[0]
    }

    return null
}

async function tagAllCommand(sock, chatId, senderId, message) {

    try {

        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId)

        if (!isBotAdmin) {
            return await sock.sendMessage(chatId, {
                text: '❀ El bot necesita ser admin para ejecutar esto.'
            }, { quoted: message })
        }

        if (!isSenderAdmin) {
            return await sock.sendMessage(chatId, {
                text: '❀ Solo administradores pueden usar este comando.'
            }, { quoted: message })
        }

        // 📌 Metadata del grupo
        const metadata = await sock.groupMetadata(chatId)
        const participantes = metadata.participants

        if (!participantes || participantes.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❀ No hay participantes en el grupo.'
            }, { quoted: message })
        }

        // Mantener los IDs originales para que las menciones funcionen
        const mentions = participantes.map(p => p.id)

        // 📝 Extrae el mensaje personalizado
        const fullText =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            ''

        const commandParts = fullText.split(' ')
        const messageContent = commandParts.slice(1).join(' ').trim()
        const displayMessage = messageContent || 'Sin Mensaje Predeterminado'

        // 📝 Obtén bandera del admin
        let adminPhone = senderId.split('@')[0]

        if (!/^\d+$/.test(adminPhone)) {
            const adminParticipant = participantes.find(p => p.id === senderId)

            if (adminParticipant) {
                const realAdminPhone = getParticipantPhone(adminParticipant)

                if (realAdminPhone) {
                    adminPhone = String(realAdminPhone)
                        .replace(/[^\d+]/g, '')
                }
            }
        }

        // Asegurar que el número del admin tenga +
        if (adminPhone && !adminPhone.startsWith('+')) {
            adminPhone = `+${adminPhone}`
        }

        const adminCountryCode = extractCountryCode(adminPhone)
        const adminFlag = getCountryFlag(adminCountryCode)

        // 📝 TEXTO PREMIUM
        const texto = `
╭─❀「 𝙈𝙀𝙉𝘾𝙄𝙊𝙉 𝙂𝙀𝙉𝙀𝙍𝘼𝙇 」❀

 ✦ Admin:
> ${adminFlag} @${adminPhone.replace('+', '')}

 ✦ >>>Mensaje:
> ${displayMessage}

 ✦ Miembros:
> ${participantes.length}

────୨ৎ────

${participantes.map(p => {

    const realPhone = getParticipantPhone(p)

    if (!realPhone) {
        const jidValue = p.id?.split('@')[0] || 'usuario'
        return ` 🌍 @${jidValue}`
    }

    // Conservar el + para trabajar con el número internacional
    let phoneNumber = String(realPhone)
        .trim()
        .replace(/[^\d+]/g, '')

    if (!phoneNumber.startsWith('+')) {
        phoneNumber = `+${phoneNumber}`
    }

    const countryCode = extractCountryCode(phoneNumber)
    const flag = getCountryFlag(countryCode)

    // El + no se coloca después de @ porque WhatsApp
    // reconoce la mención mediante el JID original.
    return ` ${flag} @${phoneNumber.replace('+', '')}`

}).join('\n')}

╰─❀
`.trim()

        // 🚀 ENVIAR
        await sock.sendMessage(chatId, {
            text: texto,
            mentions,

            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,

                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363409628624676@newsletter',
                    newsletterName: '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 𝕮𝖍𝖆𝖓𝖓𝖚𝖊𝖑 ✧'
                }
            }

        }, { quoted: message })

    } catch (error) {

        console.error('Error tagall:', error)

        await sock.sendMessage(chatId, {
            text: '❀ Error ejecutando la mención general.'
        }, { quoted: message })
    }
}

module.exports = tagAllCommand

