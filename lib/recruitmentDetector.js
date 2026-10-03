const fs = require('fs');
const path = require('path');
const settings = require('../settings');
const mongoose = require('mongoose');
const RecruitmentContact = require('../models/RecruitmentContact');

const DEFAULT_CONFIG = {
    enabled: true,
    minParticipants: 0,
    promoCooldownMs: 7 * 24 * 60 * 60 * 1000,
    declineCooldownMs: 30 * 24 * 60 * 60 * 1000,
    replyWindowMs: 72 * 60 * 60 * 1000,
    groupSizeCacheMs: 5 * 60 * 1000,
    scoreThreshold: 1,

    weakSignals: ['fem', 'fems', 'clan'],

    gameSignals: [
        /\b(?:2|3|4|6|8)\s*v(?:s)?\s*(?:2|3|4|6|8)\b/i,
        /\b(?:2|3|4|6|8)\s*vs\s*(?:2|3|4|6|8)\b/i,
        /\b(?:2|3|4|6|8)v(?:s)?(?:2|3|4|6|8)\b/i,
        /\b(?:2|3|4|6|8)vs(?:2|3|4|6|8)\b/i,
        /\bapostad[oa]s?\b/i,
        /\baposta\b/i,
        /\bapost\b/i,
        /\binfi\b/i,
        /\bscrim\b/i,
        /\bcuadri\b/i,
        /\bhexagonal\b/i,
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
    ]
};

const groupSizeCache = new Map();

async function findContact(jid) {
    if (!jid) return null;
    try {
        return await RecruitmentContact.findOne({ jid }).lean();
    } catch (error) {
        console.error('[RECRUITMENT] Error buscando contacto:', error.message);
        return null;
    }
}

async function saveContact(jid, data = {}) {
    if (!jid) return null;
    try {
        const update = { ...data };
        delete update.jid;
        return await RecruitmentContact.findOneAndUpdate(
            { jid },
            { $set: update, $setOnInsert: { jid } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
    } catch (error) {
        console.error('[RECRUITMENT] Error guardando contacto:', error.message);
        return null;
    }
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
    if (!normalized || normalized.length < 2) return { detected: false, score: 0, reason: 'empty' };

    if (matchesAny(normalized, DEFAULT_CONFIG.genericIgnore) && normalized.length < 80) {
        return { detected: false, score: 0, reason: 'generic-ignore' };
    }

    const gameHits = DEFAULT_CONFIG.gameSignals.filter(p => p.test(normalized)).length;
    const orgHits = DEFAULT_CONFIG.organizationSignals.filter(p => p.test(normalized)).length;
    const recruitmentHits = DEFAULT_CONFIG.recruitmentSignals.filter(p => p.test(normalized)).length;
    const clanHit = /\bclan(?:es)?\b/i.test(normalized);

    const directGameHit = gameHits > 0;
    const contextual =
        directGameHit ||
        (orgHits > 0 && recruitmentHits > 0) ||
        (orgHits > 0 && clanHit) ||
        (gameHits >= 2 && (clanHit || recruitmentHits > 0));

    const score =
        Math.min(gameHits, 4) * 2 +
        Math.min(orgHits, 3) * 2 +
        Math.min(recruitmentHits, 3) +
        (clanHit ? 1 : 0);

    return {
        detected: contextual && score >= DEFAULT_CONFIG.scoreThreshold,
        score,
        categories: [gameHits > 0, orgHits > 0, recruitmentHits > 0, clanHit].filter(Boolean).length,
        gameHits,
        orgHits,
        recruitmentHits,
        clanHit: clanHit ? 1 : 0
    };
}

function getOwnerJid() {
    const number = String(settings.ownerNumber || '').replace(/[^0-9]/g, '');
    return number ? number + '@s.whatsapp.net' : null;
}

function getSenderName(message, senderJid) {
    return message?.pushName || message?.verifiedBizName || String(senderJid || '').split('@')[0] || 'Usuario';
}

function getPhoneNumber(message, senderJid) {
    const candidates = [
        message?.key?.participantAlt,
        message?.participantAlt,
        message?.key?.remoteJidAlt,
        message?.remoteJidAlt,
        senderJid
    ].filter(Boolean);

    for (const value of candidates) {
        const raw = String(value);
        if (raw.endsWith('@s.whatsapp.net')) {
            const number = raw.split('@')[0].replace(/[^0-9]/g, '');
            if (number) return number;
        }
    }

    const fallback = String(candidates[0] || '').split('@')[0].replace(/[^0-9]/g, '');
    return fallback || 'No disponible';
}

function isQuotedFromOurPromo(message, user) {
    const ctx =
        message?.message?.extendedTextMessage?.contextInfo ||
        message?.message?.imageMessage?.contextInfo ||
        message?.message?.videoMessage?.contextInfo ||
        message?.message?.audioMessage?.contextInfo ||
        message?.message?.documentMessage?.contextInfo ||
        {};

    return Boolean(
        ctx?.stanzaId &&
        Array.isArray(user?.promoMessageIds) &&
        user.promoMessageIds.includes(ctx.stanzaId)
    );
}

function hasTextMatch(text, patterns) {
    return patterns.some(p => p.test(normalizeText(text)));
}

async function sendPromotion(sock, senderJid, meta = {}) {
    const now = Date.now();
    const user = await findContact(senderJid);

    if (
        user?.lastPromoAt ||
        ['contacted', 'interested', 'declined', 'replied'].includes(user?.status)
    ) return false;

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

🎁 𝐏𝐑𝐎𝐌𝐎𝐂𝐈Ó𝐍 𝐄𝐒𝐏𝐄𝐂𝐈𝐀𝐋 𝟐𝐱𝟏
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

        await saveContact(senderJid, {
            phone: meta.phone || '',
            name: meta.name || 'Usuario',
            status: 'contacted',
            lastPromoAt: new Date(now),
            promoMessageIds: [sent?.key?.id, sent2?.key?.id].filter(Boolean).slice(-10),
            groupId: meta.groupId || '',
            groupName: meta.groupName || '',
            detectionScore: Number(meta.detectionScore || 0)
        });

        return true;
    } catch (error) {
        console.error('[RECRUITMENT] Error enviando promoción:', error.message);
        return false;
    }
}

async function notifyOwner(sock, message, senderJid, responseText, type) {
    const ownerJid = getOwnerJid();
    if (!ownerJid) return;

    const name = getSenderName(message, senderJid);
    const phone = getPhoneNumber(message, senderJid);
    const cleanResponse = responseText ? responseText.slice(0, 3000) : '(sin texto)';

    const notification = `📥 NUEVO INTERESADO

👤 Usuario: ${name}
📱 Número: ${phone}

📦 Tipo: ${type}
💬 Respuesta: ${cleanResponse}`;

    await sock.sendMessage(ownerJid, { text: notification }).catch(() => {});
    try {
        await sock.sendMessage(ownerJid, { forward: message, force: true });
    } catch {}
}

async function handlePrivateReply(sock, message, senderJid) {
    if (!senderJid || senderJid.endsWith('@g.us') || message?.key?.fromMe) return false;

    const remoteJid = message?.key?.remoteJid || '';
    if (!remoteJid || remoteJid.endsWith('@g.us')) return false;

    const user = await findContact(remoteJid);
    if (!user?.lastPromoAt) return false;

    const incomingId = message?.key?.id;
    if (incomingId && Array.isArray(user.handledIncomingIds) && user.handledIncomingIds.includes(incomingId)) {
        return true;
    }

    const type = getContentType(message);
    const text = getText(message);

    // Ignorar eventos/mensajes sin contenido real. Nunca se consideran interesados.
    if (type === 'OTRO' || (!text && !['IMAGEN', 'VIDEO', 'AUDIO', 'DOCUMENTO', 'STICKER', 'UBICACION', 'CONTACTO', 'ENCUESTA', 'REACCION'].includes(type))) {
        return false;
    }

    const quoted = isQuotedFromOurPromo(message, user);
    const withinWindow = Date.now() - new Date(user.lastPromoAt).getTime() <= DEFAULT_CONFIG.replyWindowMs;
    if (!quoted && !withinWindow) return false;

    if (hasTextMatch(text, DEFAULT_CONFIG.noInterest)) {
        await sock.sendMessage(remoteJid, {
            text: 'Dale, no hay problema 😄\n¡Gracias igualmente por responder! Que estés bien. 👋'
        }).catch(() => {});
        await saveContact(remoteJid, { status: 'declined' });
        return true;
    }

    await sock.sendMessage(remoteJid, {
        text: '👋 Hola, ¿cómo estás?\nGracias por comunicarte con 𝐅𝐗𝐋𝐁𝐎𝐓.\n\n📩 En un momento te comunicaremos con un administrador.'
    }).catch(() => {});

    const handledIncomingIds = Array.isArray(user.handledIncomingIds) ? [...user.handledIncomingIds] : [];
    if (incomingId && !handledIncomingIds.includes(incomingId)) handledIncomingIds.push(incomingId);

    await notifyOwner(sock, message, remoteJid, text, type);

    await saveContact(remoteJid, {
        status: 'interested',
        handledIncomingIds: handledIncomingIds.slice(-100)
    });

    return true;
}

async function handleRecruitmentMessage(sock, message, chatId, senderJid) {
    if (!DEFAULT_CONFIG.enabled || !chatId || !message) return false;

    if (!chatId.endsWith('@g.us')) {
        return handlePrivateReply(sock, message, senderJid);
    }

    if (message?.key?.fromMe) return true;

    const text = getText(message);
    const result = detectRecruitment(text);

    if (result.detected) {
        const targetJid =
            message?.key?.participantAlt?.endsWith('@s.whatsapp.net')
                ? message.key.participantAlt
                : senderJid;

        const sent = await sendPromotion(sock, targetJid, {
            phone: getPhoneNumber(message, targetJid),
            name: getSenderName(message, targetJid),
            groupId: chatId,
            detectionScore: result.score
        });

        if (sent) {
            console.log(`[RECRUITMENT] Detectado: "${text}" | destino=${targetJid} | score=${result.score}`);
        } else {
            console.log(`[RECRUITMENT] Detectado pero ya contactado: "${text}" | destino=${targetJid}`);
        }
    }

    return true;
}

module.exports = {
    handleRecruitmentMessage,
    detectRecruitment,
    config: DEFAULT_CONFIG
};
