import { getCheckDifficulty } from './checkDifficulty';
import type { Character } from '../type';
import type { CombatParticipant, CombatState } from '../sync/combat';
import { BASE_CHARACTERISTIC_VALUE } from '../rules/characteristics';
import { CONDITIONS, type ConditionModifiers, type ConditionSave } from '../rules/conditions';
import { BESTIARY } from '../rules/bestiary';
import { getConditionModifiers } from './conditions';
import { getCharacteristicValue, getSkillCheckTarget, isAbilityLearned } from './character';

export interface CombatEffect {
	id: string;
	name: string;
	description: string;
	sourceId: string;
	sourceName: string;
	conditionId?: string;
	modifiers: ConditionModifiers;
	save?: ConditionSave;
	penalty: number;
	roundsLeft: number | null;
}

export function isTargetedSpecial(text: string): boolean {
	return /Избавлен|цель.*(?:схва|опут|Жуть|Морок|Отрав|Ошелом|Оцепен)/i.test(text) && !/^Иммунитет|^Глупость|^Упрямство|^Железная воля/i.test(text);
}

export function effectPreset(text: string) {
	const state = CONDITIONS.find(c => !c.isPositive && new RegExp(c.name.split(' / ')[0], 'i').test(text));
	const saveText = text.match(/(?:Избавление\s+)?(Стойкост[ьи]|Сил[аы]|Ловкост[ьи]|Интеллект[а]?|Религии|Красноречия)/i)?.[1]?.toLowerCase() ?? '';
	const charA = /ловк/.test(saveText) ? 'dexterity' : /интел/.test(saveText) ? 'intelligence' : /религ/.test(saveText) ? 'religion' : /красн/.test(saveText) ? 'eloquence' : 'strength';
	const skillA = /стойк/.test(saveText) ? 'fortitude' : '';
	const penalty = -Number(text.match(/(?:штрафом|СЛ)\s*[−-](\d+)/i)?.[1] ?? 0) || 0;
	const rounds = text.match(/(?:на\s+)?(\d+)\s*раунд/i)?.[1];
	return { conditionId: state?.id ?? '', charA, skillA, penalty, rounds: rounds ? Number(rounds) : state?.defaultRounds ?? null };
}

export function participantCharacter(p: CombatParticipant, live?: Character | null): Character {
	if (live) return live;
	if (p.characterSnapshot) return p.characterSnapshot;
	if (p.isPlayer) throw new Error('Нет данных персонажа для избавления. Добавьте персонажа в бой заново.');
	const base = BESTIARY.find(m => m.id === p.sourceId);
	const mods = p.statMods ?? { ...base?.baseMods, ...(base && p.primaryMod !== undefined ? { [base.primaryStat]:p.primaryMod } : {}) };
	return {
		id:p.id,name:p.name,raceId:'',level:1,
		characteristics:Object.fromEntries(['strength','intelligence','dexterity','eloquence','religion'].map(id => [id,{levelUpBonus:(mods[id] ?? 5)*6-BASE_CHARACTERISTIC_VALUE}])),
		skillPoints:{},abilities:[],conditions:[],decay:{stage:0,points:0},
		resourceRolls:{},currentResources:{hp:p.currentHp},equipment:{},inventory:[],money:{copper:0,silver:0,gold:0},spells:[],useGraceForSpells:false,
        death:{usedVoiceOfBlood:false,usedCallOfZhiva:false,debtMark:0,metkaNavi:false,deathCount:0},tempHp:0,inspiration:0,
        bio:{appearance:"",personalityKey:"",personalityText:"",idealKey:"",idealText:"",bondKey:"",bondText:"",flawKey:"",flawText:"",backstory:"",goals:""},createdAt:0,updatedAt:0
	} as Character;
}

export function combatModifiers(char: Character, p?: CombatParticipant | null): ConditionModifiers {
	const conditions = [...char.conditions];
	for (const e of p?.effects ?? []) if (e.conditionId && !conditions.some(c=>c.id===e.conditionId)) conditions.push({id:e.conditionId,roundsLeft:e.roundsLeft});
	const mods = getConditionModifiers({...char,conditions});
	for (const e of p?.effects ?? []) {
		if (e.conditionId) continue;
		for (const [key,value] of Object.entries(e.modifiers)) {
			if (typeof value === 'number') (mods as Record<string,unknown>)[key] = Number((mods as Record<string,unknown>)[key] ?? 0)+value;
			else if (key==='skipTurn' && value) mods.skipTurn=true;
			else if (key==='canAct' && !value) mods.canAct=false;
		}
	}
	return mods;
}

export function effectSaveTarget(p:CombatParticipant,e:CombatEffect,live?:Character|null,alternative=false):number|null {
	if (!e.save) return null;
	const char = participantCharacter(p,live);
	const mods = combatModifiers(char,p);
	const stat = alternative && e.save.charB ? e.save.charB : e.save.charA;
	const skill = alternative && e.save.charB ? e.save.skillB : e.save.skillA;
	const base = skill ? getSkillCheckTarget(char,skill,mods) : getCharacteristicValue(char,stat,mods)+(mods.skills??0)+getCheckDifficulty(char);
	const bonus = 0; // Fortitude tree bonuses already enter the skill target once.

	return Math.max(0,Math.min(95,base+(mods.saves??0)+e.penalty+bonus));
}

export function effectImmunity(p:CombatParticipant,e:CombatEffect):boolean {
	if(p.isPlayer || !e.conditionId)return false;
	const base=BESTIARY.find(m=>m.id===p.sourceId);
	const condition=CONDITIONS.find(c=>c.id===e.conditionId);
	if(!condition)return false;
	const stems:Record<string,string>={frightened:'жут',poisoned:'отрав',diseased:'хвор',asleep:'сон',magic_sleep:'сон',cursed:'проклят'};
	const stem=stems[condition.id]??condition.name.split(' / ')[0].toLowerCase();
	return [...(base?.immune??[]),...(p.traits??[])].some(t=>/Бездушное упорство/.test(t) || /иммунитет/i.test(t) && t.toLowerCase().includes(stem));
}

export function resolveCombatEffect(state:CombatState,targetId:string,e:CombatEffect,roll:number|null,live?:Character|null) {
	const p=state.participants.find(p=>p.id===targetId);
	if(!p)throw new Error('Цель больше не участвует в бою.');
	const target=effectSaveTarget(p,e,live);
	if(target!==null && (roll===null || !Number.isInteger(roll)||roll<1||roll>100))throw new Error('Нужен результат к100 от 1 до 100.');
	const immune=effectImmunity(p,e);
	const success=immune || target!==null && roll!==null && (roll===1 || roll!==100 && roll<=target);
	return {success,immune,target,state:success ? state : {...state,participants:state.participants.map(p=>p.id===targetId?{...p,effects:[...(p.effects??[]).filter(old=>!(old.name===e.name && old.sourceId===e.sourceId)),e]}:p)}};
}

export function removeCombatEffect(state:CombatState,targetId:string,id:string):CombatState {
	return {...state,participants:state.participants.map(p=>p.id===targetId?{...p,effects:(p.effects??[]).filter(e=>e.id!==id)}:p)};
}

export function attemptCombatEffectSave(state:CombatState,targetId:string,id:string,roll:number,live?:Character|null,alternative=false) {
	const p=state.participants.find(p=>p.id===targetId);
	const e=p?.effects?.find(e=>e.id===id);
	if(!p||!e)throw new Error('Эффект уже снят или цель отсутствует.');
	if(!Number.isInteger(roll)||roll<1||roll>100)throw new Error('Нужен результат к100 от 1 до 100.');
	const target=effectSaveTarget(p,e,live,alternative);
	if(target===null)throw new Error('У эффекта нет проверки избавления.');
	const success=roll===1||roll!==100&&roll<=target;
	return {target,success,state:success?removeCombatEffect(state,targetId,id):state};
}

export function tickCombatEffects(state:CombatState):CombatState {
	return {...state,participants:state.participants.map(p=>({...p,effects:(p.effects??[]).map(e=>e.roundsLeft===null?e:{...e,roundsLeft:e.roundsLeft-1}).filter(e=>e.roundsLeft===null || e.roundsLeft>0)}))};
}
