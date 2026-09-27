const mongoose = require('mongoose');

const robberySchema = new mongoose.Schema({
  attacker: { type: String, required: true },
  victim: { type: String, required: true },
  amount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'completed', 'blocked', 'expired'], default: 'pending' },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { minimize: false });

robberySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('EconomyRob', robberySchema);
