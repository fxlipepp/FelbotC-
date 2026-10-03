const sharp = require('sharp');
const axios = require('axios');

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeJid(jid = '') {
  return String(jid || '').replace(/:[^@]+(?=@)/, '');
}

function jidToNumber(jid = '') {
  const clean = normalizeJid(jid);
  if (clean.endsWith('@s.whatsapp.net')) return clean.replace('@s.whatsapp.net', '');
  return '';
}

function wrapText(text, maxChars = 42, maxLines = 8) {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let line = '';

  for (const word of words) {
    if (!word) continue;
    const candidate = line ? line + ' ' + word : word;

    if (candidate.length <= maxChars) {
      line = candidate;
      continue;
    }

    if (line) lines.push(line);
    line = word.length > maxChars ? word.slice(0, maxChars - 1) + '…' : word;

    if (lines.length >= maxLines) break;
  }

  if (lines.length < maxLines && line) lines.push(line);

  if (words.join(' ').length > lines.join(' ').length) {
    const last = lines.length - 1;
    if (last >= 0 && !lines[last].endsWith('…')) {
      lines[last] = lines[last].slice(0, Math.max(1, maxChars - 1)) + '…';
    }
  }

  return lines;
}

async function getQuotedSender(sock, chatId, ctx, quoted) {
  let jid =
    ctx?.participantAlt ||
    ctx?.participant ||
    quoted?.key?.participantAlt ||
    quoted?.key?.participant ||
    '';

  if (!jid && !String(chatId).endsWith('@g.us')) jid = chatId;

  let displayName = '';
  let phone = jidToNumber(jid);

  if (String(chatId).endsWith('@g.us')) {
    try {
      const metadata = await sock.groupMetadata(chatId);
      const participants = metadata?.participants || [];
      const cleanJid = normalizeJid(jid);

      const participant = participants.find(p =>
        normalizeJid(p?.id) === cleanJid ||
        normalizeJid(p?.jid) === cleanJid ||
        normalizeJid(p?.lid) === cleanJid
      );

      if (participant) {
        const participantPhone =
          participant?.phoneNumber ||
          participant?.pn ||
          participant?.phone ||
          participant?.id;

        const candidatePhone = jidToNumber(participantPhone);
        if (candidatePhone) phone = candidatePhone;

        displayName =
          participant?.notify ||
          participant?.name ||
          participant?.verifiedName ||
          '';
      }
    } catch (error) {
      console.warn('[QUOTE] No se pudo obtener metadata del grupo:', error?.message || error);
    }
  }

  if (!displayName) {
    displayName = phone ? '+' + phone : 'Usuario de WhatsApp';
  }

  if (!phone && jid && !jid.endsWith('@g.us')) {
    displayName = displayName || jid.split('@')[0];
  }

  return {
    jid: jid || chatId,
    displayName: displayName.slice(0, 32),
    phone
  };
}

async function getProfileBuffer(sock, jid) {
  try {
    if (!jid) return null;

    const url = await sock.profilePictureUrl(normalizeJid(jid), 'image');
    if (!url) return null;

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 8000,
      maxContentLength: 5 * 1024 * 1024
    });

    return Buffer.from(response.data);
  } catch (error) {
    console.warn('[QUOTE] No se pudo obtener la foto de perfil:', error?.message || error);
    return null;
  }
}

function buildQuoteSvg({ name, phone, lines, hasAvatar }) {
  const avatarX = 78;
  const avatarY = 78;
  const avatarSize = 116;

  const textLines = lines.map((line, index) =>
    '<text x="104" y="' + (310 + index * 54) + '" class="quote">“' + escapeXml(line) + (index === lines.length - 1 ? '”' : '') + '</text>'
  ).join('');

  const fallbackAvatar = hasAvatar
    ? ''
    : '<circle cx="136" cy="136" r="58" fill="#dfe7e5"/><text x="136" y="155" text-anchor="middle" font-size="54" fill="#667781">👤</text>';

  return `<svg width="1200" height="760" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.16"/>
      </filter>
      <clipPath id="avatarClip">
        <circle cx="136" cy="136" r="58"/>
      </clipPath>
      <style>
        .name { font: 700 32px Arial, sans-serif; fill: #111b21; }
        .number { font: 22px Arial, sans-serif; fill: #667781; }
        .quote { font: 34px Arial, sans-serif; fill: #111b21; }
        .small { font: 18px Arial, sans-serif; fill: #667781; }
      </style>
    </defs>

    <rect width="1200" height="760" fill="#efeae2"/>
    <rect x="0" y="0" width="1200" height="74" fill="#00a884"/>
    <text x="54" y="48" font-family="Arial" font-size="28" font-weight="700" fill="#ffffff">WhatsApp • Felbot 夜</text>

    <rect x="54" y="104" width="1092" height="580" rx="26" fill="#ffffff" filter="url(#shadow)"/>

    <circle cx="136" cy="136" r="58" fill="#dfe7e5"/>
    ${fallbackAvatar}

    <text x="220" y="128" class="name">${escapeXml(name)}</text>
    <text x="220" y="164" class="number">${escapeXml(phone ? '+' + phone : 'Número no disponible')}</text>

    <rect x="78" y="216" width="1044" height="390" rx="20" fill="#f0f2f5"/>
    <rect x="78" y="216" width="7" height="390" rx="4" fill="#00a884"/>

    ${textLines}

    <text x="104" y="652" class="small">💬 Mensaje citado • Felbot 夜</text>
  </svg>`;
}

async function quoteCommand(sock, chatId, message) {
  try {
    const ctx = message?.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;

    if (!quoted) {
      return sock.sendMessage(
        chatId,
        { text: '⚠️ Responde a un mensaje para usar *.quote*.' },
        { quoted: message }
      );
    }

    const text =
      quoted?.conversation ||
      quoted?.extendedTextMessage?.text ||
      quoted?.imageMessage?.caption ||
      quoted?.videoMessage?.caption ||
      quoted?.documentMessage?.caption ||
      '';

    if (!text) {
      return sock.sendMessage(
        chatId,
        { text: '⚠️ Responde a un mensaje que tenga texto o una descripción.' },
        { quoted: message }
      );
    }

    const sender = await getQuotedSender(sock, chatId, ctx, quoted);
    const avatar = await getProfileBuffer(sock, sender.jid);
    const lines = wrapText(text, 42, 8);

    const svg = buildQuoteSvg({
      name: sender.displayName,
      phone: sender.phone,
      lines,
      hasAvatar: Boolean(avatar)
    });

    let image = await sharp(Buffer.from(svg)).png().toBuffer();

    if (avatar) {
      const avatarImage = await sharp(avatar)
        .resize(116, 116, { fit: 'cover' })
        .png()
        .toBuffer();

      const mask = Buffer.from(
        '<svg width="116" height="116" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="58" cy="58" r="58" fill="white"/>' +
        '</svg>'
      );

      const circularAvatar = await sharp(avatarImage)
        .composite([{ input: mask, blend: 'dest-in' }])
        .png()
        .toBuffer();

      image = await sharp(image)
        .composite([{ input: circularAvatar, left: 78, top: 78 }])
        .png()
        .toBuffer();
    }

    return sock.sendMessage(
      chatId,
      {
        image,
        caption: '💬 *Quote* • ' + sender.displayName
      },
      { quoted: message }
    );
  } catch (error) {
    console.error('[QUOTE] Error:', error);
    throw error;
  }
}

module.exports = quoteCommand;
