import { getTreeRankBonus } from './combat';
import { getCheckDifficulty, applyCheckDifficulty } from './checkDifficulty';
import { SKILLS } from '../rules/skills';
import {
	SPELLS,
	type Spell,
	getSpellLevelThreshold,
	SCHOOL_STABILITY_THRESHOLDS
} from '../rules/spells';
import { MAX_CHECK_TARGET } from '../rules/characteristics';
import { getCharacteristicValue, getSkillTotal, isAbilityLearned, getResourceMax } from './character';
import type { Character } from '$lib/type';
/** Пороги характеристик для уровней заклинаний (1 — 42+, 2 — 54+, 3 — 72+, 4 — 84+) */
export const SPELL_LEVEL_THRESHOLDS: Record<number, number> = {
	0: 0,
	1: 42,
	2: 54,
	3: 72,
	4: 84
};

/** Целевое число проверки сотворения: характеристика + значение навыка школы */
export function getSpellCastTarget(char: Character, school: string): number {
	const skill = SKILLS.find((s) => s.id === school);
	if (!skill) return 0;
	const charValue = getCharacteristicValue(char, skill.parent);
	const skillTotal = getSkillTotal(char, school);
	return applyCheckDifficulty(charValue + skillTotal, char);
}

/** Цель магической атаки: значение характеристики + полный итог навыка школы + бонусы. Броня цели не влияет на сотворение. */
export function getSpellAttackTarget(
	char: Character,
	school: string,
	attackBonus = 0,
	spell?: Spell
): number {
	const skill = SKILLS.find((s) => s.id === school);
	if (!skill) return 0;
	const charValue = getCharacteristicValue(char, skill.parent);
	let abilityBonus = spell?.usesNezhiva ? getTreeRankBonus(char,'NV','base',[5,10,15]) : 0;
	if (spell?.school === 'illusion') {
		if (spell.id === 'calm' && isAbilityLearned(char, 'IL.calm')) abilityBonus += 5;
		if (spell.id === 'rage' && isAbilityLearned(char, 'IL.rage')) abilityBonus += 5;
		if (['minor_illusion', 'invisibility'].includes(spell.id) && isAbilityLearned(char, 'IL.people')) abilityBonus += 5;
	}
	return Math.max(0, charValue + getSkillTotal(char, school) + attackBonus + abilityBonus + getCheckDifficulty(char));
}

/** Уровень владения школой у персонажа (0 — не умеет, 1+ — умеет) */
export function getSpellSkillLevel(char: Character, school: string): number {
	return char.skillPoints[school] ?? 0;
}

/** Стоимость сотворения с учётом умений «Ученик/Адепт/Сказитель школы X» */
export function getSpellCost(
	char: Character,
	spell: Spell,
	useTwoHands: boolean
): { base: number; reduced: number; reduction: number; resource: 'mana' | 'grace' | 'hp' } {
	if (spell.costResource==='hp') return {base:spell.costOneHand??0,reduced:spell.costOneHand??0,reduction:0,resource:'hp'};
	if (spell.costGrace) {
		return { base: spell.costGrace, reduced: spell.costGrace, reduction: 0, resource: 'grace' };
	}

	const base = useTwoHands
		? (spell.costTwoHands ?? spell.costOneHand ?? 0)
		: (spell.costOneHand ?? 0);

	const skill = SKILLS.find((s) => s.id === spell.school);
	if (!skill) return { base, reduced: base, reduction: 0, resource: 'mana' };

 const tree = SCHOOL_TREE[spell.school];
 const maxReduction = spell.maintenanceOnly ? 0 : getTreeRankBonus(char,tree ?? '', 'base', [0,1,2,3,4]);
 let reduced=Math.max(1,base-maxReduction);
 if(spell.skillLevel===0 && !isSchoolStable(char,spell.school)) reduced*=2;

	return { base, reduced, reduction: base - reduced, resource: 'mana' };
}


/** Максимальный доступный круг заклинаний в школе (-1, если школы не знаешь) */
/** Уровень персонажа в конкретной школе — максимальный доступный круг заклинаний.
 *  0-й уровень доступен по порогу стабильности, 1+ — по характеристике.
 *  Возвращает -1, если даже 0-й уровень недоступен. */
export const SCHOOL_TREE: Record<string,string> = {destruction:'DE',transmutation:'AL',witchcraft:'CO',illusion:'IL',restoration:'RE'};
export function getMaxSpellLevel(char: Character, school: string): number {
 const tree=SCHOOL_TREE[school];
 if(!tree) return (char.spells??[]).length ? 4 : -1;
 let max=-1;for(let i=1;i<=5;i++) if(isAbilityLearned(char,`${tree}.base${i}`))max=i-1;
 return max;
}
/** Previously known spells and explicit racial gifts keep access; a rank does not teach new spells. */
export function getSpellsWithAccess(char: Character, school: string): SpellWithAccess[] {
 return SPELLS.filter(s=>s.school===school).map(spell=>({spell,available:(char.spells??[]).includes(spell.id) || spell.skillLevel<=getMaxSpellLevel(char,school)}));
}
export function getSpellVersionReason(char: Character, spell: Spell, two: boolean): string | null {
 if(spell.id==='balance' && (char.spellUsesSinceLongRest??[]).includes('balance')) return 'Равновесие уже использовано до продолжительного отдыха.';
 if(spell.requiredAbility && !isAbilityLearned(char,spell.requiredAbility)) return 'Нужно изучить '+spell.requiredAbility;
 if(two && !spell.requiresTwoHands) {
  if(!spell.enhanced) return 'У этого заклинания нет описанной усиленной версии.';
  if(!isAbilityLearned(char,`${SCHOOL_TREE[spell.school]}.dual`)) return 'Нужно двойное сотворение выбранной школы.';
 }
 return null;
}

/** Признак: школа стабильна для персонажа (характеристика ≥ порога стабильности) */
export function isSchoolStable(char: Character, school: string): boolean {
	const skill = SKILLS.find((s) => s.id === school);
	if (!skill) return false;
	const charValue = getCharacteristicValue(char, skill.parent);
	const threshold = SCHOOL_STABILITY_THRESHOLDS[school] ?? 36;
	return charValue >= threshold;
}

/** Заклинания конкретной школы с флагом «доступно/недоступно» */
export interface SpellWithAccess {
	spell: Spell;
	available: boolean;
}

/** Устаревшая функция (оставлена для совместимости) */
export function getAvailableSpells(char: Character, school: string): Spell[] {
	return getSpellsWithAccess(char, school)
		.filter((x) => x.available)
		.map((x) => x.spell);
}

/** Изучено ли заклинание персонажем */
export function isSpellKnown(char: Character, spellId: string): boolean {
	return char.spells.includes(spellId);
}

/** Классификация «провала/успеха» по к100 при сотворении */
export type SpellOutcome = 'critical_success' | 'success' | 'failure' | 'critical_failure';

export function classifySpellRoll(roll: number, target: number): SpellOutcome {
	if (roll === 1) return 'critical_success';
	if (roll === 100) return 'critical_failure';
	return roll <= target ? 'success' : 'failure';
}
/** Парсит строку урона/эффекта типа "1к6 / 2к6 (огонь)" или "1к6 + мод. Инт".
 *  Возвращает: diceCount, diceSides, modId (характеристика или null), typeLabel. */
interface ParsedEffect {
	diceCount: number;
	diceSides: number;
	modId: 'intelligence' | 'strength' | 'dexterity' | 'eloquence' | 'religion' | null;
	typeLabel: string;
}

export function parseSpellEffect(
	effectStr: string,
	useTwoHands: boolean
): ParsedEffect | null {
	if (!effectStr) return null;

	// Выбираем половину до/после "/" в зависимости от рук
	let part = effectStr;
	if (effectStr.includes('/')) {
		const [one, two] = effectStr.split('/').map((x) => x.trim());
		part = useTwoHands ? two : one;
	}

	// Ищем "NкM" — кубики (к или d)
	const diceMatch = part.match(/(\d+)[кd](\d+)/i);
	if (!diceMatch) return null;

	const diceCount = parseInt(diceMatch[1], 10);
	const diceSides = parseInt(diceMatch[2], 10);

	// Ищем модификатор: "мод. Инт", "мод. Силы", "мод. Ловкости" и т.д.
	let modId: ParsedEffect['modId'] = null;
	if (/мод\.\s*Инт/i.test(part)) modId = 'intelligence';
	else if (/мод\.\s*Сил/i.test(part)) modId = 'strength';
	else if (/мод\.\s*Ловк/i.test(part)) modId = 'dexterity';
	else if (/мод\.\s*Красн/i.test(part)) modId = 'eloquence';
	else if (/мод\.\s*Религ/i.test(part)) modId = 'religion';

	// Тип: смотрим на текст в скобках или после кубиков
	let typeLabel = '';
	const typeMatch = part.match(/\(([^)]+)\)/);
	if (typeMatch) typeLabel = typeMatch[1];

	return { diceCount, diceSides, modId, typeLabel };
}

/** Бросок эффекта заклинания. Возвращает:
 *  { total, rolls, diceString, modValue, modifierApplied } */
export interface SpellEffectRoll {
	total: number;
	rolls: number[];
	diceCount: number;
	diceSides: number;
	modValue: number;
	modId: string | null;
	typeLabel: string;
	extraDice: number; // добавленные умениями
	abilityBonus: number; // плоский бонус к урону или лечению
}

/** Какая характеристика даёт мод к эффекту заклинания */
function getCastingModId(
	char: Character,
	school: string,
	useGrace: boolean
): 'intelligence' | 'religion' {
	// Если творим через благодать — всегда мод. Религии
	if (useGrace) return 'religion';
	// Жреческие школы используют мод. Религии
	if (school === 'prayer' || school === 'higher_power') return 'religion';
	// Все магические школы — мод. Интеллекта
	return 'intelligence';
}

export function rollSpellEffect(
	char: Character,
	spell: Spell,
	useTwoHands: boolean,
	useGrace: boolean,
	die: (sides: number) => number = (sides) => Math.floor(Math.random() * sides) + 1
): SpellEffectRoll | null {
	const source = spell.damage ?? spell.effect;
	if (!source) return null;

	const parsed = parseSpellEffect(source, useTwoHands);
	if (!parsed) return null;

 const extraDice = 0; // Version dice already include double casting; elemental perks are flat bonuses.

	const extraDamage = spell.additionalDamage ? parseSpellEffect(spell.additionalDamage,false) : null;
	const totalDice = parsed.diceCount + extraDice + (extraDamage?.diceSides===parsed.diceSides ? extraDamage.diceCount : 0);
	const rolls: number[] = [];
	for (let i = 0; i < totalDice; i++) {
		rolls.push(die(parsed.diceSides));
	}
	let sum = rolls.reduce((a, b) => a + b, 0);


 let abilityBonus=0;
 if(spell.school==='destruction' && spell.damage) {
  const label=parsed.typeLabel.toLowerCase();
  const line=label.includes('огон')?'fire':label.includes('холод')?'frost':label.includes('электр')?'shock':'';
  abilityBonus=(char.skillPoints.destruction??0)+(line?getTreeRankBonus(char,'DE',line,[1,2]):0);
 }
 if(spell.school==='restoration' && ['heal','fast_heal'].includes(spell.id)) abilityBonus=(char.skillPoints.restoration??0)+(isAbilityLearned(char,'RE.regen')?2:0);
 const modId=parsed.modId;
 const modValue=modId ? Math.floor(getCharacteristicValue(char,modId)/6) : 0;

	return {
		total: sum + modValue + abilityBonus,
		rolls,
		diceCount: totalDice,
		diceSides: parsed.diceSides,
		modValue,
		modId,
		typeLabel: parsed.typeLabel,
		extraDice,
		abilityBonus
	};
}

/** Проверка ресурса до броска: критический успех не позволяет начать бесплатное сотворение без ресурсов. */
export function getSpellCastingAvailability(char: Character, spell: Spell, useTwoHands: boolean, useGrace: boolean) {
	const cost = getSpellCost(char, spell, useTwoHands).reduced;
	const resource = spell.costResource==='hp' ? 'hp' : useGrace || spell.costGrace !== undefined ? 'grace' : 'mana';
	const current = char.currentResources?.[resource] ?? getResourceMax(char, resource);
	const versionReason=char.currentResources?.hp===0 && (char.tempHp??0)<=0 ? 'Нельзя сотворять без Здравия и возможности действовать.' : getSpellVersionReason(char,spell,useTwoHands);
	const affordable = current >= cost && !versionReason;
	return { cost, resource, current, affordable, reason: versionReason ?? (affordable ? '' : 'Не хватает ' + (resource === 'grace' ? 'Благодати' : 'Живы') + ': нужно ' + cost + ', доступно ' + current + '.') };
}
