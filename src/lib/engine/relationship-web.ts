export type RelationshipTargetType = 'organization' | 'quest' | 'character' | 'npc';

export interface RelationshipNpc { id:string; name:string; role:string; description:string }

function normalizeNpc(value:unknown): RelationshipNpc | undefined {
 if(!value || typeof value!=='object') return;
 const n=value as Partial<RelationshipNpc>;
 if(typeof n.id!=='string'||!n.id||typeof n.name!=='string'||!n.name.trim()) return;
 return {id:n.id,name:n.name.trim(),role:typeof n.role==='string'?n.role:'',description:typeof n.description==='string'?n.description:''};
}
export function relationshipNpcs(links:RelationshipLink[]):RelationshipNpc[] {
 const result=new Map<string,RelationshipNpc>();
 for(const link of links){
  if(link.sourceType==='npc')result.set(link.characterId,link.sourceNpc??{id:link.characterId,name:link.characterName,role:'',description:''});
  if(link.targetType==='npc')result.set(link.targetId,link.targetNpc??{id:link.targetId,name:link.targetName,role:'',description:''});
 }
 return [...result.values()];
}
const NPC_STORAGE_KEY='parma_relationship_npcs';
export function readRelationshipNpcs():RelationshipNpc[]{
 if(typeof window==='undefined')return[];
 try{const list=JSON.parse(localStorage.getItem(NPC_STORAGE_KEY)??'[]');return Array.isArray(list)?list.map(normalizeNpc).filter((n):n is RelationshipNpc=>!!n):[];}catch{return[];}
}
export function rememberRelationshipNpcs(npcs:RelationshipNpc[]):RelationshipNpc[]{
 const remembered=new Map(readRelationshipNpcs().map(n=>[n.id,n]));
 for(const npc of npcs)remembered.set(npc.id,npc);
 const result=[...remembered.values()];
 if(typeof window!=='undefined')try{localStorage.setItem(NPC_STORAGE_KEY,JSON.stringify(result));}catch{/* The NPC card also remains in the saved link. */}
 return result;
}

export interface RelationshipLink {
	id: string;
	characterId: string;
	characterName: string;
	sourceType?: RelationshipTargetType;
	sourceNpc?: RelationshipNpc;
	targetNpc?: RelationshipNpc;
	targetType: RelationshipTargetType;
	targetId: string;
	targetName: string;
	relation: string;
	notes: string;
}

export type RelationshipWeb = RelationshipLink[];
export const RELATIONSHIP_WEB_STORAGE_KEY = 'parma_relationship_web';

const TARGET_TYPES: RelationshipTargetType[] = ['organization', 'quest', 'character', 'npc'];

export function normalizeRelationshipWeb(value: unknown): RelationshipWeb {
	if (!Array.isArray(value)) return [];
	return value.flatMap((entry): RelationshipLink[] => {
		if (!entry || typeof entry !== 'object') return [];
		const link = entry as Partial<RelationshipLink>;
		if (typeof link.characterId !== 'string' || typeof link.targetName !== 'string' || !link.targetName.trim()) return [];
		const targetType = TARGET_TYPES.includes(link.targetType as RelationshipTargetType)
			? link.targetType as RelationshipTargetType
			: 'organization';
		const targetName = link.targetName.trim();
		return [{
			id: typeof link.id === 'string' && link.id ? link.id : crypto.randomUUID(),
			characterId: link.characterId,
			...(link.sourceType && TARGET_TYPES.includes(link.sourceType) ? {sourceType: link.sourceType} : {}),
			characterName: typeof link.characterName === 'string' ? link.characterName : 'Персонаж',
			targetType,
			...(link.sourceType==='npc' && normalizeNpc(link.sourceNpc) ? {sourceNpc:normalizeNpc(link.sourceNpc)} : {}),
			...(targetType==='npc' && normalizeNpc(link.targetNpc) ? {targetNpc:normalizeNpc(link.targetNpc)} : {}),
			targetId: typeof link.targetId === 'string' && link.targetId ? link.targetId : `${targetType}:${targetName.toLocaleLowerCase('ru')}`,
			targetName,
			relation: typeof link.relation === 'string' ? link.relation : '',
			notes: typeof link.notes === 'string' ? link.notes : ''
		}];
	});
}

/** Keep the player's direct links and other characters tied to the same groups or quests. */
export function getPersonalRelationshipWeb(web: RelationshipWeb, characterId: string): RelationshipWeb {
 const direct=web.filter(link=>((link.sourceType??'character')==='character'&&link.characterId===characterId)||(link.targetType==='character'&&link.targetId===characterId));
 const targets=new Set(direct.flatMap(link=>[...(link.targetType!=='character'?[`${link.targetType}:${link.targetId}`]:[]),...(link.sourceType&&link.sourceType!=='character'?[`${link.sourceType}:${link.characterId}`]:[])]));
 return web.filter(link=>direct.includes(link)||targets.has(`${link.targetType}:${link.targetId}`)||targets.has(`${link.sourceType??'character'}:${link.characterId}`));
}

export function relationshipTargetLabel(type: RelationshipTargetType): string {
	return type === 'npc' ? 'НИП' : type === 'quest' ? 'Поручение' : type === 'character' ? 'Персонаж' : 'Организация';
}

export function readLocalRelationshipWeb(): RelationshipWeb {
	if (typeof window === 'undefined') return [];
	try { return normalizeRelationshipWeb(JSON.parse(localStorage.getItem(RELATIONSHIP_WEB_STORAGE_KEY) ?? '[]')); }
	catch { return []; }
}

export function writeLocalRelationshipWeb(web: RelationshipWeb): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(RELATIONSHIP_WEB_STORAGE_KEY, JSON.stringify(web));
		window.dispatchEvent(new CustomEvent('parma-relationship-web', { detail: web }));
	} catch { /* Room state may still be saved remotely. */ }
}
