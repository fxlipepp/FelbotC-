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

  if (user.workCount === undefined || user.workCount === null) user.workCount = 0;
  if (user.companyLevel === undefined || user.companyLevel === null) user.companyLevel = user.empresa ? 1 : 0;
  if (!user.stats) user.stats = {};
  if (user.stats.cajas === undefined) user.stats.cajas = 0;
  if (user.workWindowStartedAt === undefined) user.workWindowStartedAt = null;

  if (name && String(user.name || '').trim() === '') {
    user.name = String(name).slice(0, 50);
  }

  if (typeof user.save === 'function') {
    await user.save();
  }

  return user;
}

async function registerEconomyUser(userId, name = 'Usuario') {
  const id = normalizeJid(userId || '');
  if (!id) return null;

  let user = await ensureEconomyUser(id, name);
  if (!user) return null;
