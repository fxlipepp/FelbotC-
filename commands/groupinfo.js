async function groupInfoCommand(sock, chatId, msg) {
    try {

        const groupMetadata = await sock.groupMetadata(chatId);

        // 📸 Foto de perfil del grupo
        let pp;
        try {
            pp = await sock.profilePictureUrl(chatId, 'image');
        } catch {
            // ⚠️ fallback (Pinterest no funciona directo, así que uso proxy seguro)
            pp = 'https://i.imgur.com/2wzGhpF.jpeg';
        }

        const participants = groupMetadata.participants;

        const admins = participants.filter(p => p.admin);

        const listAdmins = admins.length
            ? admins.map((v, i) => `┃ ${i + 1}. @${v.id.split('@')[0]}`).join('\n')
            : '┃ No hay admins raros aquí 💀';

        const owner =
            groupMetadata.owner ||
            admins.find(p => p.admin === 'superadmin')?.id ||
            chatId.split('-')[0] + '@s.whatsapp.net';

        const text = `
╭━━━〔 💎 INFO DEL GRUPO 〕━━━╮

┃ 📛 Nombre:
┃ ${groupMetadata.subject}

┃ 🆔 ID:
┃ ${groupMetadata.id}

┃ 👥 Miembros:
┃ ${participants.length}

┃ 👑 Owner:
┃ @${owner.split('@')[0]}

┃ 🛡️ Admins:
${listAdmins}

┃ 📝 Descripción:
┃ ${groupMetadata.desc?.toString() || 'Sin descripción 😹'}

╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim();

        await sock.sendMessage(chatId, {
            image: { url: pp },
            caption: text,
            mentions: [...admins.map(v => v.id), owner]
        });

    } catch (error) {
        console.error('Error groupinfo:', error);

        await sock.sendMessage(chatId, {
            text: '❌ No pude obtener la info del grupo, algo anda mal 💀'
        });
    }
}

module.exports = groupInfoCommand;