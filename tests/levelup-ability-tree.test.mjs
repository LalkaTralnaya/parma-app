import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLevelUp } from '../src/lib/engine/levelup.ts';
import { getCharacteristicValue, getSkillTotal, getAbilityBlockReason, learnAbility } from '../src/lib/engine/character.ts';

const makeChar = () => ({
  level: 1, raceId: 'human', raceChoice: 'strength',
  characteristics: { strength: { levelUpBonus: 0 }, intelligence: { levelUpBonus: 0 },
    dexterity: { levelUpBonus: 0 }, eloquence: { levelUpBonus: 0 }, religion: { levelUpBonus: 0 } },
  skillPoints: { one_handed: 3 }, resourceRolls: {}, currentResources: {},
  abilities: [], abilityPoints: 0
});

test('a level grants +6 characteristic and five ability points; skills follow the modifier', () => {
  const initial = makeChar();
  const raised = applyLevelUp(initial, 'strength', [{ resourceId: 'hp', total: 8 }]);
  assert.equal(raised.level, 2);
  assert.equal(getCharacteristicValue(raised, 'strength') - getCharacteristicValue(initial, 'strength'), 6);
  assert.equal(getSkillTotal(raised, 'one_handed') - getSkillTotal(initial, 'one_handed'), 1);
  assert.equal(raised.abilityPoints, 5);
  assert.deepEqual(raised.resourceRolls.hp, [8]);
  assert.equal(raised.currentResources.hp, 8);
  assert.equal(applyLevelUp(raised, 'strength', []).abilityPoints, 10);
});

test('ability tiers require points and the prior branch', () => {
  let char = makeChar();
  char.characteristics.strength.levelUpBonus = 36;
  char.abilityPoints = 5;
  assert.match(getAbilityBlockReason(char, 'one_handed_strong'), /предыдущей ступени/);
  char = learnAbility(char, 'one_handed_base');
  assert.equal(char.abilityPoints, 4);
  char = learnAbility(char, 'one_handed_strong');
  assert.equal(char.abilityPoints, 3);
  char = learnAbility(char, 'one_handed_stance');
  assert.equal(char.abilityPoints, 2);
  assert.match(getAbilityBlockReason(char, 'one_handed_strong3'), /Сильная рука II/);
  char = learnAbility(char, 'one_handed_strong2');
  char = learnAbility(char, 'one_handed_strong3');
  assert.equal(char.abilityPoints, 0);
  assert.equal(learnAbility(char, 'one_handed_quick'), null);
  assert.equal(learnAbility(char, 'one_handed_strong3'), null);
});
