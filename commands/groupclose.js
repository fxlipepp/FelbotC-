async function groupCloseCommand(sock, chatId, message, action) {

    try {

        const setting = {
            open: 'not_announcement',
            abrir: 'not_announcement',
            close: 'announcement',
            cerrar: 'announcement'
        }[action]

        if (!setting) return

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