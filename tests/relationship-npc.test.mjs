import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRelationshipWeb,relationshipNpcs,rememberRelationshipNpcs,readRelationshipNpcs,relationshipTargetLabel} from '../src/lib/engine/relationship-web.ts';

const npc={id:'npc:test',name:'Боривой',role:'Староста',description:'Хранит ключ от амбара.'};
const link={id:'tie',characterId:'organization:асгард',characterName:'Асгард',sourceType:'organization',targetId:npc.id,targetName:npc.name,targetType:'npc',targetNpc:npc,relation:'поручительство',notes:'Знаком героям'};
test('NPC role and description survive the room link round trip and node identity is reused',()=>{
 const restored=normalizeRelationshipWeb(JSON.parse(JSON.stringify([link,{...link,id:'tie2',characterId:'hero',sourceType:'character'}])));
 assert.deepEqual(restored[0].targetNpc,npc);assert.equal(restored[0].targetType,'npc');
 assert.deepEqual(relationshipNpcs(restored),[npc]);assert.equal(relationshipTargetLabel('npc'),'НИП');
 const reverse=normalizeRelationshipWeb([{...link,sourceType:'npc',characterId:npc.id,characterName:npc.name,sourceNpc:npc,targetType:'organization',targetId:'org',targetName:'Цех'}]);
 assert.deepEqual(reverse[0].sourceNpc,npc);assert.deepEqual(relationshipNpcs(reverse),[npc]);
});
test('remembered NPC remains available after the last relationship is removed',()=>{
 const oldWindow=globalThis.window,oldStorage=globalThis.localStorage;
 const data=new Map();globalThis.window={};globalThis.localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 try{rememberRelationshipNpcs(relationshipNpcs([link]));rememberRelationshipNpcs(relationshipNpcs([]));assert.deepEqual(readRelationshipNpcs(),[npc]);rememberRelationshipNpcs([{...npc,role:'Староста Кривцов'}]);assert.equal(readRelationshipNpcs().length,1);assert.equal(readRelationshipNpcs()[0].role,'Староста Кривцов');}
 finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage;}
});
