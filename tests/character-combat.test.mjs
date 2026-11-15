import assert from 'node:assert/strict';
import test from 'node:test';
import { changeCharacterHealth, characterCombatHealth, reconcileCharacterCombat } from '../src/lib/engine/character-combat.ts';
import { getResourceMax } from '../src/lib/engine/character.ts';
import { resolveSpellCombatDamage } from '../src/lib/engine/spellTargets.ts';
import { SPELLS } from '../src/lib/rules/spells.ts';
import { createEmptyCombat } from '../src/lib/sync/combat.ts';

const hero = {
 id: 'hero', raceId: 'human', level: 1, characteristics: {}, abilities: [],
 currentResources: { hp: 12, mana: 5 }, tempHp: 4, conditions: [{ id: 'bleeding' }]
};
const foe = (id, hp) => ({ id, name: id, isPlayer: false, currentHp: hp, maxHp: hp });
const spell = id => SPELLS.find(entry => entry.id === id);
const encounter = (...participants) => ({ ...createEmptyCombat(), active: true, participants });

test('incoming damage and direct edits use temporary health first and healing caps real health', () => {
 const damaged = changeCharacterHealth(hero, -6);
 assert.equal(damaged.tempHp, 0);
 assert.equal(damaged.currentResources.hp, 10);
 assert.equal(damaged.currentResources.mana, 5);
 assert.equal(characterCombatHealth(damaged), 10);
 assert.equal(characterCombatHealth(hero), 16);
 assert.equal(changeCharacterHealth(hero, 200).currentResources.hp, getResourceMax(hero, 'hp'));

 const first = reconcileCharacterCombat(hero, foe('hero', 20), true, null);
 assert.equal(first.character, hero);
 assert.equal(first.observedHealth, 20);
 const next = reconcileCharacterCombat(hero, foe('hero', 14), true, first.observedHealth);
 assert.deepEqual(next.character, damaged);
 assert.equal(next.correction, 10);
});

test('a combat update applies treatment once and only tracks damage in an active encounter', () => {
 const participant = {
  ...foe('hero', 10),
  itemTreatments: [{ id: 'bandage-1', conditionId: 'bleeding' }]
 };
 const update = reconcileCharacterCombat(hero, participant, false, 16);
 assert.deepEqual(update.character.conditions, []);
 assert.equal(characterCombatHealth(update.character), 16);
 assert.equal(update.observedHealth, 16);
 assert.equal(reconcileCharacterCombat(update.character, participant, false, 16).character, update.character);
});

test('a damaging spell requests a separate save for each existing victim', async () => {
 const before = encounter(foe('first', 20), foe('second', 8));
 const prompts = [];
 const after = await resolveSpellCombatDamage(before, spell('banshee_cry'), 15, ['first', 'gone', 'second'], async victim => {
  prompts.push(victim.id);
  return victim.id === 'first' ? 1 : 100;
 });
 assert.deepEqual(prompts, ['first', 'second']);
 assert.deepEqual(after.encounter.participants.map(p => p.currentHp), [13, 0]);
 assert.equal(after.damageApplied, 15);
 assert.deepEqual(before.participants.map(p => p.currentHp), [20, 8]);
});

test('a cancelled save discards partial damage and life drain returns only health actually lost on a failed save', async () => {
 const before = encounter(foe('first', 10), foe('second', 3));
 const drain = spell('life_drain');
 const cancelled = await resolveSpellCombatDamage(before, drain, 15, ['first', 'second'],
  async victim => victim.id === 'first' ? 100 : null);
 assert.equal(cancelled, null);
 assert.deepEqual(before.participants.map(p => p.currentHp), [10, 3]);

 const after = await resolveSpellCombatDamage(before, drain, 15, ['first', 'second'],
  async victim => victim.id === 'first' ? 1 : 100);
 assert.equal(after.damageApplied, 10);
 assert.equal(after.drainedHp, 3);
});
