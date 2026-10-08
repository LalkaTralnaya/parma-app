import test from 'node:test';
import assert from 'node:assert/strict';
import { BESTIARY } from '../src/lib/rules/bestiary.ts';
import { BESTIARY_HABITATS, getMonsterHabitats, filterBestiary } from '../src/lib/rules/bestiary-habitats.ts';
const filters = {habitat:'all',type:'all',query:'',level:'all'};
test('every bestiary creature has valid unique habitats and one primary habitat',()=>{
  for(const monster of BESTIARY){const habitats=getMonsterHabitats(monster.id);assert.ok(habitats.length,monster.id);assert.equal(new Set(habitats.map(x=>x.id)).size,habitats.length);for(const habitat of habitats)assert.ok(BESTIARY_HABITATS.some(x=>x.id===habitat.id));}
  const grouped=BESTIARY_HABITATS.flatMap(habitat=>BESTIARY.filter(monster=>getMonsterHabitats(monster.id)[0]?.id===habitat.id));
  assert.equal(grouped.length,BESTIARY.length);assert.equal(new Set(grouped.map(x=>x.id)).size,BESTIARY.length);
});
test('secondary habitats are included without duplicating creatures',()=>{
  const water=filterBestiary({...filters,habitat:'water'});assert.ok(water.some(x=>x.id==='vodyanoy'));assert.ok(water.some(x=>x.id==='giant_boa'));assert.ok(!water.some(x=>x.id==='druzhinnik'));
  assert.ok(filterBestiary({...filters,habitat:'forest'}).some(x=>x.id==='giant_boa'));
});
test('habitat, type, level and case insensitive search combine',()=>{
  assert.deepEqual(filterBestiary({...filters,habitat:'forest',type:'forest',query:'  МЕДВЕДЬ ',level:'1-3'}).map(x=>x.id),['bear']);
  assert.equal(filterBestiary({...filters,habitat:'forest',query:'МЕДВЕДЬ',level:'7-10'}).length,0);
  assert.equal(filterBestiary({...filters,query:'нет такого чудовища'}).length,0);
  assert.equal(filterBestiary(filters).length,BESTIARY.length);
});
