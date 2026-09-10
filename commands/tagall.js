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
        // Fallback a mapeo manual
    }
    
    // Fallback: mapeo manual de códigos de país por dígitos
    const digits = phoneNumber.replace(/\D/g, '')
    const countryCodeMap = {
        '1': 'US',    // USA, Canadá
        '7': 'RU',    // Rusia
        '20': 'EG',   // Egipto
        '27': 'ZA',   // Sudáfrica
        '30': 'GR',   // Grecia
        '31': 'NL',   // Países Bajos
        '32': 'BE',   // Bélgica
        '33': 'FR',   // Francia
        '34': 'ES',   // España
        '36': 'HU',   // Hungría
        '39': 'IT',   // Italia
        '40': 'RO',   // Rumania
        '41': 'CH',   // Suiza
        '43': 'AT',   // Austria
        '44': 'GB',   // Reino Unido
        '45': 'DK',   // Dinamarca
        '46': 'SE',   // Suecia
        '47': 'NO',   // Noruega
        '48': 'PL',   // Polonia
        '49': 'DE',   // Alemania
        '51': 'PE',   // Perú
        '52': 'MX',   // México
        '53': 'CU',   // Cuba
        '54': 'AR',   // Argentina
        '55': 'BR',   // Brasil
        '56': 'CL',   // Chile
        '57': 'CO',   // Colombia
        '58': 'VE',   // Venezuela
        '60': 'MY',   // Malasia
        '61': 'AU',   // Australia
        '62': 'ID',   // Indonesia
        '63': 'PH',   // Filipinas
        '64': 'NZ',   // Nueva Zelanda
        '65': 'SG',   // Singapur
        '66': 'TH',   // Tailandia
        '81': 'JP',   // Japón
        '82': 'KR',   // Corea del Sur
        '84': 'VN',   // Vietnam
        '86': 'CN',   // China
        '90': 'TR',   // Turquía
        '91': 'IN',   // India
        '92': 'PK',   // Pakistán
        '93': 'AF',   // Afganistán
        '94': 'LK',   // Sri Lanka
        '95': 'MM',   // Myanmar
        '98': 'IR',   // Irán
        '212': 'MA',  // Marruecos
        '213': 'DZ',  // Argelia
        '216': 'TN',  // Túnez
        '234': 'NG',  // Nigeria
        '254': 'KE',  // Kenia
        '256': 'UG',  // Uganda
        '358': 'FI',  // Finlandia
        '359': 'BG',  // Bulgaria
        '370': 'LT',  // Lituania
        '371': 'LV',  // Letonia
        '372': 'EE',  // Estonia
        '373': 'MD',  // Moldavia
        '374': 'AM',  // Armenia
        '375': 'BY',  // Bielorrusia
        '376': 'AD',  // Andorra
        '377': 'MC',  // Mónaco
        '378': 'SM',  // San Marino
        '380': 'UA',  // Ucrania
        '381': 'RS',  // Serbia
        '382': 'ME',  // Montenegro
        '383': 'XK',  // Kosovo
        '385': 'HR',  // Croacia
        '386': 'SI',  // Eslovenia
        '387': 'BA',  // Bosnia
        '389': 'MK',  // Macedonia
        '420': 'CZ',  // República Checa
        '421': 'SK',  // Eslovaquia
        '423': 'LI',  // Liechtenstein
        '500': 'FK',  // Islas Malvinas
        '501': 'BZ',  // Belice
        '502': 'GT',  // Guatemala
        '503': 'SV',  // El Salvador
        '504': 'HN',  // Honduras
        '505': 'NI',  // Nicaragua
        '506': 'CR',  // Costa Rica
        '507': 'PA',  // Panamá
        '508': 'PM',  // San Pedro y Miquetón
        '509': 'HT',  // Haití
        '590': 'GP',  // Guadalupe
        '591': 'BO',  // Bolivia
        '592': 'GY',  // Guyana
        '593': 'EC',  // Ecuador
        '594': 'GF',  // Guayana Francesa
        '595': 'PY',  // Paraguay
        '596': 'MQ',  // Martinica
        '597': 'SR',  // Surinam
        '598': 'UY',  // Uruguay
        '599': 'BQ',  // Antillas Holandesas
        '670': 'TL',  // Timor Oriental
        '672': 'NU',  // Niue
        '673': 'BN',  // Brunei
        '674': 'NR',  // Nauru
        '675': 'PG',  // Papúa Nueva Guinea
        '676': 'TO',  // Tonga
        '677': 'SB',  // Islas Salomón
        '678': 'VU',  // Vanuatu
        '679': 'FJ',  // Fiji
        '680': 'PW',  // Palaos
        '681': 'WF',  // Wallis y Futuna
        '682': 'CK',  // Islas Cook
        '684': 'AS',  // Samoa Americana
        '685': 'WS',  // Samoa
        '686': 'KI',  // Kiribati
        '687': 'NC',  // Nueva Caledonia
        '688': 'TV',  // Tuvalu
        '689': 'PF',  // Polinesia Francesa
        '690': 'TK',  // Tokelau
        '691': 'FM',  // Micronesia
        '692': 'MH',  // Islas Marshall
        '850': 'KP',  // Corea del Norte
        '852': 'HK',  // Hong Kong
        '853': 'MO',  // Macao
        '855': 'KH',  // Camboya
        '856': 'LA',  // Laos
        '880': 'BD',  // Bangladesh
        '886': 'TW',  // Taiwán
        '960': 'MV',  // Maldivas
        '961': 'LB',  // Líbano
        '962': 'JO',  // Jordania
        '963': 'SY',  // Siria
        '964': 'IQ',  // Irak
        '965': 'KW',  // Kuwait
        '966': 'SA',  // Arabia Saudita
        '967': 'YE',  // Yemen
        '968': 'OM',  // Omán
        '970': 'PS',  // Palestina
        '971': 'AE',  // Emiratos Árabes Unidos
        '972': 'IL',  // Israel
        '973': 'BH',  // Bahrein
        '974': 'QA',  // Qatar
        '975': 'BT',  // Bután
        '976': 'MN',  // Mongolia
        '977': 'NP',  // Nepal
        '992': 'TJ',  // Tayikistán
        '993': 'TM',  // Turkmenistán
        '994': 'AZ',  // Azerbaiyán
        '995': 'GE',  // Georgia
        '996': 'KG',  // Kirguistán
        '998': 'UZ',  // Uzbekistán
    }
    
    // Intenta de 3 dígitos primero
    if (digits.length >= 3) {
        const code3 = digits.substring(0, 3)
        if (countryCodeMap[code3]) return countryCodeMap[code3]
    }
    
    // Intenta de 2 dígitos
    if (digits.length >= 2) {
        const code2 = digits.substring(0, 2)
        if (countryCodeMap[code2]) return countryCodeMap[code2]
    }
    
    // Intenta de 1 dígito
    if (digits.length >= 1) {
        const code1 = digits.substring(0, 1)
        if (countryCodeMap[code1]) return countryCodeMap[code1]
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