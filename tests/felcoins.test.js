const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { getEconomyConfig, getCommandCost, formatFelCoins, parseAmount, hasSufficientBalance, isOwnerAccount, transferBalance, normalizeJid, setEconomyEnabled, resolveRobbery, hasRoyalProtection, resetEconomyState, claimWork } = require('../lib/felcoins');
const settings = require('../settings');
const EconomyUser = require('../models/EconomyUser');
const EconomyLog = require('../models/EconomyLog');
const EconomyRob = require('../models/EconomyRob');
const EconomyConfig = require('../models/EconomyConfig');
const { handleEconomyButton, showEconomyMenu, showPerfil, isEconomyCommand, formatEconomyLabel } = require('../commands/felcoins');

(async () => {
  const cfg = getEconomyConfig();
  assert.equal(cfg.enabled, false, 'La economía debe iniciar desactivada');
  assert.ok(cfg.commandCosts.play === 500, 'El costo de .play debe quedar en 500 FC');
  assert.equal(await getCommandCost('play'), 500, 'El costo del comando debe venir de la config compartida');
  assert.equal(await getCommandCost('sticker'), 25, 'El costo del comando sticker debe quedar en 25 FC');
  assert.equal(formatFelCoins(5000), '5.000 FC');
  assert.equal(formatFelCoins(1000000), '1.000.000 FC');
  assert.equal(parseAmount('500'), 500);
  assert.equal(hasSufficientBalance(500, 100), true);
  assert.equal(hasSufficientBalance(50, 100), false);
  assert.equal(isOwnerAccount(settings.ownerNumber), true, 'El número principal del owner debe ser considerado propietario');
  assert.equal(isOwnerAccount(settings.ownerLid), true, 'El LID del owner también debe ser considerado propietario');
  assert.equal(hasRoyalProtection({ modoRey: true }), true, 'El modo rey debe proteger al usuario del modo admin');
  assert.equal(hasRoyalProtection({ modoRey: false }), false, 'Sin modo rey, la protección debe estar desactivada');
  assert.equal(formatEconomyLabel('523123456789@s.whatsapp.net'), '@6789', 'La etiqueta pública no debe mostrar un número enorme de WhatsApp');
  assert.equal(isEconomyCommand('.saldo'), true, 'Los comandos de economía deben quedar exentos del modo admin del grupo');
  assert.equal(isEconomyCommand('.transferir 100 @usuario'), true, 'Las transferencias de FelCoins también deben quedar exentas');
  assert.equal(isEconomyCommand('.play una cancion'), true, 'Los comandos con costo también deben quedar exentos del modo admin');
  assert.equal(isEconomyCommand('.sticker'), true, 'Los stickers con costo deben quedar exentos del modo admin');
  assert.equal(isEconomyCommand('.hello'), false, 'Los comandos ajenos no deben ser tratados como de economía');

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

  const robFindOneOriginal = EconomyRob.findOne;
  const victimOwnerId = normalizeJid(settings.ownerNumber);
  const attackerId = '1234567890';
  const attackerUser = {
    userId: attackerId,
    name: 'Ladrón',
    saldo: 400,
    registered: true,
    stats: { trabajos: 0, mineria: 0, juegos: 0, transferencias: 0, robos: 0, victorias: 0, derrotas: 0, ganancias: 0, gastos: 0 },
    save: async function () { return this; }
  };
  const ownerUser = {
    userId: victimOwnerId,
    name: 'Owner',
    saldo: 9999999999999,
    registered: true,
    stats: { trabajos: 0, mineria: 0, juegos: 0, transferencias: 0, robos: 0, victorias: 0, derrotas: 0, ganancias: 0, gastos: 0 },
    save: async function () { return this; }
  };
  const userMap = new Map([[attackerId, attackerUser], [victimOwnerId, ownerUser]]);
  EconomyUser.findOne = async ({ userId }) => userMap.get(normalizeJid(userId)) || null;
  EconomyUser.find = async () => [
    { userId: '111111111', saldo: 2500, registered: true, name: 'A', stats: { trabajos: 2, mineria: 1, juegos: 4, transferencias: 1, robos: 0, victorias: 2, derrotas: 1, ganancias: 500, gastos: 100 }, empresa: 'ropa', inventory: { glove: { quantity: 1 } }, modoAdmin: true, modoRey: true, save: async function () { return this; } },
    { userId: '222222222', saldo: 900, registered: true, name: 'B', stats: { trabajos: 1, mineria: 0, juegos: 2, transferencias: 0, robos: 1, victorias: 1, derrotas: 1, ganancias: 200, gastos: 50 }, empresa: null, inventory: {}, modoAdmin: false, modoRey: false, save: async function () { return this; } }
  ];
  EconomyRob.findOne = async () => ({
    attacker: attackerId,
    victim: victimOwnerId,
    amount: 400,
    status: 'pending',
    expiresAt: new Date(Date.now() + 60000),
    save: async function () { this.status = 'blocked'; return this; }
  });

  const robberyResult = await resolveRobbery(attackerId, settings.ownerNumber, true);
  assert.equal(robberyResult.penalty, 500, 'Si intentan robar al owner, la multa debe ser 500 FC');
  assert.equal(attackerUser.saldo, -100, 'Si el atacante no tiene 500, debe quedar en deuda negativa');

  const resetResult = await resetEconomyState();
  assert.equal(resetResult.resetCount, 2, 'El reinicio debe limpiar todas las economías no owner');
  assert.equal(resetResult.ownerPreserved, true, 'El owner no debe perder su saldo virtual');

  const profileUser = {
    userId: '1234567890',
    name: 'Perfil User',
    saldo: 5000,
    registered: true,
    stats: {
      trabajos: 3,
      mineria: 2,
      juegos: 7,
      transferencias: 5,
      robos: 4,
      victorias: 11,
      derrotas: 9,
      ganancias: 1500,
      gastos: 400
    },
    empresa: null,
    modoAdmin: false,
    save: async function () { return this; }
  };
  EconomyUser.findOne = async ({ userId }) => normalizeJid(userId) === '1234567890' ? profileUser : null;
  const configFindOneOriginal = EconomyConfig.findOne;
  EconomyConfig.findOne = () => ({
    lean: () => ({
      key: 'main',
      enabled: true,
      commandCosts: { play: 500, sticker: 25 },
      rewards: { daily: 300 },
      prices: {},
      cooldowns: {},
      limits: {},
      companies: {}
    })
  });
  Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
  const profileSent = [];
  const profileSock = {
    sendMessage: async (chatId, payload, extra) => {
      profileSent.push({ chatId, payload, extra });
      return true;
    }
  };
  await showPerfil(profileSock, '1234567890@s.whatsapp.net', '1234567890@s.whatsapp.net', { pushName: 'Perfil User' });
  assert.ok(profileSent.some((item) => String(item.payload?.text || '').includes('Victorias: 11') && String(item.payload?.text || '').includes('Derrotas: 9') && String(item.payload?.text || '').includes('Ganancias: 1.500 FC') && String(item.payload?.text || '').includes('Gastos: 400 FC')), 'El perfil debe mostrar las estadísticas reales del usuario');

  const workUser = {
    userId: '9876543210',
    name: 'Trabajo User',
    saldo: 0,
    registered: true,
    stats: { trabajos: 0, mineria: 0, juegos: 0, transferencias: 0, robos: 0, victorias: 0, derrotas: 0, ganancias: 0, gastos: 0 },
    workState: null,
    save: async function () { return this; }
  };
  EconomyUser.findOne = async ({ userId }) => normalizeJid(userId) === '9876543210' ? workUser : null;
  EconomyConfig.findOne = () => ({
    lean: () => ({
      key: 'main',
      enabled: true,
      commandCosts: { play: 500, sticker: 25 },
      rewards: { daily: 300, work: { min: 200, max: 900 } },
      prices: {},
      cooldowns: {},
      limits: {},
      companies: {}
    })
  });
  const workReward = await claimWork('9876543210@s.whatsapp.net');
  assert.equal(workReward.ok, true, 'El trabajo debe iniciar correctamente sin pagar aún el premio final');
  assert.equal(workUser.saldo, 0, 'El trabajo no debe abonar saldo antes de que el usuario elija la ruta');

  workUser.workState = { type: 'delivery', step: 'route', reward: workReward.amount };
  const workSent = [];
  const workSock = {
    sendMessage: async (chatId, payload, extra) => {
      workSent.push({ chatId, payload, extra });
      return true;
    }
  };
  await handleEconomyButton(workSock, '9876543210@s.whatsapp.net', '9876543210@s.whatsapp.net', 'felcoin::work::safe', { pushName: 'Trabajo User' });
  assert.ok(workSent.some((item) => String(item.payload?.text || '').includes('RUTA SEGURA') && String(item.payload?.text || '').includes('520 FC')), 'La ruta seleccionada debe mostrar el resultado final del trabajo');
  assert.equal(workUser.saldo, 520, 'La recompensa del trabajo debe aplicarse sólo cuando se seleccione la ruta');

  Object.defineProperty(mongoose.connection, 'readyState', { value: readyState, configurable: true });
  EconomyUser.findOne = findOneOriginal;
  EconomyUser.create = createOriginal;
  EconomyLog.create = logCreateOriginal;
  EconomyRob.findOne = robFindOneOriginal;
  EconomyConfig.findOne = configFindOneOriginal;

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
