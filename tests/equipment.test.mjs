import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, getItem } from '../src/lib/rules/items.ts';
import { WEAPONS, ARMORS, SHIELDS } from '../src/lib/rules/weapons.ts';
import { getArmorValue, getAttackCount } from '../src/lib/engine/combat.ts';
import { addItemToInventory, getInventoryWeapons, spendSilver } from '../src/lib/engine/inventory.ts';

test('new catalog has unique IDs and every weapon/armor/shield has an inventory item', () => {
 for (const list of [ITEMS, WEAPONS, ARMORS, SHIELDS]) assert.equal(new Set(list.map(x=>x.id)).size,list.length);
 for (const weapon of WEAPONS) assert.equal(getItem(weapon.id)?.category,'weapon');
 for (const armor of ARMORS.filter(a=>a.id!=='none')) assert.equal(getItem(armor.itemId ?? armor.id)?.category,'armor');
 for (const shield of SHIELDS.filter(s=>s.id!=='none')) assert.equal(getItem(shield.id)?.category,'armor');
});
test('new weapon purchases appear in attack selection; ammunition does not', () => {
 let char={inventory:[],equipment:{},money:{copper:0,silver:100,gold:0}};
 char=addItemToInventory(char,'crossbow');
 char=addItemToInventory(char,'bolts',getItem('bolts').bundleQuantity);
 assert.deepEqual(getInventoryWeapons(char).map(w=>w.id),['crossbow']);
 assert.equal(char.inventory.find(i=>i.itemId==='bolts').quantity,10);
 assert.equal(WEAPONS.find(w=>w.id==='crossbow').ammunition,'bolt');
 assert.equal(WEAPONS.find(w=>w.id==='sling').ammunition,'sling');
 assert.equal(WEAPONS.find(w=>w.id==='short_bow').ammunition,'arrow');
});
test('prices in copper use the existing currency engine', () => {
 const char={money:{copper:100,silver:0,gold:0}};
 assert.equal(getItem('rations').price,.05);
 assert.equal(getItem('wooden_arrows').price,.2);
 assert.equal(spendSilver(char,getItem('rations').price).copper,95);
 assert.equal(getItem('staff').price,2);
 assert.equal(WEAPONS.find(w=>w.id==='staff').damageOneHand,'1d6');
 assert.equal(getItem('thieves_tools').price,15);
});
test('new equipped armor and shield contribute their actual bonuses', () => {
 const char={characteristics:{},skillPoints:{},abilities:[],equipment:{armorId:'full_plate',shieldId:'small_round_shield'}};
 const armor=getArmorValue(char);
 assert.equal(armor.armor,12);
 assert.equal(armor.shield,2);
 assert.equal(ARMORS.find(a=>a.id==='worn_short_chainmail').durability,5);
});
test('crossbow does not gain additional shots from rapid archery', () => {
 const char={abilities:['archery_rapid'],skillPoints:{archery:6}};
 assert.equal(getAttackCount(char,WEAPONS.find(w=>w.id==='crossbow'),'normal'),1);
});
