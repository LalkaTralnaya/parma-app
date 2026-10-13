import test from 'node:test';
import assert from 'node:assert/strict';
import { DRAFT_TREES,DRAFT_ABILITIES } from '../src/lib/rules/draft-trees.ts';
import { getAbilityBlockReason,learnAbility,isAbilityLearned,getSkillTotal } from '../src/lib/engine/character.ts';
import { WEAPONS } from '../src/lib/rules/weapons.ts';
import { SPELLS } from '../src/lib/rules/spells.ts';
import { getMaxAttackCount,getAttackCost,getAttackBlockReason,rollAttack,spendAttackCost,rollWeaponDamage } from '../src/lib/engine/combat.ts';
import { getMaxSpellLevel,getSpellCost,getSpellCastingAvailability,rollSpellEffect } from '../src/lib/engine/spells.ts';
import { opposedWinner,resolveMartialAction } from '../src/lib/engine/martial.ts';
import { spellDamageSaveTarget,spellDamageAfterSave } from '../src/lib/engine/spellTargets.ts';
const char=(patch={})=>({id:'hero',name:'Герой',raceId:'human',level:1,characteristics:{strength:{levelUpBonus:0},intelligence:{levelUpBonus:0},dexterity:{levelUpBonus:0},eloquence:{levelUpBonus:0},religion:{levelUpBonus:0}},skillPoints:{martial:4},resourceRolls:{},currentResources:{stamina:20,mana:30,hp:20},abilities:[],abilityPoints:20,spells:[],equipment:{},conditions:[],...patch});
const weapon=id=>WEAPONS.find(w=>w.id===id),spell=id=>SPELLS.find(s=>s.id===id);
test('all 457 nodes have valid acyclic dependencies and all 35 trees can be browsed',()=>{
 assert.equal(DRAFT_TREES.length,35);assert.equal(DRAFT_ABILITIES.length,457);
 const nodes=new Map(DRAFT_ABILITIES.map(a=>[a.id,a]));assert.equal(nodes.size,457);
 const visiting=new Set(),seen=new Set();function walk(id){assert.ok(nodes.has(id));assert.ok(!visiting.has(id));if(seen.has(id))return;visiting.add(id);const n=nodes.get(id);for(const p of [...n.requiresAll,...n.requiresAny])walk(p);visiting.delete(id);seen.add(id);}for(const id of nodes.keys())walk(id);
});
test('successive one-point purchases use exact ALL and ANY prerequisites without characteristic thresholds',()=>{
 let c=char({abilityPoints:7});assert.match(getAbilityBlockReason(c,'RU.series'),/Поставленный/);
 for(const id of ['RU.base1','RU.base2','RU.series','RU.base3','RU.base4','RU.master','RU.counter']) {c=learnAbility(c,id);assert.ok(c);}
 assert.equal(c.abilityPoints,0);assert.equal(learnAbility(c,'RU.ground'),null);assert.equal(getMaxAttackCount(c,{skill:'martial'}),3);
 const special=char();assert.match(getAbilityBlockReason(special,'VA.base'),/форму/);assert.equal(getAbilityBlockReason({...special,storyForms:['vampire']},'VA.base'),null);
 const any=char({abilities:['DE.base1','DE.base2','DE.base3','DE.base4','DE.base5','CO.base5','CO.elementPower']});
 // A missing required specialization cannot be replaced by an unrelated purchased node.
 const node=DRAFT_ABILITIES.find(a=>a.requiresAny.length&&a.requiresAll.length);
 assert.ok(getAbilityBlockReason(char({abilities:node.requiresAll}),node.id));
 assert.equal(getAbilityBlockReason(char({abilities:[...node.requiresAll,node.requiresAny[0]],storyForms:['vampire','werewolf']}),node.id),null);
});
test('old saved IDs remain effective and a school rank does not grant spells',()=>{
 const c=char({abilities:['destruction_master','one_handed_strong3'],spells:['fire_arrow']});
 assert.equal(isAbilityLearned(c,'DE.base5'),true);assert.equal(isAbilityLearned(c,'OH.base5'),true);assert.equal(getMaxSpellLevel(c,'destruction'),4);assert.deepEqual(c.spells,['fire_arrow']);
});
test('noncombat skill ranks change the intended skill once without stacking prior ranks',()=>{
 const base=char(),ranked=char({abilities:['SN.base1','SN.base2','SN.base3','PK.base1','AC.base1']});
 assert.equal(getSkillTotal(ranked,'stealth')-getSkillTotal(base,'stealth'),4);
 assert.equal(getSkillTotal(ranked,'pickpocketing')-getSkillTotal(base,'pickpocketing'),2);
 assert.equal(getSkillTotal(ranked,'alchemy')-getSkillTotal(base,'alchemy'),1);
 assert.equal(getSkillTotal(ranked,'martial'),getSkillTotal(base,'martial'));
});
test('double and triple series make one check, spend stamina on a miss and add flat bonuses once',()=>{
 const c=char({abilities:['OH.base1','OH.series','OH.master'],skillPoints:{one_handed:3}}),w=weapon('war_hammer');
 let rolls=0;const result=rollAttack(c,w,'triple',0,false,[],s=>{if(s===100){rolls++;return 20;}return 1;});
 assert.equal(rolls,1);assert.equal(result.length,1);assert.equal(result[0].damage.diceCount,3);assert.equal(result[0].damage.total,3+6+3+2);
 assert.equal(spendAttackCost(c,w,'triple').currentResources.stamina,16);assert.equal(c.currentResources.stamina,20);
 assert.equal(rollAttack(c,w,'fast',0,false,[],()=>99)[0].damage,undefined);assert.equal(spendAttackCost(c,w,'fast').currentResources.stamina,18);
 assert.match(getAttackBlockReason(char(),w,'fast'),/изучите/);assert.match(getAttackBlockReason({...c,currentResources:{stamina:3}},w,'triple'),/Бодрости/);
});
test('crossbows have mechanical damage, require reload and cannot use ordinary series',()=>{
 const c=char({abilities:['AR.series','AR.master','AR.steady2'],skillPoints:{archery:2}}),w=weapon('crossbow');
 assert.equal(getMaxAttackCount(c,w),1);assert.equal(getAttackCost(c,w,'strong'),0);
 const damage=rollWeaponDamage(c,w,'strong',false,false,[],()=>1);assert.equal(damage.diceCount,1);assert.equal(damage.modValue,0);assert.equal(damage.total,1+2+4);
 const spent=spendAttackCost(c,w,'normal');assert.match(getAttackBlockReason(spent,w,'normal'),/разряжен/);
});
test('spell versions use explicit dice, flat elemental bonuses and one highest school discount',()=>{
 const c=char({abilities:['DE.base1','DE.base2','DE.base3','DE.base4','DE.base5','DE.dual','DE.fire1','DE.fire2'],skillPoints:{destruction:3}});
 assert.equal(getSpellCost(c,spell('fire_arrow'),true).reduced,3);
 const damage=rollSpellEffect(c,spell('fire_arrow'),true,false,()=>1);assert.equal(damage.diceCount,2);assert.equal(damage.extraDice,0);assert.equal(damage.modValue,0);assert.equal(damage.total,2+3+2);
 assert.match(getSpellCastingAvailability(char(),spell('fire_arrow'),true,false).reason,/двойное/);
 assert.equal(getSpellCastingAvailability(char(),spell('fireball'),true,false).affordable,true);
 assert.equal(getSpellCost(char({abilities:['RE.base5']}),spell('small_ward'),false).reduced,2);
 assert.equal(getSpellCost(char({abilities:['AL.base5']}),spell('balance'),false).resource,'hp');
});
test('opposed control uses margins and saves conditions, not attack armor or strike damage bonuses',()=>{
 assert.equal(opposedWinner(1,0,20,95),'actor');assert.equal(opposedWinner(100,95,100,95),'tie');assert.equal(opposedWinner(30,50,20,40),'tie');assert.equal(opposedWinner(30,50,20,35),'actor');
 const c=char({abilities:['RU.base5','RU.wrestle','RU.ground','RU.pain','RU.choke']});
 const state={active:true,round:1,currentTurnIndex:0,timestamp:0,participants:[{id:'hero',sourceId:'hero',isPlayer:true,name:'Герой',currentHp:20,maxHp:20,armor:0,initiative:1},{id:'enemy',name:'Враг',isPlayer:false,currentHp:50,maxHp:50,armor:90,initiative:0}]};
 let r=resolveMartialAction(c,state,'hero','enemy','grab',1,20,80,40,()=>1);assert.equal(r.damage,0);assert.equal(r.encounter.participants[1].grapple.kind,'grab');assert.equal(state.participants[1].grapple,undefined);
 r=resolveMartialAction(r.character,r.encounter,'hero','enemy','throw',1,1,80,40,()=>1);assert.equal(r.damage,7);assert.equal(r.encounter.participants[1].prone,true);assert.equal(r.encounter.participants[1].grapple,undefined);
 assert.throws(()=>resolveMartialAction(c,state,'hero','enemy','pain',1,1,80,40,()=>1),/удержание/);
});
test('area damage uses a separate save per recipient, natural signs and half damage rounded down',()=>{
 const victim={id:'enemy',isPlayer:false,name:'Враг',armor:90,maxHp:30,currentHp:30,primaryMod:6};
 const save=spellDamageSaveTarget(victim,spell('fireball'));assert.equal(typeof save,'number');
 assert.equal(spellDamageAfterSave(15,1,0),7);assert.equal(spellDamageAfterSave(15,100,95),15);
 assert.equal(spellDamageAfterSave(15,20,save),7);assert.equal(spellDamageSaveTarget(victim,spell('fire_arrow')),null);
 assert.throws(()=>spellDamageAfterSave(15,0,save));
});
test('double-charge crossbow requires its own available series and consumes the requested charges',()=>{
 const w=weapon('double_crossbow'),c=char({abilities:['AR.series','AR.master']});
 assert.equal(getMaxAttackCount(c,w),2);assert.match(getAttackBlockReason(c,w,'triple'),/изучите/);
 const fired=spendAttackCost(c,w,'fast');assert.equal(fired.crossbowCharges.double_crossbow,0);assert.equal(fired.currentResources.stamina,18);
 assert.match(getAttackBlockReason(fired,w,'normal'),/разряжен/);
});
test('balance uses health without school discount and cannot repeat before long rest',()=>{
 const c=char({abilities:['AL.base5'],spellUsesSinceLongRest:['balance']});
 assert.equal(getSpellCost(c,spell('balance'),false).reduced,10);
 assert.match(getSpellCastingAvailability(c,spell('balance'),false,false).reason,/использовано/);
});
