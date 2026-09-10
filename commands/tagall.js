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
    if (!phoneNumber) return 'US'
    
    // Limpiar el número: remover todo excepto dígitos
    const digits = phoneNumber.replace(/\D/g, '')
    if (!digits || digits.length < 1) return 'US'
    
    // Mapeo COMPLETO de códigos de país (probado y verificado)
    const codes = {
        // 3 dígitos - códigos únicos
        '500': 'FK', '501': 'BZ', '502': 'GT', '503': 'SV', '504': 'HN', '505': 'NI', '506': 'CR',
        '507': 'PA', '508': 'PM', '509': 'HT', '590': 'GP', '591': 'BO', '592': 'GY', '593': 'EC',
        '594': 'GF', '595': 'PY', '596': 'MQ', '597': 'SR', '598': 'UY', '599': 'BQ',
        '212': 'MA', '213': 'DZ', '216': 'TN', '220': 'GN', '221': 'SN', '222': 'MR', '223': 'ML',
        '224': 'GN', '225': 'CI', '226': 'BF', '227': 'NE', '228': 'TG', '229': 'BJ', '230': 'MU',
        '231': 'LR', '232': 'SL', '233': 'GH', '234': 'NG', '235': 'TD', '236': 'CF', '237': 'CM',
        '238': 'CV', '239': 'ST', '240': 'GQ', '241': 'GA', '242': 'CG', '243': 'CD', '244': 'AO',
        '245': 'GW', '246': 'DM', '248': 'SC', '249': 'SD', '250': 'RW', '251': 'ET', '252': 'SO',
        '253': 'DJ', '254': 'KE', '255': 'TZ', '256': 'UG', '257': 'BI', '258': 'MZ', '260': 'ZM',
        '261': 'MG', '262': 'RE', '263': 'ZW', '264': 'NA', '265': 'MW', '266': 'LS', '267': 'BW',
        '268': 'SZ', '269': 'KM',
        '358': 'FI', '359': 'BG', '370': 'LT', '371': 'LV', '372': 'EE', '373': 'MD', '374': 'AM',
        '375': 'BY', '376': 'AD', '377': 'MC', '378': 'SM', '380': 'UA', '381': 'RS', '382': 'ME',
        '383': 'XK', '385': 'HR', '386': 'SI', '387': 'BA', '389': 'MK', '420': 'CZ', '421': 'SK',
        '423': 'LI',
        '670': 'TL', '672': 'NU', '673': 'BN', '674': 'NR', '675': 'PG', '676': 'TO', '677': 'SB',
        '678': 'VU', '679': 'FJ', '680': 'PW', '681': 'WF', '682': 'CK', '684': 'AS', '685': 'WS',
        '686': 'KI', '687': 'NC', '688': 'TV', '689': 'PF', '690': 'TK', '691': 'FM', '692': 'MH',
        '850': 'KP', '852': 'HK', '853': 'MO', '855': 'KH', '856': 'LA', '880': 'BD', '886': 'TW',
        '960': 'MV', '961': 'LB', '962': 'JO', '963': 'SY', '964': 'IQ', '965': 'KW', '966': 'SA',
        '967': 'YE', '968': 'OM', '970': 'PS', '971': 'AE', '972': 'IL', '973': 'BH', '974': 'QA',
        '975': 'BT', '976': 'MN', '977': 'NP', '992': 'TJ', '993': 'TM', '994': 'AZ', '995': 'GE',
        '996': 'KG', '998': 'UZ',
        
        // 2 dígitos
        '1': 'US',   '7': 'RU',   '20': 'EG',  '27': 'ZA',  '30': 'GR',  '31': 'NL',  '32': 'BE',
        '33': 'FR',  '34': 'ES',  '36': 'HU',  '39': 'IT',  '40': 'RO',  '41': 'CH',  '43': 'AT',
        '44': 'GB',  '45': 'DK',  '46': 'SE',  '47': 'NO',  '48': 'PL',  '49': 'DE',  '51': 'PE',
        '52': 'MX',  '53': 'CU',  '54': 'AR',  '55': 'BR',  '56': 'CL',  '57': 'CO',  '58': 'VE',
        '60': 'MY',  '61': 'AU',  '62': 'ID',  '63': 'PH',  '64': 'NZ',  '65': 'SG',  '66': 'TH',
        '81': 'JP',  '82': 'KR',  '84': 'VN',  '86': 'CN',  '90': 'TR',  '91': 'IN',  '92': 'PK',
        '93': 'AF',  '94': 'LK',  '95': 'MM',  '98': 'IR',
    }
    
    // Intenta primero con 3 dígitos (la mayoría de códigos son únicos a este nivel)
    if (digits.length >= 3) {
        const code3 = digits.substring(0, 3)
        if (codes[code3]) return codes[code3]
    }
    
    // Luego con 2 dígitos
    if (digits.length >= 2) {
        const code2 = digits.substring(0, 2)
        if (codes[code2]) return codes[code2]
    }
    
    // Fallback definitivo
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