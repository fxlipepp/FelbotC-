const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const { Carousel } = require('../lib/airich');

async function carruselCommand(sock, chatId, message) {
    const cardsData = [
        {
            title: '🎮 JUEGOS',
            body: 'Ruleta • Slots • Crash\nPrueba de carrusel con Felbot 夜.',
            footer: 'Felbot 夜 • Tarjeta 1',
            image: 'https://placehold.co/800x1000/png?text=FELBOT+JUEGOS',
            button: '🎮 VER JUEGOS',
            id: 'carrusel::juegos'
        },
        {
            title: '💰 FELCOINS',
            body: 'Saldo • Tienda • Inventario\nTodo el sistema de economía.',
            footer: 'Felbot 夜 • Tarjeta 2',
            image: 'https://placehold.co/800x1000/png?text=FELCOINS',
            button: '💰 VER FELCOINS',
            id: 'carrusel::felcoins'
        },
        {
            title: '⚔️ VERSUS',
            body: '2v2 • 4v4 • 6v6 • 8v8\nRegistra tu equipo desde el bot.',
            footer: 'Felbot 夜 • Tarjeta 3',
            image: 'https://placehold.co/800x1000/png?text=VERSUS',
            button: '⚔️ VER VERSUS',
            id: 'carrusel::versus'
        }
    ];

    const cards = [];

    for (const card of cardsData) {
        const media = await prepareWAMessageMedia(
            { image: { url: card.image } },
            { upload: sock.waUploadToServer }
        );

        cards.push({
            header: {
                title: card.title,
                hasMediaAttachment: true,
                ...media
            },
            body: {
                text: card.body
            },
            footer: {
                text: card.footer
            },
            nativeFlowMessage: {
                buttons: [
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: card.button,
                            id: card.id
                        })
                    }
                ],
                messageParamsJson: ''
            }
        });
    }

    const carousel = new Carousel(sock)
        .setBody('╭━━〔 𝕱𝖊𝖑𝖇𝖔𝖙 夜 〕━━⬣\n┃ Desliza para ver las categorías\n╰━━━━━━━━━━━━━━━━⬣')
        .setFooter('Felbot 夜 • Carrusel de prueba')
        .addCard(cards);

    await carousel.send(chatId, { quoted: message });
}

module.exports = carruselCommand;
