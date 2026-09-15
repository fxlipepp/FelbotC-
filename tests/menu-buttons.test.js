const test = require('node:test');
const assert = require('node:assert/strict');
const { getMenuButtonAction } = require('../commands/menu');

function getNativeMenuInteraction(message) {
  const response = message?.message?.interactiveResponseMessage;
  const paramsJson = response?.nativeFlowResponseMessage?.paramsJson;
  if (!paramsJson) return null;

  const params = JSON.parse(paramsJson);
  return {
    chatId: message.key?.remoteJid,
    sender: message.key?.participant || message.participant || message.key?.remoteJid,
    buttonId: params?.id,
  };
}

test('view_full_menu returns the full-menu action', () => {
  const action = getMenuButtonAction('view_full_menu');
  assert.deepEqual(action, { type: 'send_full_menu' });
});

test('unknown menu buttons return null', () => {
  assert.equal(getMenuButtonAction('unknown_button'), null);
});

test('native menu interaction uses the current response sender', () => {
  const interaction = getNativeMenuInteraction({
    key: {
      remoteJid: 'group@g.us',
      participant: 'user-b@c.us',
    },
    message: {
      interactiveResponseMessage: {
        nativeFlowResponseMessage: {
          paramsJson: JSON.stringify({ id: 'view_full_menu' }),
        },
      },
    },
  });

  assert.deepEqual(interaction, {
    chatId: 'group@g.us',
    sender: 'user-b@c.us',
    buttonId: 'view_full_menu',
  });
});
