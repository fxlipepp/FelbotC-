const settings = require('../settings');
const { ButtonV2 } = require('../lib/airich');
const { clearTmpDirectory } = require('./cleartmp');
const updateCommand = require('./update');

function getRestartMessage() {
    const { execSync } = require('child_process');
    try {
        execSync('command -v pm2', { stdio: 'ignore' });
        return '🔄 Reiniciando Felbot con el gestor del host...';
    } catch {
        return '🔄 Felbot se está reiniciando para aplicar los cambios...';
    }
}

function normalize(id = '') {
    return id.toString().split(':')[0].split('@')[0].trim();
}

function isOwnerPanelAction(senderId, sock = null) {
    const ownerNumber = normalize(settings.ownerNumber);
    const ownerLid = normalize(settings.ownerLid);
    const senderClean = normalize(senderId);

    if (senderClean === ownerNumber) return true;
    if (senderId === settings.ownerLid || senderClean === ownerLid) return true;

    if (sock?.user?.lid) {
        const botLid = normalize(sock.user.lid);
        if (senderClean === botLid) return true;
    }

    return false;
}

function getPanelAction(buttonId) {
    const value = String(buttonId || '').trim();
    if (!value.startsWith('panel::')) return null;
    const action = value.replace(/^panel::/, '');
    return ['clear', 'restart', 'update'].includes(action) ? action : null;
}

async function panelCommand(sock, chatId, message) {
    const senderId = message.key?.participant || message.key?.remoteJid;

    if (!isOwnerPanelAction(senderId, sock)) {
        await sock.sendMessage(chatId, {
            text: '🚫 Solo el owner del bot puede usar este panel.'
        }, { quoted: message });
        return;
    }

    const panel = new ButtonV2(sock)
        .setBody(`｡ ﾟ･ ｡ 夜 ｡ ﾟ･ ｡\n\n*PANEL DE FELBOT*\n\n｡ ﾟ･ ｡ ﾟ ･ ｡ ﾟ ･ ｡`)
        .setFooter('Felbot Control Center')
        .addButton('🧹 LIMPIAR', 'panel::clear')
        .addButton('🔄 REINICIAR', 'panel::restart')
        .addButton('⬆️ ACTUALIZAR', 'panel::update');

    await panel.send(chatId, { quoted: message });
}

async function handlePanelButton(sock, senderId, buttonId, message) {
    const action = getPanelAction(buttonId);
    const chatId = message.key?.remoteJid;

    if (!action) return;

    if (!isOwnerPanelAction(senderId, sock)) {
        await sock.sendMessage(chatId, {
            text: '🚫 Solo el owner del bot puede ejecutar esta acción.'
        }, { quoted: message });
        return;
    }

    switch (action) {
        case 'clear': {
            const result = await clearTmpDirectory();
            if (result.success) {
                await sock.sendMessage(chatId, {
                    text: `✅ ${result.message}`
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, {
                    text: `❌ ${result.message}`
                }, { quoted: message });
            }
            return;
        }
        case 'restart': {
            try {
                await sock.sendMessage(chatId, {
                    text: getRestartMessage()
                }, { quoted: message });
            } catch {}

            try {
                if (typeof updateCommand.restartProcess === 'function') {
                    await updateCommand.restartProcess(sock, chatId, message);
                    return;
                }
            } catch {}

            setTimeout(() => process.exit(0), 700);
            return;
        }
        case 'update': {
            await updateCommand(sock, chatId, message, '');
            return;
        }
        default:
            return;
    }
}

module.exports = {
    panelCommand,
    handlePanelButton,
    getPanelAction,
    isOwnerPanelAction,
};
