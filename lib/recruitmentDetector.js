const fs = require('fs');
const path = require('path');
const settings = require('../settings');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'recruitment_contacts.json');

const DEFAULT_CONFIG = {
    enabled: true,
    minParticipants: 100,
    promoCooldownMs: 7 * 24 * 60 * 60 * 1000,
    declineCooldownMs: 30 * 24 * 60 * 60 * 1000,
    replyWindowMs: 72 * 60 * 60 * 1000,
    groupSizeCacheMs: 5 * 60 * 1000,
    scoreThreshold: 3,

    // Palabras que, por sí solas, NO deben disparar la promoción.
    weakSignals: [
        'fem', 'fems', 'clan'
    ],

    gameSignals: [
        /\bapostad[oa]s?\b/i,
        /\baposta\b/i,
        /\bapost\b/i,
        /\binfi\b/i,
        /\bscrim\b/i,
        /\bcuadri\b/i,
        /\bhexagonal\b/i,
        /\b(?:2|3|4|6|8)\s*v(?:s)?\s*(?:2|3|4|6|8)\b/i,
        /\b(?:2|3|4|6|8)v(?:s)?(?:2|3|4|6|8)\b/i,
        /\bversus\b/i
    ],

    organizationSignals: [
        /\borganizar\b/i,
        /\borganizaci[oó]n\b/i,
        /\borganizando\b/i,
        /\borganicen\b/i,
        /\borganiza(?:r)?\s+vs\b/i,
        /\bsaquen?\s+(?:scrim|cuadri|infi|hexagonal)\b/i,
        /\barm(?:ar|en|amos)\s+vs\b/i
    ],

    recruitmentSignals: [
        /\bbusco\b/i,
        /\bbuscamos\b/i,
        /\bnecesito\b/i,
        /\bnecesitamos\b/i,
        /\breclut(?:ando|amiento|ar)\b/i,
        /\bse\s+busca\b/i,
        /\bgente\b/i,
        /\bpersonas\b/i,
        /\bnin[oa]s?\b/i,
        /\bayud(?:ar|en|enme)\b/i,
        /\bfem(?:s)?\b/i
    ],

    genericIgnore: [
        /\bllenen\s+grupos\b/i,
        /\bgrupos\s+full\s+spam\b/i
    ],

    noInterest: [
        /\bno\s+me\s+interesa\b/i,
        /\bno\s+gracias\b/i,
        /\bgracias\s+pero\s+no\b/i,
        /\bpaso\b/i,
        /\bno\s+estoy\s+interesad[oa]\b/i,
        /\bahorita\s+no\b/i
    ],

    interest: [
        /\bme\s+interesa\b/i,
        /\binteresad[oa]\b/i,
        /\binfo\b/i,
        /\binformaci[oó]n\b/i,
        /\bprecio\b/i,
        /\bprecios\b/i,
        /\bcu[aá]nto\b/i,
        /\bcu[aá]nto\s+cuesta\b/i,
        /\bc[oó]mo\s+funciona\b/i,
        /\bquiero\s+info\b/i,
        /\bquiero\s+el\s+bot\b/i
    ]
};

const groupSizeCache = new Map();

function ensureDataFile() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ users: {} }, null, 2));
    }
}

function readData() {
    ensureDataFile();
    try {
        const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        return parsed && typeof parsed === 'object' ? parsed : { users: {} };
    } catch {
        return { users: {} };
    }
}

function writeData(data) {
    ensureDataFile();
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, DATA_FILE);
}

function normalizeText(text = '') {
    return String(text)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[“”‘’]/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function getText(message) {
    const content = message?.message || {};
    return (
        content.conversation ||
        content.extendedTextMessage?.text ||
        content.imageMessage?.caption ||
        content.videoMessage?.caption ||
        content.documentMessage?.caption ||
        content.buttonsResponseMessage?.selectedDisplayText ||
        content.listResponseMessage?.title ||
        ''
    );
}

function getContentType(message) {
    const content = message?.message || {};
    if (content.imageMessage) return 'IMAGEN';
    if (content.videoMessage) return 'VIDEO';
    if (content.audioMessage) return 'AUDIO';
    if (content.documentMessage) return 'DOCUMENTO';
    if (content.stickerMessage) return 'STICKER';
    if (content.locationMessage) return 'UBICACION';
    if (content.contactMessage || content.contactsArrayMessage) return 'CONTACTO';
    if (content.pollCreationMessageV3 || content.pollCreationMessage) return 'ENCUESTA';
    if (content.reactionMessage) return 'REACCION';
    if (content.conversation || content.extendedTextMessage) return 'TEXTO';
    return 'OTRO';
}

function matchesAny(text, patterns) {
    return patterns.some(pattern => pattern.test(text));
}

function detectRecruitment(text) {
    const normalized = normalizeText(text);
    if (!normalized || normalized.length < 4) {
        return { detected: false, score: 0, reason: 'empty' };
    }

    if (matchesAny(normalized, DEFAULT_CONFIG.genericIgnore) && normalized.length < 80) {
        return { detected: false, score: 0, reason: 'generic-ignore' };
    }

    const gameHits = DEFAULT_CONFIG.gameSignals.filter(p => p.test(normalized)).length;
    const orgHits = DEFAULT_CONFIG.organizationSignals.filter(p => p.test(normalized)).length;
    const recruitmentHits = DEFAULT_CONFIG.recruitmentSignals.filter(p => p.test(normalized)).length;
    const clanHit = /\bclan(?:es)?\b/i.test(normalized) ? 1 : 0;
    const weakOnly = matchesAny(normalized, DEFAULT_CONFIG.weakSignals.map(w => new RegExp('\\b' + w + '\\b', 'i')));

    const categories = [
        gameHits > 0,
        orgHits > 0,
        recruitmentHits > 0,
        clanHit > 0
    ].filter(Boolean).length;

    const score =
        Math.min(gameHits, 4) * 2 +
        Math.min(orgHits, 3) * 2 +
        Math.min(recruitmentHits, 3) +
        clanHit;

    // Contexto obligatorio: una palabra débil no basta.
    const contextual =
        (gameHits > 0 && (orgHits > 0 || recruitmentHits > 0)) ||
        (orgHits > 0 && recruitmentHits > 0) ||
        (orgHits > 0 && clanHit > 0) ||
        (gameHits >= 2 && (clanHit > 0 || recruitmentHits > 0));

    return {
        detected: contextual && score >= DEFAULT_CONFIG.scoreThreshold,
        score,
        categories,
        gameHits,
        orgHits,
        recruitmentHits,
        clanHit,
        weakOnly
    };
}

async function getGroupParticipantCount(sock, chatId) {
    const cached = groupSizeCache.get(chatId);
    if (cached && Date.now() - cached.time < DEFAULT_CONFIG.groupSizeCacheMs) {
        return cached.count;
    }

    try {
        const metadata = await sock.groupMetadata(chatId);
        const count = Array.isArray(metadata?.participants) ? metadata.participants.length : 0;
        groupSizeCache.set(chatId, { count, time: Date.now() });
        return count;
    } catch (error) {
        console.error('[RECRUITMENT] No se pudo obtener el tamaño del grupo:', error.message);
        return null;
    }
}

function getOwnerJid() {
    const number = String(settings.ownerNumber || '').replace(/[^0-9]/g, '');
    return number ? number + '@s.whatsapp.net' : null;
}

function getSenderName(message, senderJid) {
    return message?.pushName || message?.verifiedBizName || String(senderJid || '').split('@')[0] || 'Usuario';
}

function isQuotedFromOurPromo(message, user) {
    const ctx =
        message?.message?.extendedTextMessage?.contextInfo ||
        message?.message?.imageMessage?.contextInfo ||
        message?.message?.videoMessage?.contextInfo ||
        message?.message?.audioMessage?.contextInfo ||
        message?.message?.documentMessage?.contextInfo ||
        {};

    const stanzaId = ctx?.stanzaId;
    if (!stanzaId) return false;

    return Array.isArray(user?.promoMessageIds) && user.promoMessageIds.includes(stanzaId);
}

function hasTextMatch(text, patterns) {
    return patterns.some(p => p.test(normalizeText(text)));
}

function trimHandledIds(user) {
    user.handledIncomingIds = Array.isArray(user.handledIncomingIds)
        ? user.handledIncomingIds.slice(-100)
        : [];
}

async function sendPromotion(sock, senderJid) {
    const data = readData();
    const now = Date.now();
    const user = data.users[senderJid] || {};

    if (user.declinedUntil && user.declinedUntil > now) return false;
    if (user.lastPromoAt && now - user.lastPromoAt < DEFAULT_CONFIG.promoCooldownMs) return false;

    const mainText = `╭━━━〔 🌌 𝐅𝐄𝐋𝐁𝐎𝐓 〕━━━╮
┃ ⚡ 𝐋𝐋𝐄𝐕𝐀 𝐓𝐔 𝐆𝐑𝐔𝐏𝐎 𝐀𝐋 𝐒𝐈𝐆𝐔𝐈𝐄𝐍𝐓𝐄 𝐍𝐈𝐕𝐄𝐋
╰━━━━━━━━━━━━━━━━━━╯

🤖 ¿Quieres un bot completo para tu grupo de WhatsApp?

🔥 𝐅𝐄𝐋𝐁𝐎𝐓 lleva todo lo que necesitas para darle más actividad y funciones a tu grupo:

✦ 🎵 Música y contenido multimedia
✦ 🧠 Funciones con IA
✦ 🎨 Stickers e imágenes
✦ 🛡️ Administración de grupos
✦ 🎮 Comandos de entretenimiento
✦ ⚡ Respuestas rápidas
✦ 🟢 Disponible 24/7
✦ 🔄 Actualizaciones constantes
✦ 💬 Atención personalizada
✦ 🛠️ Puedes proponer nuevas funciones y comandos

🎁 𝐏𝐑𝐎𝐌𝐎𝐂𝐈𝐎́𝐍 𝐄𝐒𝐏𝐄𝐂𝐈𝐀𝐋 𝟐𝐱𝟏
Tenemos promociones activas para grupos que quieran adquirir FELBOT.

🌐 ¿Quieres conocer la promoción?

🔥 𝐕𝐄𝐍𝐓𝐀𝐒 𝐅𝐗𝐋𝐁𝐎𝐓
[ENLACE DEL GRUPO OFICIAL]

╰━━━━━━━━━━━━━━━━━━╯
        夜 𝐅𝐄𝐋𝐁𝐎𝐓 夜`;

    const followup = '🎁 Por si te interesa para tus grupos, actualmente tenemos promociones 2x1. Si quieres conocer los detalles, responde a este mensaje y te atenderemos.';

    try {
        const sent = await sock.sendMessage(senderJid, { text: mainText });
        const sent2 = await sock.sendMessage(senderJid, { text: followup });

        data.users[senderJid] = {
            ...user,
            lastPromoAt: now,
            status: 'contacted',
            promoMessageIds: [
                ...(user.promoMessageIds || []),
                sent?.key?.id,
                sent2?.key?.id
            ].filter(Boolean).slice(-10),
            handledIncomingIds: user.handledIncomingIds || [],
            allowWindowReplies: true
        };

        writeData(data);
        return true;
    } catch (error) {
        console.error('[RECRUITMENT] Error enviando promoción:', error.message);
        return false;
    }
}

async function notifyOwner(sock, message, senderJid, responseText, type, status) {
    const ownerJid = getOwnerJid();
    if (!ownerJid) return;

    const name = getSenderName(message, senderJid);
    const cleanResponse = responseText ? responseText.slice(0, 3000) : '(sin texto)';

    const notification = `📥 NUEVO INTERESADO

👤 Usuario: ${name}
📱 ID/Número: ${senderJid}

🎯 Estado: ${status}
📦 Tipo: ${type}
💬 Respuesta: ${cleanResponse}`;

    await sock.sendMessage(ownerJid, { text: notification }).catch(() => {});

    // Reenvío del mensaje original cuando Baileys puede conservar su contenido.
    try {
        await sock.sendMessage(ownerJid, { forward: message, force: true });
    } catch (error) {
        console.log('[RECRUITMENT] No se pudo reenviar contenido:', error.message);
    }
}

async function handlePrivateReply(sock, message, senderJid) {
    if (!senderJid || senderJid.endsWith('@g.us') || message?.key?.fromMe) return false;

    const data = readData();
    const user = data.users[senderJid];
    if (!user || !user.lastPromoAt) return false;

    const now = Date.now();
    if (user.declinedUntil && user.declinedUntil > now) return true;
    if (now - user.lastPromoAt > DEFAULT_CONFIG.replyWindowMs) return false;

    const incomingId = message?.key?.id;
    trimHandledIds(user);
    if (incomingId && user.handledIncomingIds.includes(incomingId)) return true;

    const text = getText(message);
    const type = getContentType(message);
    const quoted = isQuotedFromOurPromo(message, user);

    // Se considera respuesta válida si responde al mensaje promocional o está dentro
    // de la ventana activa de atención después de haber recibido la promoción.
    if (!quoted && !user.allowWindowReplies) return false;

    if (incomingId) user.handledIncomingIds.push(incomingId);

    if (hasTextMatch(text, DEFAULT_CONFIG.noInterest)) {
        await sock.sendMessage(senderJid, {
            text: 'Dale, no hay problema 😄\n¡Gracias igualmente por responder! Que estés bien. 👋'
        });

        user.status = 'declined';
        user.declinedUntil = now + DEFAULT_CONFIG.declineCooldownMs;
        user.allowWindowReplies = false;
        writeData(data);
        return true;
    }

    const interested = hasTextMatch(text, DEFAULT_CONFIG.interest) || type !== 'TEXTO';

    if (interested) {
        await sock.sendMessage(senderJid, {
            text: '👋 Hola, ¿cómo estás?\nGracias por comunicarte con 𝐅𝐗𝐋𝐁𝐎𝐓.\n\n📩 En un momento te comunicaremos con un administrador.'
        });

        user.status = 'interested';
        user.allowWindowReplies = false;
        writeData(data);

        await notifyOwner(sock, message, senderJid, text, type, 'INTERESADO');
        return true;
    }

    // Una respuesta de texto que no sea claramente negativa se trata como consulta.
    await sock.sendMessage(senderJid, {
        text: '👋 Hola, ¿cómo estás?\nGracias por comunicarte con 𝐅𝐗𝐋𝐁𝐎𝐓.\n\n📩 En un momento te comunicaremos con un administrador.'
    });

    user.status = 'interested';
    user.allowWindowReplies = false;
    writeData(data);

    await notifyOwner(sock, message, senderJid, text, type, 'INTERESADO');
    return true;
}

async function handleRecruitmentMessage(sock, message, chatId, senderJid) {
    if (!DEFAULT_CONFIG.enabled) return false;
    if (!chatId || !message) return false;

    // Privados: solo atendemos respuestas de personas a las que ya se les envió la promoción.
    if (!chatId.endsWith('@g.us')) {
        return await handlePrivateReply(sock, message, senderJid);
    }

    // El detector/promoción solo existe en grupos.
    if (message?.key?.fromMe) return true;

    const count = await getGroupParticipantCount(sock, chatId);

    // Si no pudimos comprobar el tamaño, no bloqueamos comandos por seguridad.
    if (count === null) return false;

    // IMPORTANTE: grupos de 100 o más quedan en modo silencioso para comandos.
    if (count < DEFAULT_CONFIG.minParticipants) return false;

    const text = getText(message);
    const result = detectRecruitment(text);

    if (result.detected) {
        await sendPromotion(sock, senderJid);
        console.log(`[RECRUITMENT] Detectado en ${chatId}: ${senderJid} | score=${result.score}`);
    }

    // En grupos de 100+ FELBOT no responde comandos ni mensajes de error.
    return true;
}

module.exports = {
    handleRecruitmentMessage,
    detectRecruitment,
    getGroupParticipantCount,
    config: DEFAULT_CONFIG
};
