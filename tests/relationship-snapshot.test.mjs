import test from 'node:test';
import assert from 'node:assert/strict';
import {createRelationshipTemplate,copyRelationshipSnapshot,normalizeRelationshipSnapshot} from '../src/lib/engine/relationship-snapshot.ts';

test('one unified template contains the complete book graph and all custom character and NPC links',()=>{
 const npc={id:'npc:one',name:'Староста',role:'Хранитель переправы',description:'Помнит старый договор'};
 const custom={id:'custom',characterId:'hero',characterName:'Герой',targetType:'npc',targetId:npc.id,targetName:npc.name,targetNpc:npc,relation:'доверие',notes:''};
 const template=createRelationshipTemplate([custom],[npc]);
 assert.equal(template.links.length,43);assert.equal(template.links.filter(l=>l.id.startsWith('book:')).length,42);assert.equal(template.links.at(-1).characterName,'Герой');assert.deepEqual(template.npcs,[npc]);
});
test('room copies are independent from the main template and from each other, including nested NPC cards',()=>{
 const npc={id:'npc:one',name:'Староста',role:'Союзник',description:'Сохраняется отдельно от связи'};
 const template=createRelationshipTemplate([],[npc]), first=copyRelationshipSnapshot(template),second=copyRelationshipSnapshot(template);
 first.links[0].notes='Изменилось в первой комнате';first.npcs[0].role='Противник';first.links.pop();
 assert.equal(template.links.length,42);assert.equal(second.links.length,42);assert.notEqual(second.links[0].notes,first.links[0].notes);assert.equal(template.npcs[0].role,'Союзник');
 template.links[1].notes='Основная паутина обновлена';assert.notEqual(template.links[1].notes,second.links[1].notes);
});
test('JSON archive round trip retains room graph and orphan NPCs without injecting a newer book graph',()=>{
 const room=createRelationshipTemplate([],[{id:'npc:orphan',name:'Путник',role:'',description:'Связь удалена, карточка остаётся'}]);room.links=room.links.slice(0,3);
 const archive=JSON.parse(JSON.stringify({format:'parma-room',version:1,relationships:room}));
 assert.deepEqual(normalizeRelationshipSnapshot(archive.relationships),room);assert.equal(archive.relationships.links.length,3);assert.equal(archive.relationships.npcs.length,1);
});
