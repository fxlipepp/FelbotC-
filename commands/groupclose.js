function parseDelay(value) {
    if (!value) return null

    const match = String(value).trim().toLowerCase().match(/^(\d+)(s|m|h|d)$/)
    if (!match) return false

    const amount = Number(match[1])
    if (!Number.isFinite(amount) || amount <= 0) return false

    const units = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    }

    const delay = amount * units[match[2]]

    // setTimeout has a maximum safe delay of about 24.8 days.
    if (delay > 2147483647) return false

    return {
        delay,
        value: `${amount}${match[2]}`
    }
}

async function groupCloseCommand(sock, chatId, message, action, delayArg) {

    try {

        const setting = {
            open: 'not_announcement',
            abrir: 'not_announcement',
            close: 'announcement',
            cerrar: 'announcement'
        }[action]

        if (!setting) return

        const hasDelay = Boolean(delayArg)
        const parsedDelay = parseDelay(delayArg)

        if (hasDelay && !parsedDelay) {
            await sock.sendMessage(chatId, {
                text: '❌ *Tiempo inválido.*\\n\\nUsa formatos como: \`.cerrar 10s\`, \`.cerrar 5m\`, \`.cerrar 1h\` o \`.cerrar 1d\`.'
            }, {
                quoted: message
            })
            return
        }

        if (parsedDelay) {
            const isClosing = setting === 'announcement'
            const actionText = isClosing
                ? 'cerrará'
                : 'se abrirá'

            await sock.sendMessage(chatId, {
                text: `⏱️ *Programado*\\n\\nEl grupo ${actionText} en *${parsedDelay.value}*.`
            }, {
                quoted: message
            })

            setTimeout(async () => {
                try {
                    await sock.groupSettingUpdate(chatId, setting)

                    await sock.sendMessage(chatId, {
                        text: isClosing
                            ? '🔒 *El grupo ha sido cerrado.*\\nSólo los admins pueden escribir.'
                            : '🔓 *El grupo ha sido abierto.*\\nYa pueden escribir todos.'
                    })
                } catch (err) {
                    console.log('Scheduled Group Close Error:', err)

                    try {
                        await sock.sendMessage(chatId, {
                            text: '❌ *No pude ejecutar el cierre/apertura programado del grupo.*'
                        })
                    } catch {}
                }
            }, parsedDelay.delay)

            return
        }

        await sock.groupSettingUpdate(
            chatId,
            setting
        )

        if (setting === 'not_announcement') {

            await sock.sendMessage(chatId, {
                text: '❀ *Ya pueden escribir en este grupo.*'
            }, {
                quoted: message
            })

        } else {

            await sock.sendMessage(chatId, {
                text: '❀ *Sólo los admins pueden escribir en este grupo.*'
            }, {
                quoted: message
            })

        }

    } catch (err) {

        console.log('Group Close Error:', err)

        await sock.sendMessage(chatId, {
            text: '❌ Error cambiando la configuración del grupo.'
        }, {
            quoted: message
        })
    }
}

module.exports = groupCloseCommand