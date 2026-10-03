const sharp = require('sharp');

async function quoteCommand(sock, chatId, message) {
  const ctx = message?.message?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;
  if (!quoted) return sock.sendMessage(chatId, { text: '⚠️ Responde a un mensaje para usar *.quote*.' }, { quoted: message });
  const text = quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || quoted.videoMessage?.caption || '';
  if (!text) return sock.sendMessage(chatId, { text: '⚠️ Responde a un mensaje que tenga texto.' }, { quoted: message });
  const safe = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = '<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="#111"/><text x="100" y="130" fill="#aaa" font-size="30">FELBOT 夜 • QUOTE</text><foreignObject x="100" y="210" width="1000" height="330"><div xmlns="http://www.w3.org/1999/xhtml" style="color:white;font:36px Arial;line-height:1.35">“' + safe + '”</div></foreignObject></svg>';
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return sock.sendMessage(chatId, { image: buffer, caption: '💬 *Quote*' }, { quoted: message });
}

module.exports = quoteCommand;
