'use strict';

// WhatsApp Sound Stickers use two protobuf fields that standard Baileys
// versions may not expose yet:
//   StickerMessage.audioMessage -> field 26
//   Message.audioStickerMessage -> field 134 (FutureProofMessage)
const PATCHED_STICKER = Symbol.for('felbot.sound-sticker.sticker-proto-patched');
const PATCHED_MESSAGE = Symbol.for('felbot.sound-sticker.message-proto-patched');

function installStickerAudioPatch(proto) {
    const Message = proto?.Message;
    const StickerMessage = Message?.StickerMessage;
    const AudioMessage = Message?.AudioMessage;
    const FutureProofMessage = Message?.FutureProofMessage;

    if (!Message?.encode || !StickerMessage?.encode || !AudioMessage?.encode || !FutureProofMessage?.encode) {
        throw new Error('Esta versión de Baileys no expone los tipos protobuf necesarios para Sound Stickers.');
    }

    if (!StickerMessage.encode[PATCHED_STICKER]) {
        const originalStickerEncode = StickerMessage.encode;
        function patchedStickerEncode(message, writer) {
            const result = originalStickerEncode.call(this, message, writer);
            if (message?.audioMessage != null) {
                AudioMessage.encode(message.audioMessage, result.uint32(210).fork()).ldelim();
            }
            return result;
        }
        patchedStickerEncode[PATCHED_STICKER] = true;
        StickerMessage.encode = patchedStickerEncode;
    }

    if (!Message.encode[PATCHED_MESSAGE]) {
        const originalMessageEncode = Message.encode;
        function patchedMessageEncode(message, writer) {
            const result = originalMessageEncode.call(this, message, writer);
            if (message?.audioStickerMessage != null) {
                FutureProofMessage.encode(
                    message.audioStickerMessage,
                    result.uint32(1074).fork()
                ).ldelim();
            }
            return result;
        }
        patchedMessageEncode[PATCHED_MESSAGE] = true;
        Message.encode = patchedMessageEncode;
    }
}

module.exports = { installStickerAudioPatch };
