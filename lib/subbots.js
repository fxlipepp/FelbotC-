const fs = require('fs');
const path = require('path');
const pino = require('pino');
const NodeCache = require('node-cache');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    jidNormalizedUser
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const { handleRecruitmentMessage } = require('./recruitmentDetector');

const SESSION_DIR = path.join(process.cwd(), 'session_subbot_recruitment');
let subbotSock = null;
let starting = null;

function sessionExists() {
    return fs.existsSync(path.join(SESSION_DIR, 'creds.json'));
}

function getSubbotStatus() {
    return {
        connected: Boolean(subbotSock?.user),
        linked: sessionExists(),
        number: subbotSock?.user?.id ? jidNormalizedUser(subbotSock.user.id).split('@')[0] : null
    };
}

async function createRecruitmentSubbot({ requestPairing = false, phoneNumber = '' } = {}) {
    if (starting) return starting;
    if (subbotSock?.user) return subbotSock;

    starting = (async () => {
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
        const { version } = await fetchLatestBaileysVersion();
        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ['Felbot Subbot', 'Chrome', '1.0.0'],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' }))
            },
            markOnlineOnConnect: true,
            syncFullHistory: false,
            msgRetryCounterCache: new NodeCache(),
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000
        });
        subbotSock = sock;
        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
            if (connection === 'open') {
                console.log('[SUBBOT] Reclutamiento conectado:', sock.user?.id || 'desconocido');
            }
            if (connection === 'close') {
                const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.error('[SUBBOT] CONEXIÓN CERRADA:', JSON.stringify({ statusCode, shouldReconnect, error: lastDisconnect?.error?.message || String(lastDisconnect?.error || '') }));
                subbotSock = null;
                if (shouldReconnect) setTimeout(() => createRecruitmentSubbot().catch(e => console.error('[SUBBOT] Error reconectando:', e.message)), 5000);
            }
        });

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            for (const message of messages) {
                try {
                    if (!message?.message || message?.key?.remoteJid === 'status@broadcast') continue;
                    const chatId = message.key?.remoteJid;
                    const senderJid = message.key?.participant || message.participant || message.key?.participantAlt || message.participantAlt || chatId;
                    await handleRecruitmentMessage(sock, message, chatId, senderJid);
                } catch (error) {
                    console.error('[SUBBOT] Error procesando mensaje:', error.message);
                }
            }
        });

        if (requestPairing && !state.creds.registered) {
            const phone = String(phoneNumber || '').replace(/[^0-9]/g, '');
            if (!phone) throw new Error('Debes indicar el número del subbot.');
            await new Promise(resolve => setTimeout(resolve, 2500));
            if (subbotSock !== sock) throw new Error('La sesión del subbot se cerró antes de solicitar el código.');
            let code = await sock.requestPairingCode(phone);
            code = code?.match(/.{1,4}/g)?.join('-') || code;
            console.log('[SUBBOT] CÓDIGO DE VINCULACIÓN:', code);
        }
        return sock;
    })();
    try { return await starting; } finally { starting = null; }
}

async function startRecruitmentSubbot() {
    if (!sessionExists()) {
        console.log('[SUBBOT] Sin sesión vinculada. Usa .subbot conectar desde Felbot.');
        return null;
    }
    return createRecruitmentSubbot();
}

async function handleSubbotCommand(sock, chatId, message, userMessage) {
    const action = userMessage.trim().split(/\s+/)[1] || 'estado';
    if (action === 'estado') {
        const s = getSubbotStatus();
        await sock.sendMessage(chatId, { text: '🤖 SUBBOT DE RECLUTAMIENTO\n\n• Estado: ' + (s.connected ? '🟢 Conectado' : '🔴 Desconectado') + '\n• Sesión: ' + (s.linked ? '💾 Vinculada' : '❌ Sin vincular') + '\n• Número: ' + (s.number || 'No conectado') + '\n\n.subbot conectar\n.subbot estado' }, { quoted: message });
        return;
    }
    if (action === 'conectar') {
        if (sessionExists()) {
            if (!getSubbotStatus().connected) await createRecruitmentSubbot();
            await sock.sendMessage(chatId, { text: '⚠️ El subbot ya tiene una sesión vinculada. Si quieres cambiar de número, elimina session_subbot_recruitment y vuelve a usar .subbot conectar.' }, { quoted: message });
            return;
        }
        const phoneNumber = userMessage.trim().split(/\s+/)[2] || '';
        if (!/^\d{10,15}$/.test(phoneNumber)) {
            await sock.sendMessage(chatId, { text: '📱 Debes indicar el número del segundo WhatsApp en formato internacional, solo números.\n\nEjemplo:\n.subbot conectar 573001234567' }, { quoted: message });
            return;
        }
        await createRecruitmentSubbot({ requestPairing: true, phoneNumber });
        await sock.sendMessage(chatId, { text: '🔗 CÓDIGO DEL SUBBOT\n\nEl código de vinculación apareció en la consola de Sky.\nBusca [SUBBOT] CÓDIGO DE VINCULACIÓN y úsalo en el WhatsApp del número ' + phoneNumber + '.\n\nEse número quedará dedicado únicamente al detector de reclutamiento.' }, { quoted: message });
        return;
    }
    await sock.sendMessage(chatId, { text: '❌ Usa .subbot conectar o .subbot estado' }, { quoted: message });
}

module.exports = { startRecruitmentSubbot, handleSubbotCommand, getSubbotStatus };