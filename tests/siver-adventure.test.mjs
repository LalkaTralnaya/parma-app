import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ADVENTURES, getAdventure } from '../src/lib/rules/adventures.ts';

const first=getAdventure('proklyatie-starogo-kolodtsa');
const adventure=getAdventure('chernaya-khvor');

test('Black Illness is a separate adventure with its own route, scene numbering and progress identity',()=>{
  assert.equal(adventure.title,'Чёрная хворь');
  assert.notEqual(first.slug,adventure.slug);
  assert.equal(ADVENTURES.filter(a=>a.slug===adventure.slug).length,1);
  assert.equal(first.nextAdventure.slug,adventure.slug);
  assert.equal(adventure.previousAdventure.slug,first.slug);
  assert.deepEqual(first.scenes.map(s=>s.id),['arrival','well','house','forest','mire','dusk','farewell','forge']);
  assert.equal(adventure.scenes.length,8);
  assert.equal(new Set(adventure.scenes.map(s=>s.id)).size,8);
  adventure.scenes.forEach((scene,index)=>{assert.ok(scene.title.startsWith(`${index+1}. `));assert.ok(scene.goals.length);assert.ok(scene.checks.length);assert.ok(scene.outcomes.length);});
});

test('Black Illness map names its own locations and puts distant marshes southeast',()=>{
  const {map}=adventure;
  const village=map.markers.find(m=>m.id==='village'), marsh=map.markers.find(m=>m.id==='mire');
  assert.ok(marsh.x-village.x>30);assert.ok(marsh.y-village.y>35);
  assert.equal(village.label,'Деревня Игната');
  assert.notEqual(first.map.src,map.src);
  assert.equal(first.map.src,'/adventures/zarechye-region.png');
  for(const name of ['Заречье','Петра','Данилы'])assert.ok(!JSON.stringify(map).includes(name));
  for(const name of ['Дом Игната и Ярослава','Дом знахарки','Убежище Сивера','Чёрные топи'])assert.ok(map.markers.some(m=>m.label===name));
  assert.ok(existsSync(resolve('static',map.src.slice(1))));
  for(const marker of map.markers){assert.ok(marker.x>=0&&marker.x<=100);assert.ok(marker.y>=0&&marker.y<=100);}
  for(const id of ['volkhv','family','healer'])assert.equal(map.markers.find(m=>m.id===id).gmOnly,true);
});

test('separate story retains both cures, hostage release, northern clue and source provenance',()=>{
  const story=JSON.stringify(adventure);
  for(const name of ['Игнат','Ярослав','полын','чистотел','руин','Предтеч','Шаг тени','пятеро'])assert.ok(story.toLowerCase().includes(name.toLowerCase()));
  for(const id of ['siver-remedy','siver-parley','siver-seals'])assert.ok(adventure.scenes.some(s=>s.id===id));
  assert.ok(adventure.handouts.some(h=>h.title.includes('переписчику')));
  assert.ok(readFileSync('docs/adventures/siver-source.md','utf8').includes('# Сюжет Сивера'));
});
