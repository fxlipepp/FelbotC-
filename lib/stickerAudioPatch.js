'use strict';

const STICKER_AUDIO_TAG = (26 << 3) | 2;
const PATCHED = Symbol.for('felbot.sound-sticker.encode-patched');
const pendingAudio = new Map();

function keyOf(hash) {
    return Buffer.from(hash).toString('base64');
}

function attachAudio(fileSha256, audioBytes) {
    if (!fileSha256 || !audioBytes) throw new Error('Faltan los datos para adjuntar el audio al sticker.');
    pendingAudio.set(keyOf(fileSha256), audioBytes);
}

function detachAudio(fileSha256) {
    if (fileSha256) pendingAudio.delete(keyOf(fileSha256));
}

function installStickerAudioPatch(proto) {
    const StickerMessage = proto?.Message?.StickerMessage;
    if (!StickerMessage?.encode) throw new Error('Esta versión de Baileys no expone StickerMessage.encode.');
    if (StickerMessage.encode[PATCHED]) return;

    const originalEncode = StickerMessage.encode;
    function patchedEncode(message, writer) {
        const result = originalEncode.call(this, message, writer);
        const audio = message?.fileSha256 ? pendingAudio.get(keyOf(message.fileSha256)) : null;
        if (audio) result.uint32(STICKER_AUDIO_TAG).bytes(audio);
        return result;
    }
    patchedEncode[PATCHED] = true;
    StickerMessage.encode = patchedEncode;
}

module.exports = { attachAudio, detachAudio, installStickerAudioPatch };
