const isAdmin = require('../lib/isAdmin')

// Función para obtener bandera por código de país
function getCountryFlag(countryCode) {
    const flagMap = {
        '1': '🇺🇸',     // USA, Canadá
        '7': '🇷🇺',     // Rusia
        '20': '🇪🇬',    // Egipto
        '27': '🇿🇦',    // Sudáfrica
        '30': '🇬🇷',    // Grecia
        '31': '🇳🇱',    // Países Bajos
        '32': '🇧🇪',    // Bélgica
        '33': '🇫🇷',    // Francia
        '34': '🇪🇸',    // España
        '36': '🇭🇺',    // Hungría
        '39': '🇮🇹',    // Italia
        '40': '🇷🇴',    // Rumania
        '41': '🇨🇭',    // Suiza
        '43': '🇦🇹',    // Austria
        '44': '🇬🇧',    // Reino Unido
        '45': '🇩🇰',    // Dinamarca
        '46': '🇸🇪',    // Suecia
        '47': '🇳🇴',    // Noruega
        '48': '🇵🇱',    // Polonia
        '49': '🇩🇪',    // Alemania
        '51': '🇵🇪',    // Perú
        '52': '🇲🇽',    // México
        '53': '🇨🇺',    // Cuba
        '54': '🇦🇷',    // Argentina
        '55': '🇧🇷',    // Brasil
        '56': '🇨🇱',    // Chile
        '57': '🇨🇴',    // Colombia
        '58': '🇻🇪',    // Venezuela
        '60': '🇲🇾',    // Malasia
        '61': '🇦🇺',    // Australia
        '62': '🇮🇩',    // Indonesia
        '63': '🇵🇭',    // Filipinas
        '64': '🇳🇿',    // Nueva Zelanda
        '65': '🇸🇬',    // Singapur
        '66': '🇹🇭',    // Tailandia
        '81': '🇯🇵',    // Japón
        '82': '🇰🇷',    // Corea del Sur
        '84': '🇻🇳',    // Vietnam
        '86': '🇨🇳',    // China
        '90': '🇹🇷',    // Turquía
        '91': '🇮🇳',    // India
        '92': '🇵🇰',    // Pakistán
        '93': '🇦🇫',    // Afganistán
        '94': '🇱🇰',    // Sri Lanka
        '95': '🇲🇲',    // Myanmar
        '98': '🇮🇷',    // Irán
        '212': '🇲🇦',   // Marruecos
        '213': '🇩🇿',   // Argelia
        '216': '🇹🇳',   // Túnez
        '234': '🇳🇬',   // Nigeria
        '254': '🇰🇪',   // Kenia
        '256': '🇺🇬',   // Uganda
        '358': '🇫🇮',   // Finlandia
        '359': '🇧🇬',   // Bulgaria
        '370': '🇱🇹',   // Lituania
        '371': '🇱🇻',   // Letonia
        '372': '🇪🇪',   // Estonia
        '373': '🇲🇩',   // Moldavia
        '374': '🇦🇲',   // Armenia
        '375': '🇧🇾',   // Bielorrusia
        '376': '🇦🇩',   // Andorra
        '377': '🇲🇨',   // Mónaco
        '378': '🇸🇲',   // San Marino
        '380': '🇺🇦',   // Ucrania
        '381': '🇷🇸',   // Serbia
        '382': '🇲🇪',   // Montenegro
        '383': '🇽🇰',   // Kosovo
        '385': '🇭🇷',   // Croacia
        '386': '🇸🇮',   // Eslovenia
        '387': '🇧🇦',   // Bosnia
        '389': '🇲🇰',   // Macedonia
        '420': '🇨🇿',   // República Checa
        '421': '🇸🇰',   // Eslovaquia
        '423': '🇱🇮',   // Liechtenstein
        '500': '🇫🇰',   // Islas Malvinas
        '501': '🇧🇿',   // Belice
        '502': '🇬🇹',   // Guatemala
        '503': '🇸🇻',   // El Salvador
        '504': '🇭🇳',   // Honduras
        '505': '🇳🇮',   // Nicaragua
        '506': '🇨🇷',   // Costa Rica
        '507': '🇵🇦',   // Panamá
        '508': '🇵🇲',   // San Pedro y Miquetón
        '509': '🇭🇹',   // Haití
        '590': '🇬🇵',   // Guadalupe
        '591': '🇧🇴',   // Bolivia
        '592': '🇬🇾',   // Guyana
        '593': '🇪🇨',   // Ecuador
        '594': '🇬🇫',   // Guayana Francesa
        '595': '🇵🇾',   // Paraguay
        '596': '🇲🇶',   // Martinica
        '597': '🇸🇷',   // Surinam
        '598': '🇺🇾',   // Uruguay
        '599': '🇧🇶',   // Antillas Holandesas
        '670': '🇹🇱',   // Timor Oriental
        '672': '🇳🇺',   // Niue
        '673': '🇧🇳',   // Brunei
        '674': '🇳🇷',   // Nauru
        '675': '🇵🇬',   // Papúa Nueva Guinea
        '676': '🇹🇴',   // Tonga
        '677': '🇸🇧',   // Islas Salomón
        '678': '🇻🇺',   // Vanuatu
        '679': '🇫🇯',   // Fiji
        '680': '🇵🇼',   // Palaos
        '681': '🇼🇫',   // Wallis y Futuna
        '682': '🇨🇰',   // Islas Cook
        '683': '🇳🇺',   // Niue
        '684': '🇦🇸',   // Samoa Americana
        '685': '🇼🇸',   // Samoa
        '686': '🇰🇮',   // Kiribati
        '687': '🇳🇨',   // Nueva Caledonia
        '688': '🇹🇻',   // Tuvalu
        '689': '🇵🇫',   // Polinesia Francesa
        '690': '🇹🇰',   // Tokelau
        '691': '🇫🇲',   // Micronesia
        '692': '🇲🇭',   // Islas Marshall
        '850': '🇰🇵',   // Corea del Norte
        '852': '🇭🇰',   // Hong Kong
        '853': '🇲🇴',   // Macao
        '855': '🇰🇭',   // Camboya
        '856': '🇱🇦',   // Laos
        '880': '🇧🇩',   // Bangladesh
        '886': '🇹🇼',   // Taiwán
        '960': '🇲🇻',   // Maldivas
        '961': '🇱🇧',   // Líbano
        '962': '🇯🇴',   // Jordania
        '963': '🇸🇾',   // Siria
        '964': '🇮🇶',   // Irak
        '965': '🇰🇼',   // Kuwait
        '966': '🇸🇦',   // Arabia Saudita
        '967': '🇾🇪',   // Yemen
        '968': '🇴🇲',   // Omán
        '970': '🇵🇸',   // Palestina
        '971': '🇦🇪',   // Emiratos Árabes Unidos
        '972': '🇮🇱',   // Israel
        '973': '🇧🇭',   // Bahrein
        '974': '🇶🇦',   // Qatar
        '975': '🇧🇹',   // Bután
        '976': '🇲🇳',   // Mongolia
        '977': '🇳🇵',   // Nepal
        '992': '🇹🇯',   // Tayikistán
        '993': '🇹🇲',   // Turkmenistán
        '994': '🇦🇿',   // Azerbaiyán
        '995': '🇬🇪',   // Georgia
        '996': '🇰🇬',   // Kirguistán
        '998': '🇺🇿',   // Uzbekistán
    }
    
    return flagMap[countryCode] || '🌍'
}

// Función para extraer el código de país del número
function extractCountryCode(phoneNumber) {
    if (!phoneNumber) return '1'
    
    // Extrae solo los dígitos iniciales hasta encontrar un patrón válido
    const digits = phoneNumber.replace(/\D/g, '')
    
    // Intenta códigos de 3 dígitos primero, luego 2, luego 1
    if (digits.length >= 3) {
        const code3 = digits.substring(0, 3)
        if (['212', '213', '216', '234', '254', '256', '358', '359', '370', '371', '372', '373', '374', '375', '376', '377', '378', '380', '381', '382', '383', '385', '386', '387', '389', '420', '421', '423', '500', '501', '502', '503', '504', '505', '506', '507', '508', '509', '590', '591', '592', '593', '594', '595', '596', '597', '598', '599', '670', '672', '673', '674', '675', '676', '677', '678', '679', '680', '681', '682', '683', '684', '685', '686', '687', '688', '689', '690', '691', '692', '850', '852', '853', '855', '856', '880', '886', '960', '961', '962', '963', '964', '965', '966', '967', '968', '970', '971', '972', '973', '974', '975', '976', '977', '992', '993', '994', '995', '996', '998'].includes(code3)) {
            return code3
        }
    }
    
    if (digits.length >= 2) {
        const code2 = digits.substring(0, 2)
        if (['20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', '58', '60', '61', '62', '63', '64', '65', '66', '81', '82', '84', '86', '90', '91', '92', '93', '94', '95', '98'].includes(code2)) {
            return code2
        }
    }
    
    return digits.substring(0, 1) || '1'
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