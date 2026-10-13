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

test('new tree uses points and explicit predecessors without attribute thresholds', () => {
 let char=makeChar();char.abilityPoints=5;
 assert.match(getAbilityBlockReason(char,'OH.base2'),/Сильная рука/);
 for(const id of ['OH.base1','OH.base2','OH.stance1','OH.base3','OH.base4']) {char=learnAbility(char,id);assert.ok(char);}
 assert.equal(char.abilityPoints,0);assert.equal(learnAbility(char,'OH.base5'),null);assert.equal(learnAbility(char,'OH.base1'),null);
});
