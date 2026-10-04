const mongoose = require('mongoose');

const economyUserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, default: 'Usuario' },
  registered: { type: Boolean, default: false },
  saldo: { type: Number, default: 0 },
  empresa: { type: String, default: null },
  empresas: { type: Object, default: {} },
  ingresoDiario: { type: Number, default: 0 },
  modoAdmin: { type: Boolean, default: false },
  modoRey: { type: Boolean, default: false },
  adminUntil: { type: Date, default: null },
  lastDaily: { type: Date, default: null },
  lastWork: { type: Date, default: null },
  workCount: { type: Number, default: 0 },
  workWindowStartedAt: { type: Date, default: null },
  lastMine: { type: Date, default: null },
  lastRob: { type: Date, default: null },
  protectionUntil: { type: Date, default: null },
  workState: { type: Object, default: null },
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
      gastos: 0,
      cajas: 0
    }
  },
  companyLevel: { type: Number, default: 0 },
  raceGame: { type: Object, default: null },
  companyPurchasedAt: { type: Date, default: null },
  companyLastPaidAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { minimize: false });

economyUserSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('EconomyUser', economyUserSchema);