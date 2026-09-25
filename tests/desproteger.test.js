const assert = require('node:assert/strict');

const userPath = require.resolve('../models/User');
const isAdminPath = require.resolve('../lib/isAdmin');

require.cache[userPath] = {
  exports: {
    findOneAndUpdate: async (query, update, opts) => {
      return { query, update, opts };
    }
  }
};

require.cache[isAdminPath] = {
  exports: async () => ({ isSenderAdmin: true, isBotAdmin: true })
};

const desprotegerCommand = require('../commands/desproteger');

(async () => {
  const isAdminActual = require('../lib/isAdmin');
  delete require.cache[require.resolve('../lib/isAdmin')];
  const actualIsAdmin = require('../lib/isAdmin');

  const botSock = {
    user: { id: '573117354305@s.whatsapp.net', lid: '274517599482100@lid' },
    groupMetadata: async () => ({
      participants: [{
        id: '573117354305@s.whatsapp.net',
        lid: '274517599482100@lid',
        phoneNumber: '573117354305',
        admin: 'admin'
      }]
    })
  };

  const botAdminStatus = await actualIsAdmin(botSock, '1203630000000000@g.us', '573117354305@s.whatsapp.net');
  assert.equal(botAdminStatus.isSenderAdmin, true, 'El propio número del bot debe poder ejecutar comandos de admin');
  const sent = [];
  const sock = {
    sendMessage: async (jid, payload, opts) => {
      sent.push({ jid, payload, opts });
      return { ok: true };
    },
    groupMetadata: async () => ({
      participants: [{ id: '573001234567@s.whatsapp.net', lid: '573001234567@lid', admin: 'admin' }]
    })
  };

  const targetId = '573001234567@s.whatsapp.net';
  const message = {
    key: { id: 'm1' },
    message: {
      extendedTextMessage: {
        contextInfo: { mentionedJid: [targetId] }
      }
    }
  };

  await desprotegerCommand(sock, '1203630000000000@g.us', '573117354305@s.whatsapp.net', message);

  const response = sent.find(item => item.payload?.text && item.payload.text.includes('desprotegido'));
  assert.ok(response, 'Debe responder confirmando que el usuario fue desprotegido');
  assert.equal(response.payload.mentions[0], '573001234567@lid', 'Debe mencionar el LID del usuario');

  console.log('OK: desproteger y permisos del bot funcionan correctamente');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
