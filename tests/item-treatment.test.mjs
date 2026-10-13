import test from 'node:test';
import assert from 'node:assert/strict';
import { treatWithItem, applyItemTreatments } from '../src/lib/engine/itemTreatment.ts';
const char=(id,conditions=[])=>({id,conditions,inventory:[{instanceId:'bandage',itemId:'bandage',quantity:2}]});
const bleeding={id:'bleeding',stacks:3,roundsLeft:null};
const encounter=target=>({active:true,participants:[{id:'ally',isPlayer:true,sourceId:target.id,characterSnapshot:target,effects:[{id:'bleed1',conditionId:'bleeding'},{id:'bleed2',conditionId:'bleeding'},{id:'poisoned',conditionId:'poisoned'}]}]});
test('self bandage removes all bleeding stacks and consumes exactly one bandage',()=>{
 const actor=char('self',[bleeding,{id:'poisoned'}]); const r=treatWithItem(actor,'bandage',actor,null,null,'t1');
 assert.deepEqual(r.actor.conditions,[{id:'poisoned'}]);assert.equal(r.actor.inventory[0].quantity,1);assert.deepEqual(actor.conditions,[bleeding,{id:'poisoned'}]);
});
test('ally treatment consumes the actor item and clears both character and combat bleeding sources',()=>{
 const actor=char('self',[bleeding]),ally=char('friend',[bleeding,{id:'poisoned'}]);
 const state=encounter(ally),r=treatWithItem(actor,'bandage',ally,state,'ally','t2');
 assert.equal(r.actor.inventory[0].quantity,1);assert.equal(r.actor.conditions.length,1);
 assert.equal(r.recipient.inventory[0].quantity,2);assert.deepEqual(r.recipient.conditions,[{id:'poisoned'}]);
 assert.deepEqual(r.state.participants[0].effects.map(e=>e.id),['poisoned']);assert.equal(state.participants[0].effects.length,3);
});
test('combat-only bleeding can be treated and treatment messages apply once on the ally device',()=>{
 const ally=char('friend',[]),actor=char('self'); const r=treatWithItem(actor,'bandage',null,encounter(ally),'ally','t3');
 const treated=applyItemTreatments(char('friend',[bleeding]),r.state.participants[0]);assert.equal(treated.conditions.length,0);
 const woundedAgain={...treated,conditions:[bleeding]};assert.equal(applyItemTreatments(woundedAgain,r.state.participants[0]),woundedAgain);
});
test('missing condition or exhausted item does not spend a bandage',()=>{
 const actor=char('self');assert.throws(()=>treatWithItem(actor,'bandage',actor,null,null,'t4'),/нет этого состояния/);assert.equal(actor.inventory[0].quantity,2);
 assert.throws(()=>treatWithItem({...actor,inventory:[]},'bandage',char('ally',[bleeding]),null,null,'t5'),/не найден/);
});
test('antidote uses the same treatment path and leaves unrelated bleeding intact',()=>{
 const actor={...char('self',[bleeding,{id:'poisoned'}]),inventory:[{instanceId:'antidote',itemId:'antidote',quantity:1}]};
 const r=treatWithItem(actor,'antidote',actor,null,null,'t6');assert.deepEqual(r.actor.conditions,[bleeding]);assert.equal(r.actor.inventory.length,0);
});
