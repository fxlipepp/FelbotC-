const { ButtonV2 } = require('../lib/airich');
const {
  ensureEconomyUser,
  registerEconomyUser,
  getEconomyEnabled,
  setEconomyEnabled,
  formatFelCoins,
  getBalance,
  getOwnerDisplayBalance,
  notifyEconomyDisabled,
  claimDaily,
  claimWork,
  claimMine,
  transferBalance,
  getTopUsers,
  getUserPosition,
  getRemainingCooldown,
  ensureEconomyConfig,
  isOwnerAccount,
  hasRoyalProtection,
  deductBalance,
  addBalance,
  createRobbery,
  getPendingRobForVictim,
  resolveRobbery,
  computeCompanyIncome,
  parseAmount,
  getEconomyMenuText,
  canUseEconomy
} = require('../lib/felcoins');

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatEconomyLabel(value = '', fallback = 'usuario') {
  const raw = String(value || '').trim();
  if (!raw || raw === 'null' || raw === 'undefined') return `@${fallback}`;

  const cleaned = raw
    .replace(/^@+/, '')
    .split('@')[0]
    .split(':')[0]
    .replace(/[^\p{L}\p{N}_\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned && !/^\d+$/.test(cleaned.replace(/\s+/g, ''))) {
    const first = cleaned.split(' ')[0].slice(0, 12) || fallback;
    return `@${first}`;
  }

  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length >= 4) return `@${digits.slice(-4)}`;
  return `@${cleaned || fallback}`;
}

function formatDisplayName(userId, fallback = 'Usuario') {
  return formatEconomyLabel(userId, fallback);
}

function isEconomyCommand(rawText = '') {
  const value = String(rawText || '').trim();
  if (!value) return false;

  const economyPrefixes = [
    '.economia', '.registrarme', '.saldo', '.perfil', '.quitar', '.transferir',
    '.diaria', '.trabajar', '.minar', '.robar', '.protegerse', '.tienda',
    '.comprar', '.empresas', '.ruleta', '.slots', '.blackjack', '.crash',
    '.sticker', '.play', '.song', '.mp3', '.ytmp3', '.music', '.modoeconomia'
  ];

  return economyPrefixes.some((prefix) => value === prefix || value.startsWith(prefix + ' '));
}

function normalize(value = '') {
  return String(value || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
}

function toRecipientJid(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.includes('@')) return raw.split(':')[0];
  const digits = normalize(raw);
  return digits ? `${digits}@s.whatsapp.net` : '';
}

function mentionTarget(value = '', fallbackName = 'usuario') {
  const jid = toRecipientJid(value);
  if (!jid) return { text: formatEconomyLabel(fallbackName, 'usuario'), jid: '' };
  return { text: formatEconomyLabel(jid, fallbackName), jid };
}

async function ensureEconomyActive(sock, chatId, message) {
  const enabled = await getEconomyEnabled();
  if (!enabled) {
    await notifyEconomyDisabled(sock, chatId, message);
    return false;
  }
  return true;
}

async function ensureRegisteredWithReply(sock, chatId, senderId, message, userName = 'Usuario') {
  const user = await ensureEconomyUser(senderId, userName);
  if (!user || !user.registered) {
    await sock.sendMessage(chatId, {
      text: `⚠️ **NO ESTÁS REGISTRADO**\n\nUsa .registrarme para entrar al sistema FelCoins.`
    }, { quoted: message });
    return null;
  }
  return user;
}

async function showEconomyMenu(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureEconomyUser(senderId, message?.pushName || 'Usuario');
  const balance = isOwnerAccount(senderId) ? getOwnerDisplayBalance() : Number(user?.saldo || 0);
  const text = `💰 **FELCOINS**\n\n👤 ${user?.name || 'Usuario'}\n💵 Saldo: ${formatFelCoins(balance)}\n\n¿Qué quieres hacer?`;

  const menu = new ButtonV2(sock)
    .setBody(text)
    .setFooter('Felbot 夜 • FelCoins')
    .addButton('💰 SALDO', 'felcoin::saldo')
    .addButton('👤 PERFIL', 'felcoin::perfil')
    .addButton('💼 TRABAJAR', 'felcoin::trabajar')
    .addButton('⛏️ MINAR', 'felcoin::minar')
    .addButton('🎁 DIARIA', 'felcoin::diaria')
    .addButton('🛒 TIENDA', 'felcoin::tienda')
    .addButton('🏢 EMPRESAS', 'felcoin::empresas')
    .addButton('🎮 JUEGOS', 'felcoin::juegos')
    .addButton('🏆 TOP', 'felcoin::top');

  await menu.send(chatId, { quoted: message, mentions: [senderId] });
}

async function showSaldo(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;

  const companyText = user.empresa ? user.empresa : 'Ninguna';
  const adminText = user.modoAdmin ? 'Sí' : 'No';
  const royalText = hasRoyalProtection(user) ? 'Sí' : 'No';
  const rawBalance = isOwnerAccount(senderId) ? 9999999999999 : Number(user.saldo || 0);
  const displayBalance = isOwnerAccount(senderId) ? getOwnerDisplayBalance() : rawBalance;
  const dailyIncome = Number(user.ingresoDiario || 0);

  await sock.sendMessage(chatId, {
    text: `💰 **SALDO FELCOINS**\n\n👤 ${user.name || 'Usuario'}\n💵 ${formatFelCoins(displayBalance)}\n\n🏢 Empresa: ${companyText}\n📈 Ingreso diario: +${dailyIncome} FC\n\n👑 Admin: ${adminText}
👑 Modo Rey: ${royalText}`
  }, { quoted: message });
}

async function showPerfil(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;

  const stats = user.stats || {};
  const resolvedStats = {
    trabajos: Number(stats.trabajos || 0),
    mineria: Number(stats.mineria || 0),
    juegos: Number(stats.juegos || 0),
    transferencias: Number(stats.transferencias || 0),
    robos: Number(stats.robos || 0),
    victorias: Number(stats.victorias || 0),
    derrotas: Number(stats.derrotas || 0),
    ganancias: Number(stats.ganancias || 0),
    gastos: Number(stats.gastos || 0)
  };
  const rawBalance = isOwnerAccount(senderId) ? 9999999999999 : Number(user.saldo || 0);
  const displayBalance = isOwnerAccount(senderId) ? getOwnerDisplayBalance() : rawBalance;
  const reyText = hasRoyalProtection(user) ? 'Sí' : 'No';

  await sock.sendMessage(chatId, {
    text: `👤 **PERFIL FELCOINS**\n\n👤 ${user.name || 'Usuario'}\n💰 ${formatFelCoins(displayBalance)}\n\n📊 ESTADÍSTICAS\n\n💼 Trabajos: ${resolvedStats.trabajos}\n⛏️ Minería: ${resolvedStats.mineria}\n🎮 Juegos: ${resolvedStats.juegos}\n🏆 Victorias: ${resolvedStats.victorias}\n💀 Derrotas: ${resolvedStats.derrotas}\n💸 Transferencias: ${resolvedStats.transferencias}\n🦹 Robos: ${resolvedStats.robos}\n💰 Ganancias: ${formatFelCoins(resolvedStats.ganancias)}\n💸 Gastos: ${formatFelCoins(resolvedStats.gastos)}\n\n🏢 Empresa: ${user.empresa || 'Ninguna'}\n👑 Admin: ${user.modoAdmin ? 'Sí' : 'No'}\n👑 Modo Rey: ${reyText}`
  }, { quoted: message });
}

async function showTop(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;
  const top = await getTopUsers(10);
  const topText = top.slice(0, 3).map((entry, index) => {
    const medals = ['🥇', '🥈', '🥉'];
    const name = entry.name || 'Usuario';
    const saldo = formatFelCoins(Number(entry.saldo || 0));
    return `${medals[index] || '🏅'} ${name} — ${saldo}`;
  }).join('\n');

  const position = await getUserPosition(senderId);
  const selfBalance = isOwnerAccount(senderId) ? formatFelCoins(getOwnerDisplayBalance()) : formatFelCoins(Number(user.saldo || 0));

  await sock.sendMessage(chatId, {
    text: `🏆 **TOP FELCOINS**\n\n${topText || '🥇 Usuario — 0 FC'}\n\n📊 Tu posición: #${position}\n\n💰 Tu saldo: ${selfBalance}`
  }, { quoted: message });
}

async function registerMe(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const realName = String(message?.pushName || message?.senderName || formatDisplayName(senderId, 'usuario')).trim() || 'usuario';
  const realTag = formatEconomyLabel(realName, 'usuario');
  const user = await ensureEconomyUser(senderId, realName);
  if (user?.registered) {
    const balance = isOwnerAccount(senderId) ? formatFelCoins(getOwnerDisplayBalance()) : formatFelCoins(Number(user.saldo || 0));
    await sock.sendMessage(chatId, {
      text: `⚠️ **YA ESTÁS REGISTRADO**\n\nYa formas parte de la economía FelCoins.\n\n💰 Saldo: ${balance}`
    }, { quoted: message });
    return;
  }

  await registerEconomyUser(senderId, realName);
  await sock.sendMessage(chatId, {
    text: `✅ **REGISTRO COMPLETADO**\n\n👤 Usuario: ${realTag}\n💰 Saldo inicial: 0 FC\n\nAhora puedes comenzar a ganar FelCoins.\n\n💼 Trabaja\n⛏️ Mina\n🎁 Reclama tu diaria\n🏢 Construye tu empresa\n\nUsa .economia para comenzar.`
  }, { quoted: message });
}

async function toggleEconomy(sock, chatId, senderId, message, enabled) {
  const config = await ensureEconomyConfig();
  if (!senderId || !String(senderId).includes('@') && !String(senderId).includes(':')) {
    return;
  }

  // owner check handled in main.js before calling
  await setEconomyEnabled(enabled);
  if (enabled) {
    await sock.sendMessage(chatId, {
      text: `💰 **FELCOINS ACTIVADO**\n\nEl sistema de economía está disponible nuevamente.\n\n𝕱𝖊𝖑𝖇𝖔𝖙 夜`
    }, { quoted: message });
  } else {
    await sock.sendMessage(chatId, {
      text: `🔒 **FELCOINS DESACTIVADO**\n\nLa economía ha sido desactivada temporalmente.\n\nLos datos de los usuarios se conservarán.\n\n𝕱𝖊𝖑𝖇𝖔𝖙 夜`
    }, { quoted: message });
  }
}

async function dailyReward(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;
  const result = await claimDaily(senderId);
  if (!result.ok) {
    const remaining = result.remaining || 0;
    const human = formatCountdown(remaining);
    await sock.sendMessage(chatId, {
      text: `⏳ **DIARIA NO DISPONIBLE**\n\nYa reclamaste tu recompensa.\n\nPróxima recompensa en: ${human}.`
    }, { quoted: message });
    return;
  }

  const balance = isOwnerAccount(senderId) ? getOwnerDisplayBalance() : Number(user.saldo || 0);
  await sock.sendMessage(chatId, {
    text: `🎁 **RECOMPENSA DIARIA**\n\n💰 Recibiste: +${result.amount} FC\n\n💵 Saldo: ${formatFelCoins(balance)}\n\n⏰ Próxima recompensa en 24h.`
  }, { quoted: message });
}

async function workCommand(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;
  const remaining = await getRemainingCooldown(senderId, 'work');
  if (remaining > 0) {
    await sock.sendMessage(chatId, {
      text: `⏳ **ESTÁS DESCANSANDO**\n\nYa completaste un turno.\n\nPodrás trabajar nuevamente en: ${formatCountdown(remaining)}.`
    }, { quoted: message });
    return;
  }

  const result = await claimWork(senderId);
  if (!result.ok) {
    await sock.sendMessage(chatId, { text: `⚠️ No pudiste trabajar.` }, { quoted: message });
    return;
  }

  const menu = new ButtonV2(sock)
    .setBody('🍕 **TURNO DE REPARTO**\n\nTienes 3 pedidos pendientes.\n\n📍 Centro\n📍 Barrio Norte\n📍 Barrio Sur\n\n⏱️ Tiempo: 60 segundos')
    .setFooter('FelCoins • Trabajo')
    .addButton('🚦 RUTA RÁPIDA', 'felcoin::work::fast')
    .addButton('🛣️ RUTA SEGURA', 'felcoin::work::safe')
    .addButton('🔄 CAMBIAR ORDEN', 'felcoin::work::change');

  await menu.send(chatId, { quoted: message, mentions: [senderId] });

  const userNow = await ensureEconomyUser(senderId, message?.pushName || 'Usuario');
  userNow.workState = { type: 'delivery', step: 'route', reward: result.amount };
  await userNow.save();
}

async function mineCommand(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;
  const result = await claimMine(senderId);
  if (!result.ok) {
    await sock.sendMessage(chatId, { text: `⏳ ${formatCountdown(await getRemainingCooldown(senderId, 'mine'))} antes de volver a minar.` }, { quoted: message });
    return;
  }

  await sock.sendMessage(chatId, {
    text: `⛏️ **MINERÍA**\n\nHas excavado...\n\n🪨 Encontraste:\n\n💎 ${result.mineral}\n\n💰 Valor: +${result.amount} FC\n\n💵 Saldo: ${formatFelCoins(Number(user.saldo || 0) + result.amount)}`
  }, { quoted: message });
}

async function removeCoinsFromUser(sock, chatId, senderId, message, rawText) {
  if (!isOwnerAccount(senderId) && !message?.key?.fromMe) {
    await sock.sendMessage(chatId, { text: '❌ Solo el OWNER puede usar este comando.' }, { quoted: message });
    return;
  }

  const args = rawText.trim().split(/\s+/).slice(1);
  const amount = parseAmount(args[0]);
  const targetRaw = args[1] || (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || '');
  const target = toRecipientJid(targetRaw);

  if (!amount || amount <= 0) {
    await sock.sendMessage(chatId, { text: '❌ Cantidad inválida. Usa .quitar 900 @usuario' }, { quoted: message });
    return;
  }

  if (!target) {
    await sock.sendMessage(chatId, { text: '❌ Debes indicar a quién quitarle FelCoins.' }, { quoted: message });
    return;
  }

  const targetUser = await ensureEconomyUser(target, 'Usuario');
  if (!targetUser || !targetUser.registered) {
    await sock.sendMessage(chatId, { text: '❌ Ese usuario no está registrado en FelCoins.' }, { quoted: message });
    return;
  }

  const previous = Number(targetUser.saldo || 0);
  const updated = await deductBalance(target, amount, 'quitar', `Coins quitados por ${senderId}`);
  const targetMention = mentionTarget(target);

  await sock.sendMessage(chatId, {
    text: `⚙️ **COINS QUITADOS**\n\n👤 Usuario: ${targetMention.text}\n💸 Cantidad: -${formatFelCoins(amount)}\n\n💰 Saldo anterior: ${formatFelCoins(previous)}\n💰 Saldo actual: ${formatFelCoins(Number(updated || 0))}`,
    contextInfo: targetMention.jid ? { mentionedJid: [targetMention.jid] } : undefined
  }, { quoted: message });
}

async function processTransfer(sock, chatId, senderId, message, rawText) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;
  const args = rawText.trim().split(/\s+/).slice(1);
  const amount = parseAmount(args[0]);
  const targetRaw = args[1] || (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || '');
  const target = toRecipientJid(targetRaw);

  if (!amount || amount <= 0) {
    await sock.sendMessage(chatId, { text: '❌ Cantidad inválida. Usa .transferir 500 @usuario' }, { quoted: message });
    return;
  }

  if (!target) {
    await sock.sendMessage(chatId, { text: '❌ Debes indicar un destinatario.' }, { quoted: message });
    return;
  }

  if (normalize(target) === normalize(senderId)) {
    await sock.sendMessage(chatId, { text: '❌ No puedes transferirte a ti mismo.' }, { quoted: message });
    return;
  }

  const result = await transferBalance(senderId, target, amount, 'transferir');
  if (!result.ok) {
    if (result.reason === 'insufficient') {
      await sock.sendMessage(chatId, { text: `❌ **SALDO INSUFICIENTE**\n\nNecesitas: ${formatFelCoins(amount)}\nTienes: ${formatFelCoins(Number(user.saldo || 0))}` }, { quoted: message });
    } else {
      await sock.sendMessage(chatId, { text: '❌ No se pudo completar la transferencia.' }, { quoted: message });
    }
    return;
  }

  const recipientMention = mentionTarget(target);
  await sock.sendMessage(chatId, {
    text: `💸 **TRANSFERENCIA REALIZADA**\n\n👤 Destinatario: ${recipientMention.text}\n💰 Cantidad: ${formatFelCoins(amount)}\n\n💵 Saldo anterior: ${formatFelCoins(Number(user.saldo || 0) + amount)}\n💵 Saldo actual: ${formatFelCoins(Number(result.senderBalance || 0))}`,
    contextInfo: recipientMention.jid ? { mentionedJid: [recipientMention.jid] } : undefined
  }, { quoted: message });
}

async function handleRobbery(sock, chatId, senderId, message, targetId) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const attackerUser = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!attackerUser) return;
  const targetRaw = targetId || (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || '');
  const target = toRecipientJid(targetRaw);
  if (!target) {
    await sock.sendMessage(chatId, { text: '❌ Debes indicar a quién quieres robar.' }, { quoted: message });
    return;
  }

  const targetUser = await ensureEconomyUser(target, 'Usuario');
  if (!targetUser || !targetUser.registered) {
    await sock.sendMessage(chatId, { text: '❌ Ese usuario no está registrado en FelCoins.' }, { quoted: message });
    return;
  }

  const maxAmount = Math.min(Number(targetUser.saldo || 0) * 0.25, 8000);
  const amount = Math.max(100, Math.min(8000, Math.floor(maxAmount || 100)));
  const rob = await createRobbery(senderId, target, amount);
  if (!rob) {
    await sock.sendMessage(chatId, { text: '❌ No se pudo iniciar el robo.' }, { quoted: message });
    return;
  }

  const victimMention = mentionTarget(target);
  await sock.sendMessage(chatId, {
    text: `🚨 **INTENTO DE ROBO**\n\n${victimMention.text} está intentando robarte.\n\n⏱️ Tienes 5 minutos para protegerte.\n\n🛡️ Pulsa el botón:`,
    contextInfo: victimMention.jid ? { mentionedJid: [victimMention.jid] } : undefined
  }, { quoted: message });

  const menu = new ButtonV2(sock)
    .setBody(`🛡️ **PROTECCIÓN**\n\n${victimMention.text} tiene un robo pendiente.`)
    .setFooter('FelCoins • Robo')
    .addButton('🛡️ PROTEGERME', `felcoin::protect::${rob._id}`);

  try {
    await menu.send(chatId, { quoted: message, mentions: [senderId, target] });
  } catch (error) {
    await menu.send(target, { quoted: message, mentions: [senderId, target] });
  }
}

async function protectMe(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const pending = await getPendingRobForVictim(senderId);
  if (!pending) {
    await sock.sendMessage(chatId, { text: '⚠️ Este robo ya no está activo.' }, { quoted: message });
    return;
  }
  const result = await resolveRobbery(pending.attacker, pending.victim, true);
  const penalty = result.penalty || 300;
  await sock.sendMessage(chatId, {
    text: `🛡️ **ROBO BLOQUEADO**\n\nLograste proteger tus FelCoins.\n\n💸 El ladrón recibió una multa de ${penalty} FC.`
  }, { quoted: message });
}

async function resetEconomy(sock, chatId, senderId, message) {
  if (!isOwnerAccount(senderId) && !message?.key?.fromMe) {
    await sock.sendMessage(chatId, { text: '❌ Solo el OWNER puede reiniciar la economía.' }, { quoted: message });
    return;
  }

  const result = await require('../lib/felcoins').resetEconomyState(senderId);
  await sock.sendMessage(chatId, {
    text: `♻️ **ECONOMÍA REINICIADA**\n\nUsuarios dejados en 0 FC: ${result.resetCount || 0}\n\n👑 Owner: preservado.`
  }, { quoted: message });
}

async function openShop(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const menu = new ButtonV2(sock)
    .setBody('🛒 **TIENDA FELCOINS**\n\nSelecciona un producto:')
    .setFooter('FelCoins • Tienda')
    .addButton('🧤 GUANTE', 'felcoin::shop::glove')
    .addButton('⚡ MULTIPLICADOR', 'felcoin::shop::multiplier')
    .addButton('⛏️ PICO', 'felcoin::shop::pico')
    .addButton('👑 ADMIN 24H', 'felcoin::shop::admin24')
    .addButton('👑 ADMIN ∞', 'felcoin::shop::adminInfinity')
    .addButton('👑 MODO REY', 'felcoin::shop::modoRey');
  await menu.send(chatId, { quoted: message });
}

async function buyProduct(sock, chatId, senderId, message, product) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;

  const config = await ensureEconomyConfig();
  const price = Number(config.prices?.[product] || 0);
  if (price <= 0) {
    await sock.sendMessage(chatId, { text: `❌ Producto no disponible: ${product}` }, { quoted: message });
    return;
  }

  if (!isOwnerAccount(senderId) && Number(user.saldo || 0) < price) {
    await sock.sendMessage(chatId, {
      text: `❌ **FELCOINS INSUFICIENTES**\n\nNecesitas: ${formatFelCoins(price)}\nTienes: ${formatFelCoins(Number(user.saldo || 0))}`
    }, { quoted: message });
    return;
  }

  if (!isOwnerAccount(senderId)) {
    user.saldo = Number(user.saldo || 0) - price;
    await user.save();
  }

  user.inventory = user.inventory || {};
  if (product === 'modoRey') {
    user.modoRey = true;
    user.inventory[product] = { quantity: 1, expiresAt: null };
    await user.save();
    await sock.sendMessage(chatId, {
      text: `✅ **MODO REY ACTIVADO**\n\n👑 Ahora eres inmune al modo admin del grupo.\n\n💸 Gastaste: ${formatFelCoins(price)}`
    }, { quoted: message });
    return;
  }

  user.inventory[product] = { quantity: Number(user.inventory[product]?.quantity || 0) + 1, expiresAt: new Date(Date.now() + (product === 'glove' ? 12 * 60 * 60 * 1000 : 0)) };
  await user.save();

  await sock.sendMessage(chatId, {
    text: `✅ **COMPRA REALIZADA**\n\n🧤 Protección activada.\n\n⏱️ 12 horas\n\n💸 Gastaste: ${formatFelCoins(price)}`
  }, { quoted: message });
}

async function openGamesMenu(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const menu = new ButtonV2(sock)
    .setBody('🎮 **JUEGOS FELCOINS**\n\nElige un juego para apostar y ganar FC.')
    .setFooter('FelCoins • Juegos')
    .addButton('🎡 RULETA', 'felcoin::game::ruleta')
    .addButton('🎰 SLOTS', 'felcoin::game::slots')
    .addButton('🃏 BLACKJACK', 'felcoin::game::blackjack')
    .addButton('💥 CRASH', 'felcoin::game::crash')
    .addButton('⬅️ VOLVER', 'felcoin::economia');
  await menu.send(chatId, { quoted: message });
}

async function viewCompanies(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const menu = new ButtonV2(sock)
    .setBody('🏢 **EMPRESAS FELCOINS**\n\nElige una empresa para ver sus detalles.')
    .setFooter('FelCoins • Empresas')
    .addButton('👕 ROPA', 'felcoin::company::ropa')
    .addButton('🍕 PIZZERÍA', 'felcoin::company::pizzeria')
    .addButton('🎮 GAMER', 'felcoin::company::gamer')
    .addButton('💻 TECNOLOGÍA', 'felcoin::company::tecnologia')
    .addButton('🏦 BANCO', 'felcoin::company::banco')
    .addButton('🌐 FELBOT ORG', 'felcoin::company::felbot');
  await menu.send(chatId, { quoted: message });
}

async function openCompanyDetails(sock, chatId, senderId, message, company) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const config = await ensureEconomyConfig();
  const companyData = config.companies?.[company] || { price: 0, income: 0 };
  const labelMap = {
    ropa: '👕 ROPA',
    pizzeria: '🍕 PIZZERÍA',
    gamer: '🎮 GAMER STORE',
    tecnologia: '💻 TECNOLOGÍA',
    banco: '🏦 BANCO',
    felbot: '🌐 FELBOT ORG'
  };

  const menu = new ButtonV2(sock)
    .setBody(`${labelMap[company] || company}\n\n💰 Precio: ${formatFelCoins(companyData.price || 0)}\n📈 Ingreso: +${companyData.income || 0} FC/día\n\n[🛒 COMPRAR] [⬅️ VOLVER]`)
    .setFooter('FelCoins • Empresa')
    .addButton('🛒 COMPRAR', `felcoin::buyCompany::${company}`)
    .addButton('⬅️ VOLVER', 'felcoin::empresas');
  await menu.send(chatId, { quoted: message });
}

async function buyCompany(sock, chatId, senderId, message, company) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;
  const config = await ensureEconomyConfig();
  const companyData = config.companies?.[company];
  if (!companyData) {
    await sock.sendMessage(chatId, { text: '❌ Empresa no disponible.' }, { quoted: message });
    return;
  }

  const amount = Number(companyData.price || 0);
  if (!isOwnerAccount(senderId) && Number(user.saldo || 0) < amount) {
    await sock.sendMessage(chatId, { text: `❌ **FELCOINS INSUFICIENTES**\n\nNecesitas: ${formatFelCoins(amount)}` }, { quoted: message });
    return;
  }

  if (!isOwnerAccount(senderId)) user.saldo = Number(user.saldo || 0) - amount;
  user.empresa = company;
  user.companyPurchasedAt = new Date();
  user.companyLastPaidAt = new Date();
  user.ingresoDiario = Number(companyData.income || 0);
  await user.save();

  await sock.sendMessage(chatId, {
    text: `✅ **COMPRA REALIZADA**\n\n🏢 Empresa: ${company}\n💰 Gastaste: ${formatFelCoins(amount)}`
  }, { quoted: message });
}

async function rouletteGame(sock, chatId, senderId, message, amount) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;
  const value = Math.max(1, Number(amount) || 0);
  if (!isOwnerAccount(senderId) && Number(user.saldo || 0) < value) {
    await sock.sendMessage(chatId, { text: `❌ **FELCOINS INSUFICIENTES**\n\nNecesitas: ${formatFelCoins(value)}` }, { quoted: message });
    return;
  }
  const result = Math.random() < 0.45;
  if (result) {
    const prize = value * 2;
    if (!isOwnerAccount(senderId)) user.saldo = Number(user.saldo || 0) - value;
    user.saldo = Number(user.saldo || 0) + prize;
    user.stats = user.stats || {};
    user.stats.juegos = Number(user.stats.juegos || 0) + 1;
    user.stats.victorias = Number(user.stats.victorias || 0) + 1;
    await user.save();
    await sock.sendMessage(chatId, { text: `🎡 **RULETA**\n\n🎯 Apuesta: ${formatFelCoins(value)}\n\n🔴 x2\n\n💰 Ganaste: +${formatFelCoins(prize)}\n\n💵 Saldo: ${formatFelCoins(Number(user.saldo || 0))}` }, { quoted: message });
  } else {
    if (!isOwnerAccount(senderId)) user.saldo = Number(user.saldo || 0) - value;
    user.stats = user.stats || {};
    user.stats.juegos = Number(user.stats.juegos || 0) + 1;
    user.stats.derrotas = Number(user.stats.derrotas || 0) + 1;
    await user.save();
    await sock.sendMessage(chatId, { text: `🎡 **RULETA**\n\n🎯 Apuesta: ${formatFelCoins(value)}\n\n⚫ PERDISTE\n\n💸 -${formatFelCoins(value)}\n\n💵 Saldo: ${formatFelCoins(Number(user.saldo || 0))}` }, { quoted: message });
  }
}

async function slotsGame(sock, chatId, senderId, message, amount) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;
  const value = Math.max(1, Number(amount) || 0);
  if (!isOwnerAccount(senderId) && Number(user.saldo || 0) < value) {
    await sock.sendMessage(chatId, { text: `❌ **FELCOINS INSUFICIENTES**\n\nNecesitas: ${formatFelCoins(value)}` }, { quoted: message });
    return;
  }

  const icons = ['🍒', '⭐', '💎', '7️⃣', '🍋'];
  const draw = Array.from({ length: 3 }, () => icons[Math.floor(Math.random() * icons.length)]);
  const jackpot = draw.every((icon) => icon === '💎');
  if (!isOwnerAccount(senderId)) user.saldo = Number(user.saldo || 0) - value;
  if (jackpot) {
    const prize = value * 10;
    user.saldo = Number(user.saldo || 0) + prize;
    user.stats = user.stats || {};
    user.stats.juegos = Number(user.stats.juegos || 0) + 1;
    user.stats.victorias = Number(user.stats.victorias || 0) + 1;
    await user.save();
    await sock.sendMessage(chatId, { text: `🎰 **SLOTS**\n\n🎯 Apuesta: ${formatFelCoins(value)}\n\n${draw.join(' | ')}\n\n🎉 JACKPOT\n\n💰 Premio: +${formatFelCoins(prize)}` }, { quoted: message });
    return;
  }

  user.stats = user.stats || {};
  user.stats.juegos = Number(user.stats.juegos || 0) + 1;
  user.stats.derrotas = Number(user.stats.derrotas || 0) + 1;
  await user.save();
  await sock.sendMessage(chatId, { text: `🎰 **SLOTS**\n\n🎯 Apuesta: ${formatFelCoins(value)}\n\n${draw.join(' | ')}\n\n❌ Sin combinación.\n\n💸 -${formatFelCoins(value)}` }, { quoted: message });
}

async function blackjackInitial(sock, chatId, senderId, message, amount) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;
  const value = Math.max(1, Number(amount) || 0);
  if (!isOwnerAccount(senderId) && Number(user.saldo || 0) < value) {
    await sock.sendMessage(chatId, { text: `❌ **FELCOINS INSUFICIENTES**\n\nNecesitas: ${formatFelCoins(value)}` }, { quoted: message });
    return;
  }

  const card1 = Math.floor(Math.random() * 10) + 1;
  const card2 = Math.floor(Math.random() * 10) + 1;
  const total = card1 + card2;
  user.blackjack = { amount: value, cards: [card1, card2], total, bot: Math.floor(Math.random() * 10) + 1 };
  user.stats = user.stats || {};
  user.stats.juegos = Number(user.stats.juegos || 0) + 1;
  await user.save();

  const buttons = new ButtonV2(sock)
    .setBody(`🃏 **BLACKJACK**\n\n💰 Apuesta: ${formatFelCoins(value)}\n\nTus cartas:\n🂠 ${card1}\n\nTotal: ${total}\n\n¿Qué haces?`)
    .setFooter('FelCoins • Blackjack')
    .addButton('🃏 PEDIR', 'felcoin::blackjack::hit')
    .addButton('✋ PLANTARSE', 'felcoin::blackjack::stand');
  await buttons.send(chatId, { quoted: message });
}

async function blackjackHit(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;
  if (!user.blackjack) {
    await sock.sendMessage(chatId, { text: '⚠️ No tienes una partida activa de blackjack.' }, { quoted: message });
    return;
  }
  const newCard = Math.floor(Math.random() * 10) + 1;
  user.blackjack.cards.push(newCard);
  user.blackjack.total = user.blackjack.cards.reduce((sum, card) => sum + card, 0);
  if (user.blackjack.total > 21) {
    if (!isOwnerAccount(senderId)) user.saldo = Number(user.saldo || 0) - Number(user.blackjack.amount || 0);
    delete user.blackjack;
    await user.save();
    await sock.sendMessage(chatId, { text: `💥 **TE PASASTE**\n\nTotal: ${user.blackjack?.total || 24}\n\n💸 Perdiste ${formatFelCoins(Number(user.blackjack?.amount || 0))}.` }, { quoted: message });
    return;
  }
  const buttons = new ButtonV2(sock)
    .setBody(`🃏 **BLACKJACK**\n\nNueva carta: ${newCard}\n\nTus cartas:\n${user.blackjack.cards.join(' + ')}\n\nTotal: ${user.blackjack.total}\n\n¿Qué haces?`)
    .setFooter('FelCoins • Blackjack')
    .addButton('🃏 PEDIR', 'felcoin::blackjack::hit')
    .addButton('✋ PLANTARSE', 'felcoin::blackjack::stand');
  await buttons.send(chatId, { quoted: message });
  await user.save();
}

async function blackjackStand(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;
  if (!user.blackjack) {
    await sock.sendMessage(chatId, { text: '⚠️ No hay partida activa.' }, { quoted: message });
    return;
  }
  const botTotal = Math.floor(Math.random() * 10) + 15;
  const amount = Number(user.blackjack.amount || 0);
  if (user.blackjack.total > botTotal) {
    user.saldo = Number(user.saldo || 0) + amount * 2;
    await sock.sendMessage(chatId, { text: `🃏 **BLACKJACK**\n\nTú: ${user.blackjack.total}\nBot: ${botTotal}\n\n🎉 GANASTE\n\n💰 Premio: +${formatFelCoins(amount * 2)}` }, { quoted: message });
  } else if (user.blackjack.total === botTotal) {
    await sock.sendMessage(chatId, { text: `🃏 **BLACKJACK**\n\nTú: ${user.blackjack.total}\nBot: ${botTotal}\n\n🤝 EMPATE\n\n💰 Recuperas: ${formatFelCoins(amount)}` }, { quoted: message });
  } else {
    if (!isOwnerAccount(senderId)) user.saldo = Number(user.saldo || 0) - amount;
    await sock.sendMessage(chatId, { text: `🃏 **BLACKJACK**\n\nTú: ${user.blackjack.total}\nBot: ${botTotal}\n\n💥 PERDISTE\n\n💸 -${formatFelCoins(amount)}` }, { quoted: message });
  }
  delete user.blackjack;
  await user.save();
}

async function crashGame(sock, chatId, senderId, message, amount) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;
  const value = Math.max(1, Number(amount) || 0);
  if (!isOwnerAccount(senderId) && Number(user.saldo || 0) < value) {
    await sock.sendMessage(chatId, { text: `❌ **FELCOINS INSUFICIENTES**\n\nNecesitas: ${formatFelCoins(value)}` }, { quoted: message });
    return;
  }
  const multiplier = (Math.random() * 2.5 + 1.1).toFixed(2);
  user.crash = { amount: value, multiplier: Number(multiplier), active: true };
  await user.save();
  const buttons = new ButtonV2(sock)
    .setBody(`💥 **CRASH**\n\n💰 Apuesta: ${formatFelCoins(value)}\n\n📈 ${multiplier}x\n\n[💰 RETIRAR]`)
    .setFooter('FelCoins • Crash')
    .addButton('💰 RETIRAR', 'felcoin::crash::withdraw');
  await buttons.send(chatId, { quoted: message });
}

async function withdrawCrash(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;
  if (!user.crash || !user.crash.active) {
    await sock.sendMessage(chatId, { text: '⚠️ Esta partida ya terminó.' }, { quoted: message });
    return;
  }
  const current = Number(user.crash.multiplier || 1);
  const base = Number(user.crash.amount || 0);
  const reward = Math.round(base * current);
  user.saldo = Number(user.saldo || 0) + reward;
  delete user.crash;
  await user.save();
  await sock.sendMessage(chatId, {
    text: `💰 **RETIRADA EXITOSA**\n\n📈 Multiplicador: ${current.toFixed(2)}x\n\n💵 Apuesta: ${formatFelCoins(base)}\n💰 Ganancia total: ${formatFelCoins(reward)}\n\n🎉 Beneficio: +${formatFelCoins(reward - base)}`
  }, { quoted: message });
}

async function handleEconomyButton(sock, chatId, senderId, buttonId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const parts = String(buttonId).split('::');
  const action = parts[1];
  const extra = parts[2];
  const extra2 = parts[3] || '';

  if (action === 'saldo') return showSaldo(sock, chatId, senderId, message);
  if (action === 'perfil') return showPerfil(sock, chatId, senderId, message);
  if (action === 'top') return showTop(sock, chatId, senderId, message);
  if (action === 'trabajar') return workCommand(sock, chatId, senderId, message);
  if (action === 'minar') return mineCommand(sock, chatId, senderId, message);
  if (action === 'diaria') return dailyReward(sock, chatId, senderId, message);
  if (action === 'tienda') return openShop(sock, chatId, senderId, message);
  if (action === 'empresas') return viewCompanies(sock, chatId, senderId, message);
  if (action === 'juegos') return openGamesMenu(sock, chatId, senderId, message);
  if (action === 'economia') return showEconomyMenu(sock, chatId, senderId, message);
  if (action === 'shop') return buyProduct(sock, chatId, senderId, message, extra);
  if (action === 'company') return openCompanyDetails(sock, chatId, senderId, message, extra);
  if (action === 'buyCompany') return buyCompany(sock, chatId, senderId, message, extra);
  if (action === 'game') {
    const label = String(extra || '').toLowerCase();
    if (label === 'ruleta') return rouletteGame(sock, chatId, senderId, message, 100);
    if (label === 'slots') return slotsGame(sock, chatId, senderId, message, 100);
    if (label === 'blackjack') return blackjackInitial(sock, chatId, senderId, message, 100);
    if (label === 'crash') return crashGame(sock, chatId, senderId, message, 100);
    return sock.sendMessage(chatId, {
      text: '🎮 **JUEGOS FELCOINS**\n\nUsa estos comandos:\n• .ruleta 100\n• .slots 100\n• .blackjack 100\n• .crash 100'
    }, { quoted: message });
  }
  if (action === 'work') {
    const user = await ensureEconomyUser(senderId, message?.pushName || 'Usuario');
    if (user?.workState?.step !== 'route') return;

    if (extra === 'fast') {
      user.saldo = Number(user.saldo || 0) + 580;
      user.workState = null;
      await user.save();
      await sock.sendMessage(chatId, { text: `🍕 **TURNO TERMINADO**\n\n📦 Pedidos entregados: 3/3\n⏱️ Tiempo: excelente\n🎁 Propinas: +180 FC\n💰 Pago: +400 FC\n\n💵 Total ganado: +580 FC` }, { quoted: message });
      return;
    }

    if (extra === 'safe') {
      user.saldo = Number(user.saldo || 0) + 520;
      user.workState = null;
      await user.save();
      await sock.sendMessage(chatId, { text: `🚚 **RUTA SEGURA**\n\n📦 Entrega completada sin incidentes\n⏱️ Tiempo: muy estable\n💰 Pago: +500 FC\n🎁 Bonificación: +20 FC\n\n💵 Total ganado: +520 FC` }, { quoted: message });
      return;
    }

    if (extra === 'change') {
      user.saldo = Number(user.saldo || 0) + 430;
      user.workState = null;
      await user.save();
      await sock.sendMessage(chatId, { text: `🔄 **ORDEN REASIGNADA**\n\nSe reordenaron los pedidos\n📍 Ruta ajustada al tráfico\n💰 Pago: +360 FC\n🎁 Bônus: +70 FC\n\n💵 Total ganado: +430 FC` }, { quoted: message });
      return;
    }

    return;
  }
  if (action === 'protect') return protectMe(sock, chatId, senderId, message);
  if (action === 'blackjack') {
    if (extra === 'hit') return blackjackHit(sock, chatId, senderId, message);
    if (extra === 'stand') return blackjackStand(sock, chatId, senderId, message);
  }
  if (action === 'crash' && extra === 'withdraw') return withdrawCrash(sock, chatId, senderId, message);
  return false;
}

module.exports = {
  showEconomyMenu,
  registerMe,
  toggleEconomy,
  showSaldo,
  showPerfil,
  showTop,
  dailyReward,
  workCommand,
  mineCommand,
  processTransfer,
  handleRobbery,
  protectMe,
  openShop,
  buyProduct,
  openGamesMenu,
  viewCompanies,
  openCompanyDetails,
  buyCompany,
  rouletteGame,
  slotsGame,
  blackjackInitial,
  blackjackHit,
  blackjackStand,
  crashGame,
  withdrawCrash,
  handleEconomyButton,
  formatCountdown,
  removeCoinsFromUser,
  isEconomyCommand,
  formatEconomyLabel,
  resetEconomy
};
