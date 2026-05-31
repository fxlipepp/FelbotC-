const fetch = require('node-fetch');

async function shayariCommand(sock, chatId, message) {
    try {
        const res = await fetch('https://shizoapi.onrender.com/api/texts/shayari?apikey=shizo');
        const data = await res.json();

        if (!data?.result) {
            throw new Error('API inválida');
        }

        // 🔥 MENSAJE SIMPLE + BOTONES CLÁSICOS (ESTABLE)
        await sock.sendMessage(chatId, {
            text: `💖 SHAYARI:\n\n${data.result}`,
            footer: "😎 Bot Medellín",
            buttons: [
                {
                    buttonId: ".shayari",
                    buttonText: { displayText: "🪄 Otra" },
                    type: 1
                },
                {
                    buttonId: ".roseday",
                    buttonText: { displayText: "🌹 RoseDay" },
                    type: 1
                }
            ],
            headerType: 1
        }, { quoted: message });

    } catch (err) {
        console.error("shayari error:", err);

        await sock.sendMessage(chatId, {
            text: "💀 No salió la shayari, la API anda mamando"
        }, { quoted: message });
    }
}

module.exports = { shayariCommand };