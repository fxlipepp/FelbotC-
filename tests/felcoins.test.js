const assert = require('node:assert/strict');
const { getEconomyConfig, getCommandCost, formatFelCoins, parseAmount, hasSufficientBalance } = require('../lib/felcoins');
const { handleEconomyButton } = require('../commands/felcoins');

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

  console.log('FelCoins tests passed');
})();
