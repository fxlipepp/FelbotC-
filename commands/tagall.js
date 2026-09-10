const isAdmin = require('../lib/isAdmin')
const { parsePhoneNumber } = require('libphonenumber-js')

// Función para obtener bandera por código de país ISO
function getCountryFlag(countryCode) {
    // Si no hay código o no es válido, retornar globo
    if (!countryCode || countryCode.length !== 2) {
        return '🌍'
    }
    
    // Convertir código ISO (2 letras) a emoji de bandera usando Unicode
    // Regional indicator symbols: A=127462, Z=127487
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt())
    
    return String.fromCodePoint(...codePoints)
}

// Función para extraer el código de país del número
function extractCountryCode(phoneNumber) {
    if (!phoneNumber) return null
    
    try {
        // Extraer solo dígitos
        const digits = phoneNumber.replace(/\D/g, '')
        if (!digits) return null
        
        // Intentar parsePhoneNumber con +
        let parsed = null
        try {
            parsed = parsePhoneNumber('+' + digits)
        } catch (e) {}
        
        // Si falla, intentar sin +
        if (!parsed) {
            try {
                parsed = parsePhoneNumber(digits)
            } catch (e) {}
        }
        
        // Devolver el código ISO del país (2 letras)
        if (parsed && parsed.country) {
            return parsed.country
        }
    } catch (error) {
        // Silenciosamente ignorar errores
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

        const mentions = participantes.map(p => p.id)

        // 📝 Extrae el mensaje personalizado
        const fullText = message.message?.conversation || message.message?.extendedTextMessage?.text || ''
        const commandParts = fullText.split(' ')
        const messageContent = commandParts.slice(1).join(' ').trim()
        const displayMessage = messageContent || 'Sin Mensaje Predeterminado'

        // 📝 Obtén bandera del admin
        const adminPhone = senderId.split('@')[0]
        const adminCountryCode = extractCountryCode(adminPhone)
        const adminFlag = getCountryFlag(adminCountryCode)

        // 📝 TEXTO PREMIUM
        const texto = `
╭─❀「 𝙈𝙀𝙉𝙘𝙄𝙊𝙉 𝙂𝙀𝙉𝙀𝙍𝘼𝙇 」❀

 ✦ Admin:
> ${adminFlag} @${adminPhone}

 ✦ >>>Mensaje:
> ${displayMessage}

 ✦ Miembros:
> ${participantes.length}

────୨ৎ────

${participantes.map(p => {
    const phoneNumber = p.id.split('@')[0]
    const countryCode = extractCountryCode(phoneNumber)
    const flag = getCountryFlag(countryCode)
    return ` ${flag} @${phoneNumber}`
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