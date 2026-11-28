const mongoose = require('mongoose');

const stickerCommandSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        default: 'group-control-stickers'
    },
    stickers: {
        type: [{
            perceptualHash: { type: String, required: true },
            command: { type: String, enum: ['.abrir', '.cerrar'], required: true }
        }],
        default: []
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    minimize: false,
    versionKey: false
});

module.exports = mongoose.models.StickerCommand ||
    mongoose.model('StickerCommand', stickerCommandSchema);
