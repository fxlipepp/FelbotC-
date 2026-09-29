const { Button, ButtonV2 } = require('../lib/airich')

async function testBotonesCommand(sock, chatId, message) {
    const sendNative = async (title, builder) => {
        try {
            await sock.sendMessage(chatId, {
                text: `🧪 ${title}\n\nEste mensaje sirve para identificar qué formato de botón muestra tu WhatsApp.`
            }, { quoted: message })
            await builder.send(chatId, { quoted: message })
        } catch (error) {
            console.error(`[TESTBOTONES] ${title}:`, error.message)
            await sock.sendMessage(chatId, {
                text: `❌ ${title} falló:\n${error.message}`
            }, { quoted: message })
        }
    }

    try {
        await sock.sendMessage(chatId, {
            text: '🧪 TEST DE BOTONES\n\nVoy a enviar los formatos disponibles uno por uno. Mira cuáles aparecen como botones en WhatsApp.'
        }, { quoted: message })

        const clasico = new ButtonV2(sock)
            .setBody('🟦 BOTÓN CLÁSICO — ButtonV2')
            .setFooter('Formato usado actualmente en .versus')
            .addButton('❤️ Botón 1', 'test_clasico_1')
            .addButton('👍 Botón 2', 'test_clasico_2')
            .addButton('💔 Botón 3', 'test_clasico_3')

        await clasico.send(chatId, { quoted: message, viewOnce: false })

        await sendNative(
            '🟩 NATIVE FLOW — quick_reply',
            new Button(sock)
                .setBody('🟩 Native Flow — Quick Reply')
                .setFooter('Formato: quick_reply')
                .addReply('❤️ Responder', 'test_native_reply')
        )

        await sendNative(
            '🟨 NATIVE FLOW — single_select',
            new Button(sock)
                .setBody('🟨 Native Flow — Lista')
                .setFooter('Formato: single_select')
                .addSelection('Abrir lista')
                .makeSection('Opciones')
                .makeRow('', 'Opción 1', 'Prueba', 'test_list_1')
                .makeRow('', 'Opción 2', 'Prueba', 'test_list_2')
        )

        await sendNative(
            '🟥 NATIVE FLOW — cta_url',
            new Button(sock)
                .setBody('🟥 Native Flow — URL')
                .setFooter('Formato: cta_url')
                .addUrl('🌐 Abrir web', 'https://example.com')
        )

        await sendNative(
            '🟪 NATIVE FLOW — cta_copy',
            new Button(sock)
                .setBody('🟪 Native Flow — Copiar')
                .setFooter('Formato: cta_copy')
                .addCopy('📋 Copiar texto', 'FELBOT_TEST')
        )

        await sendNative(
            '☎️ NATIVE FLOW — cta_call',
            new Button(sock)
                .setBody('☎️ Native Flow — Llamada')
                .setFooter('Formato: cta_call')
                .addCall('☎️ Llamar', 'test_call', { phone_number: '+573000000000' })
        )

        await sendNative(
            '⏰ NATIVE FLOW — cta_reminder',
            new Button(sock)
                .setBody('⏰ Native Flow — Recordatorio')
                .setFooter('Formato: cta_reminder')
                .addReminder('⏰ Recordarme', 'test_reminder')
        )

        await sendNative(
            '🚫 NATIVE FLOW — cta_cancel_reminder',
            new Button(sock)
                .setBody('🚫 Native Flow — Cancelar recordatorio')
                .setFooter('Formato: cta_cancel_reminder')
                .addCancelReminder('🚫 Cancelar', 'test_cancel_reminder')
        )

        await sendNative(
            '📍 NATIVE FLOW — send_location',
            new Button(sock)
                .setBody('📍 Native Flow — Ubicación')
                .setFooter('Formato: send_location')
                .addLocation()
        )

        await sendNative(
            '🏠 NATIVE FLOW — address_message',
            new Button(sock)
                .setBody('🏠 Native Flow — Dirección')
                .setFooter('Formato: address_message')
                .addAddress('🏠 Enviar dirección', 'test_address')
        )

        await sock.sendMessage(chatId, {
            text: '✅ TEST TERMINADO\n\nDime cuáles formatos sí aparecieron y cuáles no. Con eso dejamos .versus usando el que realmente te funciona.'
        }, { quoted: message })
    } catch (error) {
        console.error('[TESTBOTONES] Error general:', error)
        await sock.sendMessage(chatId, {
            text: `❌ Error en .testbotones:\n${error.message}`
        }, { quoted: message })
    }
}

module.exports = { testBotonesCommand }
