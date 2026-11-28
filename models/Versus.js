const mongoose = require('mongoose')

const versusSchema = new mongoose.Schema({
    matchId: { type: String, required: true, unique: true },
    chatId: { type: String, required: true, index: true },
    messageId: { type: String, required: true },
    key: { type: mongoose.Schema.Types.Mixed, required: true },
    type: { type: String, required: true },
    title: { type: String, default: '' },
    time: { type: String, default: null },
    rival: { type: String, default: '??' },
    groupName: { type: String, default: 'Grupo' },
    maxTitular: { type: Number, required: true },
    maxSuplentes: { type: Number, required: true },
    titular: { type: [String], default: [] },
    suplentes: { type: [String], default: [] },
    equipo2: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
}, { minimize: false })

// MongoDB elimina automáticamente cada lista al cumplir 24 horas.
versusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.models.Versus || mongoose.model('Versus', versusSchema)
