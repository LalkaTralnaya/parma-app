import test from 'node:test';
import assert from 'node:assert/strict';
import { attemptCombatEffectSave, combatModifiers, effectPreset, effectSaveTarget, participantCharacter, resolveCombatEffect, tickCombatEffects } from '../src/lib/engine/combatEffects.ts';

const monster=(id,sourceId='harpy')=>({id,name:id,sourceId,isPlayer:false,maxHp:40,currentHp:40,armor:10,initiative:0,statMods:{strength:8,intelligence:6,dexterity:7,eloquence:4,religion:5},traits:[]});
const effect=(changes={})=>({id:'fear-1',name:'Крик',description:'Жуть',sourceId:'harpy',sourceName:'Гарпия',conditionId:'frightened',modifiers:{armor:-15,skills:-5},save:{charA:'strength',skillA:'fortitude'},penalty:-5,roundsLeft:2,...changes});
const state=(participants)=>({participants,round:1,currentTurnIndex:0,active:true,timestamp:0});

test('source descriptions retain explicit save characteristic, skill, penalty and duration',()=>{
 assert.deepEqual(effectPreset('Пронзительный крик: Избавление Стойкости или Ошеломление 1 раунд'),{conditionId:'stunned',charA:'strength',skillA:'fortitude',penalty:0,rounds:1});
 assert.equal(effectPreset('Пение: Избавление Интеллекта СЛ -5 или Жуть на 2 раунда').charA,'intelligence');
 assert.equal(effectPreset('Укус: Стойкость со штрафом −10 — иначе Отрава на 3 раунда').penalty,-10);
});
test('monster to player and player to monster use the same saving and application rules without HP changes',()=>{
 const enemy=monster('enemy');const player={...monster('player'),isPlayer:true,characterSnapshot:participantCharacter(enemy)};
 for(const target of [enemy,player]){
  const s=state([target]);const failed=resolveCombatEffect(s,target.id,effect(),100);
  assert.equal(failed.success,false);assert.equal(failed.state.participants[0].effects.length,1);
  assert.equal(failed.state.participants[0].currentHp,40);assert.equal(s.participants[0].effects,undefined);
  assert.equal(resolveCombatEffect(s,target.id,effect(),1).success,true);
  assert.equal(resolveCombatEffect(s,target.id,effect(),1).state.participants[0].effects,undefined);
 }
});
test('effect save respects current effects, invested skills and source penalty; succeeds only for its own effect',()=>{
 let target=monster('target');const character=participantCharacter(target);character.skillPoints.fortitude=10;
 assert.equal(effectSaveTarget(target,effect(),character),61);
 target={...target,effects:[effect(),effect({id:'other',name:'Другая Жуть',sourceId:'other'})]};
 assert.equal(combatModifiers(character,target).armor,-15); // same condition does not stack
 assert.equal(effectSaveTarget(target,effect(),character),56);
 const s=state([target]);assert.equal(attemptCombatEffectSave(s,'target','fear-1',100,character).state,s);
 const success=attemptCombatEffectSave(s,'target','fear-1',1,character);
 assert.equal(success.success,true);assert.deepEqual(success.state.participants[0].effects.map(e=>e.id),['other']);
 assert.throws(()=>attemptCombatEffectSave(s,'target','fear-1',0,character));
});
test('monster immunity prevents negative state and effects count down equally on both sides',()=>{
 const skeleton=monster('skeleton','skeleton');skeleton.traits=['Нежить: иммунитет к Отраве, Хвори, Сну, Жути'];
 const immune=resolveCombatEffect(state([skeleton]),'skeleton',effect(),100);
 assert.equal(immune.immune,true);assert.equal(immune.state.participants[0].effects,undefined);
 const a={...monster('a'),effects:[effect({roundsLeft:1}),effect({id:'forever',roundsLeft:null})]};
 const b={...monster('b'),isPlayer:true,effects:[effect({roundsLeft:2})]};
 const tick=tickCombatEffects(state([a,b]));
 assert.deepEqual(tick.participants[0].effects.map(e=>e.id),['forever']);assert.equal(tick.participants[1].effects[0].roundsLeft,1);
});
test('custom penalties apply and a refreshed source does not duplicate the same active effect',()=>{
 const target=monster('target');const e=effect({conditionId:undefined,modifiers:{attacks:-5,speed:-2,canAct:false},save:undefined});
 const first=resolveCombatEffect(state([target]),'target',e,null).state;
 const refreshed=resolveCombatEffect(first,'target',{...e,id:'new'},null).state;
 assert.equal(refreshed.participants[0].effects.length,1);
 const mods=combatModifiers(participantCharacter(target),refreshed.participants[0]);
 assert.equal(mods.attacks,-5);assert.equal(mods.speed,-2);assert.equal(mods.canAct,false);
});
