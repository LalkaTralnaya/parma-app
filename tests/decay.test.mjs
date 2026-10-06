import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adjustDecayPoints, canUseGraceWithDecay, gainDecay, getDecaySkillModifier,
  getDecayStage, normalizeDecay, resolveDecayAtonement, undeadAttacksFirst
} from '../src/lib/engine/decay.ts';
import { getSkillCheckTarget } from '../src/lib/engine/character.ts';
import { getConditionSaveTarget } from '../src/lib/engine/conditions.ts';
import { findCondition } from '../src/lib/rules/conditions.ts';

const character = (points = 0) => ({
  id: 'decay-test', name: 'Испытатель', raceId: 'human', level: 1,
  characteristics: {}, skillPoints: {}, abilities: [],
  conditions: [], decay: { points, stage: getDecayStage(points).level }
});

test('late-book decay thresholds and legacy stage normalization', () => {
  assert.deepEqual([0, 1, 4, 5, 9, 10, 19, 20].map(p => getDecayStage(p).name), [
    'Чистый', 'Отмеченный', 'Отмеченный', 'Теневой', 'Теневой',
    'Слуга Тьмы', 'Слуга Тьмы', 'Поглощённый'
  ]);
  assert.equal(getDecayStage(20).isPlayerCharacter, false);
  assert.deepEqual(normalizeDecay({ points: 12, stage: 2 }), { points: 12, stage: 3 });
  assert.deepEqual(normalizeDecay({ points: -3, stage: 9 }), { points: 0, stage: 0 });
  assert.deepEqual(adjustDecayPoints(character(2), -20).decay, { points: 0, stage: 0 });
});

test('decay affects only the skills and situations named in the chosen table', () => {
  assert.equal(getDecaySkillModifier(4, 'persuasion'), 0);
  assert.equal(getDecaySkillModifier(4, 'persuasion', true), -5);
  assert.equal(getDecaySkillModifier(4, 'trade', true), 0);
  assert.equal(getDecaySkillModifier(5, 'persuasion'), -10);
  assert.equal(getDecaySkillModifier(10, 'persuasion'), -15);
  assert.equal(getDecaySkillModifier(1, 'intimidation'), 5);
  assert.equal(getDecaySkillModifier(5, 'intimidation'), 10);
  assert.equal(getDecaySkillModifier(10, 'intimidation'), 15);
  const base = getSkillCheckTarget(character(), 'persuasion');
  assert.equal(getSkillCheckTarget(character(4), 'persuasion'), base);
  assert.equal(getSkillCheckTarget(character(4), 'persuasion', undefined, undefined, true), base - 5);
  assert.equal(getSkillCheckTarget(character(5), 'persuasion'), base - 10);
  assert.equal(getSkillCheckTarget(character(10), 'persuasion'), base - 15);
});

test('grace and undead flags follow their thresholds; old Жуть bonus is absent', () => {
  assert.equal(canUseGraceWithDecay(9), true);
  assert.equal(canUseGraceWithDecay(10), false);
  assert.equal(undeadAttacksFirst(4), true);
  assert.equal(undeadAttacksFirst(5), false);
  const before = getConditionSaveTarget(character(), findCondition('frightened'), false);
  const after = getConditionSaveTarget(character(10), findCondition('frightened'), false);
  assert.equal(after.target, before.target);
});

test('sources add the book amount and reject impossible GM or die values', () => {
  assert.deepEqual(gainDecay(character(4), { kind: 'nezhiva_cast' }).character.decay, { points: 5, stage: 2 });
  assert.equal(gainDecay(character(), { kind: 'navi_critical_failure', d4: 4 }).gained, 4);
  assert.equal(gainDecay(character(), { kind: 'grave_kon_violation', points: 6 }).gained, 6);
  assert.equal(gainDecay(character(19), { kind: 'story', points: 1 }).character.decay.stage, 4);
  assert.throws(() => gainDecay(character(), { kind: 'navi_critical_failure', d4: 5 }), RangeError);
  assert.throws(() => gainDecay(character(), { kind: 'grave_kon_violation', points: 1 }), RangeError);
});

test('atonement removes points; thresholds derive from remaining points', () => {
  assert.deepEqual(resolveDecayAtonement(character(12), 1).character.decay, { points: 0, stage: 0 });
  const partial = resolveDecayAtonement(character(10), 20, 1);
  assert.equal(partial.outcome, 'partial');
  assert.equal(partial.removed, 1);
  assert.deepEqual(partial.character.decay, { points: 9, stage: 2 });
  assert.deepEqual(resolveDecayAtonement(character(2), 2, 4).character.decay, { points: 0, stage: 0 });
  assert.equal(resolveDecayAtonement(character(10), 21).removed, 0);
  assert.throws(() => resolveDecayAtonement(character(10), 2), RangeError);
});
