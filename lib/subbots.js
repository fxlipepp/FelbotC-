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

function sessionRegistered() {
    try {
        const credsPath = path.join(SESSION_DIR, 'creds.json');
        if (!fs.existsSync(credsPath)) return false;
        return Boolean(JSON.parse(fs.readFileSync(credsPath, 'utf8'))?.registered);
    } catch {
        return false;
    }
}

function resetUnregisteredSession() {
    if (!sessionExists() || sessionRegistered()) return;
    try {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        console.log('[SUBBOT] Sesión incompleta anterior eliminada.');
    } catch (error) {
        console.error('[SUBBOT] No se pudo limpiar la sesión anterior:', error.message);
    }
}

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
        let pairingStarted = false;
        let pairingResolve;
        let pairingReject;
        const pairingPromise = requestPairing ? new Promise((resolve, reject) => { pairingResolve = resolve; pairingReject = reject; }) : null;
        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
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

        sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
            if (requestPairing && !state.creds.registered && !pairingStarted && (connection === 'connecting' || qr)) {
                pairingStarted = true;
                try {
                    const phone = String(phoneNumber || '').replace(/[^0-9]/g, '');
                    if (!/^\d{10,15}$/.test(phone)) throw new Error('Número inválido para vinculación.');
                    console.log('[SUBBOT] Socket listo para vinculación. Solicitando código...');
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    if (subbotSock !== sock || state.creds.registered) return;
                    let code = await sock.requestPairingCode(phone);
                    code = code?.match(/.{1,4}/g)?.join('-') || code;
                    console.log('[SUBBOT] CÓDIGO DE VINCULACIÓN:', code);
                    pairingResolve?.(code);
                } catch (error) {
                    console.error('[SUBBOT] Error solicitando código:', error.message);
                    pairingReject?.(error);
                }
            }
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
            const code = await Promise.race([
                pairingPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('WhatsApp no estuvo listo para generar el código. Reinicia Sky y vuelve a intentarlo.')), 25000))
            ]);
            sock.__subbotPairingCode = code;
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
        if (sessionExists() && !sessionRegistered()) {
            resetUnregisteredSession();
        }
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