const { ButtonV2 } = require('../lib/airich')

async function sendTest(sock, chatId, message, title, sender) {
    try {
        await sock.sendMessage(chatId, {
            text: `🧪 ${title}`
        }, { quoted: message })

        await sender()
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
            text: '🧪 TEST COMPLETO DE BOTONES WHATSAPP\n\nVoy a probar formatos legacy, template, list y Native Flow.\n\nLos experimentales también van identificados para saber si tu WhatsApp los muestra.'
        }, { quoted: message })

        // 1. Legacy ButtonsMessage — 1 botón
        await sendTest(sock, chatId, message, '🟦 LEGACY — 1 BOTÓN', async () => {
            const buttons = new ButtonV2(sock)
                .setBody('Legacy ButtonsMessage — 1 botón')
                .setFooter('ButtonV2')
                .addButton('❤️ Aceptar', 'legacy_1')

            await buttons.send(chatId, { quoted: message, viewOnce: false })
        })

        // 2. Legacy ButtonsMessage — 2 botones
        await sendTest(sock, chatId, message, '🟦 LEGACY — 2 BOTONES', async () => {
            const buttons = new ButtonV2(sock)
                .setBody('Legacy ButtonsMessage — 2 botones')
                .setFooter('ButtonV2')
                .addButton('❤️ Opción 1', 'legacy_2_a')
                .addButton('👍 Opción 2', 'legacy_2_b')

            await buttons.send(chatId, { quoted: message, viewOnce: false })
        })

        // 3. Legacy ButtonsMessage — 3 botones
        await sendTest(sock, chatId, message, '🟦 LEGACY — 3 BOTONES', async () => {
            const buttons = new ButtonV2(sock)
                .setBody('Legacy ButtonsMessage — 3 botones')
                .setFooter('ButtonV2')
                .addButton('❤️ Titular', 'legacy_3_a')
                .addButton('👍 Suplente', 'legacy_3_b')
                .addButton('💔 Salir', 'legacy_3_c')

            await buttons.send(chatId, { quoted: message, viewOnce: false })
        })

        // 4. Legacy + NativeFlow single_select
        await sendTest(sock, chatId, message, '🟦 LEGACY + NATIVE FLOW — single_select', async () => {
            await sock.sendMessage(chatId, {
                text: 'Legacy + Native Flow',
                footer: 'type 4 / nativeFlowInfo',
                buttons: [
                    {
                        buttonId: 'legacy_flow_select',
                        buttonText: { displayText: '📋 Abrir opciones' },
                        type: 4,
                        nativeFlowInfo: {
                            name: 'single_select',
                            paramsJson: JSON.stringify({
                                title: 'Opciones',
                                sections: [{
                                    title: 'Prueba',
                                    rows: [
                                        { title: 'Opción 1', description: 'Primera opción', id: 'flow_opt_1' },
                                        { title: 'Opción 2', description: 'Segunda opción', id: 'flow_opt_2' }
                                    ]
                                }]
                            })
                        }
                    }
                ]
            }, { quoted: message })
        })

        // 5. Native quick_reply
        await sendTest(sock, chatId, message, '🟩 NATIVE — quick_reply', async () => {
            await sock.sendMessage(chatId, {
                text: 'Native Flow — Quick Reply',
                footer: 'quick_reply',
                interactiveButtons: [{
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '❤️ Responder',
                        id: 'native_quick_reply'
                    })
                }]
            }, { quoted: message })
        })

        // 6. Native single_select
        await sendTest(sock, chatId, message, '🟩 NATIVE — single_select', async () => {
            await sock.sendMessage(chatId, {
                text: 'Native Flow — Lista',
                footer: 'single_select',
                interactiveButtons: [{
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: 'Abrir lista',
                        sections: [{
                            title: 'Opciones',
                            rows: [
                                { title: 'Opción 1', description: 'Primera', id: 'select_1' },
                                { title: 'Opción 2', description: 'Segunda', id: 'select_2' }
                            ]
                        }]
                    })
                }]
            }, { quoted: message })
        })

        // 7. Native URL
        await sendTest(sock, chatId, message, '🟩 NATIVE — cta_url', async () => {
            await sock.sendMessage(chatId, {
                text: 'Native Flow — URL',
                footer: 'cta_url',
                interactiveButtons: [{
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🌐 Abrir web',
                        url: 'https://www.google.com',
                        merchant_url: 'https://www.google.com'
                    })
                }]
            }, { quoted: message })
        })

        // 8. Native copy
        await sendTest(sock, chatId, message, '🟩 NATIVE — cta_copy', async () => {
            await sock.sendMessage(chatId, {
                text: 'Native Flow — Copiar',
                footer: 'cta_copy',
                interactiveButtons: [{
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📋 Copiar código',
                        id: 'copy_test',
                        copy_code: 'FELBOT_TEST_123'
                    })
                }]
            }, { quoted: message })
        })

        // 9. Native call
        await sendTest(sock, chatId, message, '🟩 NATIVE — cta_call', async () => {
            await sock.sendMessage(chatId, {
                text: 'Native Flow — Llamada',
                footer: 'cta_call',
                interactiveButtons: [{
                    name: 'cta_call',
                    buttonParamsJson: JSON.stringify({
                        display_text: '☎️ Llamar',
                        phone_number: '+573000000000'
                    })
                }]
            }, { quoted: message })
        })

        // 10. Native reminder
        await sendTest(sock, chatId, message, '🟩 NATIVE — cta_reminder', async () => {
            await sock.sendMessage(chatId, {
                text: 'Native Flow — Recordatorio',
                footer: 'cta_reminder',
                interactiveButtons: [{
                    name: 'cta_reminder',
                    buttonParamsJson: JSON.stringify({
                        display_text: '⏰ Recordarme',
                        id: 'reminder_test'
                    })
                }]
            }, { quoted: message })
        })

        // 11. Native cancel reminder
        await sendTest(sock, chatId, message, '🟩 NATIVE — cta_cancel_reminder', async () => {
            await sock.sendMessage(chatId, {
                text: 'Native Flow — Cancelar recordatorio',
                footer: 'cta_cancel_reminder',
                interactiveButtons: [{
                    name: 'cta_cancel_reminder',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🚫 Cancelar',
                        id: 'cancel_reminder_test'
                    })
                }]
            }, { quoted: message })
        })

        // 12. Native location
        await sendTest(sock, chatId, message, '🟩 NATIVE — send_location', async () => {
            await sock.sendMessage(chatId, {
                text: 'Native Flow — Ubicación',
                footer: 'send_location',
                interactiveButtons: [{
                    name: 'send_location',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📍 Enviar ubicación'
                    })
                }]
            }, { quoted: message })
        })

        // 13. Native address
        await sendTest(sock, chatId, message, '🟩 NATIVE — address_message', async () => {
            await sock.sendMessage(chatId, {
                text: 'Native Flow — Dirección',
                footer: 'address_message',
                interactiveButtons: [{
                    name: 'address_message',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🏠 Enviar dirección'
                    })
                }]
            }, { quoted: message })
        })

        // 14. Native catalog
        await sendTest(sock, chatId, message, '🟨 NATIVE — cta_catalog', async () => {
            await sock.sendMessage(chatId, {
                text: 'Native Flow — Catálogo',
                footer: 'cta_catalog',
                interactiveButtons: [{
                    name: 'cta_catalog',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🛍️ Abrir catálogo',
                        business_phone_number: '573000000000'
                    })
                }]
            }, { quoted: message })
        })

        // 15. Native webview
        await sendTest(sock, chatId, message, '🟨 NATIVE — open_webview', async () => {
            await sock.sendMessage(chatId, {
                text: 'Native Flow — WebView',
                footer: 'open_webview',
                interactiveButtons: [{
                    name: 'open_webview',
                    buttonParamsJson: JSON.stringify({
                        title: '🌐 Abrir página',
                        link: {
                            in_app_webview: true,
                            url: 'https://www.google.com'
                        }
                    })
                }]
            }, { quoted: message })
        })

        // 16. Native cta_reply (variante encontrada en forks)
        await sendTest(sock, chatId, message, '🟨 NATIVE — cta_reply', async () => {
            await sock.sendMessage(chatId, {
                text: 'Native Flow — CTA Reply',
                footer: 'cta_reply',
                interactiveButtons: [{
                    name: 'cta_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '💬 Responder',
                        id: 'cta_reply_test'
                    })
                }]
            }, { quoted: message })
        })

        // 17. Native call permission (experimental)
        await sendTest(sock, chatId, message, '🟨 NATIVE — call_permission_request', async () => {
            await sock.sendMessage(chatId, {
                text: 'Native Flow — Permiso de llamadas',
                footer: 'experimental',
                interactiveButtons: [{
                    name: 'call_permission_request',
                    buttonParamsJson: JSON.stringify({
                        has_multiple_buttons: true
                    })
                }]
            }, { quoted: message })
        })

        // 18. Template URL + call + quick reply
        await sendTest(sock, chatId, message, '🟪 TEMPLATE — URL + CALL + REPLY', async () => {
            await sock.sendMessage(chatId, {
                text: 'TemplateMessage — tres acciones',
                footer: 'Template Buttons',
                templateButtons: [
                    {
                        index: 0,
                        urlButton: {
                            displayText: '🌐 Abrir web',
                            url: 'https://www.google.com'
                        }
                    },
                    {
                        index: 1,
                        callButton: {
                            displayText: '☎️ Llamar',
                            phoneNumber: '+573000000000'
                        }
                    },
                    {
                        index: 2,
                        quickReplyButton: {
                            displayText: '💬 Responder',
                            id: 'template_reply'
                        }
                    }
                ]
            }, { quoted: message })
        })

        // 19. List Message
        await sendTest(sock, chatId, message, '🟧 LIST MESSAGE — SECCIONES', async () => {
            await sock.sendMessage(chatId, {
                text: 'List Message — menú',
                title: 'Menú de prueba',
                footer: 'Lista de WhatsApp',
                buttonText: '📋 Abrir lista',
                sections: [
                    {
                        title: 'Opciones',
                        rows: [
                            { title: 'Opción 1', description: 'Primera opción', rowId: 'list_1' },
                            { title: 'Opción 2', description: 'Segunda opción', rowId: 'list_2' }
                        ]
                    },
                    {
                        title: 'Más opciones',
                        rows: [
                            { title: 'Opción 3', description: 'Tercera opción', rowId: 'list_3' },
                            { title: 'Opción 4', description: 'Cuarta opción', rowId: 'list_4' }
                        ]
                    }
                ]
            }, { quoted: message })
        })

        // 20. Raw buttons array
        await sendTest(sock, chatId, message, '🟦 RAW BUTTONS — buttons[]', async () => {
            await sock.sendMessage(chatId, {
                text: 'Raw Buttons',
                footer: 'buttons[]',
                buttons: [
                    {
                        buttonId: 'raw_1',
                        buttonText: { displayText: '❤️ Raw 1' },
                        type: 1
                    },
                    {
                        buttonId: 'raw_2',
                        buttonText: { displayText: '👍 Raw 2' },
                        type: 1
                    },
                    {
                        buttonId: 'raw_3',
                        buttonText: { displayText: '💔 Raw 3' },
                        type: 1
                    }
                ]
            }, { quoted: message })
        })

        // 21. Mixed raw + native flow
        await sendTest(sock, chatId, message, '🟦 MIXED — LEGACY + NATIVE', async () => {
            await sock.sendMessage(chatId, {
                text: 'Mixed Buttons',
                footer: 'type 1 + type 4',
                buttons: [
                    {
                        buttonId: 'mixed_classic',
                        buttonText: { displayText: '❤️ Clásico' },
                        type: 1
                    },
                    {
                        buttonId: 'mixed_select',
                        buttonText: { displayText: '📋 Lista' },
                        type: 4,
                        nativeFlowInfo: {
                            name: 'single_select',
                            paramsJson: JSON.stringify({
                                title: 'Opciones',
                                sections: [{
                                    title: 'Menú',
                                    rows: [
                                        { title: 'A', description: 'Opción A', id: 'mixed_a' },
                                        { title: 'B', description: 'Opción B', id: 'mixed_b' }
                                    ]
                                }]
                            })
                        }
                    }
                ]
            }, { quoted: message })
        })

        await sock.sendMessage(chatId, {
            text: '✅ TEST COMPLETO TERMINADO\n\nProbamos:\n• Legacy / ButtonV2\n• Raw buttons[]\n• Native Flow\n• Template Buttons\n• List Message\n• URL / Copy / Call\n• Quick Reply / Select\n• Reminder / Location / Address\n• Catálogo / WebView\n• Variantes experimentales\n\nDime cuáles aparecen correctamente y cuáles no. Con eso dejamos .versus con el formato que realmente funciona en tu WhatsApp.'
        }, { quoted: message })

    } catch (error) {
        console.error('[TESTBOTONES] Error general:', error)

        await sock.sendMessage(chatId, {
            text: `❌ Error en .testbotones:\n${error.message}`
        }, { quoted: message })
    }
}

module.exports = { testBotonesCommand }
