import test from 'node:test';
import assert from 'node:assert/strict';
import { SPELLS } from '../src/lib/rules/spells.ts';
import { getSpellCastingAvailability } from '../src/lib/engine/spells.ts';
const heal = SPELLS.find(spell => spell.id === 'heal');
const mage = { raceId: 'human', raceChoice: 'strength', characteristics: { intelligence: { levelUpBonus: 36 } }, skillPoints: {}, abilities: [], currentResources: { mana: 0, grace: 0 } };
test('zero and insufficient mana block casting before any roll; exact cost is sufficient', () => {
  for (const mana of [0, 1]) {
    const result = getSpellCastingAvailability({ ...mage, currentResources: { mana } }, heal, false, false);
    assert.equal(result.affordable, false);
    assert.equal(result.cost, 2);
    assert.match(result.reason, /Живы/);
  }
  assert.equal(getSpellCastingAvailability({ ...mage, currentResources: { mana: 2 } }, heal, false, false).affordable, true);
});
test('two handed casting needs its full cost', () => {
  assert.equal(getSpellCastingAvailability({ ...mage, currentResources: { mana: 4 } }, heal, true, false).affordable, false);
  assert.equal(getSpellCastingAvailability({ ...mage, currentResources: { mana: 5 } }, heal, true, false).affordable, true);
});
test('casting with grace checks grace even when mana is plentiful or empty', () => {
  const plentiful = { ...mage, currentResources: { mana: 100, grace: 1 } };
  assert.equal(getSpellCastingAvailability(plentiful, heal, false, true).affordable, false);
  const paid = getSpellCastingAvailability({ ...mage, currentResources: { mana: 0, grace: 2 } }, heal, false, true);
  assert.equal(paid.affordable, true);
  assert.equal(paid.resource, 'grace');
  assert.equal(getSpellCastingAvailability(plentiful, { ...heal, costGrace: 3 }, false, false).affordable, false);
});
test('availability respects learned cost reductions without spending resources', () => {
  const reduced = { ...mage, abilities: ['restoration_apprentice'], currentResources: { mana: 1 } };
  assert.equal(getSpellCastingAvailability(reduced, heal, false, false).affordable, true);
  assert.equal(reduced.currentResources.mana, 1);
});
