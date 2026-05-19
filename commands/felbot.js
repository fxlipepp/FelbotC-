const Group = require('../models/group')
const isOwnerOrSudo = require('../lib/isOwnerOrSudo')

module.exports = async (sock, msg, args, senderId, chatId) => {

    const isOwner = await isOwnerOrSudo(senderId, sock)

    if (!isOwner) {
        return sock.sendMessage(chatId, {
            text: '❌ Solo el owner puede usar este comando'
        })
    }

    const action = args[0]?.toLowerCase()

    let groupData = await Group.findOne({ groupId: chatId })
    if (!groupData) groupData = await Group.create({ groupId: chatId })

    if (!action) {
        return sock.sendMessage(chatId, {
            text: `⚙️ FELBOT SYSTEM

Estado: ${groupData.felbot.enabled ? '🟢 ON' : '🔴 OFF'}

👉 .felbot on
👉 .felbot off`
        })
    }

    if (action === 'on') {
        groupData.felbot.enabled = true
        await groupData.save()

        return sock.sendMessage(chatId, {
            text: '🟢 Felbot activado'
        })
    }

    if (action === 'off') {
        groupData.felbot.enabled = false
        await groupData.save()

        return sock.sendMessage(chatId, {
            text: '🔴 Felbot desactivado'
        })
    }

    return sock.sendMessage(chatId, {
        text: '❌ Usa .felbot on o .felbot off'
    })
}