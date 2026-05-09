const fetch = require('node-fetch');

const memes = [

    'https://i.imgflip.com/30b1gx.jpg',
    'https://i.imgflip.com/1bij.jpg',
    'https://i.imgflip.com/26am.jpg',
    'https://i.imgflip.com/1otk96.jpg',
    'https://i.imgflip.com/9ehk.jpg',
    'https://i.imgflip.com/2fm6x.jpg',
    'https://i.imgflip.com/1g8my4.jpg',
    'https://i.imgflip.com/3si4.jpg',
    'https://i.imgflip.com/4acd7j.png',
    'https://i.imgflip.com/43a45p.png',
    'https://i.imgflip.com/54hjww.jpg',
    'https://i.imgflip.com/4t0m5.jpg',
    'https://i.imgflip.com/39t1o.jpg',
    'https://i.imgflip.com/5w3q.jpg',
    'https://i.imgflip.com/1ur9b0.jpg',
    'https://i.imgflip.com/2za3u1.jpg',
    'https://i.imgflip.com/345v97.jpg',
    'https://i.imgflip.com/1bhk.jpg',
    'https://i.imgflip.com/1ur9b0.jpg',
    'https://i.imgflip.com/2wifvo.jpg',
    'https://i.imgflip.com/3oevdk.jpg',
    'https://i.imgflip.com/28j0te.jpg',
    'https://i.imgflip.com/4uapcv.jpg',
    'https://i.imgflip.com/5c7lwq.png',
    'https://i.imgflip.com/49z6gd.jpg',
    'https://i.imgflip.com/3lmzyx.jpg',
    'https://i.imgflip.com/46e43q.png',
    'https://i.imgflip.com/1h7in3.jpg',
    'https://i.imgflip.com/3pnmg.jpg',
    'https://i.imgflip.com/265k.jpg',
    'https://i.imgflip.com/2cp1.jpg',
    'https://i.imgflip.com/9vct.jpg',
    'https://i.imgflip.com/24y43o.jpg',
    'https://i.imgflip.com/1tl71a.jpg',
    'https://i.imgflip.com/2ybua0.png',
    'https://i.imgflip.com/3kwur5.jpg',
    'https://i.imgflip.com/3po4m7.jpg',
    'https://i.imgflip.com/54d9lj.png',
    'https://i.imgflip.com/4acd7j.png',
    'https://i.imgflip.com/1tkjq9.jpg',
    'https://i.imgflip.com/2gnnjh.jpg',
    'https://i.imgflip.com/5ehk.jpg'
];

const captions = [

    '🗿 Yo entrando al grupo solo a sapear',
    '💀 Cuando dices “5 minutos más” y amaneces',
    '🐒 Yo buscando quién pidió mi opinión',
    '🔥 El admin cuando por fin puede banear a alguien',
    '🤡 Cuando borras el mensaje tarde',
    '🚬 Dizque “no me importa” y revisa el perfil cada 2 minutos',
    '😹 Yo viendo peleas ajenas en el grupo',
    '🫠 El cerebro mío después de 3 horas sin dormir',
    '📉 Mi estabilidad mental viendo el recibo',
    '💸 La quincena durándome menos que una historia',
    '🧠 Yo creando escenarios falsos en la cabeza',
    '👹 Cuando me dicen “cálmate”',
    '🥶 Yo fingiendo que entendí',
    '🚑 El grupo después de que llega el chisme',
    '🐀 Yo desapareciendo después de mandar una estupidez',
    '🪦 Mi dignidad después de ese mensaje',
    '📵 Cuando mandas mensaje y responden en el grupo pero no a ti',
    '🤨 “No voy a volver con esa persona”',
    '💔 Yo escuchando música triste sin estar triste',
    '🛌 Yo diciendo “ya voy” desde hace 2 horas',
    '🫡 El parcero fiel defendiendo a la tóxica',
    '🐸 Yo viendo cómo se destruyen solitos',
    '🚨 Cuando el profe dice “hagan grupos”',
    '🍷 Yo haciéndome el misterioso y solo soy raro',
    '💣 El grupo cuando entra alguien nuevo',
    '😴 Yo leyendo un párrafo y olvidándolo al instante',
    '🧃 El amigo que nunca pone plata pero sí toma',
    '🤖 Yo respondiendo “jajaja” sin leer',
    '☠️ El internet cayéndose justo en ranked',
    '📚 Yo estudiando 5 minutos y descansando 3 horas',
    '🐢 Mi cerebro en matemáticas',
    '🎭 Yo actuando normal después de tremenda pena',
    '🧍‍♂️ Cuando te saludan y no sabes quién es',
    '👺 El que pone música triste en las fiestas',
    '🫥 Yo queriendo socializar y arrepintiéndome',
    '🥴 Cuando mezclas guaro con malas decisiones',
    '📸 Yo abriendo la cámara frontal por accidente',
    '💤 El grupo muerto hasta que alguien manda sticker',
    '🧨 Cuando dicen “no se enojen”',
    '🗣️ Yo peleando solo en la ducha',
    '🐔 El que manda indirectas y nunca dice nombres',
    '💅 Yo después de hacer absolutamente nada',
    '🚓 Cuando el admin aparece después de 8 meses',
    '🎮 “Última partida”',
    '🤓 El inteligente del grupo corrigiendo todo',
    '🧌 Yo molestando y luego haciéndome la víctima',
    '🪑 El tímido cuando le toca exponer',
    '🧠 Mi última neurona funcionando',
    '📶 El WiFi fallando en el peor momento',
    '🫣 Cuando mandas captura al chat equivocado'
];

async function memeCommand(sock, chatId, message) {

    try {

        const randomMeme =
            memes[Math.floor(Math.random() * memes.length)];

        const randomCaption =
            captions[Math.floor(Math.random() * captions.length)];

        const response = await fetch(randomMeme);

        if (!response.ok) {
            throw new Error('No se pudo descargar el meme');
        }

        const imageBuffer = await response.buffer();

        await sock.sendMessage(chatId, {

            image: imageBuffer,

            caption: randomCaption,

            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,

                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363409628624676@newsletter',
                    newsletterName: '✧ 𝕱𝖊𝖑𝖇𝖔𝖙 夜 | 𝕮𝖆𝖓𝖆𝖑 𝕺𝖋𝖎𝖈𝖎𝖆𝖑 ✧'
                }
            }

        }, { quoted: message });

    } catch (error) {

        console.error('Error en meme command:', error);

        await sock.sendMessage(chatId, {
            text: '❌ No pude traer el meme, el internet anda más tieso que profesor de matemáticas.'
        }, { quoted: message });
    }
}

module.exports = memeCommand;