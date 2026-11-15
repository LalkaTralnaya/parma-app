import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareRoomCombatAction, roomCombatChanges, roomCombatPhase } from '../src/lib/engine/room-combat-changes.ts';
import { createEmptyCombat } from '../src/lib/sync/combat.ts';

const hero = { id: 'hero', sourceId: 'sheet', isPlayer: true, currentHp: 15 };
const foe = { id: 'foe', isPlayer: false, currentHp: 20 };

test('a room action contains only changed combat fields and the existing participant ids', () => {
 const before = { ...createEmptyCombat(), participants: [hero, foe] };
 const after = {
  ...before, round: 2, currentTurnIndex: 1,
  participants: [
   { ...hero, characterSnapshot: { bio: { backstory: 'private' } } },
   { ...foe, currentHp: 13, name: 'changed' },
   { ...foe, id: 'injected', currentHp: 0 }
  ]
 };
 assert.deepEqual(roomCombatPhase(before), [false, 1, 0]);
 assert.deepEqual(roomCombatChanges(before, after), [
  { id: 'foe', before: { currentHp: 20 }, after: { currentHp: 13 } }
 ]);
});

test('a removed grapple is sent explicitly, while unchanged health and effects are omitted', () => {
 const grapple = { sourceId: 'hero', kind: 'hold', round: 2 };
 const before = { ...createEmptyCombat(), participants: [hero, { ...foe, grapple, effects: [] }] };
 const after = { ...before, participants: [hero, { ...foe, effects: [] }] };
 assert.deepEqual(roomCombatChanges(before, after), [
  { id: 'foe', before: { grapple }, after: { grapple: null } }
 ]);
 assert.deepEqual(roomCombatChanges(before, before), []);
});


test('a room action uses the actor in the previous encounter and skips an empty patch', () => {
 const before = { ...createEmptyCombat(), round: 4, participants: [hero, foe] };
 const after = { ...before, participants: [hero, { ...foe, currentHp: 10 }] };
 assert.deepEqual(prepareRoomCombatAction(before, after, 'sheet'), {
  actorId: 'hero', phase: [false, 4, 0],
  changes: [{ id: 'foe', before: { currentHp: 20 }, after: { currentHp: 10 } }]
 });
 assert.equal(prepareRoomCombatAction(before, before, 'other'), null);
 assert.throws(() => prepareRoomCombatAction(before, after, 'foe'), /добавить персонажа/);
});
