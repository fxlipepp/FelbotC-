const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { getEconomyConfig, getCommandCost, formatFelCoins, parseAmount, hasSufficientBalance, isOwnerAccount, transferBalance, normalizeJid, setEconomyEnabled } = require('../lib/felcoins');
const settings = require('../settings');
const EconomyUser = require('../models/EconomyUser');
const EconomyLog = require('../models/EconomyLog');
const { handleEconomyButton, showEconomyMenu } = require('../commands/felcoins');

(async () => {
  const cfg = getEconomyConfig();
  assert.equal(cfg.enabled, false, 'La economía debe iniciar desactivada');
  assert.ok(cfg.commandCosts.play === 100, 'El costo de .play debe quedar en 100 FC');
  assert.equal(await getCommandCost('play'), 100, 'El costo del comando debe venir de la config compartida');
  assert.equal(await getCommandCost('sticker'), 25, 'El costo del comando sticker debe quedar en 25 FC');
  assert.equal(formatFelCoins(5000), '5.000 FC');
  assert.equal(formatFelCoins(1000000), '1.000.000 FC');
  assert.equal(parseAmount('500'), 500);
  assert.equal(hasSufficientBalance(500, 100), true);
  assert.equal(hasSufficientBalance(50, 100), false);
  assert.equal(isOwnerAccount(settings.ownerNumber), true, 'El número principal del owner debe ser considerado propietario');
  assert.equal(isOwnerAccount(settings.ownerLid), true, 'El LID del owner también debe ser considerado propietario');

  const readyState = mongoose.connection.readyState;
  const findOneOriginal = EconomyUser.findOne;
  const createOriginal = EconomyUser.create;
  const logCreateOriginal = EconomyLog.create;
  Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
  EconomyUser.findOne = async ({ userId }) => {
    const normalized = normalizeJid(userId);
    if (normalized === normalizeJid(settings.ownerNumber)) {
      return {
        userId: normalized,
        name: 'Owner',
        saldo: 0,
        registered: true,
        stats: { trabajos: 0, mineria: 0, juegos: 0, transferencias: 0, robos: 0, victorias: 0, derrotas: 0, ganancias: 0, gastos: 0 },
        empresa: null,
        save: async function () { return this; }
      };
    }
    if (normalized === '1234567890') {
      return {
        userId: normalized,
        name: 'Destinatario',
        saldo: 0,
        registered: true,
        stats: { trabajos: 0, mineria: 0, juegos: 0, transferencias: 0, robos: 0, victorias: 0, derrotas: 0, ganancias: 0, gastos: 0 },
        empresa: null,
        save: async function () { return this; }
      };
    }
    return null;
  };
  EconomyUser.create = async (doc) => ({ ...doc, save: async function () { return this; } });
  EconomyLog.create = async () => ({ ok: true });

  const ownerTransfer = await transferBalance(settings.ownerNumber, '1234567890@s.whatsapp.net', 50, 'transferir');
  assert.equal(ownerTransfer.ok, true, 'El owner debe poder transferir FelCoins aunque tenga saldo infinito');

  Object.defineProperty(mongoose.connection, 'readyState', { value: readyState, configurable: true });
  EconomyUser.findOne = findOneOriginal;
  EconomyUser.create = createOriginal;
  EconomyLog.create = logCreateOriginal;

  await setEconomyEnabled(true);

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

  await setEconomyEnabled(false);
  const disabledSent = [];
  const disabledSock = {
    sendMessage: async (chatId, payload, extra) => {
      disabledSent.push({ chatId, payload, extra });
      return true;
    },
    relayMessage: async () => ({ key: { id: 'test-disabled', remoteJid: '1234567890@s.whatsapp.net', fromMe: false }, message: {} })
  };
  await showEconomyMenu(disabledSock, '1234567890@s.whatsapp.net', '1234567890@s.whatsapp.net', { pushName: 'Usuario' });
  assert.ok(disabledSent.some((item) => String(item.payload?.text || '').includes('ECONOMÍA DESACTIVADA') || String(item.payload?.text || '').includes('desactivado') || String(item.payload?.text || '').includes('owner')), 'Cuando la economía está apagada, el comando debe informar que está desactivada');
  await setEconomyEnabled(true);

  console.log('FelCoins tests passed');
})();
