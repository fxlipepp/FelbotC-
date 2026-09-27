const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  enabled: { type: Boolean, default: false },
  commandCosts: {
    type: Object,
    default: {
      play: 500,
      sticker: 25,
      menu: 0,
      transferir: 0,
      daily: 0
    }
  },
  rewards: {
    type: Object,
    default: {
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
    }
  },
  prices: {
    type: Object,
    default: {
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
    }
  },
  cooldowns: {
    type: Object,
    default: {
      work: 20 * 60 * 1000,
      mine: 5 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      rob: 15 * 60 * 1000
    }
  },
  limits: {
    type: Object,
    default: {
      robPercent: 0.25,
      robMin: 100,
      robMax: 8000,
      transferMin: 1,
      transferMax: 100000000
    }
  },
  companies: {
    type: Object,
    default: {
      ropa: { price: 5000, income: 100 },
      pizzeria: { price: 15000, income: 250 },
      gamer: { price: 35000, income: 500 },
      tecnologia: { price: 75000, income: 900 },
      banco: { price: 150000, income: 1300 },
      felbot: { price: 500000, income: 2000 }
    }
  },
  createdAt: { type: Date, default: Date.now }
}, { minimize: false });

module.exports = mongoose.model('EconomyConfig', configSchema);
