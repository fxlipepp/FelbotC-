const mongoose = require('mongoose');

const economyUserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, default: 'Usuario' },
  registered: { type: Boolean, default: false },
  saldo: { type: Number, default: 0 },
  empresa: { type: String, default: null },
  ingresoDiario: { type: Number, default: 0 },
  modoAdmin: { type: Boolean, default: false },
  adminUntil: { type: Date, default: null },
  lastDaily: { type: Date, default: null },
  lastWork: { type: Date, default: null },
  lastMine: { type: Date, default: null },
  lastRob: { type: Date, default: null },
  protectionUntil: { type: Date, default: null },
  inventory: { type: Object, default: {} },
  stats: {
    type: Object,
    default: {
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
  },
  companyPurchasedAt: { type: Date, default: null },
  companyLastPaidAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { minimize: false });

economyUserSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('EconomyUser', economyUserSchema);
