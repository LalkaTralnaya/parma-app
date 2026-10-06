import test from 'node:test';
import assert from 'node:assert/strict';
import { getAttackTarget, classifyAttack, rollWeaponDamage, rollCombatAttackEffect, rollAttack } from '../src/lib/engine/combat.ts';
import { applyLevelUp, rollResourceGrowth } from '../src/lib/engine/levelup.ts';
import { getCharacteristicValue } from '../src/lib/engine/character.ts';
import { getConditionSaveTarget } from '../src/lib/engine/conditions.ts';
import { findCondition } from '../src/lib/rules/conditions.ts';
import { WEAPONS } from '../src/lib/rules/weapons.ts';
import { BESTIARY } from '../src/lib/rules/bestiary.ts';
import { scaleMonster } from '../src/lib/engine/bestiary.ts';
import { getSpellAttackTarget, getSpellCastTarget } from '../src/lib/engine/spells.ts';

const char = {
  id: 'test', name: 'Тестовый воин', raceId: 'human', raceChoice: 'strength', level: 1,
  characteristics: {
    strength: { levelUpBonus: 0 }, intelligence: { levelUpBonus: 0 },
    dexterity: { levelUpBonus: 0 }, eloquence: { levelUpBonus: 0 }, religion: { levelUpBonus: 0 }
  },
  skillPoints: { one_handed: 20 }
};
const weapon = WEAPONS.find(w => w.id === 'war_hammer');

test('weapon attack formula includes characteristic, skill modifier, and invested skill value', () => {
  const { target, parts } = getAttackTarget(char, weapon, 'normal', 15, false);
  assert.equal(target, 54); // СИЛ 42 + мод. одноручного 7 + вложение 20 − Броня 15
  assert.equal(parts.find(p => p.label.startsWith('значение Сила'))?.value, 42);
  assert.equal(parts.find(p => p.label.startsWith('мод. навыка'))?.value, 7);
  assert.equal(parts.find(p => p.label.startsWith('значение навыка'))?.value, 20);
});

test('attack speed modifiers are applied before enemy armor', () => {
  assert.equal(getAttackTarget(char, weapon, 'strong', 15, false).target, 64);
  assert.equal(getAttackTarget(char, weapon, 'fast', 15, false).target, 49);
});


test('magical attack uses the school skill and subtracts target armor and attack modifiers', () => {
  const mage = { ...char, skillPoints: { destruction: 20 } };
  const castTarget = getSpellCastTarget(mage, 'destruction');
  assert.equal(getSpellAttackTarget(mage, 'destruction', 14, -5), castTarget - 19);
  assert.equal(getSpellAttackTarget(mage, 'destruction', 0, 0), castTarget);
});

test('natural 1 and 100 override the target; a double is special only on success', () => {
  assert.equal(classifyAttack(1, 0), 'critical_hit');
  assert.equal(classifyAttack(100, 100), 'critical_miss');
  assert.equal(classifyAttack(22, 22), 'double');
  assert.equal(classifyAttack(33, 22), 'miss');
});

test('strong attack adds a weapon die before the characteristic modifier', () => {
  const original = Math.random;
  Math.random = () => 0.999;
  try {
    const result = rollWeaponDamage(char, weapon, 'strong', false);
    assert.equal(result.diceCount, 2);
    assert.deepEqual(result.rolls, [6, 6]);
    assert.equal(result.total, 19); // 2d6 + 7
  } finally {
    Math.random = original;
  }
});

test('physical attack dice feed the usual hit, effect and damage rules', () => {
  const supplied = [1, 1, 4];
  const attacks = rollAttack(char, weapon, 'normal', 15, false, [], () => supplied.shift());
  assert.equal(attacks.length, 1);
  assert.equal(attacks[0].outcome, 'critical_hit');
  assert.equal(attacks[0].effect.roll, 1);
  assert.deepEqual(attacks[0].effect.extraDamageRolls, [4]);
  assert.deepEqual(attacks[0].damage.rolls, [6]);
  assert.equal(attacks[0].damage.total, 17);
  assert.deepEqual(supplied, []);
});

test('level-up characteristic increase can be checked against both candidate rules', () => {
  const original = Math.random;
  Math.random = () => 0.5;
  try {
    const createLevelOne = () => ({
      ...char, level: 1,
      characteristics: Object.fromEntries(['strength','intelligence','dexterity','eloquence','religion'].map(id => [id,{levelUpBonus:0}])),
      resourceRolls: { hp: [], mana: [], stamina: [], influence: [], grace: [] },
      currentResources: { hp: 0, mana: 0, stamina: 0, influence: 0, grace: 0 }, abilities: [], spells: [], useGraceForSpells: false,
      conditions: [], decay: {stage:0,points:0}, death: {usedVoiceOfBlood:false,usedCallOfZhiva:false,debtMark:0,metkaNavi:false,deathCount:0}
    });
    const onePoint = createLevelOne();
    const onePointRolls = rollResourceGrowth(onePoint, 'strength', 1);
    const onePointResult = applyLevelUp(onePoint, 'strength', onePointRolls, 1);
    const sixPoints = createLevelOne();
    const sixPointRolls = rollResourceGrowth(sixPoints, 'strength', 6);
    const sixPointResult = applyLevelUp(sixPoints, 'strength', sixPointRolls, 6);
    const defaultResult = applyLevelUp(createLevelOne(), 'strength', []);
    assert.equal(getCharacteristicValue(onePointResult, 'strength'), 43);
    assert.equal(getCharacteristicValue(sixPointResult, 'strength'), 48);
    assert.equal(getCharacteristicValue(defaultResult, 'strength'), 48);
  } finally {
    Math.random = original;
  }
});

test('condition saves include race, trained skill, active penalties, and save modifiers', () => {
  const character = {
    ...char,
    raceChoice: 'strength',
    skillPoints: { fortitude: 2 },
    conditions: [{ id: 'poisoned', roundsLeft: 2 }]
  };
  const result = getConditionSaveTarget(character, findCondition('bleeding'), false);
  assert.equal(result.target, 31); // СИЛ 42 + Стойкость 9 −10 skills −10 saves
  assert.match(result.label, /31/);
});

test('critical table effects match the book, including additional critical-hit dice', () => {
  const original = Math.random;
  Math.random = () => 0;
  try {
    const effect = rollCombatAttackEffect('critical_hit', 'two_handed');
    assert.equal(effect.table, 'Правь');
    assert.equal(effect.roll, 1);
    assert.equal(effect.extraDamageFormula, '1к8');
    assert.deepEqual(effect.extraDamageRolls, [1]);
  } finally {
    Math.random = original;
  }
});

test('Rotten Leshy attacks use characteristic value plus modifier, and its armor is DEX modifier plus bark', () => {
  const base = BESTIARY.find((monster) => monster.id === 'gniyushiy_leshy');
  const scaled = scaleMonster(base, 3);
  assert.equal(scaled.scaledArmor, 13);
  assert.equal(scaled.scaledAttacks.find((attack) => attack.name === 'Гнилая ветвь')?.hitTarget, 63);
  assert.equal(scaled.scaledAttacks.find((attack) => attack.name === 'Плевок гнилью')?.hitTarget, 49);
  assert.equal(scaled.scaledAttacks.find((attack) => attack.name === 'Плевок гнилью')?.damageModifier, 0);
});

test('Bog Walker uses the player book stats and attack formula', () => {
  const base = BESTIARY.find((monster) => monster.id === 'bolotny_hodok');
  const scaled = scaleMonster(base, 2);
  assert.equal(scaled.scaledHp, 40);
  assert.equal(scaled.scaledMods.strength, 9);
  assert.equal(scaled.scaledMods.dexterity, 6);
  assert.equal(scaled.scaledArmor, 14);
  assert.equal(scaled.scaledAttacks[0]?.hitTarget, 63);
  assert.equal(
    scaled.scaledAttacks[0]?.damageModifier ?? scaled.scaledMods[scaled.scaledAttacks[0]?.attackStat ?? base.primaryStat],
    9
  );
  assert.ok(base.traits.includes('Скорость в болоте: 8 саженей'));
});
