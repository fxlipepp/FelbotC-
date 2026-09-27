const mongoose = require('mongoose');

const economyLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  command: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  type: { type: String, enum: ['credit', 'debit', 'reward', 'cost', 'transfer', 'rob', 'game'], default: 'credit' },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { minimize: false });

module.exports = mongoose.model('EconomyLog', economyLogSchema);
