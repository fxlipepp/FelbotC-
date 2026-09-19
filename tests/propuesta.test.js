const assert = require('node:assert/strict');
const { propuestaCommand, divortioCommand, divorcioCommand, handleProposalButton } = require('../commands/propuesta');

(async () => {
  const chatId = '1203630000000000@g.us';
  const senderId = '521234567890@s.whatsapp.net';
  const targetId = '521234567891@s.whatsapp.net';

  const sent = [];
  const sock = {
    sendMessage: async (jid, payload, opts) => {
      sent.push({ jid, payload, opts });
      return { ok: true };
    },
    relayMessage: async (jid, message, opts) => {
      sent.push({ jid, message, opts, viaRelay: true });
      return { ok: true };
    }
  };

  const message = {
    key: { id: 'm1' },
    message: {
      extendedTextMessage: {
        contextInfo: { mentionedJid: [targetId] }
      }
    }
  };

  await propuestaCommand(sock, chatId, senderId, message);
  const buttonMessage = sent.find(item => item.message?.buttonsMessage);
  assert.ok(buttonMessage, 'La propuesta debe enviarse con botones');

  const accepted = await handleProposalButton(sock, chatId, targetId, 'propuesta::accept::' + `${chatId}:${targetId}`);
  assert.equal(accepted, true, 'Debe aceptar la propuesta correctamente');

  const wedding = await divortioCommand(sock, chatId, senderId, { key: { id: 'm2' } });
  assert.equal(wedding, true, 'Debe poder divorciarse cuando esté casado');

  const secondProposal = await propuestaCommand(sock, chatId, senderId, message);
  assert.equal(secondProposal, false, 'No debe permitir proposiciones a otra persona si ya está casado');

  console.log('OK: tests de propuesta/divorcio correctos');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
