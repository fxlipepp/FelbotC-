const fetch = require('node-fetch');

async function handleTranslateCommand(sock, chatId, message, match) {
    try {

        // Indicador de escribiendo
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);

        let textToTranslate = '';
        let lang = '';

        // Verificar si respondió a un mensaje
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (quotedMessage) {

            // Obtener texto del mensaje respondido
            textToTranslate =
                quotedMessage.conversation ||
                quotedMessage.extendedTextMessage?.text ||
                quotedMessage.imageMessage?.caption ||
                quotedMessage.videoMessage?.caption ||
                '';

            // Obtener idioma del comando
            lang = match.trim();

        } else {

            // Obtener argumentos del comando
            const args = match.trim().split(' ');

            if (args.length < 2) {
                return sock.sendMessage(chatId, {
                    text:
`🌍 *TRADUCTOR*

📌 Uso:

1️⃣ Responde a un mensaje usando:
.translate <idioma>
o
.trt <idioma>

2️⃣ O escribe directamente:
.translate <texto> <idioma>

📌 Ejemplos:
.translate hello es
.trt buenos días en

📌 Idiomas disponibles:
🇪🇸 es - Español
🇺🇸 en - Inglés
🇫🇷 fr - Francés
🇩🇪 de - Alemán
🇮🇹 it - Italiano
🇵🇹 pt - Portugués
🇷🇺 ru - Ruso
🇯🇵 ja - Japonés
🇰🇷 ko - Coreano
🇨🇳 zh - Chino
🇸🇦 ar - Árabe
🇮🇳 hi - Hindi`
                }, {
                    quoted: message
                });
            }

            lang = args.pop(); // Idioma
            textToTranslate = args.join(' '); // Texto
        }

        // Validar texto
        if (!textToTranslate) {
            return sock.sendMessage(chatId, {
                text: '❌ No se encontró texto para traducir.',
            }, {
                quoted: message
            });
        }

        // Intentar varias APIs
        let translatedText = null;

        // API 1 - Google Translate
        try {

            const response = await fetch(
                `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(textToTranslate)}`
            );

            if (response.ok) {

                const data = await response.json();

                if (data?.[0]?.[0]?.[0]) {
                    translatedText = data[0][0][0];
                }
            }

        } catch (e) {}

        // API 2 - MyMemory
        if (!translatedText) {

            try {

                const response = await fetch(
                    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=auto|${lang}`
                );

                if (response.ok) {

                    const data = await response.json();

                    if (data?.responseData?.translatedText) {
                        translatedText = data.responseData.translatedText;
                    }
                }

            } catch (e) {}
        }

        // API 3
        if (!translatedText) {

            try {

                const response = await fetch(
                    `https://api.dreaded.site/api/translate?text=${encodeURIComponent(textToTranslate)}&lang=${lang}`
                );

                if (response.ok) {

                    const data = await response.json();

                    if (data?.translated) {
                        translatedText = data.translated;
                    }
                }

            } catch (e) {}
        }

        // Si todas fallan
        if (!translatedText) {
            throw new Error('Todas las APIs fallaron');
        }

        // Enviar traducción
        await sock.sendMessage(chatId, {
            text:
`🌍 *TRADUCCIÓN*

📝 Texto original:
${textToTranslate}

✨ Traducción:
${translatedText}`
        }, {
            quoted: message
        });

    } catch (error) {

        console.error('❌ Error en translate:', error);

        await sock.sendMessage(chatId, {
            text:
`❌ No fue posible traducir el texto.

📌 Uso:
• .translate <texto> <idioma>
• .trt <texto> <idioma>

📌 También puedes responder un mensaje usando:
.translate <idioma>`
        }, {
            quoted: message
        });
    }
}

module.exports = {
    handleTranslateCommand
};