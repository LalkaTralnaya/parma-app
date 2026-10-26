import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOK_FACTIONS, BOOK_RELATIONSHIPS, BOOK_RELATIONSHIP_JOBS } from '../src/lib/rules/book-relationships.ts';
import { LORE } from '../src/lib/rules/parma-library.ts';

test('world web preserves all 24 parties, 42 relations and 120 jobs from the book',()=>{
 assert.equal(BOOK_FACTIONS.length,24); assert.equal(BOOK_RELATIONSHIPS.length,42); assert.equal(BOOK_RELATIONSHIP_JOBS.length,120);
 const source=LORE.find(e=>e.id==='book16-82').blocks.filter(b=>b.kind==='paragraph').map(b=>b.text);
 const jobs=LORE.find(e=>e.id==='book16-83').blocks.filter(b=>b.kind==='paragraph').map(b=>b.text);
 for(const e of BOOK_RELATIONSHIPS){ assert.ok(source.some(t=>t.startsWith(`${e.id}. `))); assert.ok(source.includes(e.terms)); assert.ok(source.includes(`Повод для перемены: ${e.trigger}`)); }
 for(const j of BOOK_RELATIONSHIP_JOBS){ assert.ok(jobs.includes(`${j.id}. ${j.title}`)); assert.ok(jobs.includes(j.brief)); assert.ok(jobs.includes(`Дополнительная награда: ${j.reward}`)); }
 for(const f of BOOK_FACTIONS) { assert.ok(jobs.includes(f.name)); assert.equal(BOOK_RELATIONSHIP_JOBS.filter(j=>j.owner===f.id).length,5); }
});
test('every world edge and job points to existing parties without duplicate ids',()=>{
 const factions=new Set(BOOK_FACTIONS.map(f=>f.id)), edges=new Set(BOOK_RELATIONSHIPS.map(e=>e.id));
 for(const list of [BOOK_FACTIONS,BOOK_RELATIONSHIPS,BOOK_RELATIONSHIP_JOBS]) assert.equal(new Set(list.map(v=>v.id)).size,list.length);
 for(const e of BOOK_RELATIONSHIPS){assert.ok(factions.has(e.a)); assert.ok(factions.has(e.b));assert.notEqual(e.a,e.b);}
 for(const j of BOOK_RELATIONSHIP_JOBS){assert.ok(factions.has(j.owner));assert.ok(factions.has(j.peer));assert.ok(edges.has(j.edge));const e=BOOK_RELATIONSHIPS.find(e=>e.id===j.edge);assert.deepEqual(new Set([e.a,e.b]),new Set([j.owner,j.peer]));}
});

test('new world relationships keep their source type through saving and normalization',async()=>{
 const {normalizeRelationshipWeb}=await import('../src/lib/engine/relationship-web.ts');
 const world={id:'new-world',characterId:'organization:асгард',characterName:'Асгард',sourceType:'organization',targetType:'organization',targetId:'organization:новая община',targetName:'Новая община',relation:'обмен',notes:'Новый договор'};
 assert.deepEqual(normalizeRelationshipWeb(JSON.parse(JSON.stringify([world]))),[world]);
 const personal={...world,id:'personal',characterId:'hero',characterName:'Герой'};delete personal.sourceType;
 assert.deepEqual(normalizeRelationshipWeb([personal]),[personal]);
 assert.equal(BOOK_RELATIONSHIPS.length,42);
});
