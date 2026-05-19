const fetch = require('node-fetch');
const Tesseract = require('tesseract.js');

const usedMemes = new Set();
const MAX_CACHE = 100;

// ==========================
// 🧠 OCR (leer texto imagen)
// ==========================
async function extractText(imageBuffer) {
    try {
        const { data: { text } } = await Tesseract.recognize(
            imageBuffer,
            'eng' // memes casi siempre en inglés
        );

        return text?.trim() || '';
    } catch {
        return '';
    }
}

// ==========================
// 🌍 TRADUCTOR
// ==========================
async function translate(text) {
    try {
        if (!text) return '';

        const res = await fetch('https://libretranslate.de/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                q: text,
                source: 'en',
                target: 'es',
                format: 'text'
            })
        });

        const data = await res.json();
        return data.translatedText || text;

    } catch {
        return text;
    }
}

// ==========================
// 😂 MEME API
// ==========================
async function getMeme() {
    const res = await fetch('https://meme-api.com/gimme');
    const json = await res.json();

    return json.url;
}

// ==========================
// 🧠 CACHE
// ==========================
function isRepeated(url) {
    return usedMemes.has(url);
}

function saveCache(url) {
    usedMemes.add(url);
    if (usedMemes.size > MAX_CACHE) usedMemes.clear();
}

// ==========================
// 🚀 MAIN COMMAND
// ==========================
async function memeCommand(sock, chatId, message) {
    try {

        const url = await getMeme();

        if (isRepeated(url)) {
            return memeCommand(sock, chatId, message);
        }

        saveCache(url);

        const imgRes = await fetch(url);
        const buffer = await imgRes.buffer();

        // 🧠 OCR
        const rawText = await extractText(buffer);

        // 🌍 traducción
        const translatedText = await translate(rawText);

        const captions = [
            '🧠 IA leyendo memes como humano',
            '🔥 traducción automática activada',
            '🤣 esto antes era en inglés',
            '💀 cerebro bilingüe activado'
        ];

        let caption =
            `${captions[Math.floor(Math.random() * captions.length)]}\n\n`;

        if (translatedText) {
            caption += `📝 Texto detectado:\n${translatedText}\n\n`;
        }

        caption += `📎 meme traducido con IA`;

        await sock.sendMessage(chatId, {
            image: buffer,
            caption
        }, { quoted: message });

    } catch (err) {
        console.error('OCR Meme error:', err);

        await sock.sendMessage(chatId, {
            text: '❌ Error procesando meme con IA'
        }, { quoted: message });
    }
}

module.exports = memeCommand;