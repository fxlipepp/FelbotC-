const { ButtonV2 } = require('../lib/airich')

async function sendTest(sock, chatId, message, title, builder) {
    try {
        await sock.sendMessage(chatId, {
            text: `🧪 ${title}`
        }, { quoted: message })

        await builder.send(chatId, {
            quoted: message,
            viewOnce: false
        })
    } catch (error) {
        console.error(`[TESTBOTONES] ${title}:`, error.message)

        await sock.sendMessage(chatId, {
            text: `❌ ${title} falló:\n${error.message}`
        }, { quoted: message })
    }
}

async function testBotonesCommand(sock, chatId, message) {
    try {
        await sock.sendMessage(chatId, {
            text: '🧪 TEST BUTTONV2\n\nVoy a probar las variantes de botones clásicos/legacy que podemos construir con ButtonV2.\n\nMira cuáles aparecen correctamente en tu WhatsApp.'
        }, { quoted: message })

        // 1 botón
        await sendTest(
            sock,
            chatId,
            message,
            '🟦 BUTTONV2 — 1 BOTÓN',
            new ButtonV2(sock)
                .setBody('ButtonV2 con un solo botón')
                .setFooter('Legacy / ButtonsMessage')
                .addButton('❤️ Aceptar', 'test_v2_1')
        )

        // 2 botones
        await sendTest(
            sock,
            chatId,
            message,
            '🟦 BUTTONV2 — 2 BOTONES',
            new ButtonV2(sock)
                .setBody('ButtonV2 con dos botones')
                .setFooter('Legacy / ButtonsMessage')
                .addButton('❤️ Titular', 'test_v2_2_a')
                .addButton('👍 Suplente', 'test_v2_2_b')
        )

        // 3 botones
        await sendTest(
            sock,
            chatId,
            message,
            '🟦 BUTTONV2 — 3 BOTONES',
            new ButtonV2(sock)
                .setBody('ButtonV2 con tres botones')
                .setFooter('Legacy / ButtonsMessage')
                .addButton('❤️ Titular', 'test_v2_3_a')
                .addButton('👍 Suplente', 'test_v2_3_b')
                .addButton('💔 Salir', 'test_v2_3_c')
        )

        // 3 botones largos
        await sendTest(
            sock,
            chatId,
            message,
            '🟦 BUTTONV2 — 3 BOTONES TEXTO LARGO',
            new ButtonV2(sock)
                .setBody('Prueba de botones con textos más largos')
                .setFooter('Comprobar límite visual de WhatsApp')
                .addButton('❤️ Entrar como titular', 'test_v2_long_a')
                .addButton('👍 Entrar como suplente', 'test_v2_long_b')
                .addButton('💔 Salirme del partido', 'test_v2_long_c')
        )

        // Botones con type 1 explícito
        await sendTest(
            sock,
            chatId,
            message,
            '🟦 BUTTONV2 — TYPE 1 EXPLÍCITO',
            new ButtonV2(sock)
                .setBody('ButtonV2 usando buttonsMessage type 1')
                .setFooter('type: 1')
                .addRawButton({
                    buttonId: 'test_v2_raw_1',
                    buttonText: { displayText: '❤️ Type 1' },
                    type: 1
                })
                .addRawButton({
                    buttonId: 'test_v2_raw_2',
                    buttonText: { displayText: '👍 Type 1' },
                    type: 1
                })
        )

        // Variante híbrida que algunos forks de Baileys/WhatsApp aceptan
        await sendTest(
            sock,
            chatId,
            message,
            '🟦 BUTTONV2 — TYPE 4 / NATIVE FLOW DENTRO DE BUTTONS',
            new ButtonV2(sock)
                .setBody('Prueba híbrida usando ButtonV2')
                .setFooter('buttonsMessage + nativeFlowInfo')
                .addRawButton({
                    buttonId: 'test_v2_hybrid',
                    buttonText: { displayText: '📋 Abrir opción' },
                    type: 4,
                    nativeFlowInfo: {
                        name: 'single_select',
                        paramsJson: JSON.stringify({
                            title: 'Opciones',
                            sections: [{
                                title: 'Prueba',
                                rows: [
                                    {
                                        title: 'Opción 1',
                                        description: 'ButtonV2 híbrido',
                                        rowId: 'test_hybrid_1'
                                    },
                                    {
                                        title: 'Opción 2',
                                        description: 'ButtonV2 híbrido',
                                        rowId: 'test_hybrid_2'
                                    }
                                ]
                            }]
                        })
                    }
                })
        )

        // Mezcla de botón clásico + botón raw
        await sendTest(
            sock,
            chatId,
            message,
            '🟦 BUTTONV2 — CLÁSICO + RAW',
            new ButtonV2(sock)
                .setBody('Prueba de mezcla dentro de ButtonV2')
                .setFooter('addButton + addRawButton')
                .addButton('❤️ Clásico', 'test_v2_mix_1')
                .addRawButton({
                    buttonId: 'test_v2_mix_2',
                    buttonText: { displayText: '👍 Raw' },
                    type: 1
                })
        )

        await sock.sendMessage(chatId, {
            text: '✅ TEST BUTTONV2 TERMINADO\n\nTodos los mensajes anteriores usan ButtonV2.\n\nDime cuáles se ven y cuáles no, y usamos exactamente el formato que sí te aparece.'
        }, { quoted: message })

    } catch (error) {
        console.error('[TESTBOTONES] Error general:', error)

        await sock.sendMessage(chatId, {
            text: `❌ Error en .testbotones:\n${error.message}`
        }, { quoted: message })
    }
}

module.exports = { testBotonesCommand }
