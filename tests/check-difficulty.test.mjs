import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCheckDifficulty, getCheckDifficulty, normalizeCheckDifficulty } from '../src/lib/engine/checkDifficulty.ts';
import { getCharacteristicValue, getResourceMax, getSkillCheckTarget } from '../src/lib/engine/character.ts';
import { getSpellAttackTarget, getSpellCastTarget } from '../src/lib/engine/spells.ts';
import { getAttackTarget } from '../src/lib/engine/combat.ts';
import { getConditionSaveTarget } from '../src/lib/engine/conditions.ts';
import { participantCharacter } from '../src/lib/engine/combatEffects.ts';
import { WEAPONS } from '../src/lib/rules/weapons.ts';
import { CONDITIONS } from '../src/lib/rules/conditions.ts';
const char=participantCharacter({id:'test',name:'test',isPlayer:false,maxHp:40,currentHp:40,armor:5,initiative:0,statMods:{strength:6,dexterity:6,intelligence:6,religion:6,eloquence:6}});

test('all six storyteller adjustments change the target by their signed amount',()=>{
 const base=getSkillCheckTarget(char,'perception');
 for(const amount of [-1,-5,-10,1,5,10]) {
  const c={...char,checkDifficulty:amount};
  assert.equal(getSkillCheckTarget(c,'perception'),base+amount);
  assert.equal(getSpellCastTarget(c,'illusion'),getSpellCastTarget(char,'illusion')+amount);
  assert.equal(getSpellAttackTarget(c,'illusion'),getSpellAttackTarget(char,'illusion')+amount);
  assert.equal(getAttackTarget(c,WEAPONS[0],'normal',5,false).target,getAttackTarget(char,WEAPONS[0],'normal',5,false).target+amount);
  assert.equal(getConditionSaveTarget(c,CONDITIONS.find(c=>c.id==='poisoned'),false).target,getConditionSaveTarget(char,CONDITIONS.find(c=>c.id==='poisoned'),false).target+amount);
 }
});
test('difficulty changes checks without changing characteristics, resources or initiative modifier',()=>{
 const c={...char,checkDifficulty:-10};
 for(const id of ['strength','intelligence','dexterity','religion','eloquence'])assert.equal(getCharacteristicValue(c,id),getCharacteristicValue(char,id));
 for(const id of ['hp','mana','stamina','influence','grace'])assert.equal(getResourceMax(c,id),getResourceMax(char,id));
 assert.equal(getCheckDifficulty({...c,checkDifficulty:0}),0);
 assert.equal(getCheckDifficulty(char),0);
});
test('difficulty is applied before percentile target limits and malformed data cannot break checks',()=>{
 assert.equal(applyCheckDifficulty(100,{checkDifficulty:-10}),90);
 assert.equal(applyCheckDifficulty(3,{checkDifficulty:-10}),0);
 assert.equal(applyCheckDifficulty(94,{checkDifficulty:10}),95);
 assert.equal(normalizeCheckDifficulty(Infinity),0);assert.equal(normalizeCheckDifficulty('5'),0);
 assert.equal(normalizeCheckDifficulty(1000),95);assert.equal(normalizeCheckDifficulty(-1000),-95);
});
