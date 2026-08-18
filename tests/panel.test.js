const test = require('node:test');
const assert = require('node:assert/strict');

const { getPanelAction, isOwnerPanelAction } = require('../commands/panel');

test('panel actions map to expected actions', () => {
  assert.equal(getPanelAction('panel::clear'), 'clear');
  assert.equal(getPanelAction('panel::restart'), 'restart');
  assert.equal(getPanelAction('panel::update'), 'update');
  assert.equal(getPanelAction('panel::unknown'), null);
});

test('panel owner check recognizes only the configured owner', () => {
  const ownerNumber = '573117354305';
  assert.equal(isOwnerPanelAction(ownerNumber, { user: { lid: '274517599482100@lid' } }), true);
  assert.equal(isOwnerPanelAction('573117354306', { user: { lid: '274517599482100@lid' } }), false);
});
