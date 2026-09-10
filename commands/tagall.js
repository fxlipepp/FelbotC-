const isAdmin = require('../lib/isAdmin')
const { parsePhoneNumber } = require('libphonenumber-js')

// Función para obtener bandera por código de país
function getCountryFlag(countryCode) {
    const flagMap = {
        'US': '🇺🇸',     // USA
        'CA': '🇨🇦',     // Canadá
        'RU': '🇷🇺',     // Rusia
        'EG': '🇪🇬',     // Egipto
        'ZA': '🇿🇦',     // Sudáfrica
        'GR': '🇬🇷',     // Grecia
        'NL': '🇳🇱',     // Países Bajos
        'BE': '🇧🇪',     // Bélgica
        'FR': '🇫🇷',     // Francia
        'ES': '🇪🇸',     // España
        'HU': '🇭🇺',     // Hungría
        'IT': '🇮🇹',     // Italia
        'RO': '🇷🇴',     // Rumania
        'CH': '🇨🇭',     // Suiza
        'AT': '🇦🇹',     // Austria
        'GB': '🇬🇧',     // Reino Unido
        'DK': '🇩🇰',     // Dinamarca
        'SE': '🇸🇪',     // Suecia
        'NO': '🇳🇴',     // Noruega
        'PL': '🇵🇱',     // Polonia
        'DE': '🇩🇪',     // Alemania
        'PE': '🇵🇪',     // Perú
        'MX': '🇲🇽',     // México
        'CU': '🇨🇺',     // Cuba
        'AR': '🇦🇷',     // Argentina
        'BR': '🇧🇷',     // Brasil
        'CL': '🇨🇱',     // Chile
        'CO': '🇨🇴',     // Colombia
        'VE': '🇻🇪',     // Venezuela
        'MY': '🇲🇾',     // Malasia
        'AU': '🇦🇺',     // Australia
        'ID': '🇮🇩',     // Indonesia
        'PH': '🇵🇭',     // Filipinas
        'NZ': '🇳🇿',     // Nueva Zelanda
        'SG': '🇸🇬',     // Singapur
        'TH': '🇹🇭',     // Tailandia
        'JP': '🇯🇵',     // Japón
        'KR': '🇰🇷',     // Corea del Sur
        'VN': '🇻🇳',     // Vietnam
        'CN': '🇨🇳',     // China
        'TR': '🇹🇷',     // Turquía
        'IN': '🇮🇳',     // India
        'PK': '🇵🇰',     // Pakistán
        'AF': '🇦🇫',     // Afganistán
        'LK': '🇱🇰',     // Sri Lanka
        'MM': '🇲🇲',     // Myanmar
        'IR': '🇮🇷',     // Irán
        'MA': '🇲🇦',     // Marruecos
        'DZ': '🇩🇿',     // Argelia
        'TN': '🇹🇳',     // Túnez
        'NG': '🇳🇬',     // Nigeria
        'KE': '🇰🇪',     // Kenia
        'UG': '🇺🇬',     // Uganda
        'FI': '🇫🇮',     // Finlandia
        'BG': '🇧🇬',     // Bulgaria
        'LT': '🇱🇹',     // Lituania
        'LV': '🇱🇻',     // Letonia
        'EE': '🇪🇪',     // Estonia
        'MD': '🇲🇩',     // Moldavia
        'AM': '🇦🇲',     // Armenia
        'BY': '🇧🇾',     // Bielorrusia
        'AD': '🇦🇩',     // Andorra
        'MC': '🇲🇨',     // Mónaco
        'SM': '🇸🇲',     // San Marino
        'UA': '🇺🇦',     // Ucrania
        'RS': '🇷🇸',     // Serbia
        'ME': '🇲🇪',     // Montenegro
        'XK': '🇽🇰',     // Kosovo
        'HR': '🇭🇷',     // Croacia
        'SI': '🇸🇮',     // Eslovenia
        'BA': '🇧🇦',     // Bosnia
        'MK': '🇲🇰',     // Macedonia
        'CZ': '🇨🇿',     // República Checa
        'SK': '🇸🇰',     // Eslovaquia
        'LI': '🇱🇮',     // Liechtenstein
        'FK': '🇫🇰',     // Islas Malvinas
        'BZ': '🇧🇿',     // Belice
        'GT': '🇬🇹',     // Guatemala
        'SV': '🇸🇻',     // El Salvador
        'HN': '🇭🇳',     // Honduras
        'NI': '🇳🇮',     // Nicaragua
        'CR': '🇨🇷',     // Costa Rica
        'PA': '🇵🇦',     // Panamá
        'PM': '🇵🇲',     // San Pedro y Miquetón
        'HT': '🇭🇹',     // Haití
        'GP': '🇬🇵',     // Guadalupe
        'BO': '🇧🇴',     // Bolivia
        'GY': '🇬🇾',     // Guyana
        'EC': '🇪🇨',     // Ecuador
        'GF': '🇬🇫',     // Guayana Francesa
        'PY': '🇵🇾',     // Paraguay
        'MQ': '🇲🇶',     // Martinica
        'SR': '🇸🇷',     // Surinam
        'UY': '🇺🇾',     // Uruguay
        'BQ': '🇧🇶',     // Antillas Holandesas
        'TL': '🇹🇱',     // Timor Oriental
        'NU': '🇳🇺',     // Niue
        'BN': '🇧🇳',     // Brunei
        'NR': '🇳🇷',     // Nauru
        'PG': '🇵🇬',     // Papúa Nueva Guinea
        'TO': '🇹🇴',     // Tonga
        'SB': '🇸🇧',     // Islas Salomón
        'VU': '🇻🇺',     // Vanuatu
        'FJ': '🇫🇯',     // Fiji
        'PW': '🇵🇼',     // Palaos
        'WF': '🇼🇫',     // Wallis y Futuna
        'CK': '🇨🇰',     // Islas Cook
        'AS': '🇦🇸',     // Samoa Americana
        'WS': '🇼🇸',     // Samoa
        'KI': '🇰🇮',     // Kiribati
        'NC': '🇳🇨',     // Nueva Caledonia
        'TV': '🇹🇻',     // Tuvalu
        'PF': '🇵🇫',     // Polinesia Francesa
        'TK': '🇹🇰',     // Tokelau
        'FM': '🇫🇲',     // Micronesia
        'MH': '🇲🇭',     // Islas Marshall
        'KP': '🇰🇵',     // Corea del Norte
        'HK': '🇭🇰',     // Hong Kong
        'MO': '🇲🇴',     // Macao
        'KH': '🇰🇭',     // Camboya
        'LA': '🇱🇦',     // Laos
        'BD': '🇧🇩',     // Bangladesh
        'TW': '🇹🇼',     // Taiwán
        'MV': '🇲🇻',     // Maldivas
        'LB': '🇱🇧',     // Líbano
        'JO': '🇯🇴',     // Jordania
        'SY': '🇸🇾',     // Siria
        'IQ': '🇮🇶',     // Irak
        'KW': '🇰🇼',     // Kuwait
        'SA': '🇸🇦',     // Arabia Saudita
        'YE': '🇾🇪',     // Yemen
        'OM': '🇴🇲',     // Omán
        'PS': '🇵🇸',     // Palestina
        'AE': '🇦🇪',     // Emiratos Árabes Unidos
        'IL': '🇮🇱',     // Israel
        'BH': '🇧🇭',     // Bahrein
        'QA': '🇶🇦',     // Qatar
        'BT': '🇧🇹',     // Bután
        'MN': '🇲🇳',     // Mongolia
        'NP': '🇳🇵',     // Nepal
        'TJ': '🇹🇯',     // Tayikistán
        'TM': '🇹🇲',     // Turkmenistán
        'AZ': '🇦🇿',     // Azerbaiyán
        'GE': '🇬🇪',     // Georgia
        'KG': '🇰🇬',     // Kirguistán
        'UZ': '🇺🇿',     // Uzbekistán
    }
    
    return flagMap[countryCode] || '🌍'
}

// Función para extraer el código de país del número
function extractCountryCode(phoneNumber) {
    if (!phoneNumber) return '1'
    
    try {
        // Intenta parsear con +
        let parsed = parsePhoneNumber('+' + phoneNumber.replace(/\D/g, ''))
        
        if (!parsed || !parsed.country) {
            // Intenta sin +
            parsed = parsePhoneNumber(phoneNumber)
        }
        
        if (parsed && parsed.country) {
            return parsed.country
        }
    } catch (error) {
        // Fallback silencioso
    }
    
    return 'US'
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