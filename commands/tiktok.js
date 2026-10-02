const { ttdl } = require("ruhend-scraper");
const axios = require("axios");

const processedMessages = new Set();
const resultCache = new Map();
const inflightDownloads = new Map();

function cacheGet(url) {
    const item = resultCache.get(url);
    if (!item) return null;
    if (item.expiresAt < Date.now()) {
        resultCache.delete(url);
        return null;
    }
    return item.value;
}

function cacheSet(url, value, ttl = 2 * 60 * 1000) {
    resultCache.set(url, { value, expiresAt: Date.now() + ttl });
    if (resultCache.size > 50) {
        const first = resultCache.keys().next().value;
        if (first) resultCache.delete(first);
    }
}

// ==============================
// ⚡ HELPERS
// ==============================

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function isValidTikTokUrl(url) {
    return /https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\//.test(url);
}

function pickVideo(data) {
    return (
        data?.data?.play ||
        data?.data?.hdplay ||
        data?.data?.wmplay ||
        data?.data?.download ||
        data?.data?.url ||
        data?.data?.video_url ||
        data?.data?.urls?.[0] ||
        null
    );
}

// ==============================
// 🔥 SIPUTZX
// ==============================
async function siputzx(url) {
    try {
        const res = await axios.get(
            `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`,
            { timeout: 12000 }
        );

        if (!res.data?.status) return null;

        return {
            video: pickVideo(res.data)
        };
    } catch {
        return null;
    }
}

// ==============================
// 🔥 TIKWM
// ==============================
async function tikwm(url) {
    try {
        const res = await axios.post(
            "https://www.tikwm.com/api/",
            new URLSearchParams({ url }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "Mozilla/5.0"
                },
                timeout: 12000
            }
        );

        if (!res.data || res.data.code !== 0) return null;

        return {
            video: res.data?.data?.play
        };
    } catch {
        return null;
    }
}

// ==============================
// 🔥 SSSTIK
// ==============================
async function ssstik(url) {
    try {
        const res = await axios.post(
            "https://ssstik.io/abc?url=dl",
            new URLSearchParams({ id: url, locale: "en", tt: "0" }),
            {
                headers: {
                    "User-Agent": "Mozilla/5.0"
                },
                timeout: 12000
            }
        );

        const match = res.data.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
        if (!match) return null;

        return {
            video: match[1]
        };
    } catch {
        return null;
    }
}

// ==============================
// 🔥 FALLBACK
// ==============================
async function fallback(url) {
    try {
        const data = await ttdl(url);

        const found = data?.data?.find(m => m.url);

        if (!found) return null;

        return {
            video: found.url
        };
    } catch {
        return null;
    }
}

// ==============================
// ⚡ ENGINE
// ==============================
async function getVideo(url) {
    const cached = cacheGet(url);
    if (cached?.video) return cached;

    if (inflightDownloads.has(url)) {
        return inflightDownloads.get(url);
    }

    const task = (async () => {
        // Ask the lightweight extractors at the same time instead of waiting
        // 12 seconds for one service before trying the next.
        const results = await Promise.allSettled([
            siputzx(url),
            tikwm(url),
            ssstik(url)
        ]);

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value?.video) {
                cacheSet(url, result.value);
                return result.value;
            }
        }

        const fallbackResult = await fallback(url);
        if (fallbackResult?.video) cacheSet(url, fallbackResult);
        return fallbackResult;
    })();

    inflightDownloads.set(url, task);
    try {
        return await task;
    } finally {
        inflightDownloads.delete(url);
    }
}

// ==============================
// 🚀 COMMAND
// ==============================
async function tiktokCommand(sock, chatId, message) {
    try {

        if (processedMessages.has(message.key.id)) return;
        processedMessages.add(message.key.id);

        setTimeout(() => processedMessages.delete(message.key.id), 5 * 60 * 1000);

        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text;

        const url = text?.split(" ").slice(1).join(" ").trim();

        if (!url || !isValidTikTokUrl(url)) {
            return sock.sendMessage(chatId, {
                text: "❌ Envía un link válido de TikTok."
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            react: { text: "🔄", key: message.key }
        });

        const result = await getVideo(url);

        if (!result?.video) {
            return sock.sendMessage(chatId, {
                text: "❌ No se pudo descargar el video."
            }, { quoted: message });
        }

        const cachedBuffer = cacheGet(result.video);
        let buffer;

        if (cachedBuffer?.buffer) {
            buffer = cachedBuffer.buffer;
        } else {
            const video = await axios.get(result.video, {
                responseType: "arraybuffer",
                timeout: 45000,
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Referer": "https://www.tiktok.com/"
                }
            });

            buffer = Buffer.from(video.data);
            // Keep only a very short-lived copy to make repeated requests fast.
            // Limit memory usage to videos up to ~15 MB.
            if (buffer.length <= 15 * 1024 * 1024) {
                cacheSet(result.video, { buffer }, 60 * 1000);
            }
        }

        // 🟢 reacción final (check verde)
        await sock.sendMessage(chatId, {
            react: { text: "✅", key: message.key }
        });

        await sock.sendMessage(chatId, {
            video: buffer,
            mimetype: "video/mp4",
            caption: "> Powered By 𝕱𝖊𝖑𝖇𝖔𝖙 夜."
        }, { quoted: message });

    } catch (err) {
        console.error("TikTok clean error:", err);

        await sock.sendMessage(chatId, {
            text: "⚠️ Error procesando el video."
        }, { quoted: message });
    }
}

module.exports = tiktokCommand;