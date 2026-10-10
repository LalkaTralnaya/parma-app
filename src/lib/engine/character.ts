import { BASE_CHARACTERISTIC_VALUE, MAX_CHECK_TARGET } from '../rules/characteristics';
import { SKILLS } from '../rules/skills';
import { RACES } from '../rules/races';
import { RESOURCES } from '../rules/resources';
import type { Character } from '$lib/type';
import { ABILITIES, ABILITY_THRESHOLDS, type Ability } from '../rules/abilities';
import { BACKGROUNDS } from '../rules/backgrounds';
import { getDecaySkillModifier } from './decay';

/** Модификатор = floor(значение / 6) */
export function getModifier(value: number): number {
	return Math.floor(value / 6);
}

export interface CondModsInput {
	characteristics?: number;
	skills?: number;
	attacks?: number;
	maxStamina?: number;
}

/** Полное значение характеристики: 36 + раса + бонусы уровня + состояния. */
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

/** Значение навыка = мод(parent) + вложения + расовые бонусы + умения */
export function getSkillTotal(
	char: Character,
	skillId: string,
	condMods?: CondModsInput,
	checkContext?: string
): number {
	const skill = SKILLS.find((s) => s.id === skillId);
	if (!skill) return 0;

	const parentValue = getCharacteristicValue(char, skill.parent, condMods);
	let total = getModifier(parentValue);
	total += char.skillPoints[skillId] ?? 0;
	const background = BACKGROUNDS.find(b => b.id === char.backgroundId);
	const backgroundContext = background?.skillBonusContexts?.[skillId];
	if (!backgroundContext || backgroundContext === checkContext) total += background?.skillBonuses[skillId] ?? 0;

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

	total += getAbilityBonusToSkill(char, skillId, checkContext);

	return total;
}

/** Собрать бонусы от изученных умений к конкретному навыку. */
export function getAbilityBonusToSkill(char: Character, skillId: string, checkContext?: string): number {
	return getSkillBonusDetails(char, skillId, checkContext).reduce((sum, bonus) => sum + bonus.value, 0);
}

/** Детализация бонусов от умений: откуда что взялось */
export function getSkillBonusDetails(char: Character, skillId: string, checkContext?: string): Array<{ name: string; value: number }> {
	const details: Array<{ name: string; value: number }> = [];
	const progressiveGroups = new Map<string, { name: string; value: number }>();
	const flat: Array<{ name: string; value: number }> = [];

	for (const a of ABILITIES) {
		if (!isAbilityLearned(char, a.id)) continue;
		const target = a.bonusTo ?? a.skillId;
		if (target !== skillId) continue;
		if (a.bonusContext && a.bonusContext !== checkContext) continue;
		const bonus = (a.skillBonus ?? 0) + (a.skillBonusPerPoint ?? 0) * (char.skillPoints[a.skillId] ?? 0);
		if (!bonus) continue;

		if (a.progressiveGroup) {
			const existing = progressiveGroups.get(a.progressiveGroup);
			if (!existing || bonus > existing.value) {
				progressiveGroups.set(a.progressiveGroup, { name: a.name, value: bonus });
			}
		} else {
			flat.push({ name: a.name, value: bonus });
		}
	}

	details.push(...flat);
	details.push(...progressiveGroups.values());
	return details;
}

/** Целевое число проверки: характеристика + навык + состояния + Тлен.
 * На 1–4 ОТ штраф Убеждения включается только при targetIsGoodPerson. */
export function getSkillCheckTarget(
	char: Character,
	skillId: string,
	condMods?: CondModsInput,
	checkContext?: string,
	targetIsGoodPerson = false
): number {
	const skill = SKILLS.find((s) => s.id === skillId);
	if (!skill) return 0;
	const charValue = getCharacteristicValue(char, skill.parent, condMods);
	const skillTotal = getSkillTotal(char, skillId, condMods, checkContext);
	const base = charValue + skillTotal;
	const withState = base + (condMods?.skills ?? 0)
		+ getDecaySkillModifier(char.decay?.points ?? 0, skillId, targetIsGoodPerson);
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
	if (resourceId === 'hp') {
		total += isAbilityLearned(char, 'fortitude_strong_body3') ? 20
			: isAbilityLearned(char, 'fortitude_strong_body2') ? 10 : 0;
	}

	// Изнеможение
	if (resourceId === 'stamina' && condMods?.maxStamina) {
		total += condMods.maxStamina;
	}

	// Метка «Долг Живе» — каждая −5 к максимуму ЗДР (применяется только к ЗДР)
	if (resourceId === 'hp' && char.death?.debtMark) {
		total -= char.death.debtMark * 5;
	}

	return Math.max(0, total);
}


/** Какие умения открыты у персонажа по конкретному навыку */
export function isAbilityAvailable(char: Character, abilityId: string): boolean {
	const ability = ABILITIES.find((item) => item.id === abilityId);
	if (!ability) return false;
	const skill = SKILLS.find((item) => item.id === ability.skillId);
	return !!skill && getCharacteristicValue(char, skill.parent) >= ABILITY_THRESHOLDS[ability.tier];
}

/** Изученное умение действует, пока выполнен порог его характеристики. */
export function isAbilityLearned(char: Character, abilityId: string): boolean {
	return (char.abilities ?? []).includes(abilityId) && isAbilityAvailable(char, abilityId);
}

/** Почему умение пока нельзя изучить. Каждое умение стоит одно очко. */
export function getAbilityBlockReason(char: Character, abilityId: string): string | null {
	const ability = ABILITIES.find((item) => item.id === abilityId);
	if (!ability) return 'Умение не найдено';
	if ((char.abilities ?? []).includes(abilityId)) return 'Уже изучено';
	if (!isAbilityAvailable(char, abilityId)) return `Нужна характеристика ${ABILITY_THRESHOLDS[ability.tier]}+`;
	if ((char.abilityPoints ?? 0) < 1) return 'Нет очков умений';
	if (ability.tier === 0) return null;

	const priorTier = ability.tier - 1;
	const previousTierAbilities = ABILITIES.filter((item) => item.skillId === ability.skillId && item.tier === priorTier);
	if (!previousTierAbilities.some((item) => isAbilityLearned(char, item.id))) {
		return `Изучите умение предыдущей ступени навыка`;
	}

	// Продолжения одного умения образуют отдельную ветку дерева.
	let predecessor: Ability | undefined;
	if (ability.progressiveGroup) {
		predecessor = previousTierAbilities.find((item) => item.progressiveGroup === ability.progressiveGroup);
	} else if (/[23]$/.test(ability.id)) {
		const id = ability.id.slice(0, -1) + (ability.id.endsWith('3') ? '2' : '');
		predecessor = previousTierAbilities.find((item) => item.id === id);
	} else if (ability.id.endsWith('_adept')) {
		predecessor = previousTierAbilities.find((item) => item.id === ability.id.replace(/_adept$/, '_apprentice'));
	} else if (ability.id.endsWith('_master')) {
		predecessor = previousTierAbilities.find((item) => item.id === ability.id.replace(/_master$/, '_adept'));
	}
	if (predecessor && !isAbilityLearned(char, predecessor.id)) return `Сначала изучите «${predecessor.name}»`;
	return null;
}

export function learnAbility(char: Character, abilityId: string): Character | null {
	if (getAbilityBlockReason(char, abilityId)) return null;
	return {
		...char,
		abilities: [...(char.abilities ?? []), abilityId],
		abilityPoints: (char.abilityPoints ?? 0) - 1
	};
}

/** Какие умения доступны для изучения по конкретному навыку */
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
