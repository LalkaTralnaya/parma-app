import test from 'node:test';
import assert from 'node:assert/strict';
import { getResourceMax, getSkillCheckTarget, getSkillTotal, isAbilityLearned } from '../src/lib/engine/character.ts';
import { getConditionSaveTarget } from '../src/lib/engine/conditions.ts';
import { findCondition } from '../src/lib/rules/conditions.ts';
import { getAttackTarget, getAttackCount, getArmorValue, rollWeaponDamage } from '../src/lib/engine/combat.ts';
import { getSpellAttackTarget, getSpellCost, rollSpellEffect } from '../src/lib/engine/spells.ts';
import { WEAPONS } from '../src/lib/rules/weapons.ts';
import { SPELLS } from '../src/lib/rules/spells.ts';

const makeChar = (patch = {}) => ({
  raceId: 'human', raceChoice: 'strength', characteristics: {
    strength: { levelUpBonus: 0 }, intelligence: { levelUpBonus: 36 },
    dexterity: { levelUpBonus: 0 }, eloquence: { levelUpBonus: 0 }, religion: { levelUpBonus: 0 }
  },
  skillPoints: { one_handed: 3, perception: 2, destruction: 3 },
  abilities: [], equipment: { weaponId: 'war_hammer', armorId: 'none', shieldId: 'wooden_shield' },
  ...patch
});

test('skill bonuses require study, respect thresholds and use highest progressive rank', () => {
  const basic = makeChar();
  const trained = makeChar({ abilities: ['perception_sharp_eye', 'perception_sharp_eye2', 'perception_sharp_eye3'] });
  assert.equal(getSkillTotal(basic, 'perception'), 14);
  assert.equal(getSkillTotal(trained, 'perception'), 29);
  assert.equal(getSkillCheckTarget(trained, 'perception'), 95);
  const belowThreshold = makeChar({ characteristics: { ...basic.characteristics, intelligence: { levelUpBonus: 0 } }, abilities: ['perception_sharp_eye3'] });
  assert.equal(isAbilityLearned(belowThreshold, 'perception_sharp_eye3'), false);
  assert.equal(getSkillTotal(belowThreshold, 'perception'), 8);
});

test('weapon abilities affect attack and damage only after study', () => {
  const weapon = WEAPONS.find((item) => item.id === 'war_hammer');
  const plain = makeChar();
  const studied = makeChar({ abilities: ['one_handed_base', 'one_handed_strong'] });
  assert.equal(getAttackTarget(studied, weapon, 'normal', 15, false).target,
    getAttackTarget(plain, weapon, 'normal', 15, false).target + 2);
  const original = Math.random;
  Math.random = () => 0;
  try {
    assert.equal(rollWeaponDamage(studied, weapon, 'normal', false).total,
      rollWeaponDamage(plain, weapon, 'normal', false).total + 5);
  } finally { Math.random = original; }
});

test('spell discounts and extra dice require studied abilities', () => {
  const spell = SPELLS.find((item) => item.school === 'destruction' && item.damage && item.costOneHand > 1);
  const plain = makeChar();
  const studied = makeChar({ abilities: ['destruction_apprentice', 'destruction_double', 'destruction_base'] });
  assert.equal(getSpellCost(studied, spell, false).reduced, getSpellCost(plain, spell, false).reduced - 1);
  const original = Math.random;
  Math.random = () => 0;
  try {
    const base = rollSpellEffect(plain, spell, true, false);
    const boosted = rollSpellEffect(studied, spell, true, false);
    assert.equal(boosted.extraDice, base.extraDice + 1);
    assert.equal(boosted.abilityBonus, 3);
    assert.equal(boosted.total, base.total + 4);
  } finally { Math.random = original; }
});

test('shield abilities add armor only with a shield equipped', () => {
  const basic = makeChar({ skillPoints: { blocking: 3 } });
  const studied = makeChar({ skillPoints: { blocking: 3 }, abilities: ['blocking_base', 'blocking_shield_bearer'] });
  assert.equal(getArmorValue(studied).total, getArmorValue(basic).total + 5);
  assert.equal(getArmorValue({ ...studied, equipment: { shieldId: 'none' } }).total,
    getArmorValue({ ...basic, equipment: { shieldId: 'none' } }).total);
});

test('armor training applies to equipped armor and light armor improves stealth', () => {
  const dexterity = { ...makeChar().characteristics, dexterity: { levelUpBonus: 6 } };
  const basic = makeChar({ characteristics: dexterity, skillPoints: { light_armor: 3 } });
  const studied = makeChar({ characteristics: dexterity, skillPoints: { light_armor: 3 }, abilities: ['light_armor_base', 'light_armor_defense'] });
  assert.equal(getSkillTotal(studied, 'stealth'), getSkillTotal(basic, 'stealth') + 3);
  const light = { armorId: 'light_armor', shieldId: 'none' };
  assert.equal(getArmorValue({ ...studied, equipment: light }).total,
    getArmorValue({ ...basic, equipment: light }).total + 5);
});

test('studied archery abilities add shots, accuracy and modifier damage', () => {
  const bow = WEAPONS.find((item) => item.id === 'short_bow');
  const plain = makeChar();
  const trained = makeChar({ abilities: ['archery_rapid', 'archery_steady_hand'] });
  assert.equal(getAttackCount(trained, bow, 'fast'), 2); // Ранг 72 нужен по Силе.
  const eligible = makeChar({
    characteristics: { ...plain.characteristics, strength: { levelUpBonus: 30 } },
    abilities: ['archery_rapid', 'archery_steady_hand']
  });
  assert.equal(getAttackCount(eligible, bow, 'fast'), 3);
  assert.equal(getAttackTarget(eligible, bow, 'normal', 0, false).target,
    getAttackTarget({ ...eligible, abilities: [] }, bow, 'normal', 0, false).target + 10);
  const original = Math.random;
  Math.random = () => 0;
  try {
    assert.equal(rollWeaponDamage(eligible, bow, 'normal', false).total,
      rollWeaponDamage({ ...eligible, abilities: [] }, bow, 'normal', false).total + 6);
  } finally { Math.random = original; }
});

test('situational illusion bonuses affect only matching spells', () => {
  const calm = SPELLS.find((item) => item.id === 'calm');
  const rage = SPELLS.find((item) => item.id === 'rage');
  const mage = makeChar({ abilities: ['illusion_hypnosis'] });
  const ordinary = { ...mage, abilities: [] };
  assert.equal(getSpellAttackTarget(mage, 'illusion', 0, calm),
    getSpellAttackTarget(ordinary, 'illusion', 0, calm) + 5);
  assert.equal(getSpellAttackTarget(mage, 'illusion', 0, rage),
    getSpellAttackTarget(ordinary, 'illusion', 0, rage));
});

test('duration abilities do not add damage dice', () => {
  const mage = makeChar({ abilities: ['illusion_double'] });
  const effect = rollSpellEffect(mage, { id: 'test', school: 'illusion', damage: '1к6' }, true, false);
  assert.equal(effect.extraDice, 0);
  assert.equal(effect.diceCount, 1);
});

test('strong body improves relevant saves and maximum health without stacking ranks', () => {
  const base = makeChar({
    characteristics: { ...makeChar().characteristics, strength: { levelUpBonus: 30 } },
    skillPoints: { fortitude: 2 }, resourceRolls: { hp: [] }, conditions: []
  });
  const studied = { ...base, abilities: ['fortitude_strong_body', 'fortitude_strong_body2', 'fortitude_strong_body3'] };
  const poison = findCondition('poisoned');
  assert.equal(getConditionSaveTarget(studied, poison, false).target,
    Math.min(95, getConditionSaveTarget(base, poison, false).target + 15));
  assert.equal(getResourceMax(studied, 'hp'), getResourceMax(base, 'hp') + 20);
  assert.equal(getConditionSaveTarget(studied, findCondition('bleeding'), false).target,
    getConditionSaveTarget(base, findCondition('bleeding'), false).target);
});
