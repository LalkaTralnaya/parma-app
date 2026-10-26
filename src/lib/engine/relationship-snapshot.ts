import {BOOK_FACTIONS,BOOK_RELATIONSHIPS} from '../rules/book-relationships';
import {normalizeRelationshipWeb,relationshipNpcs,type RelationshipLink,type RelationshipNpc} from './relationship-web';

export interface RelationshipSnapshot {version:1;links:RelationshipLink[];npcs:RelationshipNpc[]}
export function normalizeRelationshipSnapshot(value:unknown):RelationshipSnapshot {
 const raw=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
 const links=normalizeRelationshipWeb(Array.isArray(value)?value:raw.links);
 const npcs=new Map<string,RelationshipNpc>();
 if(Array.isArray(raw.npcs))for(const n of raw.npcs){if(n&&typeof n==='object'&&typeof n.id==='string'&&typeof n.name==='string')npcs.set(n.id,{id:n.id,name:n.name,role:typeof n.role==='string'?n.role:'',description:typeof n.description==='string'?n.description:''});}
 for(const n of relationshipNpcs(links))if(!npcs.has(n.id))npcs.set(n.id,n);
 return {version:1,links,npcs:[...npcs.values()]};
}
export function createRelationshipTemplate(legacy:RelationshipLink[]=[],npcs:RelationshipNpc[]=[]):RelationshipSnapshot {
 const factions=new Map(BOOK_FACTIONS.map(n=>[n.id,n]));
 const base:RelationshipLink[]=BOOK_RELATIONSHIPS.map(e=>({id:`book:${e.id}`,characterId:`organization:${factions.get(e.a)!.short.toLocaleLowerCase('ru')}`,characterName:factions.get(e.a)!.short,sourceType:'organization',targetId:`organization:${factions.get(e.b)!.short.toLocaleLowerCase('ru')}`,targetName:factions.get(e.b)!.short,targetType:'organization',relation:`${e.kind} · ${e.label}`,notes:`${e.terms}\nПовод для перемены: ${e.trigger}`}));
 return normalizeRelationshipSnapshot({links:[...new Map([...base,...legacy].map(l=>[l.id,l])).values()],npcs});
}
export function copyRelationshipSnapshot(snapshot:RelationshipSnapshot):RelationshipSnapshot {
 return normalizeRelationshipSnapshot(JSON.parse(JSON.stringify(snapshot)));
}
