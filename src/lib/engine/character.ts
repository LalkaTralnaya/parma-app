import { BASE_CHARACTERISTIC_VALUE, MAX_CHECK_TARGET } from '../rules/characteristics';
import { SKILLS } from '../rules/skills';
import { RACES } from '../rules/races';
import { RESOURCES } from '../rules/resources';
import type { Character } from '../types';
import { ABILITIES, ABILITY_THRESHOLDS, type Ability } from '../rules/abilities';
import { BACKGROUNDS } from '../rules/backgrounds';

/** Модификатор = floor(значение / 6) */
export function getModifier(value: number): number {
	return Math.floor(value / 6);
}

/** Полное значение характеристики: 36 + раса + бонусы уровня */
export interface CondModsInput {
	characteristics?: number;
	skills?: number;
	attacks?: number;
	maxStamina?: number;
}

/** Полное значение характеристики: 36 + раса + бонусы уровня + состояния */
export function getCharacteristicValue(
	char: Character,
	charId: string,
	condMods?: CondModsInput
): number {
	const race = RACES.find((r) => r.id === char.raceId);
	let value = BASE_CHARACTERISTIC_VALUE;

	if (race) {
		if (race.bonus && race.bonus[charId]) {
			value += race.bonus[charId];
		}
		if (race.bonusChoice && char.raceChoice === charId) {
			value += race.bonusChoice.amount;
		}
	}

	value += char.characteristics[charId]?.levelUpBonus ?? 0;

	// Модификатор от состояний (например, Хворь: −5 ко всем характеристикам)
	value += condMods?.characteristics ?? 0;

	return value;
}

/** Значение навыка = мод(parent) + вложения + расовые бонусы + бонусы от умений */
/** Значение навыка = мод(parent) + вложения + расовые бонусы + умения */
export function getSkillTotal(
	char: Character,
	skillId: string,
	condMods?: CondModsInput
): number {
	const skill = SKILLS.find((s) => s.id === skillId);
	if (!skill) return 0;

	const parentValue = getCharacteristicValue(char, skill.parent, condMods);
	let total = getModifier(parentValue);
	total += char.skillPoints[skillId] ?? 0;

	const race = RACES.find((r) => r.id === char.raceId);
	if (race) {
		if (race.skillAffinity && race.skillAffinity[skillId]) {
			total += race.skillAffinity[skillId];
		}
		if (race.variants && char.raceVariantId) {
			const v = race.variants.find((x) => x.id === char.raceVariantId);
			if (v && v.skillBonus === skillId) total += 1;
		}
	}

	total += getAbilityBonusToSkill(char, skillId);

	return total;
}

/** Собрать бонусы от открытых умений к конкретному навыку */
export function getAbilityBonusToSkill(char: Character, skillId: string): number {
	const progressiveGroups: Record<string, number> = {};
	let flatSum = 0;

	for (const s of SKILLS) {
		const charValue = getCharacteristicValue(char, s.parent);
		for (const a of ABILITIES) {
			if (a.skillId !== s.id) continue;
			if (ABILITY_THRESHOLDS[a.tier] > charValue) continue;

			const target = a.bonusTo ?? a.skillId;
			if (target !== skillId) continue;
			if (!a.skillBonus) continue;

			if (a.progressiveGroup) {
				const current = progressiveGroups[a.progressiveGroup] ?? 0;
				progressiveGroups[a.progressiveGroup] = Math.max(current, a.skillBonus);
			} else {
				flatSum += a.skillBonus;
			}
		}
	}

	return flatSum + Object.values(progressiveGroups).reduce((a, b) => a + b, 0);
}

/** Детализация бонусов от умений: откуда что взялось */
export function getSkillBonusDetails(char: Character, skillId: string): Array<{ name: string; value: number }> {
	const details: Array<{ name: string; value: number }> = [];
	const progressiveGroups = new Map<string, { name: string; value: number }>();
	const flat: Array<{ name: string; value: number }> = [];

	for (const s of SKILLS) {
		const charValue = getCharacteristicValue(char, s.parent);
		for (const a of ABILITIES) {
			if (a.skillId !== s.id) continue;
			if (ABILITY_THRESHOLDS[a.tier] > charValue) continue;
			const target = a.bonusTo ?? a.skillId;
			if (target !== skillId) continue;
			if (!a.skillBonus) continue;

			if (a.progressiveGroup) {
				const existing = progressiveGroups.get(a.progressiveGroup);
				if (!existing || a.skillBonus > existing.value) {
					progressiveGroups.set(a.progressiveGroup, { name: a.name, value: a.skillBonus });
				}
			} else {
				flat.push({ name: a.name, value: a.skillBonus });
			}
		}
	}

	details.push(...flat);
	details.push(...progressiveGroups.values());
	return details;
}

/** Целевое число проверки: характеристика + значение навыка, но не более 95 */
/** Целевое число проверки: характеристика + значение навыка + штраф от состояний */
export function getSkillCheckTarget(
	char: Character,
	skillId: string,
	condMods?: CondModsInput
): number {
	const skill = SKILLS.find((s) => s.id === skillId);
	if (!skill) return 0;
	const charValue = getCharacteristicValue(char, skill.parent, condMods);
	const skillTotal = getSkillTotal(char, skillId, condMods);
	const base = charValue + skillTotal;
	const withState = base + (condMods?.skills ?? 0);
	return Math.min(MAX_CHECK_TARGET, Math.max(0, withState));
}

/** Максимум ресурса */
/** Максимум ресурса (с учётом состояний, влияющих на максимум) */
export function getResourceMax(
	char: Character,
	resourceId: string,
	condMods?: CondModsInput
): number {
	const res = RESOURCES.find((r) => r.id === resourceId);
	if (!res) return 0;
	const mod = getModifier(getCharacteristicValue(char, res.parent, condMods));
	const base = res.base + mod * res.baseModMul;
	const levelBonus = (char.resourceRolls[resourceId] ?? []).reduce((a, b) => a + b, 0);

	let total = base + levelBonus;

	// Изнеможение
	if (resourceId === 'stamina' && condMods?.maxStamina) {
		total += condMods.maxStamina;
	}

	// Метка «Долг Живе» — каждая −5 к максимуму Жвч (применяется только к Жвч)
	if (resourceId === 'hp' && char.death?.debtMark) {
		total -= char.death.debtMark * 5;
	}

	return Math.max(0, total);
}


/** Какие умения открыты у персонажа по конкретному навыку */
export function getUnlockedAbilities(char: Character, skillId: string): Ability[] {
	const skill = SKILLS.find((s) => s.id === skillId);
	if (!skill) return [];
	const charValue = getCharacteristicValue(char, skill.parent);
	return ABILITIES.filter(
		(a) => a.skillId === skillId && ABILITY_THRESHOLDS[a.tier] <= charValue
	);
}

/** Какие умения ещё закрыты по конкретному навыку */
export function getLockedAbilities(char: Character, skillId: string): Ability[] {
	const skill = SKILLS.find((s) => s.id === skillId);
	if (!skill) return [];
	const charValue = getCharacteristicValue(char, skill.parent);
	return ABILITIES.filter(
		(a) => a.skillId === skillId && ABILITY_THRESHOLDS[a.tier] > charValue
	);
}

/** Все открытые умения персонажа (по всем навыкам) */
export function getAllUnlockedAbilities(char: Character): Ability[] {
	return SKILLS.flatMap((s) => getUnlockedAbilities(char, s.id));
}