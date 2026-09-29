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
  hasActiveProtection,
  activateProtection,
  deductBalance,
  addBalance,
  createRobbery,
  getPendingRobForVictim,
  resolveRobbery,
  computeCompanyIncome,
  getCompanyLevel,
  getCompanyUpgradeCost,
  openMysteryBox,
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
  // Cuando tenemos un JID real, usamos el número completo y mentionedJid
  // para que WhatsApp renderice la mención correctamente.
  if (digits.length >= 4) return `@${digits}`;
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
    '.comprar', '.caja', '.inventario', '.vender', '.mejorarempresa', '.empresas', '.ruleta', '.slots', '.blackjack', '.crash',
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

function resolveTargetInfo(message, rawValue = '', fallbackName = 'usuario') {
  const directValue = String(rawValue || '').trim();
  const directJid = directValue ? toRecipientJid(directValue) : '';
  const mentionedJid = message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    || message?.message?.viewOnceMessage?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    || '';
  // Si el mensaje trae una mención real, esa siempre tiene prioridad.
  const jid = toRecipientJid(mentionedJid) || directJid || toRecipientJid(directValue || fallbackName);

  if (!jid) {
    return { jid: '', label: formatEconomyLabel(fallbackName, 'usuario') };
  }

  return { jid, label: formatEconomyLabel(jid, fallbackName) };
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
      text: `⚠️ *NO ESTÁS REGISTRADO*\n\nUsa .registrarme para entrar al sistema FelCoins.`
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
  const text = `💰 *FELCOINS*\n\n👤 ${user?.name || 'Usuario'}\n💵 Saldo: ${formatFelCoins(balance)}\n\n¿Qué quieres hacer?`;

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
    .addButton('🎁 CAJA — 2K', 'felcoin::caja')
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
    text: `💰 *SALDO FELCOINS*\n\n👤 ${user.name || 'Usuario'}\n💵 ${formatFelCoins(displayBalance)}\n\n🏢 Empresa: ${companyText}\n📈 Ingreso diario: +${dailyIncome} FC\n\n👑 Admin: ${adminText}
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
  const companyLevel = Number(user.companyLevel || (user.empresa ? 1 : 0));
  const protectionRemaining = user.protectionUntil ? Math.max(0, new Date(user.protectionUntil).getTime() - Date.now()) : 0;
  const boxCount = Number(stats.cajas || 0);
  const profileMention = mentionTarget(senderId, user.name || message?.pushName || 'usuario');

  await sock.sendMessage(chatId, {
    text: `👤 *PERFIL FELCOINS*\n\n👤 ${profileMention.text}\n💰 ${formatFelCoins(displayBalance)}\n\n📊 ESTADÍSTICAS\n\n💼 Trabajos: ${resolvedStats.trabajos}\n⛏️ Minería: ${resolvedStats.mineria}\n🎮 Juegos: ${resolvedStats.juegos}\n🏆 Victorias: ${resolvedStats.victorias}\n💀 Derrotas: ${resolvedStats.derrotas}\n💸 Transferencias: ${resolvedStats.transferencias}\n🦹 Robos: ${resolvedStats.robos}\n💰 Ganancias: ${formatFelCoins(resolvedStats.ganancias)}\n💸 Gastos: ${formatFelCoins(resolvedStats.gastos)}\n🎁 Cajas abiertas: ${boxCount}\n\n🏢 Empresa: ${user.empresa || 'Ninguna'}\n📈 Nivel empresa: ${companyLevel || '—'}\n🛡️ Protección: ${protectionRemaining > 0 ? formatCountdown(protectionRemaining) : 'Inactiva'}\n👑 Admin: ${user.modoAdmin ? 'Sí' : 'No'}\n👑 Modo Rey: ${reyText}`,
    contextInfo: profileMention.jid ? { mentionedJid: [profileMention.jid] } : undefined
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
    text: `🏆 *TOP FELCOINS*\n\n${topText || '🥇 Usuario — 0 FC'}\n\n📊 Tu posición: #${position}\n\n💰 Tu saldo: ${selfBalance}`
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
      text: `⚠️ *YA ESTÁS REGISTRADO*\n\nYa formas parte de la economía FelCoins.\n\n💰 Saldo: ${balance}`
    }, { quoted: message });
    return;
  }

  await registerEconomyUser(senderId, realName);
  await sock.sendMessage(chatId, {
    text: `✅ *REGISTRO COMPLETADO*\n\n👤 Usuario: ${realTag}\n💰 Saldo inicial: 0 FC\n\nAhora puedes comenzar a ganar FelCoins.\n\n💼 Trabaja\n⛏️ Mina\n🎁 Reclama tu diaria\n🏢 Construye tu empresa\n\nUsa .economia para comenzar.`
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
      text: `💰 *FELCOINS ACTIVADO*\n\nEl sistema de economía está disponible nuevamente.\n\n𝕱𝖊𝖑𝖇𝖔𝖙 夜`
    }, { quoted: message });
  } else {
    await sock.sendMessage(chatId, {
      text: `🔒 *FELCOINS DESACTIVADO*\n\nLa economía ha sido desactivada temporalmente.\n\nLos datos de los usuarios se conservarán.\n\n𝕱𝖊𝖑𝖇𝖔𝖙 夜`
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
      text: `⏳ *DIARIA NO DISPONIBLE*\n\nYa reclamaste tu recompensa.\n\nPróxima recompensa en: ${human}.`
    }, { quoted: message });
    return;
  }

  const balance = isOwnerAccount(senderId) ? getOwnerDisplayBalance() : Number(user.saldo || 0);
  await sock.sendMessage(chatId, {
    text: `🎁 *RECOMPENSA DIARIA*\n\n💰 Recibiste: +${result.amount} FC\n\n💵 Saldo: ${formatFelCoins(balance)}\n\n⏰ Próxima recompensa en 24h.`
  }, { quoted: message });
}

function getWorkJobs() {
  return {
    delivery: {
      label: '🚚 REPARTO',
      title: 'Entrega a domicilio',
      detail: 'Llevaste paquetes a clientes del centro y el norte.',
      reward: 580,
      bonus: 'Propinas +180 FC'
    },
    cashier: {
      label: '💳 CAJA',
      title: 'Atención al cliente',
      detail: 'Cobraste ventas y resolviste devoluciones del día.',
      reward: 640,
      bonus: 'Comisión +220 FC'
    },
    repair: {
      label: '🛠️ REPARACIÓN',
      title: 'Servicio técnico',
      detail: 'Arreglaste equipos y dejaste todo funcionando.',
      reward: 700,
      bonus: 'Extra por rapidez +260 FC'
    },
    restaurant: {
      label: '🍽️ RESTAURANTE',
      title: 'Turno de cocina',
      detail: 'Preparaste pedidos y atendiste la mesa de la noche.',
      reward: 540,
      bonus: 'Propina +150 FC'
    },
    warehouse: {
      label: '📦 ALMACÉN',
      title: 'Picking y logística',
      detail: 'Ordenaste stock y entregaste paquetes del almacén.',
      reward: 610,
      bonus: 'Bonificación +190 FC'
    },
    event: {
      label: '🎉 EVENTO',
      title: 'Montaje del evento',
      detail: 'Armaste la zona, ayudaste con la logística y la atención.',
      reward: 760,
      bonus: 'Bonificación de evento +300 FC'
    }
  };
}

async function workCommand(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;

  const remaining = await getRemainingCooldown(senderId, 'work');
  if (remaining > 0) {
    await sock.sendMessage(chatId, {
      text: `⏳ *YA TRABAJASTE HOY*\n\nPodrás volver a trabajar cuando se reinicie tu ventana de 20 minutos.`
    }, { quoted: message });
    return;
  }

  const jobs = getWorkJobs();
  const jobButtons = Object.entries(jobs).slice(0, 6);

  user.workState = {
    type: 'job',
    step: 'route',
    jobs: jobButtons.map(([key]) => key),
    createdAt: new Date()
  };
  user.markModified('workState');
  await user.save();

  const menu = new ButtonV2(sock)
    .setBody('💼 *TRABAJOS DISPONIBLES*\n\nElige UN trabajo.\n\nCada trabajo tiene una recompensa diferente.\n\n⏱️ Puedes completar 2 trabajos cada 20 minutos.')
    .setFooter('FelCoins • Trabajo diario')
    .addButton(jobButtons[0][1].label, `felcoin::work::${jobButtons[0][0]}`)
    .addButton(jobButtons[1][1].label, `felcoin::work::${jobButtons[1][0]}`)
    .addButton(jobButtons[2][1].label, `felcoin::work::${jobButtons[2][0]}`)
    .addButton(jobButtons[3][1].label, `felcoin::work::${jobButtons[3][0]}`)
    .addButton(jobButtons[4][1].label, `felcoin::work::${jobButtons[4][0]}`)
    .addButton(jobButtons[5][1].label, `felcoin::work::${jobButtons[5][0]}`);

  await menu.send(chatId, { quoted: message, mentions: [senderId] });
}

async function mineCommand(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;
  const result = await claimMine(senderId);
  if (!result.ok) {
    if (result.reason === 'no_pickaxe') {
      await sock.sendMessage(chatId, { text: '⛏️ *NO TIENES PICO*\n\nDebes comprar el pico en .tienda por 2.000 FC antes de poder minar.' }, { quoted: message });
      return;
    }
    await sock.sendMessage(chatId, { text: `⏳ ${formatCountdown(await getRemainingCooldown(senderId, 'mine'))} antes de volver a minar.` }, { quoted: message });
    return;
  }

  await sock.sendMessage(chatId, {
    text: `⛏️ *MINERÍA*\n\nHas excavado...\n\n🪨 Encontraste:\n\n💎 ${result.mineral} ×${result.quantity}\n💰 Valor de venta: ${formatFelCoins(result.unitValue)} FC/u\n\n🎒 Guardado en tu inventario.\n🛒 Usa .vender para venderlo.\n\n💵 Saldo: ${formatFelCoins(Number(user.saldo || 0))}`
  }, { quoted: message });
}

async function removeCoinsFromUser(sock, chatId, senderId, message, rawText) {
  if (!isOwnerAccount(senderId) && !message?.key?.fromMe) {
    await sock.sendMessage(chatId, { text: '❌ Solo el OWNER puede usar este comando.' }, { quoted: message });
    return;
  }

  const args = rawText.trim().split(/\s+/).slice(1);
  const amount = parseAmount(args[0]);
  const targetInfo = resolveTargetInfo(message, args[1], 'usuario');
  const target = targetInfo.jid;

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
    text: `╭─〔 ⚙️ FELCOINS 〕─╮\n│\n│ 👤 Usuario: ${targetMention.text}\n│ 💸 Retirado: -${formatFelCoins(amount)} FC\n│\n│ 💰 Antes: ${formatFelCoins(previous)} FC\n│ 💰 Ahora: ${formatFelCoins(Number(updated || 0))} FC\n│\n╰─────────────────╯`,
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
  const targetInfo = resolveTargetInfo(message, args[1], 'usuario');
  const target = targetInfo.jid;

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
      await sock.sendMessage(chatId, { text: `❌ *SALDO INSUFICIENTE*\n\nNecesitas: ${formatFelCoins(amount)}\nTienes: ${formatFelCoins(Number(user.saldo || 0))}` }, { quoted: message });
    } else {
      await sock.sendMessage(chatId, { text: '❌ No se pudo completar la transferencia.' }, { quoted: message });
    }
    return;
  }

  const recipientMention = mentionTarget(target);
  await sock.sendMessage(chatId, {
    text: `╭─〔 💸 TRANSFERENCIA 〕─╮\n│\n│ 👤 Para: ${recipientMention.text}\n│ 💰 Enviado: ${formatFelCoins(amount)} FC\n│\n│ 💵 Saldo anterior: ${formatFelCoins(Number(user.saldo || 0) + amount)} FC\n│ 💳 Saldo actual: ${formatFelCoins(Number(result.senderBalance || 0))} FC\n│\n╰────────────────────╯`,
    contextInfo: recipientMention.jid ? { mentionedJid: [recipientMention.jid] } : undefined
  }, { quoted: message });
}

async function handleRobbery(sock, chatId, senderId, message, targetId) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;

  const attackerUser = await ensureRegisteredWithReply(
    sock, chatId, senderId, message, message?.pushName || 'Usuario'
  );
  if (!attackerUser) return;

  const targetInfo = resolveTargetInfo(message, targetId, 'usuario');
  const target = targetInfo.jid;

  if (!target) {
    await sock.sendMessage(chatId, {
      text: '❌ Debes indicar a quién quieres robar.'
    }, { quoted: message });
    return;
  }

  if (normalize(target) === normalize(senderId)) {
    await sock.sendMessage(chatId, {
      text: '❌ No puedes robarte a ti mismo.'
    }, { quoted: message });
    return;
  }

  const remaining = await getRemainingCooldown(senderId, 'rob');
  if (remaining > 0) {
    await sock.sendMessage(chatId, {
      text: `⏳ *ROBO EN COOLDOWN*\n\nPodrás volver a intentarlo en ${formatCountdown(remaining)}.`
    }, { quoted: message });
    return;
  }

  const targetUser = await ensureEconomyUser(target, 'Usuario');
  if (!targetUser || !targetUser.registered) {
    await sock.sendMessage(chatId, {
      text: '❌ Ese usuario no está registrado en FelCoins.'
    }, { quoted: message });
    return;
  }

  attackerUser.lastRob = new Date();
  await attackerUser.save();

  if (isOwnerAccount(target)) {
    const penalty = 2000;
    await deductBalance(senderId, penalty, 'robar', 'Multa por intentar robar al OWNER');
    await sock.sendMessage(chatId, {
      text: `👑 *ROBO AL OWNER BLOQUEADO*\n\nNo puedes robar al OWNER.\n\n💸 Multa: -${formatFelCoins(penalty)}`
    }, { quoted: message });
    return;
  }

  if (hasActiveProtection(targetUser)) {
    const remainingProtection = Math.max(
      0,
      new Date(targetUser.protectionUntil).getTime() - Date.now()
    );
    await deductBalance(senderId, 500, 'robar', 'Multa por intentar robar a un usuario protegido');
    await sock.sendMessage(chatId, {
      text: `🛡️ *ROBO BLOQUEADO*\n\n${targetInfo.label} tiene protección activa durante ${formatCountdown(remainingProtection)}.\n\n💸 Multa: -500 FC`,
      contextInfo: targetInfo.jid ? { mentionedJid: [targetInfo.jid] } : undefined
    }, { quoted: message });
    return;
  }

  const config = await ensureEconomyConfig();
  const victimBalance = Number(targetUser.saldo || 0);

  if (victimBalance < Number(config.limits?.robMin || 100)) {
    await sock.sendMessage(chatId, {
      text: '❌ Ese usuario no tiene suficientes FelCoins para robarle.'
    }, { quoted: message });
    return;
  }

  const amount = Math.min(
    Math.floor(victimBalance * Number(config.limits?.robPercent || 0.50)),
    Number(config.limits?.robMax || 8000)
  );

  const rob = await createRobbery(
    senderId,
    target,
    Math.max(Number(config.limits?.robMin || 100), amount)
  );

  if (!rob) {
    await sock.sendMessage(chatId, {
      text: '❌ No se pudo iniciar el robo.'
    }, { quoted: message });
    return;
  }

  const protectButton = new ButtonV2(sock)
    .setBody(
      `🚨 *INTENTO DE ROBO*\n\n👤 ${targetInfo.label}, ${formatEconomyLabel(senderId, 'usuario')} está intentando robarte.\n\n⏳ Tienes 5 minutos para proteger tus FelCoins.`
    )
    .setFooter('FelCoins • Protección')
    .addButton('🛡️ PROTEGERSE', `felcoin::protect::${normalize(target)}`);

  await protectButton.send(chatId, {
    quoted: message,
    mentions: [target]
  });

  setTimeout(async () => {
    try {
      const pending = await getPendingRobForVictim(target);
      if (!pending || String(pending.attacker) !== normalize(senderId)) return;

      const victim = await ensureEconomyUser(target, 'Usuario');
      if (!victim || !victim.registered) return;

      if (hasActiveProtection(victim)) {
        const blocked = await resolveRobbery(pending.attacker, pending.victim, true);
        if (blocked?.ok) {
          await sock.sendMessage(chatId, {
            text: `🛡️ *ROBO BLOQUEADO*\n\n${targetInfo.label} tenía protección activa.`
          }, { quoted: message });
        }
        return;
      }

      const success = Math.random() < 0.70;
      const result = success
        ? await resolveRobbery(pending.attacker, pending.victim, false)
        : await resolveRobbery(pending.attacker, pending.victim, true, 300);

      if (success && result?.ok) {
        await sock.sendMessage(chatId, {
          text: `🚨 *ROBO EXITOSO*\n\n👤 Víctima: ${targetInfo.label}\n💰 Robaste: +${formatFelCoins(result.amount || 0)}\n\n💵 Se tomó el 50% del saldo, con máximo de 8.000 FC.`,
          contextInfo: targetInfo.jid ? { mentionedJid: [targetInfo.jid] } : undefined
        }, { quoted: message });
      } else if (result?.ok) {
        await sock.sendMessage(chatId, {
          text: `🚔 *ROBO FALLIDO*\n\n👤 Víctima: ${targetInfo.label}\n\n💸 Multa por fallar: -300 FC\n🎯 Probabilidad de éxito: 70%`
        }, { quoted: message });
      }
    } catch (error) {
      console.error('[FELCOINS ROBO] Error resolviendo robo:', error);
    }
  }, 5 * 60 * 1000);
}
async function protectMe(sock, chatId, senderId, message, requestedHours = null) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;

  const victim = await ensureEconomyUser(senderId, message?.pushName || 'Usuario');
  if (!victim || !victim.registered) return;

  // La protección manual funciona aunque no tenga una tarjeta comprada.
  // Solo se puede usar cuando existe un robo pendiente contra esa persona.
  const pending = await getPendingRobForVictim(senderId);
  if (!pending) return;

  const result = await resolveRobbery(
    pending.attacker,
    pending.victim,
    true,
    300
  );

  if (!result?.ok) return;

  await sock.sendMessage(chatId, {
    text: `🛡️ *ROBO BLOQUEADO*

Lograste proteger tus FelCoins manualmente.

💸 El ladrón recibió una multa de 300 FC.`
  }, { quoted: message });
}
async function resetEconomy(sock, chatId, senderId, message) {
  if (!isOwnerAccount(senderId) && !message?.key?.fromMe) {
    await sock.sendMessage(chatId, { text: '❌ Solo el OWNER puede reiniciar la economía.' }, { quoted: message });
    return;
  }

  const result = await require('../lib/felcoins').resetEconomyState(senderId);
  await sock.sendMessage(chatId, {
    text: `♻️ *ECONOMÍA REINICIADA*\n\nUsuarios dejados en 0 FC: ${result.resetCount || 0}\n\n👑 Owner: preservado.`
  }, { quoted: message });
}

const ECONOMY_ITEM_LABELS = {
  pico: '⛏️ Pico', multiplier: '⚡ Multiplicador', protect12: '🛡️ Protección 12h', protect24: '🛡️ Protección 24h',
  play: '🎵 Acceso .play', tiktok: '🎵 Acceso .tiktok', instagram: '📸 Acceso .instagram', brat: '📝 Acceso .brat', vv: '👁️ Acceso .vv',
  cofre: '📦 Cofre', carbon: '🪨 Carbón', hierro: '⚙️ Hierro', plata: '🥈 Plata', oro: '🥇 Oro', diamante: '💎 Diamante', cristal: '💠 Cristal raro'
};
const ECONOMY_SELL_PRICES = { carbon:80, hierro:160, plata:300, oro:650, diamante:1200, cristal:2200, cofre:1500 };
function economyInventoryEntries(user) {
  return Object.entries(user?.inventory || {}).map(([key,data]) => ({key, quantity:Number(data?.quantity || 0)})).filter(x => x.quantity > 0);
}
async function inventoryCommand(sock, chatId, senderId, message) {
  if (!await ensureEconomyActive(sock,chatId,message)) return;
  const user=await ensureRegisteredWithReply(sock,chatId,senderId,message,message?.pushName||'Usuario'); if(!user)return;
  const entries=economyInventoryEntries(user);
  if(!entries.length){ const m=new ButtonV2(sock).setBody('🎒 *INVENTARIO*\n\nTu inventario está vacío.\n\n⛏️ Compra un pico en .tienda y usa .minar.').setFooter('FelCoins • Inventario').addButton('🛒 TIENDA','felcoin::tienda'); await m.send(chatId,{quoted:message}); return; }
  const lines=entries.map((x,i)=>(i+1)+'. '+(ECONOMY_ITEM_LABELS[x.key]||x.key)+' ×'+x.quantity).join('\n');
  const m=new ButtonV2(sock).setBody('🎒 *INVENTARIO FELCOINS*\n\n'+lines+'\n\nSelecciona un objeto.').setFooter('FelCoins • Inventario');
  for(const x of entries.slice(0,9)) m.addButton((ECONOMY_ITEM_LABELS[x.key]||x.key)+' ×'+x.quantity,'felcoin::inv::view::'+x.key);
  m.addButton('🛒 VENDER','felcoin::vender'); await m.send(chatId,{quoted:message});
}
async function sellMenu(sock, chatId, senderId, message) {
  if (!await ensureEconomyActive(sock,chatId,message)) return;
  const user=await ensureRegisteredWithReply(sock,chatId,senderId,message,message?.pushName||'Usuario'); if(!user)return;
  const entries=economyInventoryEntries(user).filter(x=>ECONOMY_SELL_PRICES[x.key]);
  if(!entries.length){await sock.sendMessage(chatId,{text:'🛒 *VENDER*\n\nNo tienes objetos vendibles.\n\n⛏️ Usa .minar para conseguir minerales.'},{quoted:message});return;}
  const lines=entries.map(x=>(ECONOMY_ITEM_LABELS[x.key]||x.key)+' ×'+x.quantity+' — '+formatFelCoins(ECONOMY_SELL_PRICES[x.key])+' FC/u').join('\n');
  const m=new ButtonV2(sock).setBody('🛒 *¿QUÉ DESEAS VENDER?*\n\n'+lines+'\n\nCada botón vende 1 unidad.').setFooter('FelCoins • Venta');
  for(const x of entries.slice(0,9)) m.addButton('💰 '+(ECONOMY_ITEM_LABELS[x.key]||x.key)+' ×'+x.quantity,'felcoin::sell::'+x.key);
  m.addButton('🎒 INVENTARIO','felcoin::inventario'); await m.send(chatId,{quoted:message});
}
async function sellItem(sock, chatId, senderId, message, itemKey) {
  if (!await ensureEconomyActive(sock,chatId,message)) return;
  const user=await ensureRegisteredWithReply(sock,chatId,senderId,message,message?.pushName||'Usuario'); if(!user)return;
  const key=String(itemKey||'').toLowerCase(), price=Number(ECONOMY_SELL_PRICES[key]||0), qty=Number(user.inventory?.[key]?.quantity||0);
  if(!price||qty<=0){await sock.sendMessage(chatId,{text:'⚠️ Ese objeto ya no está disponible para vender.'},{quoted:message});return;}
  user.inventory[key].quantity=qty-1; if(user.inventory[key].quantity<=0) delete user.inventory[key];
  user.saldo=Number(user.saldo||0)+price; user.stats=user.stats||{}; user.stats.ganancias=Number(user.stats.ganancias||0)+price; user.markModified('inventory'); user.markModified('stats'); await user.save();
  await sock.sendMessage(chatId,{text:'🛒 *VENTA COMPLETADA*\n\n📦 '+(ECONOMY_ITEM_LABELS[key]||key)+' ×1\n💰 Recibiste: +'+formatFelCoins(price)+' FC\n📦 Te quedan: '+Math.max(0,qty-1)+'\n💵 Saldo: '+formatFelCoins(Number(user.saldo||0))},{quoted:message});
  if(Number(user.inventory?.[key]?.quantity||0)>0) await sellMenu(sock,chatId,senderId,message);
}
async function openShop(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const menu = new ButtonV2(sock)
    .setBody('🛒 *TIENDA FELCOINS*\n\nSelecciona un producto:')
    .setFooter('FelCoins • Tienda')
    .addButton('🎵 .PLAY — 50K', 'felcoin::shop::play')
    .addButton('🎵 .TIKTOK — 30K', 'felcoin::shop::tiktok')
    .addButton('📸 .INSTAGRAM — 30K', 'felcoin::shop::instagram')
    .addButton('📝 .BRAT — 20K', 'felcoin::shop::brat')
    .addButton('👁️ .VV — 10K', 'felcoin::shop::vv')
    .addButton('🛡️ PROTEGERME 12H — 12K', 'felcoin::shop::protect12')
    .addButton('🛡️ PROTEGERME 24H — 24K', 'felcoin::shop::protect24')
    .addButton('⚡ MULTIPLICADOR x2 — 10K', 'felcoin::shop::multiplier')
    .addButton('⛏️ PICO — 2K', 'felcoin::shop::pico')
    .addButton('🎁 CAJA MISTERIOSA — 2K', 'felcoin::caja')
    .addButton('🎒 INVENTARIO', 'felcoin::inventario')
    .addButton('🛒 VENDER', 'felcoin::vender')
    .addButton('👑 MODO REY — 2.5M', 'felcoin::shop::modoRey');
  await menu.send(chatId, { quoted: message });
}

async function buyProduct(sock, chatId, senderId, message, product) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;

  const normalizedProduct = String(product || '').trim().toLowerCase().replace(/^\./, '');
  product = normalizedProduct;
  const config = await ensureEconomyConfig();
  const price = Number(config.prices?.[product] || 0);
  if (price <= 0) {
    await sock.sendMessage(chatId, { text: `❌ Producto no disponible: ${product}` }, { quoted: message });
    return;
  }

  const commandProduct = ['play', 'tiktok', 'instagram', 'brat', 'vv'].includes(product);
  if (commandProduct && Number(user.inventory?.[product]?.quantity || 0) > 0) {
    await sock.sendMessage(chatId, {
      text: `🔓 *COMANDO YA DESBLOQUEADO*\n\n${({ play: '🎵 .play', tiktok: '🎵 .tiktok', instagram: '📸 .instagram', brat: '📝 .brat', vv: '👁️ .vv' })[product] || product}\n\nYa compraste este acceso anteriormente. No necesitas volver a pagarlo.`
    }, { quoted: message });
    return;
  }

  if (!isOwnerAccount(senderId) && Number(user.saldo || 0) < price) {
    await sock.sendMessage(chatId, {
      text: `❌ *FELCOINS INSUFICIENTES*\n\nNecesitas: ${formatFelCoins(price)}\nTienes: ${formatFelCoins(Number(user.saldo || 0))}`
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
      text: `✅ *MODO REY ACTIVADO*\n\n👑 Ahora eres inmune al modo admin del grupo.\n\n💸 Gastaste: ${formatFelCoins(price)}`
    }, { quoted: message });
    return;
  }

  if (commandProduct) {
    const labels = { play: '🎵 .play', tiktok: '🎵 .tiktok', instagram: '📸 .instagram', brat: '📝 .brat', vv: '👁️ .vv' };
    user.inventory[product] = { quantity: 1, expiresAt: null };
    user.markModified('inventory');
    await user.save();
    await sock.sendMessage(chatId, { text: `✅ *COMANDO DESBLOQUEADO*\n\n${labels[product] || product}\n\n💸 Compra: ${formatFelCoins(price)}\n\n🔓 Ya puedes usar este comando.` }, { quoted: message });
    return;
  }

  if (product === 'multiplier') {
    user.inventory.multiplier = { quantity: 1, expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000) };
    user.markModified('inventory');
    await user.save();
    await sock.sendMessage(chatId, { text: `✅ *MULTIPLICADOR x2 ACTIVADO*\n\n⚡ Tus recompensas de trabajar y minar se duplican durante 6 horas.\n\n💸 Gastaste: ${formatFelCoins(price)}` }, { quoted: message });
    return;
  }

  if (product === 'pico') {
    if (Number(user.inventory?.pico?.quantity || 0) > 0) {
      await sock.sendMessage(chatId, { text: '⛏️ *PICO YA COMPRADO*\n\nYa tienes un pico y puedes usar .minar.' }, { quoted: message });
      return;
    }
    user.inventory.pico = { quantity: 1, expiresAt: null };
    user.markModified('inventory');
    await user.save();
    await sock.sendMessage(chatId, { text: `⛏️ *PICO COMPRADO*\n\nYa puedes usar .minar.\n\n💸 Gastaste: ${formatFelCoins(price)}` }, { quoted: message });
    return;
  }

  const protectionProduct = product === 'protect12' || product === 'protect24';
  const hours = product === 'protect24' ? 24 : 12;

  if (protectionProduct) {
    // La compra activa la protección inmediatamente.
    user.protectionUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    user.markModified('protectionUntil');
    await user.save();

    await sock.sendMessage(chatId, {
      text: `🛡️ *PROTECCIÓN ACTIVADA*

⏱️ Duración: ${hours} horas
💸 Gastaste: ${formatFelCoins(price)}

Tu protección quedó activa automáticamente. Nadie podrá robarte mientras esté vigente.`
    }, { quoted: message });
    return;
  }

  user.inventory[product] = { quantity: Number(user.inventory[product]?.quantity || 0) + 1, expiresAt: null };
  user.markModified('inventory');
  await user.save();

  await sock.sendMessage(chatId, {
    text: `✅ *COMPRA REALIZADA*\n\n📦 Producto: ${product}\n\n💸 Gastaste: ${formatFelCoins(price)}`
  }, { quoted: message });
}

async function openGamesMenu(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const menu = new ButtonV2(sock)
    .setBody('🎮 *JUEGOS FELCOINS*\n\nElige un juego para apostar y ganar FC.')
    .setFooter('FelCoins • Juegos')
    .addButton('🎡 RULETA', 'felcoin::game::ruleta')
    .addButton('🎰 SLOTS', 'felcoin::game::slots')
    .addButton('🃏 BLACKJACK', 'felcoin::game::blackjack')
    .addButton('💥 CRASH', 'felcoin::game::crash')
    .addButton('🏇 CARRERAS', 'felcoin::game::race')
    .addButton('🪙 CARA O CRUZ', 'felcoin::game::coinflip')
    .addButton('🎲 DADOS', 'felcoin::game::dice')
    .addButton('⬅️ VOLVER', 'felcoin::economia');
  await menu.send(chatId, { quoted: message });
}

async function viewCompanies(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const menu = new ButtonV2(sock)
    .setBody('🏢 *EMPRESAS FELCOINS*\n\nCompra una empresa y mejórala hasta nivel 5.\nCada nivel aumenta el ingreso diario en +50%.')
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
  const active=await ensureEconomyActive(sock,chatId,message); if(!active)return;
  const config=await ensureEconomyConfig(); const data=config.companies?.[company]; if(!data)return;
  const user=await ensureEconomyUser(senderId,message?.pushName||'Usuario');
  const labels={ropa:'👕 ROPA',pizzeria:'🍕 PIZZERÍA',gamer:'🎮 GAMER STORE',tecnologia:'💻 TECNOLOGÍA',banco:'🏦 BANCO',felbot:'🌐 FELBOT ORG'};
  const owned=user?.empresa===company; const level=owned?Math.max(1,Number(user.companyLevel||1)):0; const max=Number(data.maxLevel||5);
  const income=owned?Math.round(Number(data.income||0)*(1+((level-1)*0.5))):Number(data.income||0);
  const cost=owned&&level<max?Math.max(1000,Math.round(Number(data.price||0)*level*0.75)):0;
  const body=`${labels[company]||company}\n\n💰 Compra: ${formatFelCoins(data.price||0)}\n📈 Ingreso base: +${formatFelCoins(data.income||0)}/día\n🏢 Nivel: ${level||'—'} / ${max}\n💵 Ingreso actual: +${formatFelCoins(income)}/día\n${owned&&level<max?`⬆️ Mejora: ${formatFelCoins(cost)}`:owned?'🏆 NIVEL MÁXIMO':'🛒 Compra esta empresa para empezar'}`;
  const menu=new ButtonV2(sock).setBody(body).setFooter('FelCoins • Empresa').addButton(owned?(level<max?'⬆️ MEJORAR':'🏆 NIVEL 5'):'🛒 COMPRAR',owned&&level<max?`felcoin::upgradeCompany::${company}`:owned?'felcoin::empresas':`felcoin::buyCompany::${company}`).addButton('⬅️ VOLVER','felcoin::empresas');
  await menu.send(chatId,{quoted:message});
}

async function buyCompany(sock, chatId, senderId, message, company) {
  const active=await ensureEconomyActive(sock,chatId,message); if(!active)return;
  const user=await ensureRegisteredWithReply(sock,chatId,senderId,message,message?.pushName||'Usuario'); if(!user)return;
  const config=await ensureEconomyConfig(); const data=config.companies?.[company];
  if(!data){await sock.sendMessage(chatId,{text:'❌ Empresa no disponible.'},{quoted:message});return;}
  if(user.empresa){await sock.sendMessage(chatId,{text:`⚠️ Ya tienes la empresa ${user.empresa}. Mejora esa empresa antes de comprar otra.`},{quoted:message});return;}
  const price=Number(data.price||0);
  if(!isOwnerAccount(senderId)&&Number(user.saldo||0)<price){await sock.sendMessage(chatId,{text:`❌ *FELCOINS INSUFICIENTES*\n\nNecesitas: ${formatFelCoins(price)}`},{quoted:message});return;}
  if(!isOwnerAccount(senderId)){user.saldo-=price;user.stats=user.stats||{};user.stats.gastos=Number(user.stats.gastos||0)+price;}
  user.empresa=company; user.companyLevel=1; user.companyPurchasedAt=new Date(); user.companyLastPaidAt=new Date(); user.ingresoDiario=Number(data.income||0); user.markModified('stats'); await user.save();
  await sock.sendMessage(chatId,{text:`✅ *EMPRESA ADQUIRIDA*\n\n🏢 ${company}\n⭐ Nivel: 1\n📈 Ingreso: +${formatFelCoins(user.ingresoDiario)}/día\n💰 Inversión: ${formatFelCoins(price)}\n\n⬆️ Mejora con .mejorarempresa.`},{quoted:message});
}

async function upgradeCompany(sock, chatId, senderId, message, company) {
  const active=await ensureEconomyActive(sock,chatId,message); if(!active)return;
  const user=await ensureRegisteredWithReply(sock,chatId,senderId,message,message?.pushName||'Usuario'); if(!user)return;
  const config=await ensureEconomyConfig(); const data=config.companies?.[company];
  if(!data||user.empresa!==company){await sock.sendMessage(chatId,{text:'❌ Debes ser dueño de esa empresa para mejorarla.'},{quoted:message});return;}
  const level=Math.max(1,Number(user.companyLevel||1)); const max=Number(data.maxLevel||5);
  if(level>=max){await sock.sendMessage(chatId,{text:`🏆 *EMPRESA AL MÁXIMO*\n\nNivel ${max}.`},{quoted:message});return;}
  const cost=Math.max(1000,Math.round(Number(data.price||0)*level*0.75));
  if(!isOwnerAccount(senderId)&&Number(user.saldo||0)<cost){await sock.sendMessage(chatId,{text:`❌ *FELCOINS INSUFICIENTES*\n\nMejora a nivel ${level+1}: ${formatFelCoins(cost)}`},{quoted:message});return;}
  if(!isOwnerAccount(senderId)){user.saldo-=cost;user.stats=user.stats||{};user.stats.gastos=Number(user.stats.gastos||0)+cost;}
  user.companyLevel=level+1; user.ingresoDiario=Math.round(Number(data.income||0)*(1+((user.companyLevel-1)*0.5))); user.markModified('stats'); await user.save();
  await sock.sendMessage(chatId,{text:`⬆️ *EMPRESA MEJORADA*\n\n🏢 ${company}\n⭐ Nivel: ${user.companyLevel}/${max}\n📈 Ingreso diario: +${formatFelCoins(user.ingresoDiario)}\n💸 Inversión: ${formatFelCoins(cost)}`},{quoted:message});
}

async function mysteryBox(sock, chatId, senderId, message) {
  const active=await ensureEconomyActive(sock,chatId,message); if(!active)return;
  const result=await openMysteryBox(senderId);
  if(!result.ok){const text=result.reason==='insufficient'?`❌ *FELCOINS INSUFICIENTES*\n\nLa caja cuesta ${formatFelCoins(result.price||2000)}.\nTienes: ${formatFelCoins(result.balance||0)}`:'⚠️ No se pudo abrir la caja.';await sock.sendMessage(chatId,{text},{quoted:message});return;}
  const r=result.result||{}; let outcome='';
  if(r.type==='item'){const labels={diamante:'💎 Diamante',cristal:'💠 Cristal raro',protect24:'🛡️ Protección 24h',protect12:'🛡️ Protección 12h',multiplier:'⚡ Multiplicador',oro:'🥇 Oro',plata:'🥈 Plata',cofre:'📦 Cofre'};outcome='🎁 *OBJETO OBTENIDO*\n\n'+(labels[r.item]||r.item)+' ×'+(r.quantity||1)+'\n🏷️ Rareza: '+(r.label||'RECOMPENSA');}
  else if(r.type==='coins'){outcome=(r.label||'💰 RECOMPENSA')+'\n\n💰 Ganaste +'+formatFelCoins(r.amount||0)+' FC.';}
  else {outcome='🎁 *RECOMPENSA*\n\n'+JSON.stringify(r);}
  await sock.sendMessage(chatId,{text:'🎁 *CAJA MISTERIOSA*\n\n💸 Precio: 2.000 FC\n\n'+outcome+'\n\n💵 Saldo: '+formatFelCoins(result.saldo)}, {quoted:message});
}
async function rouletteGame(sock, chatId, senderId, message, amount) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;

  const value = Math.max(1, Number(amount) || 0);
  if (!isOwnerAccount(senderId) && Number(user.saldo || 0) < value) {
    await sock.sendMessage(chatId, { text: `❌ *FELCOINS INSUFICIENTES*\n\nNecesitas: ${formatFelCoins(value)}` }, { quoted: message });
    return;
  }

  const roll = Math.random();
  user.stats = user.stats || {};
  user.stats.juegos = Number(user.stats.juegos || 0) + 1;

  if (!isOwnerAccount(senderId)) user.saldo = Number(user.saldo || 0) - value;

  if (roll < 0.02) {
    const jackpotPrize = 1000000;
    user.saldo = Number(user.saldo || 0) + jackpotPrize;
    user.stats.victorias = Number(user.stats.victorias || 0) + 1;
    await user.save();
    await sock.sendMessage(chatId, {
      text: `🎡 *RULETA*\n\n🎯 Apuesta: ${formatFelCoins(value)}\n\n💎 3 DIAMANTES\n\n🎉 GANASTE EL PREMIO MAYOR\n\n💰 +${formatFelCoins(jackpotPrize)}\n\n💵 Saldo: ${formatFelCoins(Number(user.saldo || 0))}`
    }, { quoted: message });
    return;
  }

  if (roll < 0.8) {
    user.stats.derrotas = Number(user.stats.derrotas || 0) + 1;
    await user.save();
    await sock.sendMessage(chatId, {
      text: `🎡 *RULETA*\n\n🎯 Apuesta: ${formatFelCoins(value)}\n\n⚫ PERDISTE\n\n💸 -${formatFelCoins(value)}\n\n💵 Saldo: ${formatFelCoins(Number(user.saldo || 0))}`
    }, { quoted: message });
    return;
  }

  const prize = value * 2;
  user.saldo = Number(user.saldo || 0) + prize;
  user.stats.victorias = Number(user.stats.victorias || 0) + 1;
  await user.save();
  await sock.sendMessage(chatId, {
    text: `🎡 *RULETA*\n\n🎯 Apuesta: ${formatFelCoins(value)}\n\n🔴 x2\n\n💰 Ganaste: +${formatFelCoins(prize)}\n\n💵 Saldo: ${formatFelCoins(Number(user.saldo || 0))}`
  }, { quoted: message });
}

async function slotsGame(sock, chatId, senderId, message, amount) {
  const active=await ensureEconomyActive(sock,chatId,message); if(!active)return;
  const user=await ensureRegisteredWithReply(sock,chatId,senderId,message,message?.pushName||'Usuario'); if(!user)return;
  const value=Math.max(100,Number(amount)||0);
  if(!isOwnerAccount(senderId)&&Number(user.saldo||0)<value){await sock.sendMessage(chatId,{text:'❌ *FELCOINS INSUFICIENTES*\n\nNecesitas: '+formatFelCoins(value)},{quoted:message});return;}
  const icons=['🍒','⭐','💎','7️⃣','🍋','🔔']; const draw=Array.from({length:3},()=>icons[Math.floor(Math.random()*icons.length)]);
  const counts={}; for(const icon of draw)counts[icon]=(counts[icon]||0)+1; const maxSame=Math.max(...Object.values(counts));
  let mult=0,label='❌ SIN COMBINACIÓN';
  if(draw.every(x=>x==='💎')){mult=15;label='💎💎💎 JACKPOT';} else if(draw.every(x=>x==='7️⃣')){mult=10;label='7️⃣7️⃣7️⃣ SUPER PREMIO';} else if(maxSame===3){mult=5;label='🎉 TRIPLE';} else if(maxSame===2){mult=1.5;label='✨ PAREJA';}
  if(!isOwnerAccount(senderId))user.saldo=Number(user.saldo||0)-value;
  user.stats=user.stats||{}; user.stats.juegos=Number(user.stats.juegos||0)+1;
  if(mult>0){const prize=Math.round(value*mult); if(!isOwnerAccount(senderId))user.saldo+=prize; user.stats.victorias=Number(user.stats.victorias||0)+1; await user.save(); await sock.sendMessage(chatId,{text:'🎰 *SLOTS*\n\n🎯 Apuesta: '+formatFelCoins(value)+'\n\n'+draw.join(' | ')+'\n\n'+label+'\n💰 Premio: +'+formatFelCoins(prize)+' ('+mult+'x)\n\n💵 Saldo: '+formatFelCoins(Number(user.saldo||0))},{quoted:message});return;}
  user.stats.derrotas=Number(user.stats.derrotas||0)+1; user.stats.gastos=Number(user.stats.gastos||0)+value; await user.save();
  await sock.sendMessage(chatId,{text:'🎰 *SLOTS*\n\n🎯 Apuesta: '+formatFelCoins(value)+'\n\n'+draw.join(' | ')+'\n\n'+label+'\n\n💸 -'+formatFelCoins(value)+'\n💵 Saldo: '+formatFelCoins(Number(user.saldo||0))},{quoted:message});
}
async function coinflipBet(sock,chatId,senderId,message,amount){
  if(!await ensureEconomyActive(sock,chatId,message))return; const user=await ensureRegisteredWithReply(sock,chatId,senderId,message,message?.pushName||'Usuario'); if(!user)return;
  const value=Math.max(100,Number(amount)||0); if(!isOwnerAccount(senderId)&&Number(user.saldo||0)<value){await sock.sendMessage(chatId,{text:'❌ Necesitas '+formatFelCoins(value)+' FC para jugar.'},{quoted:message});return;}
  const guess=Math.random()<0.5?'CARA':'CRUZ', result=Math.random()<0.5?'CARA':'CRUZ'; if(!isOwnerAccount(senderId))user.saldo-=value; user.stats=user.stats||{}; user.stats.juegos=Number(user.stats.juegos||0)+1;
  if(guess===result){const prize=value*2;if(!isOwnerAccount(senderId))user.saldo+=prize;user.stats.victorias=Number(user.stats.victorias||0)+1;await user.save();return sock.sendMessage(chatId,{text:'🪙 *CARA O CRUZ*\n\n🎯 Elegiste: '+guess+'\n🪙 Salió: '+result+'\n\n🎉 ¡GANASTE! +'+formatFelCoins(prize)+' FC'},{quoted:message});}
  user.stats.derrotas=Number(user.stats.derrotas||0)+1;await user.save();return sock.sendMessage(chatId,{text:'🪙 *CARA O CRUZ*\n\n🎯 Elegiste: '+guess+'\n🪙 Salió: '+result+'\n\n❌ Perdiste '+formatFelCoins(value)+' FC.'},{quoted:message});
}
async function diceBet(sock,chatId,senderId,message,amount){
  if(!await ensureEconomyActive(sock,chatId,message))return; const user=await ensureRegisteredWithReply(sock,chatId,senderId,message,message?.pushName||'Usuario'); if(!user)return;
  const value=Math.max(100,Number(amount)||0); if(!isOwnerAccount(senderId)&&Number(user.saldo||0)<value){await sock.sendMessage(chatId,{text:'❌ Necesitas '+formatFelCoins(value)+' FC para jugar.'},{quoted:message});return;}
  const player=1+Math.floor(Math.random()*6), bot=1+Math.floor(Math.random()*6); if(!isOwnerAccount(senderId))user.saldo-=value; user.stats=user.stats||{}; user.stats.juegos=Number(user.stats.juegos||0)+1;
  if(player>bot){const prize=value*2;if(!isOwnerAccount(senderId))user.saldo+=prize;user.stats.victorias=Number(user.stats.victorias||0)+1;await user.save();return sock.sendMessage(chatId,{text:'🎲 *DADOS*\n\n👤 Tú: '+player+'\n🤖 Bot: '+bot+'\n\n🏆 Ganaste +'+formatFelCoins(prize)+' FC.'},{quoted:message});}
  if(player===bot){if(!isOwnerAccount(senderId))user.saldo+=value;await user.save();return sock.sendMessage(chatId,{text:'🎲 *DADOS*\n\n👤 Tú: '+player+'\n🤖 Bot: '+bot+'\n\n🤝 Empate. Recuperas tu apuesta.'},{quoted:message});}
  user.stats.derrotas=Number(user.stats.derrotas||0)+1;await user.save();return sock.sendMessage(chatId,{text:'🎲 *DADOS*\n\n👤 Tú: '+player+'\n🤖 Bot: '+bot+'\n\n❌ Perdiste '+formatFelCoins(value)+' FC.'},{quoted:message});
}
async function sendBetMenu(sock, chatId, senderId, message, game) {
  const label = game === 'crash' ? '💥 CRASH' : '🃏 BLACKJACK';
  const prefix = game === 'crash' ? 'felcoin::crashbet::' : 'felcoin::blackjackbet::';
  const menu = new ButtonV2(sock)
    .setBody(`${label}\n\n💰 Elige cuánto quieres apostar:`)
    .setFooter('FelCoins • Apuesta')
    .addButton('💰 1.000 FC', `${prefix}1000::${normalize(senderId)}`)
    .addButton('💰 2.000 FC', `${prefix}2000::${normalize(senderId)}`)
    .addButton('💰 3.000 FC', `${prefix}3000::${normalize(senderId)}`)
    .addButton('💰 4.000 FC', `${prefix}4000::${normalize(senderId)}`)
    .addButton('💰 5.000 FC', `${prefix}5000::${normalize(senderId)}`);
  await menu.send(chatId, { quoted: message });
}

async function blackjackInitial(sock, chatId, senderId, message, amount) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;

  if (user.blackjack?.active) {
    await sock.sendMessage(chatId, { text: '⚠️ Ya tienes una partida de blackjack activa.' }, { quoted: message });
    return;
  }

  const value = Number(amount || 0);
  if (value <= 0) return sendBetMenu(sock, chatId, senderId, message, 'blackjack');

  if (!isOwnerAccount(senderId) && Number(user.saldo || 0) < value) {
    await sock.sendMessage(chatId, {
      text: `❌ *FELCOINS INSUFICIENTES*\n\nNecesitas: ${formatFelCoins(value)}\nTienes: ${formatFelCoins(Number(user.saldo || 0))}`
    }, { quoted: message });
    return;
  }

  if (!isOwnerAccount(senderId)) user.saldo = Number(user.saldo || 0) - value;

  const deck = [
    1,2,3,4,5,6,7,8,9,10,10,10,10,
    1,2,3,4,5,6,7,8,9,10,10,10,10,
    1,2,3,4,5,6,7,8,9,10,10,10,10
  ];
  const draw = () => deck[Math.floor(Math.random() * deck.length)];
  const card1 = draw();
  const card2 = draw();
  const bot1 = draw();
  const bot2 = draw();

  user.blackjack = {
    active: true,
    amount: value,
    cards: [card1, card2],
    botCards: [bot1, bot2],
    total: card1 + card2
  };
  user.stats = user.stats || {};
  user.stats.juegos = Number(user.stats.juegos || 0) + 1;
  await user.save();

  const buttons = new ButtonV2(sock)
    .setBody(`🃏 *BLACKJACK*\n\n💰 Apuesta: ${formatFelCoins(value)}\n\nTus cartas:\n🂠 ${card1} + 🂠 ${card2}\n\nTotal: ${user.blackjack.total}\n\n¿Qué haces?`)
    .setFooter('FelCoins • Blackjack')
    .addButton('🃏 PEDIR', `felcoin::blackjack::hit::${normalize(senderId)}`)
    .addButton('✋ PLANTARSE', `felcoin::blackjack::stand::${normalize(senderId)}`);
  await buttons.send(chatId, { quoted: message });
}

async function blackjackHit(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;
  if (!user.blackjack?.active) return;

  const deck = [1,2,3,4,5,6,7,8,9,10,10,10,10];
  const newCard = deck[Math.floor(Math.random() * deck.length)];
  user.blackjack.cards.push(newCard);
  user.blackjack.total = user.blackjack.cards.reduce((sum, card) => sum + card, 0);

  if (user.blackjack.total > 21) {
    const total = user.blackjack.total;
    const lost = Number(user.blackjack.amount || 0);
    delete user.blackjack;
    user.stats.derrotas = Number(user.stats.derrotas || 0) + 1;
    await user.save();
    await sock.sendMessage(chatId, {
      text: `💥 *BLACKJACK — TE PASASTE*\n\n🃏 Carta: ${newCard}\n💥 Total: ${total}\n\n💸 Perdiste: -${formatFelCoins(lost)}`
    }, { quoted: message });
    return;
  }

  await user.save();
  const buttons = new ButtonV2(sock)
    .setBody(`🃏 *BLACKJACK*\n\nTus cartas:\n${user.blackjack.cards.join(' + ')}\n\nTotal: ${user.blackjack.total}\n\n¿Qué haces?`)
    .setFooter('FelCoins • Blackjack')
    .addButton('🃏 PEDIR', `felcoin::blackjack::hit::${normalize(senderId)}`)
    .addButton('✋ PLANTARSE', `felcoin::blackjack::stand::${normalize(senderId)}`);
  await buttons.send(chatId, { quoted: message });
}

async function blackjackStand(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;
  if (!user.blackjack?.active) return;

  const playerTotal = Number(user.blackjack.total || 0);
  const botCards = Array.isArray(user.blackjack.botCards) ? [...user.blackjack.botCards] : [10, 10];
  let botTotal = botCards.reduce((a, b) => a + b, 0);
  while (botTotal < 17) {
    botCards.push(Math.floor(Math.random() * 10) + 1);
    botTotal = botCards.reduce((a, b) => a + b, 0);
  }

  const amount = Number(user.blackjack.amount || 0);
  let resultText = '';
  let payout = 0;

  if (botTotal > 21 || playerTotal > botTotal) {
    payout = amount * 2;
    if (!isOwnerAccount(senderId)) user.saldo = Number(user.saldo || 0) + payout;
    user.stats.victorias = Number(user.stats.victorias || 0) + 1;
    resultText = `🎉 *GANASTE*\n\n💰 Cobras: +${formatFelCoins(payout)}`;
  } else if (playerTotal === botTotal) {
    payout = amount;
    if (!isOwnerAccount(senderId)) user.saldo = Number(user.saldo || 0) + payout;
    resultText = `🤝 *EMPATE*\n\n💰 Recuperas: ${formatFelCoins(payout)}`;
  } else {
    user.stats.derrotas = Number(user.stats.derrotas || 0) + 1;
    resultText = `💥 *PERDISTE*\n\n💸 Pierdes: -${formatFelCoins(amount)}`;
  }

  delete user.blackjack;
  await user.save();
  await sock.sendMessage(chatId, {
    text: `🃏 *BLACKJACK*\n\n👤 Tú: ${playerTotal}\n🤖 Bot: ${botTotal}\n\n${resultText}\n\n💵 Saldo: ${formatFelCoins(isOwnerAccount(senderId) ? getOwnerDisplayBalance() : Number(user.saldo || 0))}`
  }, { quoted: message });
}

async function crashGame(sock, chatId, senderId, message, amount) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;

  if (user.crash?.active) {
    await sock.sendMessage(chatId, { text: '⚠️ Ya tienes una partida de Crash activa.' }, { quoted: message });
    return;
  }

  const value = Number(amount || 0);
  if (value <= 0) return sendBetMenu(sock, chatId, senderId, message, 'crash');

  if (!isOwnerAccount(senderId) && Number(user.saldo || 0) < value) {
    await sock.sendMessage(chatId, {
      text: `❌ *FELCOINS INSUFICIENTES*\n\nNecesitas: ${formatFelCoins(value)}\nTienes: ${formatFelCoins(Number(user.saldo || 0))}`
    }, { quoted: message });
    return;
  }

  if (!isOwnerAccount(senderId)) user.saldo = Number(user.saldo || 0) - value;

  // El crash siempre queda por debajo de 6x, pero puede ocurrir en cualquier punto desde 1.20x.
  const crashPoint = Number((1.20 + Math.random() * 4.70).toFixed(2));
  user.crash = {
    active: true,
    amount: value,
    multiplier: 1.00,
    crashPoint,
    messageKey: null
  };
  await user.save();

  const renderCrash = (multiplier, status = 'EN JUEGO') => new ButtonV2(sock)
    .setBody(`💥 *CRASH*\n\n💰 Apuesta: ${formatFelCoins(value)}\n📈 ${multiplier.toFixed(2)}x\n\n${status}`)
    .setFooter('FelCoins • Crash')
    .addButton('💰 RETIRAR', `felcoin::crash::withdraw::${normalize(senderId)}`);

  const sent = await renderCrash(1.00).send(chatId, { quoted: message });
  const messageKey = sent?.key || null;
  if (messageKey) {
    user.crash.messageKey = messageKey;
    await user.save();
  }

  let current = 1.00;
  const timer = setInterval(async () => {
    try {
      const live = await ensureEconomyUser(senderId, message?.pushName || 'Usuario');
      if (!live?.crash?.active) {
        clearInterval(timer);
        return;
      }

      current = Number((current + (0.08 + Math.random() * 0.22)).toFixed(2));
      const crashed = current >= Number(live.crash.crashPoint || crashPoint);

      if (crashed) {
        clearInterval(timer);
        delete live.crash;
        live.stats = live.stats || {};
        live.stats.derrotas = Number(live.stats.derrotas || 0) + 1;
        await live.save();

        const finalText = `💥 *CRASH*\n\n💰 Apuesta: ${formatFelCoins(value)}\n📈 CRASH en ${Number(crashPoint).toFixed(2)}x\n\n💸 Perdiste la apuesta.`;
        if (messageKey) {
          await sock.sendMessage(chatId, { text: finalText }, { edit: messageKey });
        } else {
          await sock.sendMessage(chatId, { text: finalText }, { quoted: message });
        }
        return;
      }

      live.crash.multiplier = current;
      await live.save();

      if (messageKey) {
        await renderCrash(current).send(chatId, { edit: messageKey });
      }
    } catch (error) {
      clearInterval(timer);
      console.error('[FELCOINS CRASH] Error:', error);
    }
  }, 1000);
}

async function withdrawCrash(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;
  if (!user.crash?.active) return;

  const current = Number(user.crash.multiplier || 1);
  const base = Number(user.crash.amount || 0);
  const reward = Math.round(base * current);

  if (!isOwnerAccount(senderId)) {
    user.saldo = Number(user.saldo || 0) + reward;
    user.stats = user.stats || {};
    user.stats.victorias = Number(user.stats.victorias || 0) + 1;
  }
  delete user.crash;
  await user.save();

  await sock.sendMessage(chatId, {
    text: `💰 *RETIRADA EXITOSA*\n\n📈 Multiplicador: ${current.toFixed(2)}x\n\n💵 Apuesta: ${formatFelCoins(base)}\n💰 Cobras: +${formatFelCoins(reward)}\n\n🎉 Ganancia: +${formatFelCoins(Math.max(0, reward - base))}`
  }, { quoted: message });
}


async function sendRaceBetMenu(sock, chatId, senderId, message) {
  const menu = new ButtonV2(sock)
    .setBody('🏇 *CARRERAS FELCOINS*\n\n💰 Elige cuánto quieres apostar:')
    .setFooter('FelCoins • Carreras')
    .addButton('💰 1.000 FC', `felcoin::racebet::1000::${normalize(senderId)}`)
    .addButton('💰 2.000 FC', `felcoin::racebet::2000::${normalize(senderId)}`)
    .addButton('💰 3.000 FC', `felcoin::racebet::3000::${normalize(senderId)}`)
    .addButton('💰 4.000 FC', `felcoin::racebet::4000::${normalize(senderId)}`)
    .addButton('💰 5.000 FC', `felcoin::racebet::5000::${normalize(senderId)}`);
  await menu.send(chatId, { quoted: message });
}

async function raceGame(sock, chatId, senderId, message, amount) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user) return;

  if (user.raceGame?.active) {
    await sock.sendMessage(chatId, { text: '⚠️ Ya tienes una carrera activa.' }, { quoted: message });
    return;
  }

  const value = Number(amount || 0);
  if (value <= 0) return sendRaceBetMenu(sock, chatId, senderId, message);

  if (!isOwnerAccount(senderId) && Number(user.saldo || 0) < value) {
    await sock.sendMessage(chatId, {
      text: `❌ *FELCOINS INSUFICIENTES*\n\nNecesitas: ${formatFelCoins(value)}\nTienes: ${formatFelCoins(Number(user.saldo || 0))}`
    }, { quoted: message });
    return;
  }

  if (!isOwnerAccount(senderId)) user.saldo = Number(user.saldo || 0) - value;

  const racers = [
    { id: 'relampago', emoji: '🔴🐎', name: 'Relámpago' },
    { id: 'sombra', emoji: '⚫🐎', name: 'Sombra' },
    { id: 'trueno', emoji: '🔵🐎', name: 'Trueno' },
    { id: 'diablo', emoji: '🟢🐎', name: 'Diablo' }
  ];

  user.raceGame = {
    active: true,
    amount: value,
    selected: null,
    racers: racers.map(r => ({ ...r, progress: 0 })),
    step: 0
  };
  user.stats = user.stats || {};
  user.stats.juegos = Number(user.stats.juegos || 0) + 1;
  await user.save();

  const select = new ButtonV2(sock)
    .setBody('🏁 *CARRERA FELCOINS*\n\n🐎 Elige tu corredor:\n\n🔴🐎 Relámpago\n⚫🐎 Sombra\n🔵🐎 Trueno\n🟢🐎 Diablo')
    .setFooter(`Apuesta: ${formatFelCoins(value)}`)
    .addButton('🔴 RELÁMPAGO', `felcoin::racepick::relampago::${normalize(senderId)}`)
    .addButton('⚫ SOMBRA', `felcoin::racepick::sombra::${normalize(senderId)}`)
    .addButton('🔵 TRUENO', `felcoin::racepick::trueno::${normalize(senderId)}`)
    .addButton('🟢 DIABLO', `felcoin::racepick::diablo::${normalize(senderId)}`);
  await select.send(chatId, { quoted: message });
}

function renderRaceTrack(racers, selectedId, finish = 24) {
  const sorted = [...racers].sort((a, b) => b.progress - a.progress);
  const positionMap = new Map(sorted.map((r, i) => [r.id, i + 1]));
  const lines = racers.map(r => {
    const spaces = ' '.repeat(Math.max(1, Math.min(finish - 1, Math.floor(r.progress))));
    const horse = `${r.emoji} ${r.name}`;
    const marker = r.id === selectedId ? ' ⭐' : '';
    return `${horse}${marker} ${spaces}🏇`;
  });
  return lines.join('\n') + `\n\n🥇 ${sorted[0]?.name || '-'}  •  🥈 ${sorted[1]?.name || '-'}  •  🥉 ${sorted[2]?.name || '-'}  •  4️⃣ ${sorted[3]?.name || '-'}`;
}

async function startRace(sock, chatId, senderId, message) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user?.raceGame?.active) return;

  const selected = String(message?.racePick || user.raceGame.selected || '');
  if (!selected) return;

  user.raceGame.selected = selected;
  await user.save();

  const finish = 24;
  const messageText = () => {
    const race = user.raceGame;
    return `🏁 *CARRERA FELCOINS*\n\n${renderRaceTrack(race.racers, race.selected, finish)}\n\n⭐ Tu corredor está marcado.\n💰 Apuesta: ${formatFelCoins(race.amount)}`;
  };

  const sent = await sock.sendMessage(chatId, { text: messageText() }, { quoted: message });
  const messageKey = sent?.key;
  let finished = false;

  const timer = setInterval(async () => {
    if (finished) return;
    try {
      const live = await ensureEconomyUser(senderId, message?.pushName || 'Usuario');
      if (!live?.raceGame?.active || live.raceGame.selected !== selected) {
        clearInterval(timer);
        return;
      }

      live.raceGame.step = Number(live.raceGame.step || 0) + 1;
      for (const racer of live.raceGame.racers) {
        const burst = 0.7 + Math.random() * 1.7;
        racer.progress = Math.min(finish, Number(racer.progress || 0) + burst);
      }

      const winner = live.raceGame.racers.find(r => r.progress >= finish);
      await live.save();

      if (winner) {
        finished = true;
        clearInterval(timer);

        const sorted = [...live.raceGame.racers].sort((a, b) => b.progress - a.progress);
        const place = sorted.findIndex(r => r.id === selected) + 1;
        const betAmount = Number(live.raceGame.amount || 0);
        const multiplierByPlace = { 1: 3, 2: 1.5, 3: 1.1, 4: 0 };
        const multiplier = Number(multiplierByPlace[place] || 0);
        const amountWon = Math.round(betAmount * multiplier);

        // El premio se acredita ANTES de borrar la partida y se guarda
        // nuevamente en MongoDB para evitar que se pierda al finalizar.
        live.stats = live.stats || {};
        live.stats.ganancias = Number(live.stats.ganancias || 0);

        if (amountWon > 0) {
          if (!isOwnerAccount(senderId)) {
            live.saldo = Number(live.saldo || 0) + amountWon;
          }
          live.stats.victorias = Number(live.stats.victorias || 0) + 1;
          live.stats.ganancias += amountWon;
        } else {
          live.stats.derrotas = Number(live.stats.derrotas || 0) + 1;
        }
        const raceSnapshot = {
          amount: Number(live.raceGame.amount || 0),
          racers: live.raceGame.racers.map(r => ({ ...r }))
        };
        const selectedName = raceSnapshot.racers.find(r => r.id === selected)?.name || 'Tu caballo';
        delete live.raceGame;
        await live.save();

        const result = place === 1
          ? `🏆 *¡GANASTE LA CARRERA!*

🥇 ${selectedName} llegó primero.
💰 Premio: +${formatFelCoins(amountWon)} FC (3x)`
          : place === 2
            ? `🥈 *SEGUNDO LUGAR*

🐎 ${selectedName} llegó segundo.
💰 Premio: +${formatFelCoins(amountWon)} FC (1.5x)`
            : place === 3
              ? `🥉 *TERCER LUGAR*

🐎 ${selectedName} llegó tercero.
💰 Premio: +${formatFelCoins(amountWon)} FC (1.1x)`
              : `💥 *ÚLTIMO PUESTO*

🐎 ${selectedName} quedó en 4.º lugar.
💸 Perdiste la apuesta: -${formatFelCoins(raceSnapshot.amount)} FC`;

        const finalBody = `🏁 *CARRERA TERMINADA*

${renderRaceTrack(raceSnapshot.racers, selected, finish)}

${result}`;

        if (messageKey) await sock.sendMessage(chatId, { text: finalBody }, { edit: messageKey });
        else await sock.sendMessage(chatId, { text: finalBody }, { quoted: message });
        return;
      }

      if (messageKey) await sock.sendMessage(chatId, {
        text: `🏁 *CARRERA FELCOINS*\n\n${renderRaceTrack(live.raceGame.racers, selected, finish)}\n\n⭐ Tu corredor\n💰 Apuesta: ${formatFelCoins(live.raceGame.amount)}`
      }, { edit: messageKey });
    } catch (error) {
      clearInterval(timer);
      console.error('[FELCOINS RACE] Error:', error);
    }
  }, 1000);
}

async function pickRace(sock, chatId, senderId, message, racerId) {
  const active = await ensureEconomyActive(sock, chatId, message);
  if (!active) return;
  const user = await ensureRegisteredWithReply(sock, chatId, senderId, message, message?.pushName || 'Usuario');
  if (!user?.raceGame?.active) return;
  if (user.raceGame.selected) return;

  const valid = ['relampago', 'sombra', 'trueno', 'diablo'];
  if (!valid.includes(racerId)) return;

  user.raceGame.selected = racerId;
  await user.save();

  const fakeMessage = { ...message, racePick: racerId };
  return startRace(sock, chatId, senderId, fakeMessage);
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
  if (action === 'caja') return mysteryBox(sock, chatId, senderId, message);
  if (action === 'inventario') return inventoryCommand(sock, chatId, senderId, message);
  if (action === 'vender') return sellMenu(sock, chatId, senderId, message);
  if (action === 'inv' && extra === 'view') { const u=await ensureEconomyUser(senderId,message?.pushName||'Usuario'); const k=extra2||''; const q=Number(u?.inventory?.[k]?.quantity||0); const label=ECONOMY_ITEM_LABELS[k]||k; return sock.sendMessage(chatId,{text:'📦 *'+label+'*\n\nCantidad: '+q+'\n'+(ECONOMY_SELL_PRICES[k]?'Venta: '+formatFelCoins(ECONOMY_SELL_PRICES[k])+' FC/u':'Este objeto no se puede vender.')},{quoted:message}); }
  if (action === 'sell') return sellItem(sock, chatId, senderId, message, extra);
  if (action === 'empresas') return viewCompanies(sock, chatId, senderId, message);
  if (action === 'juegos') return openGamesMenu(sock, chatId, senderId, message);
  if (action === 'economia') return showEconomyMenu(sock, chatId, senderId, message);
  if (action === 'shop') return buyProduct(sock, chatId, senderId, message, extra);
  if (action === 'company') return openCompanyDetails(sock, chatId, senderId, message, extra);
  if (action === 'buyCompany') return buyCompany(sock, chatId, senderId, message, extra);
  if (action === 'upgradeCompany') return upgradeCompany(sock, chatId, senderId, message, extra);
  if (action === 'game') {
    const label = String(extra || '').toLowerCase();
    if (label === 'ruleta') return rouletteGame(sock, chatId, senderId, message, 100);
    if (label === 'slots') return slotsGame(sock, chatId, senderId, message, 100);
    if (label === 'blackjack') return blackjackInitial(sock, chatId, senderId, message, 100);
    if (label === 'crash') return crashGame(sock, chatId, senderId, message, 100);
    if (label === 'race') return raceGame(sock, chatId, senderId, message, 0);
    if (label === 'coinflip') return coinflipBet(sock, chatId, senderId, message, 100);
    if (label === 'dice') return diceBet(sock, chatId, senderId, message, 100);
    return sock.sendMessage(chatId, {
      text: '🎮 *JUEGOS FELCOINS*\n\nUsa estos comandos:\n• .ruleta 100\n• .slots 100\n• .blackjack 100\n• .crash 100'
    }, { quoted: message });
  }
  if (action === 'work') {
    const user = await ensureEconomyUser(senderId, message?.pushName || 'Usuario');
    if (!user || !user.registered) {
      await sock.sendMessage(chatId, { text: '⚠️ Debes registrarte con .registrarme.' }, { quoted: message });
      return;
    }

    const jobKey = String(extra || '').toLowerCase();
    const jobs = getWorkJobs();
    const job = jobs[jobKey];

    if (!job) {
      await sock.sendMessage(chatId, { text: '❌ Ese trabajo ya no está disponible.' }, { quoted: message });
      return;
    }

    const remaining = await getRemainingCooldown(senderId, 'work');
    if (remaining > 0) {
      await sock.sendMessage(chatId, {
        text: `⏳ *YA TRABAJASTE HOY*\n\nPodrás volver a trabajar en: ${formatCountdown(remaining)}.`
      }, { quoted: message });
      return;
    }

    // Si el botón pertenece a un menú viejo o ya fue consumido,
    // simplemente no respondemos. Así no aparece el mensaje de "turno expirado".
    if (user.workState?.type !== 'job' || !Array.isArray(user.workState.jobs) || !user.workState.jobs.includes(jobKey)) {
      return;
    }

    const result = await claimWork(senderId, jobKey);
    if (!result.ok) {
      const text = result.reason === 'cooldown'
        ? `⏳ Ya trabajaste hoy. Próximo turno en ${formatCountdown(result.remaining || 0)}.`
        : '⚠️ No se pudo completar el trabajo.';
      await sock.sendMessage(chatId, { text }, { quoted: message });
      return;
    }

    await sock.sendMessage(chatId, {
      text: `${job.label} *${job.title.toUpperCase()}*\n\n${job.detail}\n\n💰 Pago recibido: +${formatFelCoins(result.amount)}\n🎁 ${job.bonus}\n\n💵 Saldo: ${formatFelCoins(result.saldo)}\n📅 Próximo trabajo: en 24 horas.`
    }, { quoted: message });
    return;
  }
  if (action === 'protect') {
    const victimKey = normalize(extra);
    if (victimKey && victimKey !== normalize(senderId)) return;
    return protectMe(sock, chatId, senderId, message);
  }
  if (action === 'blackjackbet') {
    const ownerKey = String(extra2 || '');
    if (ownerKey && ownerKey !== normalize(senderId)) return;
    const bet = Number(extra || 0);
    return blackjackInitial(sock, chatId, senderId, message, bet);
  }
  if (action === 'blackjack') {
    const ownerKey = String(extra2 || '');
    if (ownerKey && ownerKey !== normalize(senderId)) return;
    if (extra === 'hit') return blackjackHit(sock, chatId, senderId, message);
    if (extra === 'stand') return blackjackStand(sock, chatId, senderId, message);
  }
  if (action === 'racebet') {
    const ownerKey = String(extra2 || '');
    if (ownerKey && ownerKey !== normalize(senderId)) return;
    const bet = Number(extra || 0);
    return raceGame(sock, chatId, senderId, message, bet);
  }
  if (action === 'racepick') {
    const ownerKey = String(extra2 || '');
    if (ownerKey && ownerKey !== normalize(senderId)) return;
    return pickRace(sock, chatId, senderId, message, extra);
  }
  if (action === 'crashbet') {
    const ownerKey = String(extra2 || '');
    if (ownerKey && ownerKey !== normalize(senderId)) return;
    const bet = Number(extra || 0);
    return crashGame(sock, chatId, senderId, message, bet);
  }
  if (action === 'crash') {
    const ownerKey = String(extra2 || '');
    if (ownerKey && ownerKey !== normalize(senderId)) return;
    if (extra === 'withdraw') return withdrawCrash(sock, chatId, senderId, message);
  }
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
  inventoryCommand,
  sellMenu,
  sellItem,
  openGamesMenu,
  viewCompanies,
  openCompanyDetails,
  buyCompany,
  upgradeCompany,
  mysteryBox,
  rouletteGame,
  slotsGame,
  blackjackInitial,
  blackjackHit,
  blackjackStand,
  crashGame,
  withdrawCrash,
  raceGame,
  handleEconomyButton,
  formatCountdown,
  removeCoinsFromUser,
  isEconomyCommand,
  formatEconomyLabel,
  resetEconomy
};