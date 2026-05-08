const settings = require("../settings");

async function comandoActivo(sock, chatId, mensaje) {
    try {
        const texto = `*🤖 𝕱𝖊𝖑𝖇𝖔𝖙 夜 está Activo!*\n\n` +
            `*Versión:* ${settings.version}\n` +
            `*Estado:* En línea\n` +
            `*Modo:* Público\n\n` +
            `*🌟 Funciones:*\n` +
            `• Administración de grupos\n` +
            `• Protección anti-link\n` +
            `• Comandos de diversión\n` +
            `• Y más cosas\n\n` +
            `Escribe *.menu* para ver todo`;

        await sock.sendMessage(chatId, {
            text: texto,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,

                // 👇 AQUÍ ES DONDE CAMBIAS LA COMUNIDAD
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363409628624676@newsletter',
                    newsletterName: '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 𝕮𝖍𝖆𝖓𝖓𝖊𝖑 ✧',
                    serverMessageId: -1
                }
            }
        }, { quoted: mensaje });

    } catch (error) {
        console.error('Error en el comando activo:', error);
        await sock.sendMessage(chatId, { text: 'El bot está vivo y funcionando 😎' }, { quoted: mensaje });
    }
}

module.exports = comandoActivo;