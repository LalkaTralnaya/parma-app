import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKGROUNDS } from '../src/lib/rules/backgrounds.ts';
import { getItem, ITEMS } from '../src/lib/rules/items.ts';
import { SKILLS } from '../src/lib/rules/skills.ts';
import { MECHANICS, LORE } from '../src/lib/rules/parma-library.ts';
import { SPELLS } from '../src/lib/rules/spells.ts';
import { giveBackgroundStartingInventory } from '../src/lib/engine/backgrounds.ts';
import { getSkillTotal } from '../src/lib/engine/character.ts';

test('all 40 backgrounds have both features, valid skill bonuses and usable starting items', () => {
 assert.equal(BACKGROUNDS.length,40);
 assert.equal(new Set(BACKGROUNDS.map(x=>x.id)).size,40);
 for (const background of BACKGROUNDS) {
  assert.ok(background.passiveFeature && background.activeFeature,background.id);
  assert.equal(Object.keys(background.skillBonuses).length,2);
  for (const [skill,bonus] of Object.entries(background.skillBonuses)) {
   assert.ok(SKILLS.some(s=>s.id===skill),skill); assert.equal(bonus,2);
  }
  for (const item of background.startingItems) {
   assert.ok(getItem(item.itemId),background.id+': '+item.itemId);
   assert.ok(Number.isInteger(item.quantity) && item.quantity>0);
  }
 }
 assert.equal(new Set(ITEMS.map(x=>x.id)).size,ITEMS.length);
});
test('starter inventory uses correct arrow types, worn mail and acid flasks', () => {
 const make=(id)=>{const char={inventory:[],money:{copper:0,silver:0,gold:0}};assert.equal(giveBackgroundStartingInventory(char,id),true);return char;};
 const hunter=make('hunter');
 assert.equal(hunter.inventory.find(i=>i.itemId==='arrows').quantity,10);
 assert.equal(hunter.inventory.find(i=>i.itemId==='broadhead_arrows').quantity,10);
 assert.equal(hunter.money.silver,20);
 assert.ok(make('veteran').inventory.some(i=>i.itemId==='worn_short_chainmail'));
 assert.equal(make('alchemist').inventory.find(i=>i.itemId==='acid_flask').quantity,3);
 assert.ok(make('shepherd').inventory.some(i=>i.itemId==='sling'));
});
test('background skill bonuses apply once and situational herb bonuses require context', () => {
 const char={characteristics:{},skillPoints:{smithing:1},abilities:[],backgroundId:'blacksmith'};
 const baseline=getSkillTotal({...char,backgroundId:undefined},'smithing');
 assert.equal(getSkillTotal(char,'smithing'),baseline+2);
 const healer={...char,backgroundId:'healer'};
 const observation=getSkillTotal({...char,backgroundId:undefined},'perception');
 assert.equal(getSkillTotal(healer,'perception'),observation);
 assert.equal(getSkillTotal(healer,'perception',undefined,'search_herbs'),observation+2);
});
test('book16 reference material and judicial spell retain their essential rules', () => {
 const entries=[...MECHANICS,...LORE];
 assert.equal(new Set(entries.map(x=>x.id)).size,entries.length);
 assert.ok(LORE.some(x=>x.category==='Письменности Пармы' && x.blocks.some(b=>b.kind==='table')));
 assert.ok(LORE.some(x=>x.category==='Связи, отношения и поручения Пармы'));
 const spell=SPELLS.find(s=>s.id==='judicial_compulsion');
 assert.equal(spell.school,'illusion'); assert.equal(spell.skillLevel,3);
 assert.equal(spell.costOneHand,8); assert.equal(spell.application,'ritual');
 assert.match(spell.save,/Колдовством.*Сплетничеством/);
});
