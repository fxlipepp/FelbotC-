const mongoose = require('mongoose');
const settings = require('../settings');
const EconomyConfig = require('../models/EconomyConfig');
const EconomyUser = require('../models/EconomyUser');
const EconomyLog = require('../models/EconomyLog');
const EconomyRob = require('../models/EconomyRob');

const OWNER_VIRTUAL_BALANCE = 9999999999999;
const OWNER_DISPLAY_BALANCE = 1000000;

const DEFAULT_CONFIG = {
  enabled: false,
  commandCosts: {
    play: 100,
    sticker: 25,
    menu: 0,
    transferir: 0,
    daily: 0
  },
  rewards: {
    daily: 300,
    work: { min: 200, max: 900 },
    mine: { min: 50, max: 1500 },
    robbery: { min: 120, max: 800 },
    business: {
      ropa: 100,
      pizzeria: 250,
      gamer: 500,
      tecnologia: 900,
      banco: 1300,
      felbot: 2000
    }
  },
  prices: {
    glove: 1200,
    multiplier: 3500,
    pico: 4000,
    admin24: 20000,
    adminInfinity: 1000000,
    ropa: 5000,
    pizzeria: 15000,
    gamer: 35000,
    tecnologia: 75000,
    banco: 150000,
    felbot: 500000
  },
  cooldowns: {
    work: 20 * 60 * 1000,
    mine: 5 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
    rob: 15 * 60 * 1000
  },
  limits: {
    robPercent: 0.25,
    robMin: 100,
    robMax: 8000,
    transferMin: 1,
    transferMax: 100000000
  },
  companies: {
    ropa: { price: 5000, income: 100 },
    pizzeria: { price: 15000, income: 250 },
    gamer: { price: 35000, income: 500 },
    tecnologia: { price: 75000, income: 900 },
    banco: { price: 150000, income: 1300 },
    felbot: { price: 500000, income: 2000 }
  }
};

function normalizeJid(value = '') {
  if (!value) return '';
  return String(value).split(':')[0].replace(/[^0-9]/g, '');
}

function normalizeOwnerId(value = '') {
  const candidates = [value || '', settings.ownerNumber, settings.OWNER_NUMBER, settings.ownerLid]
    .filter(Boolean)
    .map((entry) => normalizeJid(entry))
    .filter(Boolean);

  return candidates[0] || '';
}

function isOwnerAccount(userId = '') {
  const id = normalizeJid(userId || '');
  if (!id) return false;

  const ownerIds = [settings.ownerNumber, settings.OWNER_NUMBER, settings.ownerLid]
    .filter(Boolean)
    .map((entry) => normalizeJid(entry))
    .filter(Boolean);

  return ownerIds.includes(id);
}

function formatFelCoins(value = 0) {
  if (value === Infinity || value === Number.POSITIVE_INFINITY || value === '∞' || value === 'infinito' || value === 'infinite') return '1.000.000 FC';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '1.000.000 FC';
  const whole = Math.floor(Math.abs(numeric));
  const sign = numeric < 0 ? '-' : '';
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}${grouped} FC`;
}

function parseAmount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string') {
    const clean = value.replace(/[^0-9.-]/g, '');
    if (!clean || clean === '-' || clean === '.') return 0;
    const parsed = Number(clean);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.floor(parsed));
  }
  return 0;
}

function hasSufficientBalance(balance = 0, required = 0) {
  const current = Number(balance) || 0;
  const needed = Number(required) || 0;
  return current >= needed;
}

async function getCommandCost(commandName = '') {
  const key = String(commandName || '').toLowerCase().trim();
  if (!key) return 0;
  const config = await ensureEconomyConfig();
  const byCommand = config.commandCosts || DEFAULT_CONFIG.commandCosts;
  const value = Number(byCommand[key] ?? byCommand[commandName] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

async function chargeCommandCost(userId, commandName, options = {}) {
  const command = String(commandName || '').toLowerCase().trim();
  if (!command) return { ok: true, cost: 0, charged: false };

  const cost = await getCommandCost(command);
  if (cost <= 0) return { ok: true, cost: 0, charged: false };

  const user = await ensureEconomyUser(userId, options.name || 'Usuario');
  if (!user || !user.registered) {
    return { ok: false, cost, reason: 'not_registered', charged: false };
  }

  if (isOwnerAccount(userId)) {
    return { ok: true, cost, charged: false };
  }

  const balance = Number(user.saldo || 0);
  if (balance < cost) {
    return { ok: false, cost, reason: 'insufficient', charged: false, balance };
  }

  user.saldo = balance - cost;
  await user.save();
  await EconomyLog.create({
    userId: normalizeJid(userId),
    command,
    amount: -cost,
    type: 'debit',
    description: options.description || `Costo de ${command}`,
    createdAt: new Date()
  });

  return { ok: true, cost, charged: true, balance: user.saldo };
}

function safeJsonCopy(value, fallback = {}) {
  try {
    if (!value) return JSON.parse(JSON.stringify(fallback));
    return JSON.parse(JSON.stringify(value));
  } catch {
    return JSON.parse(JSON.stringify(fallback));
  }
}

function getEconomyConfig() {
  return { ...DEFAULT_CONFIG };
}

async function ensureEconomyConfig() {
  if (mongoose.connection.readyState !== 1) {
    return getEconomyConfig();
  }

  let config = await EconomyConfig.findOne({ key: 'main' }).lean();
  if (!config) {
    const created = new EconomyConfig({ key: 'main', ...DEFAULT_CONFIG });
    await created.save();
    config = created.toObject();
  }

  const merged = safeJsonCopy(config);
  merged.commandCosts = { ...DEFAULT_CONFIG.commandCosts, ...(merged.commandCosts || {}) };
  merged.rewards = { ...DEFAULT_CONFIG.rewards, ...(merged.rewards || {}) };
  merged.prices = { ...DEFAULT_CONFIG.prices, ...(merged.prices || {}) };
  merged.cooldowns = { ...DEFAULT_CONFIG.cooldowns, ...(merged.cooldowns || {}) };
  merged.limits = { ...DEFAULT_CONFIG.limits, ...(merged.limits || {}) };
  merged.companies = { ...DEFAULT_CONFIG.companies, ...(merged.companies || {}) };
  return merged;
}

async function saveEconomyConfig(updates = {}) {
  if (mongoose.connection.readyState !== 1) {
    return { ...DEFAULT_CONFIG, ...updates };
  }

  const current = await ensureEconomyConfig();
  const merged = {
    ...current,
    ...updates,
    commandCosts: { ...current.commandCosts, ...(updates.commandCosts || {}) },
    rewards: { ...current.rewards, ...(updates.rewards || {}) },
    prices: { ...current.prices, ...(updates.prices || {}) },
    cooldowns: { ...current.cooldowns, ...(updates.cooldowns || {}) },
    limits: { ...current.limits, ...(updates.limits || {}) },
    companies: { ...current.companies, ...(updates.companies || {}) }
  };

  await EconomyConfig.findOneAndUpdate({ key: 'main' }, { $set: merged }, { upsert: true, new: true });
  return merged;
}

async function getEconomyEnabled() {
  const config = await ensureEconomyConfig();
  return Boolean(config.enabled);
}

async function setEconomyEnabled(value) {
  const config = await ensureEconomyConfig();
  config.enabled = Boolean(value);
  await saveEconomyConfig({ enabled: config.enabled });
  return config.enabled;
}

async function ensureEconomyUser(userId, name = 'Usuario') {
  const id = normalizeJid(userId || '');
  if (!id) return null;

  if (mongoose.connection.readyState !== 1) {
    return {
      userId: id,
      name: name || 'Usuario',
      saldo: 0,
      registered: false,
      stats: { trabajos: 0, mineria: 0, juegos: 0, transferencias: 0, robos: 0, victorias: 0, derrotas: 0, ganancias: 0, gastos: 0 },
      empresa: null,
      ingresoDiario: 0,
      inventory: {},
      modoAdmin: false,
      protectionUntil: null,
      lastDaily: null,
      lastWork: null,
      lastMine: null,
      lastRob: null
    };
  }

  let user = await EconomyUser.findOne({ userId: id });
  if (!user) {
    user = await EconomyUser.create({
      userId: id,
      name: name || 'Usuario',
      registered: false,
      saldo: 0,
      empresa: null,
      ingresoDiario: 0,
      inventory: {},
      stats: {
        trabajos: 0,
        mineria: 0,
        juegos: 0,
        transferencias: 0,
        robos: 0,
        victorias: 0,
        derrotas: 0,
        ganancias: 0,
        gastos: 0
      }
    });
  }

  if (name && String(user.name || '').trim() === '') {
    user.name = String(name).slice(0, 50);
    if (typeof user.save === 'function') {
      await user.save();
    }
  }

  return user;
}

async function registerEconomyUser(userId, name = 'Usuario') {
  const id = normalizeJid(userId || '');
  if (!id) return null;

  let user = await ensureEconomyUser(id, name);
  if (!user) return null;

  if (user.registered) return user;

  user.name = String(name || user.name || 'Usuario').slice(0, 50);
  user.registered = true;
  user.saldo = 0;
  user.empresa = user.empresa || null;
  user.ingresoDiario = user.ingresoDiario || 0;
  user.modoAdmin = Boolean(user.modoAdmin);
  user.updatedAt = new Date();
  await user.save();
  return user;
}

async function getBalance(userId) {
  const user = await ensureEconomyUser(userId, 'Usuario');
  if (!user) return 0;
  if (isOwnerAccount(userId)) return OWNER_VIRTUAL_BALANCE;
  return Number(user.saldo || 0);
}

function getOwnerDisplayBalance() {
  return OWNER_DISPLAY_BALANCE;
}

async function addBalance(userId, amount, command = 'system', description = '') {
  const id = normalizeJid(userId || '');
  if (!id) return 0;
  const numeric = Number(amount) || 0;
  if (isOwnerAccount(id)) return Number.POSITIVE_INFINITY;

  if (mongoose.connection.readyState !== 1) {
    return numeric;
  }

  const user = await ensureEconomyUser(id, 'Usuario');
  if (!user) return 0;

  user.saldo = Number(user.saldo || 0) + numeric;
  if (user.saldo < 0) user.saldo = 0;
  await user.save();

  await EconomyLog.create({
    userId: id,
    command,
    amount: numeric,
    type: numeric >= 0 ? 'credit' : 'debit',
    description: description || command,
    createdAt: new Date()
  });

  return Number(user.saldo || 0);
}

async function deductBalance(userId, amount, command = 'system', description = '') {
  const id = normalizeJid(userId || '');
  if (!id) return 0;
  if (isOwnerAccount(id)) return Number.POSITIVE_INFINITY;

  const numeric = Number(amount) || 0;
  if (numeric <= 0) return Number((await ensureEconomyUser(id))?.saldo || 0);

  if (mongoose.connection.readyState !== 1) {
    return 0;
  }

  const user = await ensureEconomyUser(id, 'Usuario');
  if (!user) return 0;

  const previous = Number(user.saldo || 0);
  const next = Math.max(0, previous - numeric);
  user.saldo = next;
  await user.save();

  await EconomyLog.create({
    userId: id,
    command,
    amount: -numeric,
    type: 'debit',
    description: description || command,
    createdAt: new Date()
  });

  return Number(user.saldo || 0);
}

async function transferBalance(senderId, recipientId, amount, command = 'transferir') {
  const sender = normalizeJid(senderId || '');
  const recipient = normalizeJid(recipientId || '');
  if (!sender || !recipient || sender === recipient || amount <= 0) return { ok: false, reason: 'invalid' };

  const senderIsOwner = isOwnerAccount(sender);
  const recipientIsOwner = isOwnerAccount(recipient);

  const senderUser = await ensureEconomyUser(sender, 'Usuario');
  const recipientUser = await ensureEconomyUser(recipient, 'Usuario');
  if (!senderUser || !recipientUser) return { ok: false, reason: 'not_registered' };
  if (!senderIsOwner && !senderUser.registered) return { ok: false, reason: 'not_registered' };
  if (!recipientIsOwner && !recipientUser.registered) return { ok: false, reason: 'not_registered' };

  if (!senderIsOwner && (Number(senderUser.saldo) || 0) < amount) return { ok: false, reason: 'insufficient' };

  if (senderIsOwner) {
    recipientUser.saldo = Number(recipientUser.saldo || 0) + amount;
    recipientUser.stats = recipientUser.stats || {};
    recipientUser.stats.ganancias = Number(recipientUser.stats.ganancias || 0) + amount;
    await recipientUser.save();
    await EconomyLog.create({
      userId: sender,
      command,
      amount: -amount,
      type: 'transfer',
      description: `Transferencia enviada a ${recipient}`
    });
    await EconomyLog.create({
      userId: recipient,
      command,
      amount,
      type: 'transfer',
      description: `Transferencia recibida de ${sender}`
    });

    return { ok: true, amount, senderBalance: Number.POSITIVE_INFINITY, recipientBalance: recipientUser.saldo };
  }

  senderUser.saldo = Number(senderUser.saldo || 0) - amount;
  recipientUser.saldo = Number(recipientUser.saldo || 0) + amount;
  senderUser.stats = senderUser.stats || {};
  recipientUser.stats = recipientUser.stats || {};
  senderUser.stats.transferencias = Number(senderUser.stats.transferencias || 0) + 1;
  recipientUser.stats.ganancias = Number(recipientUser.stats.ganancias || 0) + amount;

  await Promise.all([senderUser.save(), recipientUser.save()]);
  await EconomyLog.create({
    userId: sender,
    command,
    amount: -amount,
    type: 'transfer',
    description: `Transferencia enviada a ${recipient}`
  });
  await EconomyLog.create({
    userId: recipient,
    command,
    amount,
    type: 'transfer',
    description: `Transferencia recibida de ${sender}`
  });

  return { ok: true, amount, senderBalance: senderUser.saldo, recipientBalance: recipientUser.saldo };
}

async function getTopUsers(limit = 10) {
  if (mongoose.connection.readyState !== 1) return [];
  const users = await EconomyUser.find({ registered: true }).sort({ saldo: -1, name: 1 }).limit(limit).lean();
  return users.map((user, index) => ({ ...user, rank: index + 1 }));
}

async function getUserPosition(userId) {
  const users = await getTopUsers(200);
  const target = normalizeJid(userId || '');
  const idx = users.findIndex((item) => normalizeJid(item.userId) === target);
  return idx >= 0 ? idx + 1 : users.length + 1;
}

async function getRemainingCooldown(userId, key) {
  const config = await ensureEconomyConfig();
  const now = Date.now();
  const user = await ensureEconomyUser(userId, 'Usuario');
  if (!user) return 0;

  const lastField = {
    daily: 'lastDaily',
    work: 'lastWork',
    mine: 'lastMine',
    rob: 'lastRob'
  }[key];

  if (!lastField) return 0;
  const lastAt = user[lastField] ? new Date(user[lastField]).getTime() : 0;
  const cooldown = Number(config.cooldowns?.[key] || 0);
  if (!lastAt || cooldown <= 0) return 0;
  const remaining = lastAt + cooldown - now;
  return Math.max(0, remaining);
}

async function canClaimDaily(userId) {
  const remaining = await getRemainingCooldown(userId, 'daily');
  return remaining <= 0;
}

async function claimDaily(userId) {
  const id = normalizeJid(userId || '');
  if (!id) return { ok: false, reason: 'invalid' };
  const user = await ensureEconomyUser(id, 'Usuario');
  if (!user || !user.registered) return { ok: false, reason: 'not_registered' };

  const remaining = await getRemainingCooldown(id, 'daily');
  if (remaining > 0) {
    return { ok: false, reason: 'cooldown', remaining };
  }

  const config = await ensureEconomyConfig();
  const reward = Number(config.rewards?.daily || 300);
  user.lastDaily = new Date();
  user.saldo = Number(user.saldo || 0) + reward;
  await user.save();
  await EconomyLog.create({ userId: id, command: 'diaria', amount: reward, type: 'reward', description: 'Recompensa diaria' });
  return { ok: true, amount: reward, saldo: user.saldo, remaining: 0 };
}

async function claimWork(userId) {
  const id = normalizeJid(userId || '');
  if (!id) return { ok: false, reason: 'invalid' };
  const user = await ensureEconomyUser(id, 'Usuario');
  if (!user || !user.registered) return { ok: false, reason: 'not_registered' };

  const remaining = await getRemainingCooldown(id, 'work');
  if (remaining > 0) return { ok: false, reason: 'cooldown', remaining };

  const config = await ensureEconomyConfig();
  const range = config.rewards?.work || { min: 200, max: 900 };
  const reward = Math.floor(Math.random() * (Number(range.max) - Number(range.min) + 1)) + Number(range.min);
  const maxMultiplier = user.modoAdmin ? 1.4 : 1;
  const finalReward = Math.round(reward * maxMultiplier);

  user.lastWork = new Date();
  user.saldo = Number(user.saldo || 0) + finalReward;
  user.stats = user.stats || {};
  user.stats.trabajos = Number(user.stats.trabajos || 0) + 1;
  user.stats.ganancias = Number(user.stats.ganancias || 0) + finalReward;
  await user.save();

  await EconomyLog.create({ userId: id, command: 'trabajar', amount: finalReward, type: 'reward', description: 'Trabajo completado' });
  return { ok: true, amount: finalReward, saldo: user.saldo };
}

async function claimMine(userId) {
  const id = normalizeJid(userId || '');
  if (!id) return { ok: false, reason: 'invalid' };
  const user = await ensureEconomyUser(id, 'Usuario');
  if (!user || !user.registered) return { ok: false, reason: 'not_registered' };

  const remaining = await getRemainingCooldown(id, 'mine');
  if (remaining > 0) return { ok: false, reason: 'cooldown', remaining };

  const minerals = [
    { name: 'carbón', value: 80 },
    { name: 'plata', value: 250 },
    { name: 'oro', value: 500 },
    { name: 'diamante', value: 800 },
    { name: 'cristal raro', value: 1500 }
  ];

  const pick = minerals[Math.floor(Math.random() * minerals.length)];
  const multiplier = user.inventory?.pico ? 1.25 : 1;
  const reward = Math.round(pick.value * multiplier);

  user.lastMine = new Date();
  user.saldo = Number(user.saldo || 0) + reward;
  user.stats = user.stats || {};
  user.stats.mineria = Number(user.stats.mineria || 0) + 1;
  user.stats.ganancias = Number(user.stats.ganancias || 0) + reward;
  await user.save();

  await EconomyLog.create({ userId: id, command: 'minar', amount: reward, type: 'reward', description: `${pick.name} encontrado` });
  return { ok: true, mineral: pick.name, amount: reward, saldo: user.saldo };
}

async function getCompanyIncome(userId) {
  const user = await ensureEconomyUser(userId, 'Usuario');
  if (!user || !user.empresa) return 0;
  const config = await ensureEconomyConfig();
  const companyConfig = config.companies?.[user.empresa];
  if (!companyConfig) return 0;
  const income = Number(companyConfig.income || 0);
  return income;
}

async function computeCompanyIncome(userId) {
  const id = normalizeJid(userId || '');
  if (!id) return { ok: false };
  const user = await ensureEconomyUser(id, 'Usuario');
  if (!user || !user.empresa) return { ok: false, reason: 'no_empresa' };

  const config = await ensureEconomyConfig();
  const company = config.companies?.[user.empresa];
  if (!company) return { ok: false, reason: 'desconocida' };

  const income = Number(company.income || 0);
  const currentBalance = Number(user.saldo || 0) + income;
  user.saldo = currentBalance;
  user.companyLastPaidAt = new Date();
  await user.save();
  await EconomyLog.create({ userId: id, command: 'empresa', amount: income, type: 'reward', description: `Ingreso de ${user.empresa}` });

  return { ok: true, empresa: user.empresa, amount: income, saldo: user.saldo };
}

async function getEconomyMenuText(userId, name = 'Usuario') {
  const user = await ensureEconomyUser(userId, name);
  const config = await ensureEconomyConfig();
  const balance = isOwnerAccount(userId) ? getOwnerDisplayBalance() : Number(user?.saldo || 0);
  const empresaText = user?.empresa ? user.empresa : 'Ninguna';
  return `💰 *FELCOINS*

👤 ${name || user?.name || 'Usuario'}
💵 Saldo: ${formatFelCoins(balance)}

¿Qué quieres hacer?`;
}

async function canUseEconomy(userId) {
  const enabled = await getEconomyEnabled();
  if (!enabled) return false;
  return true;
}

async function getPendingRobForVictim(victimId) {
  const victim = normalizeJid(victimId || '');
  if (!victim) return null;
  if (mongoose.connection.readyState !== 1) return null;
  return EconomyRob.findOne({ victim, status: 'pending', expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).lean();
}

async function createRobbery(attackerId, victimId, amount = 0) {
  const attacker = normalizeJid(attackerId || '');
  const victim = normalizeJid(victimId || '');
  if (!attacker || !victim || attacker === victim) return null;

  const doc = await EconomyRob.create({
    attacker,
    victim,
    amount,
    status: 'pending',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    createdAt: new Date()
  });

  return doc;
}

async function resolveRobbery(attackerId, victimId, protectedByVictim = false) {
  const attacker = normalizeJid(attackerId || '');
  const victim = normalizeJid(victimId || '');
  if (!attacker || !victim) return { ok: false };

  if (mongoose.connection.readyState !== 1) return { ok: false };

  const robbery = await EconomyRob.findOne({ attacker, victim, status: 'pending' }).sort({ createdAt: -1 });
  if (!robbery) return { ok: false, reason: 'none' };

  if (protectedByVictim) {
    const penalty = Math.min(300, Number(robbery.amount || 300));
    const attackerUser = await ensureEconomyUser(attacker, 'Usuario');
    if (attackerUser && !isOwnerAccount(attacker)) {
      const attackerBalance = Number(attackerUser.saldo || 0);
      const next = Math.max(0, attackerBalance - penalty);
      attackerUser.saldo = next;
      await attackerUser.save();
      await EconomyLog.create({ userId: attacker, command: 'robar', amount: -penalty, type: 'debit', description: 'Multa por robo bloqueado' });
    }
    robbery.status = 'blocked';
    robbery.updatedAt = new Date();
    await robbery.save();
    return { ok: true, blocked: true, penalty };
  }

  const victimUser = await ensureEconomyUser(victim, 'Usuario');
  const attackerUser = await ensureEconomyUser(attacker, 'Usuario');

  if (!victimUser || !attackerUser) return { ok: false };

  const amount = Math.min(Number(robbery.amount || 0), Number(victimUser.saldo || 0));
  const attackerBalance = Number(attackerUser.saldo || 0) + amount;
  victimUser.saldo = Math.max(0, Number(victimUser.saldo || 0) - amount);
  attackerUser.saldo = attackerBalance;

  attackerUser.stats = attackerUser.stats || {};
  victimUser.stats = victimUser.stats || {};
  attackerUser.stats.robos = Number(attackerUser.stats.robos || 0) + 1;
  victimUser.stats.gastos = Number(victimUser.stats.gastos || 0) + amount;

  await Promise.all([attackerUser.save(), victimUser.save()]);
  robbery.status = 'completed';
  robbery.updatedAt = new Date();
  await robbery.save();
  await EconomyLog.create({ userId: attacker, command: 'robar', amount, type: 'reward', description: 'Robo completado' });
  await EconomyLog.create({ userId: victim, command: 'robar', amount: -amount, type: 'debit', description: 'FelCoins robados' });

  return { ok: true, blocked: false, amount };
}

async function notifyEconomyDisabled(sock, chatId, message) {
  if (!sock?.sendMessage) return;
  await sock.sendMessage(chatId, {
    text: '⚠️ **ECONOMÍA DESACTIVADA**\n\nEl sistema FelCoins no está disponible actualmente.'
  }, { quoted: message });
}

module.exports = {
  DEFAULT_CONFIG,
  normalizeJid,
  isOwnerAccount,
  formatFelCoins,
  parseAmount,
  hasSufficientBalance,
  getCommandCost,
  chargeCommandCost,
  ensureEconomyConfig,
  getEconomyConfig,
  saveEconomyConfig,
  getEconomyEnabled,
  setEconomyEnabled,
  ensureEconomyUser,
  registerEconomyUser,
  getBalance,
  getOwnerDisplayBalance,
  addBalance,
  deductBalance,
  transferBalance,
  getTopUsers,
  getUserPosition,
  canClaimDaily,
  getRemainingCooldown,
  claimDaily,
  claimWork,
  claimMine,
  computeCompanyIncome,
  getCompanyIncome,
  createRobbery,
  getPendingRobForVictim,
  resolveRobbery,
  getEconomyMenuText,
  canUseEconomy,
  notifyEconomyDisabled
};
