import test from 'node:test';
import assert from 'node:assert/strict';
import {MECHANICS,LORE} from '../src/lib/rules/parma-library.ts';
import {BOOK16_CURRENT} from '../src/lib/rules/book16-current.ts';
import {BOOK16_DRAFTS} from '../src/lib/rules/book16-drafts.ts';
import {getDecayStage} from '../src/lib/engine/decay.ts';
const entries=[...MECHANICS,...LORE,...BOOK16_CURRENT,...BOOK16_DRAFTS];
test('reference removes approval and migration sections and NPC comparison column',()=>{
 for(const title of ['Основа и границы заимствования','Первичная оценка баланса','Порядок согласования','Перенос прежних умений','Перенос уже созданного героя'])assert.ok(!entries.some(e=>e.title===title),title);
 const table=MECHANICS.find(e=>e.title==='Таблица характеристик и модификаторов навыков').blocks.find(b=>b.kind==='table');
 assert.equal(table.rows[0].length,3);
 assert.ok(table.rows.every(row=>row.length===3));
 assert.ok(!JSON.stringify(entries).includes('Автор утвердил'));
 assert.ok(!JSON.stringify(entries).match(/\bпоступок\b/u));
});
test('reference decay table has four book stages matching character sheet boundaries',()=>{
 const table=entries.flatMap(e=>e.blocks).find(b=>b.kind==='table'&&b.rows[0].includes('Порог ОТ')&&b.rows[0].includes('Название стадии'));
 assert.deepEqual(table.rows.slice(1).map(row=>row.slice(0,2)),[['1–4','Отмеченный'],['5–9','Теневой'],['10–19','Слуга Тьмы'],['20+','Поглощённый']]);
 for(const [points,name] of [[1,'Отмеченный'],[4,'Отмеченный'],[5,'Теневой'],[9,'Теневой'],[10,'Слуга Тьмы'],[19,'Слуга Тьмы'],[20,'Поглощённый']])assert.equal(getDecayStage(points).name,name);
 assert.ok(table.rows[3][2].includes('Благодать недоступна'));
});
test('personality keeps character, ideal, bond, weakness and a separate personal goal',()=>{
 const aspectEntries=entries.filter(e=>e.category==='Аспекты личности Пармы');
 for(const title of ['Характер','Идеал','Привязанность','Слабость','Личная цель'])assert.ok(aspectEntries.some(e=>e.title===title),title);
 assert.ok(!aspectEntries.some(e=>e.title.includes('Стремление')||e.title.includes('Искушение')));
 assert.ok(JSON.stringify(MECHANICS).includes('Убеждение'),'persuasion skill remains intact');
});
