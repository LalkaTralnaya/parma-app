import test from 'node:test';
import assert from 'node:assert/strict';
import { SPELLS } from '../src/lib/rules/spells.ts';
import { canHoldSpell, startSpellHolding, advanceSpellHolding, rollHeldSpellEffect } from '../src/lib/engine/spellHolding.ts';
const spell = (id) => SPELLS.find((entry) => entry.id === id);
const mage = { raceId: 'human', raceChoice: 'strength', characteristics: { intelligence: { levelUpBonus: 36 } }, skillPoints: {}, abilities: [], currentResources: { mana: 22 }, heldSpell: null };
const options = { useTwoHands: false, useGrace: false, targetId: 'enemy', targetName: 'Враг' };

test('optional hold spells are supported; failed casts keep the current hold', () => {
  assert.equal(canHoldSpell(spell('fire_chaos')), true);
  assert.equal(canHoldSpell(spell('fire_arrow')), false);
  const held = startSpellHolding(mage, spell('heal'), 'success', options);
  assert.equal(startSpellHolding(held, spell('fire_chaos'), 'failure', options), held);
  const next = startSpellHolding(held, spell('fire_chaos'), 'critical_success', options);
  assert.equal(next.heldSpell.spellId, 'fire_chaos');
  assert.equal(next.heldSpell.round, 1);
  assert.equal(next.currentResources.mana, 22);
});
test('a held round costs holdCost and preserves original target and casting choices', () => {
  const held = startSpellHolding(mage, spell('heal'), 'success', { ...options, useTwoHands: true });
  const next = advanceSpellHolding(held);
  assert.equal(next.cost, 2);
  assert.equal(next.character.currentResources.mana, 20);
  assert.equal(next.character.heldSpell.targetId, 'enemy');
  assert.equal(next.character.heldSpell.useTwoHands, true);
  assert.equal(next.round, 2);
  assert.equal(held.currentResources.mana, 22);
});
test('insufficient mana ends holding without a partial payment; exact cost is allowed', () => {
  const held = startSpellHolding({ ...mage, currentResources: { mana: 1 } }, spell('heal'), 'success', options);
  const next = advanceSpellHolding(held);
  assert.equal(next.character.heldSpell, null);
  assert.equal(next.character.currentResources.mana, 1);
  assert.equal(next.cost, 0);
  assert.ok(next.reason);
  const exact = advanceSpellHolding({ ...held, currentResources: { mana: 2 } });
  assert.equal(exact.character.currentResources.mana, 0);
  assert.equal(exact.ended, false);
});
test('ice storm expires at four rounds including the casting round', () => {
  let held = startSpellHolding({ ...mage, currentResources: { mana: 100 } }, spell('ice_storm'), 'success', options);
  for (let round = 2; round <= 4; round++) {
    const next = advanceSpellHolding(held);
    assert.equal(next.round, round);
    assert.equal(next.ended, round === 4);
    held = next.character;
  }
  assert.equal(held.heldSpell, null);
  assert.equal(held.currentResources.mana, 70);
});
test('holding rolls its own damage; healing retains hands and modifier', () => {
  const held = { ...options, spellId: 'fire_chaos', round: 2 };
  const fire = rollHeldSpellEffect(mage, spell('fire_chaos'), held, () => 6);
  assert.equal(fire.total, 6);
  assert.equal(fire.diceSides, 6);
  const storm = rollHeldSpellEffect(mage, spell('ice_storm'), held, () => 8);
  assert.equal(storm.total, 16);
  assert.equal(storm.diceCount, 2);
  const heal = rollHeldSpellEffect(mage, spell('heal'), { ...held, useTwoHands: true }, () => 6);
  assert.equal(heal.diceCount, 2);
  assert.equal(heal.total, 24);
  assert.equal(rollHeldSpellEffect(mage, spell('steady_ward'), held), null);
});
