import { SKILLS } from '../rules/skills';
import {
	SPELLS,
	type Spell,
	getSpellLevelThreshold,
	SCHOOL_STABILITY_THRESHOLDS
} from '../rules/spells';
import { ABILITIES, ABILITY_THRESHOLDS } from '../rules/abilities';
import { MAX_CHECK_TARGET } from '../rules/characteristics';
import { getCharacteristicValue, getSkillTotal } from './character';
import type { Character } from '../types';
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
	return Math.min(MAX_CHECK_TARGET, charValue + skillTotal);
}

/** Уровень владения школой у персонажа (0 — не умеет, 1+ — умеет) */
export function getSpellSkillLevel(char: Character, school: string): number {
	return char.skillPoints[school] ?? 0;
}

/** Стоимость сотворения с учётом умений «Ученик/Адепт/Мастер школы X» */
export function getSpellCost(
	char: Character,
	spell: Spell,
	useTwoHands: boolean
): { base: number; reduced: number; reduction: number; resource: 'mana' | 'grace' } {
	if (spell.costGrace) {
		return { base: spell.costGrace, reduced: spell.costGrace, reduction: 0, resource: 'grace' };
	}

	const base = useTwoHands
		? (spell.costTwoHands ?? spell.costOneHand ?? 0)
		: (spell.costOneHand ?? 0);

	const skill = SKILLS.find((s) => s.id === spell.school);
	if (!skill) return { base, reduced: base, reduction: 0, resource: 'mana' };

	const charValue = getCharacteristicValue(char, skill.parent);

	// Скидки от умений «Ученик/Адепт/Мастер школы»
	const reductions: Array<{ id: string; value: number }> = [
		{ id: `${spell.school}_apprentice`, value: 1 },
		{ id: `${spell.school}_adept`, value: 2 },
		{ id: `${spell.school}_master`, value: 4 }
	];

	let maxReduction = 0;
	for (const r of reductions) {
		const ability = ABILITIES.find((a) => a.id === r.id);
		if (ability && ABILITY_THRESHOLDS[ability.tier] <= charValue) {
			maxReduction = Math.max(maxReduction, r.value);
		}
	}

	let reduced = Math.max(1, base - maxReduction);

	// Нестабильность: если целевое число ниже порога школы — двойная стоимость
	const castTarget = getSpellCastTarget(char, spell.school);
	const stabilityThreshold = SCHOOL_STABILITY_THRESHOLDS[spell.school] ?? 36;
	if (castTarget < stabilityThreshold) {
		reduced = reduced * 2;
	}

	return { base, reduced, reduction: base - reduced, resource: 'mana' };
}


/** Максимальный доступный круг заклинаний в школе (-1, если школы не знаешь) */
/** Уровень персонажа в конкретной школе — максимальный доступный круг заклинаний.
 *  0-й уровень доступен по порогу стабильности, 1+ — по характеристике.
 *  Возвращает -1, если даже 0-й уровень недоступен. */
export function getMaxSpellLevel(char: Character, school: string): number {
	const skill = SKILLS.find((s) => s.id === school);
	if (!skill) return -1;

	const charValue = getCharacteristicValue(char, skill.parent);
	const castTarget = getSpellCastTarget(char, school);
	const stabilityThreshold = SCHOOL_STABILITY_THRESHOLDS[school] ?? 36;

	let maxLevel = -1;
	// 0-й уровень доступен, если целевое число ≥ порог стабильности
	if (castTarget >= stabilityThreshold) maxLevel = 0;

	// 1+ уровни — по характеристике
	for (let level = 1; level <= 4; level++) {
		const threshold = SPELL_LEVEL_THRESHOLDS[level];
		if (charValue >= threshold) maxLevel = level;
	}
	return maxLevel;
}

/** Возвращает все заклинания школы с флагом «доступно/недоступно».
 *  НЕ скрывает школу, если очков вложено 0 — только помечает
 *  заклинания как недоступные, если не пройдены пороги. */
export function getSpellsWithAccess(char: Character, school: string): SpellWithAccess[] {
	const skill = SKILLS.find((s) => s.id === school);
	if (!skill) return [];

	const charValue = getCharacteristicValue(char, skill.parent);
	const castTarget = getSpellCastTarget(char, school);
	const stabilityThreshold = SCHOOL_STABILITY_THRESHOLDS[school] ?? 36;
	const zeroLevelAvailable = castTarget >= stabilityThreshold;

	return SPELLS
		.filter((s) => s.school === school)
		.map((spell) => {
			let available = false;
			if (spell.skillLevel === 0) {
				available = zeroLevelAvailable;
			} else {
				const threshold = SPELL_LEVEL_THRESHOLDS[spell.skillLevel];
				available = charValue >= threshold;
			}
			return { spell, available };
		});
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
	useGrace: boolean
): SpellEffectRoll | null {
	const source = spell.damage ?? spell.effect;
	if (!source) return null;

	const parsed = parseSpellEffect(source, useTwoHands);
	if (!parsed) return null;

	const skill = SKILLS.find((s) => s.id === spell.school);
	let extraDice = 0;

	if (skill) {
		const charValue = getCharacteristicValue(char, skill.parent);

		const doubleId = `${spell.school}_double`;
		const doubleAbility = ABILITIES.find((a) => a.id === doubleId);
		if (doubleAbility && useTwoHands && ABILITY_THRESHOLDS[doubleAbility.tier] <= charValue) {
			extraDice += 1;
		}

		if (spell.school === 'destruction') {
			const typeLabel = parsed.typeLabel.toLowerCase();
			let enhancedId: string | null = null;
			if (typeLabel.includes('огон')) enhancedId = 'destruction_flame';
			else if (typeLabel.includes('холод') || typeLabel.includes('мороз')) enhancedId = 'destruction_frost';
			else if (typeLabel.includes('электр') || typeLabel.includes('молни')) enhancedId = 'destruction_lightning';

			if (enhancedId) {
				const enh = ABILITIES.find((a) => a.id === enhancedId);
				if (enh && ABILITY_THRESHOLDS[enh.tier] <= charValue) {
					extraDice += 1;
				}
			}
		}
	}

	const totalDice = parsed.diceCount + extraDice;
	const rolls: number[] = [];
	for (let i = 0; i < totalDice; i++) {
		rolls.push(Math.floor(Math.random() * parsed.diceSides) + 1);
	}
	const sum = rolls.reduce((a, b) => a + b, 0);

	// Модификатор: если в строке явно указан — берём его.
	// Иначе — по школе и режиму (жива vs благодать).
	const modId = parsed.modId ?? getCastingModId(char, spell.school, useGrace);
	const modValue = Math.floor(getCharacteristicValue(char, modId) / 6);

	return {
		total: sum + modValue,
		rolls,
		diceCount: totalDice,
		diceSides: parsed.diceSides,
		modValue,
		modId,
		typeLabel: parsed.typeLabel,
		extraDice
	};
}