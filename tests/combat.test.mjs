import test from 'node:test';
import assert from 'node:assert/strict';
import * as combat from '../src/lib/sync/combat.ts';

// Browser storage and cross-tab notifications are the module's only external dependencies.
const data = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: key => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, value),
  removeItem: key => data.delete(key)
};
globalThis.BroadcastChannel = class { postMessage() {} };
function setup(index = 1) {
  combat.saveCombat({ ...combat.createEmptyCombat(), active: true, round: 3, currentTurnIndex: index,
    participants: ['a', 'b', 'c'].map((id, i) => ({ id, name: id, initiative: 30 - i * 10, isPlayer: false, maxHp: 10, currentHp: 10, armor: 0 })) });
}
test('removing a participant before the current turn preserves the acting character', () => {
  setup();
  assert.equal(typeof combat.removeParticipant, 'function');
  combat.removeParticipant('a');
  assert.equal(combat.getCurrentParticipant(combat.getCombat()).id, 'b');
  assert.equal(combat.getCombat().round, 3);
});
test('removing the acting character passes the turn to the next participant', () => {
  setup();
  combat.removeParticipant('b');
  assert.equal(combat.getCurrentParticipant(combat.getCombat()).id, 'c');
});
test('removing all participants ends combat with a valid turn index', () => {
  setup();
  for (const id of ['a', 'b', 'c']) combat.removeParticipant(id);
  const state = combat.getCombat();
  assert.equal(state.active, false);
  assert.equal(state.currentTurnIndex, 0);
  assert.equal(combat.getCurrentParticipant(state), null);
});
test('removing an unknown participant leaves combat unchanged', () => {
  setup();
  const before = combat.getCombat();
  combat.removeParticipant('missing');
  assert.deepEqual(combat.getCombat(), before);
});
test('removing the last acting participant advances to the next round', () => {
  setup(2);
  combat.removeParticipant('c');
  assert.equal(combat.getCurrentParticipant(combat.getCombat()).id, 'a');
  assert.equal(combat.getCombat().round, 4);
});
