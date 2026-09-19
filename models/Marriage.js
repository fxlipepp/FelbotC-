const mongoose = require('mongoose')

const marriageSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true,
        index: true
    },
    personA: {
        type: String,
        required: true,
        index: true
    },
    personB: {
        type: String,
        required: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
})

marriageSchema.index({ chatId: 1, personA: 1 }, { unique: true })
marriageSchema.index({ chatId: 1, personB: 1 }, { unique: true })

module.exports = mongoose.model('Marriage', marriageSchema)
