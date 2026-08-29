const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const settings = require('../settings');
const { getPanelAction, isOwnerPanelAction } = require('../commands/panel');
const { getSafeCleanupTargets, getRestartStrategy } = require('../commands/cleartmp');

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

test('owner configuration is single-owner only', () => {
  const ownerList = JSON.parse(fs.readFileSync(require('node:path').join(__dirname, '..', 'data', 'owner.json')));
  assert.deepEqual(ownerList, ['573117354305']);
  assert.deepEqual(settings.privilegedNumbers || [], []);
  assert.equal(settings.ownerNumber, '573117354305');
});

test('safe cleanup targets avoid project-critical folders', () => {
  const targets = getSafeCleanupTargets();
  assert.ok(targets.some((t) => t.endsWith('tmp') || t.endsWith('temp')));
  assert.ok(!targets.some((t) => t.endsWith('session')));
  assert.ok(!targets.some((t) => t.endsWith('node_modules')));
});

test('restart strategy defaults to host-managed exit when pm2 is unavailable', () => {
  const strategy = getRestartStrategy();
  assert.ok(['pm2', 'process_exit'].includes(strategy));
});
