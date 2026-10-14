import type { Adventure } from '../rules/adventures';
import type { Character } from '$lib/type';
import { BESTIARY } from '../rules/bestiary';
import { scaleMonster } from './bestiary';
import { getCurrentParticipant, sortedParticipants, type CombatState, type CombatParticipant } from '../sync/combat';
export const MAP_MAX_BYTES = 5 * 1024 * 1024;
export const MAP_MAX_COUNT = 4;
export interface AdventureEnemy { id:string; monsterId:string; level:number; count:number; sceneId:string; notes:string; }
export interface CustomAdventure { id:string; adventure:Adventure; maps:Array<{id:string;name:string;src:string;bytes:number;caption:string}>; readyCharacters:Character[]; enemies:AdventureEnemy[]; createdAt:number; updatedAt:number; }
export function createCustomAdventure(id=crypto.randomUUID()):CustomAdventure {
 const now=Date.now();return {id,createdAt:now,updatedAt:now,maps:[],readyCharacters:[],enemies:[],adventure:{slug:`custom-${id}`,title:'',label:'Своё приключение',summary:'',region:'',levels:'1–3',players:'3–5',duration:'',tags:[],opening:'',hooks:[],secret:'',map:{src:'/forest.svg',alt:'Карта приключения',caption:'',markers:[]},pacing:[],clues:[],locations:[],npcs:[],scenes:[],handouts:[],encounter:{name:'',bestiaryId:'',advice:''},endings:[],rewards:[]}};
}
export function validateMapFile(file:{size:number;type:string},bytes:Uint8Array) {
 if(file.size<=0 || file.size>MAP_MAX_BYTES)throw new Error('Карта должна быть не больше 5 МБ и не быть пустой.');
 const png=bytes.length>=8 && [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const webp=bytes.length>=12 && String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 if(!(file.type==='image/png'&&png || file.type==='image/jpeg'&&jpeg || file.type==='image/webp'&&webp))throw new Error('Разрешены только изображения PNG, JPEG и WebP.');
}
export function validateCustomAdventure(record:CustomAdventure) {
 if(!record.adventure.title.trim())throw new Error('Введите название приключения.');
 if(record.adventure.title.length>160)throw new Error('Название не должно превышать 160 символов.');
 if(record.maps.length>MAP_MAX_COUNT || record.maps.some(m=>m.bytes>MAP_MAX_BYTES||m.bytes<=0))throw new Error('Разрешено до четырёх карт, каждая не больше 5 МБ.');
 if(record.readyCharacters.length>20)throw new Error('Разрешено до 20 готовых персонажей.');
 if(record.enemies.length>50)throw new Error('Разрешено до 50 групп врагов.');
 const scenes=new Set(record.adventure.scenes.map(s=>s.id));
 for(const enemy of record.enemies){const monster=BESTIARY.find(m=>m.id===enemy.monsterId);if(!monster||!Number.isInteger(enemy.count)||enemy.count<1||enemy.count>30||!Number.isInteger(enemy.level)||enemy.level<monster.baseLevel||enemy.level>Math.max(20,monster.baseLevel))throw new Error('Проверьте вид, уровень и количество врагов (1–30).');if(enemy.sceneId&&!scenes.has(enemy.sceneId))throw new Error('Для группы врагов указана удалённая сцена.');}
 return record;
}
export function freshReadyCharacter(template:Character):Character {
 const copy=JSON.parse(JSON.stringify(template)) as Character;
 copy.id=crypto.randomUUID();copy.createdAt=copy.updatedAt=Date.now();copy.appliedItemTreatments=[];copy.heldSpell=null;
 copy.inventory=(copy.inventory??[]).map(item=>({...item,instanceId:crypto.randomUUID()}));return copy;
}
export function adventureEnemiesToCombat(state:CombatState, groups:AdventureEnemy[]):CombatState {
 const active=getCurrentParticipant(state)?.id;const added:CombatParticipant[]=[];
 for(const group of groups){const base=BESTIARY.find(m=>m.id===group.monsterId);if(!base||!Number.isInteger(group.count)||group.count<1||group.count>30||!Number.isInteger(group.level)||group.level<base.baseLevel||group.level>Math.max(20,base.baseLevel))throw new Error('Неверные параметры группы врагов.');
 for(let i=0;i<group.count;i++){const scaled=scaleMonster(base,group.level),roll=Math.floor(Math.random()*20)+1,mod=scaled.scaledMods.dexterity??0;added.push({id:crypto.randomUUID(),name:`${base.name}${group.count>1?` ${i+1}`:''} (ур. ${scaled.level})`,sourceId:base.id,isPlayer:false,maxHp:scaled.scaledHp,currentHp:scaled.scaledHp,armor:scaled.scaledArmor,initiative:roll+mod,initiativeRoll:roll,initiativeMod:mod,traits:base.traits,notes:group.notes,attacks:scaled.scaledAttacks,statMods:scaled.scaledMods,primaryMod:scaled.scaledMods[base.primaryStat]});}}
 const next={...state,participants:[...state.participants,...added],timestamp:Date.now()};if(active)next.currentTurnIndex=sortedParticipants(next).findIndex(p=>p.id===active);return next;
}
