const Group = require('../models/Group')

async function modoAdminCommand(sock, chatId, message, args) {

    if (!chatId.endsWith('@g.us')) {
        return await sock.sendMessage(chatId, {
            text: '❌ Este comando solo funciona en grupos.'
        }, { quoted: message })
    }

    const option = args[0]?.toLowerCase()

    if (!option) {
        return await sock.sendMessage(chatId, {
            text: `
╭─〔 👑 \`MODO ADMIN\` 〕─╮

✅ \`.modoadmin on\`
> Solo admins podrán usar comandos

❌ \`.modoadmin off\`
> Todos podrán usar comandos

╰──────────╯
`
        }, { quoted: message })
    }

    let group = await Group.findOne({ groupId: chatId })

    if (!group) {
        group = await Group.create({
            groupId: chatId
        })
    }

    if (option === 'on') {

        group.adminMode = true
        await group.save()

        return await sock.sendMessage(chatId, {
            text: '✅ \`Modo admin activado.\`'
        }, { quoted: message })
    }

    if (option === 'off') {

        group.adminMode = false
        await group.save()

        return await sock.sendMessage(chatId, {
            text: '❌ \`Modo admin desactivado.\`'
        }, { quoted: message })
    }

    return await sock.sendMessage(chatId, {
        text: '⚠️ \`Usa .modoadmin on/off\`'
    }, { quoted: message })
}

module.exports = modoAdminCommand