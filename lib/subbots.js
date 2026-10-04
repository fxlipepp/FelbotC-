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
        subbotEvent('Sesión incompleta eliminada', 'se limpiará antes de una nueva vinculación', '🧹');
    } catch (error) {
        subbotEvent('No se pudo limpiar la sesión anterior', error.message, '❌');
    }
}

const SESSION_DIR = path.join(process.cwd(), 'session_subbot_recruitment');
let subbotSock = null;
let starting = null;

function subbotLog(title, details = '', icon = '🤖') {
    const line = '━'.repeat(58);
    console.log(`\\n╭${line}╮`);
    console.log(`┃ ${icon}  SUBBOT • ${title}`);
    if (details) {
        for (const row of String(details).split('\\n')) {
            console.log(`┃    ${row}`);
        }
    }
    console.log(`╰${line}╯\\n`);
}

function subbotEvent(title, details = '', icon = '•') {
    console.log(`[SUBBOT] ${icon} ${title}${details ? ' → ' + details : ''}`);
}

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
        let pendingCredSave = Promise.resolve();
        sock.ev.on('creds.update', () => {
            pendingCredSave = pendingCredSave.then(() => saveCreds()).catch(() => {});
        });

        sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr, isNewLogin }) => {
            if (requestPairing && !state.creds.registered && !pairingStarted && (connection === 'connecting' || qr)) {
                pairingStarted = true;
                try {
                    const phone = String(phoneNumber || '').replace(/[^0-9]/g, '');
                    if (!/^\d{10,15}$/.test(phone)) throw new Error('Número inválido para vinculación.');
                    subbotLog('VINCULACIÓN', 'Preparando conexión para solicitar código de WhatsApp...', '🔗');
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    if (subbotSock !== sock || state.creds.registered) return;
                    let code = await sock.requestPairingCode(phone);
                    code = code?.match(/.{1,4}/g)?.join('-') || code;
                    subbotLog('CÓDIGO DE VINCULACIÓN', 'Código: ' + code + '\\nIntroduce este código en el WhatsApp del número que estás vinculando.', '🔐');
                    pairingResolve?.(code);
                } catch (error) {
                    subbotLog('ERROR DE VINCULACIÓN', error.message, '❌');
                    pairingReject?.(error);
                }
            }
            if (isNewLogin) subbotLog('NÚMERO VINCULADO', 'La vinculación fue aceptada correctamente.', '✅');
            if (connection === 'open') {
                subbotLog('CONECTADO', 'Número: ' + (sock.user?.id || 'desconocido') + '\\nEstado: 🟢 Online\\nFunción: detector de reclutamiento', '🟢');
            }
            if (connection === 'close') {
                await pendingCredSave;
                const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
                const restartRequired = statusCode === DisconnectReason.restartRequired || statusCode === 515;
                const sessionInvalid = statusCode === 401 || statusCode === DisconnectReason.loggedOut;
                const shouldReconnect = !sessionInvalid;

                subbotLog('CONEXIÓN CERRADA',
                    'Código: ' + (statusCode || 'desconocido') +
                    '\\nReinicio requerido: ' + (restartRequired ? 'sí' : 'no') +
                    '\\nSesión inválida: ' + (sessionInvalid ? 'sí' : 'no') +
                    '\\nNúmero: ' + (sock.user?.id || 'desconocido'),
                    sessionInvalid ? '🔴' : '🟡'
                );

                if (subbotSock === sock) subbotSock = null;

                if (sessionInvalid) {
                    subbotLog('SESIÓN INVALIDADA', 'WhatsApp devolvió 401. No se intentará reconectar automáticamente.\\nAcción: vuelve a vincular el número con .subbot conectar.', '🔴');
                    return;
                }

                if (shouldReconnect) {
                    const delay = restartRequired ? 1000 : 5000;
                    setTimeout(() => {
                        if (subbotSock || starting) return;
                        createRecruitmentSubbot().catch(e =>
                            subbotEvent('Error reconectando', e.message, '❌')
                        );
                    }, delay);
                }
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
                    subbotEvent('Error procesando mensaje', error.message, '❌');
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
        subbotLog('SIN SESIÓN', 'No hay una sesión vinculada. Usa .subbot conectar desde Felbot.', '⚪');
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
            subbotEvent('Comando .subbot conectar', 'La sesión ya está vinculada.', 'ℹ️');
            await sock.sendMessage(chatId, { text: '⚠️ El subbot ya tiene una sesión vinculada. Si quieres cambiar de número, elimina session_subbot_recruitment y vuelve a usar .subbot conectar.' }, { quoted: message });
            return;
        }
        const phoneNumber = userMessage.trim().split(/\s+/)[2] || '';
        if (!/^\d{10,15}$/.test(phoneNumber)) {
            await sock.sendMessage(chatId, { text: '📱 Debes indicar el número del segundo WhatsApp en formato internacional, solo números.\n\nEjemplo:\n.subbot conectar 573001234567' }, { quoted: message });
            return;
        }
        subbotLog('NUEVA VINCULACIÓN', 'Número solicitado: ' + phoneNumber, '📱');
        await createRecruitmentSubbot({ requestPairing: true, phoneNumber });
        subbotEvent('Comando .subbot conectar', 'Código generado y proceso de vinculación iniciado.', '🔗');
        await sock.sendMessage(chatId, { text: '🔗 CÓDIGO DEL SUBBOT\n\nEl código de vinculación apareció en la consola de Sky.\nBusca [SUBBOT] CÓDIGO DE VINCULACIÓN y úsalo en el WhatsApp del número ' + phoneNumber + '.\n\nEse número quedará dedicado únicamente al detector de reclutamiento.' }, { quoted: message });
        return;
    }
    subbotEvent('Comando desconocido', userMessage, '⚠️');
    await sock.sendMessage(chatId, { text: '❌ Usa .subbot conectar o .subbot estado' }, { quoted: message });
}

module.exports = { startRecruitmentSubbot, handleSubbotCommand, getSubbotStatus };