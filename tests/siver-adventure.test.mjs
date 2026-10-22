import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ADVENTURES, getAdventure } from '../src/lib/rules/adventures.ts';

const first=getAdventure('proklyatie-starogo-kolodtsa');
const adventure=getAdventure('chernaya-khvor');
const road=getAdventure('doroga-v-gardariki');

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
  assert.equal(village.label,'Кривцы');
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

test('road is a separate adventure with its own route and scene numbering',()=>{
  assert.equal(adventure.nextAdventure.slug,road.slug);
  assert.equal(road.previousAdventure.slug,adventure.slug);
  assert.deepEqual(road.scenes.map(s=>s.id),['road-gavrila','road-first-watch','road-ambush-site','road-bandit-camp','road-patrol','road-gardariki']);
  assert.ok(!adventure.scenes.some(s=>s.id.startsWith('road-')));
  assert.ok(!adventure.npcs.some(n=>n.name.includes('Гаврила')));
  assert.equal(adventure.overviewMap,undefined);
  road.scenes.forEach((s,i)=>assert.ok(s.title.startsWith(`${i+1}. `)));
  assert.ok(road.guide.some(e=>e.blocks.some(b=>b.kind==='table')));
});

test('road retains caravan facts, unknown watcher, personal clue and alternative patrol scenes',()=>{
  const scene=id=>JSON.stringify(road.scenes.find(s=>s.id===id));
  assert.ok(scene('road-gavrila').includes('пяти телегах по два'));
  assert.ok(scene('road-gavrila').includes('Двое на первой телеге'));
  assert.ok(scene('road-gavrila').includes('Интеллекта'));
  assert.ok(scene('road-first-watch').includes('остаётся неизвестным'));
  for(const clue of ['кровь','бинтов','клеймо'])assert.ok(scene('road-bandit-camp').includes(clue));
  assert.ok(scene('road-bandit-camp').includes('Кузнец по предыстории'));
  assert.ok(scene('road-patrol').includes('Не проводите обе версии подряд'));
  assert.ok(scene('road-gardariki').includes('два до места нападения и четыре после него'));
  const source=readFileSync('docs/adventures/siver-source.md','utf8');
  for(const heading of ['## Дорога в Гардарики','### Обоз Гаврилы Златоборода','### Ночная проверка дружины','### Последние дни пути'])assert.ok(source.includes(heading));
});

test('overview preserves the six-day road and a separate local map',()=>{
  const overview=road.map;
  assert.equal(overview.travelDays,6);
  assert.notEqual(overview.src,adventure.map.src);
  assert.ok(existsSync(resolve('static',overview.src.slice(1))));
  assert.ok(existsSync(resolve('static',adventure.map.src.slice(1))));
  assert.deepEqual([...new Set(overview.markers.filter(m=>m.day).map(m=>m.day))].sort(),[1,2,3,4,5,6]);
  assert.equal(overview.markers.find(m=>m.id==='overview-ambush').day,2);
  assert.equal(overview.markers.find(m=>m.id==='overview-city').day,6);
  const village=overview.markers.find(m=>m.id==='overview-krivtsy'), marsh=overview.markers.find(m=>m.id==='overview-marsh');
  assert.ok(marsh.x>village.x&&marsh.y>village.y);
  assert.ok(overview.caption.includes('затем ещё четыре'));
  assert.ok(overview.caption.includes('трёх часах'));
  assert.equal(overview.markers.find(m=>m.id==='overview-bandit-camp').gmOnly,true);
  assert.ok(!overview.markers.some(m=>m.id==='overview-siver'));
  assert.equal(new Set(overview.markers.map(m=>m.id)).size,overview.markers.length);
  for(const marker of overview.markers){assert.ok(marker.x>=0&&marker.x<=100);assert.ok(marker.y>=0&&marker.y<=100);}
});
