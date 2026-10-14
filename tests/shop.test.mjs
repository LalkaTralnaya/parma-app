import test from 'node:test';
import assert from 'node:assert/strict';
import { purchaseItem } from '../src/lib/engine/shop.ts';
import { ITEMS } from '../src/lib/rules/items.ts';
import { getTotalCopper } from '../src/lib/engine/inventory.ts';
const hero = () => ({ id:'buyer', money:{gold:1,silver:0,copper:0}, inventory:[] });
test('purchases charge exact copper prices and leave the original character untouched',()=>{
 const original=hero(); const updated=purchaseItem(original,'chalk',3);
 assert.equal(getTotalCopper(updated.money),9985);assert.equal(updated.inventory[0].quantity,15);
 assert.equal(original.inventory.length,0);assert.equal(original.money.gold,1);
});
test('bundle purchases charge per package and stack actual quantities',()=>{
 const item=ITEMS.find(i=>i.bundleQuantity>1 && i.stackable && i.price>0);
 assert.ok(item);let original=hero(); original.money.gold=100;
 const first=purchaseItem(original,item.id,2), next=purchaseItem(first,item.id,1);
 assert.equal(next.inventory.length,1);assert.equal(next.inventory[0].quantity,item.bundleQuantity*3);
 assert.equal(getTotalCopper(original.money)-getTotalCopper(next.money),Math.round(item.price*3*100));
});
test('insufficient money, missing items and invalid quantities do not produce a purchase',()=>{
 const original={...hero(),money:{gold:0,silver:0,copper:0}};
 assert.throws(()=>purchaseItem(original,'rope'),/Недостаточно/);
 assert.throws(()=>purchaseItem(hero(),'unknown'),/цена/);
 for(const qty of [0,-1,1.5,100,NaN])assert.throws(()=>purchaseItem(hero(),'chalk',qty),/количество/);
 assert.equal(original.inventory.length,0);
});

test('copper-priced purchases never leave fractional coins',()=>{
 const item=ITEMS.find(i=>i.price===0.07);assert.ok(item);
 const updated=purchaseItem(hero(),item.id,3);
 assert.equal(getTotalCopper(updated.money),9979);assert.ok(Number.isInteger(updated.money.copper));
});
