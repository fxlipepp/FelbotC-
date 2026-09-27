const assert = require('node:assert/strict');
const { getEconomyConfig, getCommandCost, formatFelCoins, parseAmount, hasSufficientBalance, isOwnerAccount } = require('../lib/felcoins');
const settings = require('../settings');
const { handleEconomyButton, showEconomyMenu } = require('../commands/felcoins');

(async () => {
  const cfg = getEconomyConfig();
  assert.equal(cfg.enabled, false, 'La economía debe iniciar desactivada');
  assert.ok(cfg.commandCosts.play === 100, 'El costo de .play debe quedar en 100 FC');
  assert.equal(await getCommandCost('play'), 100, 'El costo del comando debe venir de la config compartida');
  assert.equal(await getCommandCost('sticker'), 25, 'El costo del comando sticker debe quedar en 25 FC');
  assert.equal(formatFelCoins(5000), '5.000 FC');
  assert.equal(parseAmount('500'), 500);
  assert.equal(hasSufficientBalance(500, 100), true);
  assert.equal(hasSufficientBalance(50, 100), false);
  assert.equal(isOwnerAccount(settings.ownerNumber), true, 'El número principal del owner debe ser considerado propietario');
  assert.equal(isOwnerAccount(settings.ownerLid), true, 'El LID del owner también debe ser considerado propietario');

  const sent = [];
  const fakeSock = {
    sendMessage: async (chatId, payload, extra) => {
      sent.push({ chatId, payload, extra });
      return true;
    },
    relayMessage: async (chatId, payload, extra) => {
      sent.push({ chatId, payload, extra });
      return { key: { id: 'test', remoteJid: chatId, fromMe: false } };
    }
  };

  const testMessage = {
    key: { id: 'test-msg', fromMe: false, remoteJid: '1234567890@s.whatsapp.net' },
    message: { conversation: 'prueba' },
    pushName: 'Tester'
  };

  await handleEconomyButton(fakeSock, '1234567890@s.whatsapp.net', '1234567890@s.whatsapp.net', 'felcoin::juegos', testMessage);
  assert.ok(sent.some((item) => item.payload?.buttonsMessage || String(item.payload?.text || '').includes('JUEGOS FELCOINS')), 'El botón de juegos debe abrir un menú real');

  const safeSock = {
    sendMessage: async () => true,
    relayMessage: async () => ({ key: { id: 'test-econ-menu', remoteJid: '1234567890@s.whatsapp.net', fromMe: false }, message: {} })
  };

  await assert.doesNotReject(
    () => showEconomyMenu(safeSock, '1234567890@s.whatsapp.net', '1234567890@s.whatsapp.net', { pushName: 'Usuario sin key' }),
    'El menú económico no debe romperse si el objeto de mensaje no tiene key'
  );

  console.log('FelCoins tests passed');
})();
