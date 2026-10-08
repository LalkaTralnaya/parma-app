import test from 'node:test';
import assert from 'node:assert/strict';
import { getInventoryWeapons, clearUnavailableWeapon, removeItemFromInventory } from '../src/lib/engine/inventory.ts';
import { ITEMS } from '../src/lib/rules/items.ts';
import { WEAPONS } from '../src/lib/rules/weapons.ts';
test('weapon selection uses positive inventory quantities and excludes ammo and duplicate entries', () => {
const char = { inventory: [{itemId:'dagger',quantity:1},{itemId:'dagger',quantity:2},{itemId:'war_hammer',quantity:0},{itemId:'arrows',quantity:20},{itemId:'smith_hammer',quantity:1}],equipment:{weaponId:'dagger'} };
assert.deepEqual(new Set(getInventoryWeapons(char).map(w=>w.id)),new Set(['dagger','smith_hammer']));
assert.deepEqual(getInventoryWeapons({inventory:[]}),[]);
assert.deepEqual(getInventoryWeapons({}),[]);
});
test('removing the last equipped weapon clears equipment but preserves remaining copies', () => {
const char={inventory:[{instanceId:'a',itemId:'dagger',quantity:2}],equipment:{weaponId:'dagger',armorId:'none'}};
const one=clearUnavailableWeapon(removeItemFromInventory(char,'a'));
assert.equal(one.equipment.weaponId,'dagger');
const empty=clearUnavailableWeapon(removeItemFromInventory(one,'a'));
assert.equal(empty.equipment.weaponId,undefined);
assert.equal(empty.equipment.armorId,'none');
});
test('every inventory weapon except ammunition has combat stats',()=>{
for(const item of ITEMS.filter(x=>x.category==='weapon'&&x.id!=='arrows'))assert.ok(WEAPONS.some(w=>w.id===item.id),item.id);
});
