const test = require('node:test');
const assert = require('node:assert/strict');
const { getMenuButtonAction } = require('../commands/menu');

test('view_full_menu returns the full-menu action', () => {
  const action = getMenuButtonAction('view_full_menu');
  assert.deepEqual(action, { type: 'send_full_menu' });
});

test('unknown menu buttons return null', () => {
  assert.equal(getMenuButtonAction('unknown_button'), null);
});
