const spamGroups = new Map()

async function spamCommand(sock, chatId, message, rawText) {
    try {
        const args = rawText.trim().split(/\s+/)
        const action = args[1]?.toLowerCase()

        // ===============================
        // MENÚ
        // ===============================

        if (!action) {
            const data = spamGroups.get(chatId)

            return await sock.sendMessage(chatId, {
                text:
`╭─〔 💬 𝐒𝐏𝐀𝐌 〕─╮

📌 Estado: ${data?.enabled ? '🟢 ON' : '🔴 OFF'}

Uso:

.spam <texto>
> Configurar y activar spam

.spam on
> Activar spam

.spam off
> Desactivar spam

Ejemplo:
.spam Hola soy pro

╰────────────────╯`
            }, { quoted: message })
        }

        // ===============================
        // OFF
        // ===============================

        if (action === 'off') {
            const data = spamGroups.get(chatId)

            if (data) {
                data.enabled = false
                spamGroups.set(chatId, data)
            } else {
                spamGroups.set(chatId, {
                    enabled: false,
                    message: ''
                })
            }

            await sock.sendMessage(chatId, {
                text: '🔴 Spam desactivado.'
            }, { quoted: message })

            return
        }

        // ===============================
        // ON
        // ===============================

        if (action === 'on') {
            const data = spamGroups.get(chatId)

            if (!data?.message) {
                await sock.sendMessage(chatId, {
                    text:
`⚠️ No hay ningún mensaje configurado.

Usa:
.spam Hola soy pro`
                }, { quoted: message })

                return
            }

            data.enabled = true
            spamGroups.set(chatId, data)

            await sock.sendMessage(chatId, {
                text:
`🟢 Spam activado.

📝 Mensaje:
${data.message}`
            }, { quoted: message })

            return
        }

        // ===============================
        // CONFIGURAR MENSAJE
        // ===============================

        const spamMessage = rawText
            .slice('.spam'.length)
            .trim()

        if (!spamMessage) {
            await sock.sendMessage(chatId, {
                text: '⚠️ Escribe el mensaje que quieres repetir.\n\nEjemplo:\n.spam Hola soy pro'
            }, { quoted: message })

            return
        }

        spamGroups.set(chatId, {
            enabled: true,
            message: spamMessage
        })

        await sock.sendMessage(chatId, {
            text:
`🟢 Spam activado.

📝 Mensaje:
${spamMessage}

Ahora responderé automáticamente a los mensajes del grupo.`
        }, { quoted: message })

    } catch (error) {
        console.error('❌ Error en spamCommand:', error)
    }
}


// ======================================
// OBTENER CONFIGURACIÓN
// ======================================

function getSpamConfig(chatId) {
    return spamGroups.get(chatId)
}


module.exports = {
    spamCommand,
    getSpamConfig
}