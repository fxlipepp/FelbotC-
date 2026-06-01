const { bots } = require('../lib/antilink');
const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '```For Group Admins Only!```' }, { quoted: message });
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(' ').filter(Boolean);
        const action = args[0];

        if (!action) {
            const usage = `\n╭─〔 🔒 𝖠𝗇𝗍𝗂𝗅𝗂𝗇𝗄 〕─╮\n\n> Sistema para controlar enlaces en el grupo\n\n✅ \`.antilink on\`\n> Activar: elimina enlaces publicados (solo admins pueden enviar enlaces)\n\n⚠️ \`.antilink kick\`\n> Modo advertencias: da 3 advertencias y al 3ro expulsa (también elimina enlaces)\n\n❌ \`.antilink off\`\n> Desactivar antilink\n\n📌 Nota:\n> Solo administradores pueden usar este comando y enviar enlaces.\n\n╰────────────────╯\n`;
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
            return;
        }

        if (action === 'on') {
            const existingConfig = await getAntilink(chatId, 'on');
            if (existingConfig?.enabled) {
                await sock.sendMessage(chatId, { text: '✨ Antilink ya está activado.' }, { quoted: message });
                return;
            }
            const result = await setAntilink(chatId, 'on', 'delete');
            await sock.sendMessage(chatId, { 
                text: result ? '✅ Antilink activado. Solo admins pueden enviar enlaces.' : '❌ Error al activar Antilink.'
            },{ quoted: message });
            return;
        }

        if (action === 'kick') {
            const result = await setAntilink(chatId, 'on', 'kick');
            await sock.sendMessage(chatId, { 
                text: result ? '⚠️ Antilink: modo *kick* activado. Se darán 3 avisos antes de expulsar.' : '❌ Error al configurar modo kick.'
            }, { quoted: message });
            return;
        }

        if (action === 'off') {
            await removeAntilink(chatId, 'on');
            await sock.sendMessage(chatId, { text: '🛑 Antilink desactivado.' }, { quoted: message });
            return;
        }

        if (action === 'get') {
            const cfg = await getAntilink(chatId, 'on');
            await sock.sendMessage(chatId, { 
                text: `📌 Antilink: ${cfg && cfg.enabled ? 'ACTIVO' : 'INACTIVO'}\nModo: ${cfg && cfg.action ? cfg.action : 'no definido'}`
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { text: `Usa ${prefix}antilink para ver la ayuda.` }, { quoted: message });
    } catch (error) {
        console.error('Error in antilink command:', error);
        await sock.sendMessage(chatId, { text: '*_Error processing antilink command_*' });
    }
}

async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    // Use the stored config (JSON/Mongo) to decide behavior
    const cfg = await getAntilink(chatId, 'on');
    if (!cfg || !cfg.enabled) return;

    const action = cfg.action || 'delete';

    const linkRegex = /https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/i;
    if (!linkRegex.test(userMessage || '')) return;

    // delete message
    try {
        await sock.sendMessage(chatId, { delete: message.key });
    } catch (err) {
        console.error('Error deleting message:', err);
    }

    // Friendly Spanish notices are handled in lib/antilink.Antilink when used by the main message pipeline.
    // Fallback: send a brief warning here too.
    const mentioned = [senderId];
    if (action === 'delete') {
        await sock.sendMessage(chatId, { text: `⚠️ @${senderId.split('@')[0]}, no se permiten enlaces aquí.`, mentions: mentioned });
    } else if (action === 'kick' || action === 'warn') {
        // increment warning via index helper so messages stay consistent
        try {
            const { incrementWarningCount, resetWarningCount } = require('../lib/index');
            const cfg = require('../config');
            const WARN = cfg.WARN_COUNT || 3;
            const count = await incrementWarningCount(chatId, senderId);
            if (count >= WARN) {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                await resetWarningCount(chatId, senderId);
                await sock.sendMessage(chatId, { text: `⚠️ \`\`\`@${senderId.split('@')[0]} expulsado tras ${WARN}/${WARN} avisos por enviar enlaces.\`\`\``, mentions: mentioned });
            } else {
                await sock.sendMessage(chatId, { text: `⚠️ \`\`\`@${senderId.split('@')[0]} advertencia ${count}/${WARN} por enviar enlaces.\`\`\``, mentions: mentioned });
            }
        } catch (err) {
            console.error('Error handling warn/kick flow:', err);
        }
    }
}

module.exports = {
    handleAntilinkCommand,
    handleLinkDetection,
};
