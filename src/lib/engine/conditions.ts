import { findCondition, type ConditionDef, type ConditionModifiers } from '../rules/conditions';
import { CHARACTERISTICS } from '../rules/characteristics';
import { SKILLS } from '../rules/skills';
import { getCharacteristicValue, getSkillCheckTarget, isAbilityLearned } from './character';
import type { Character } from '$lib/type';

/** Собрать суммарные модификаторы от всех активных состояний */
export function getConditionModifiers(char: Character): ConditionModifiers {
	const result: ConditionModifiers = {
		characteristics: 0,
		attacks: 0,
		skills: 0,
		saves: 0,
		armor: 0,
		speed: 0,
		maxStamina: 0,
		skipTurn: false,
		canAct: true
	};

	for (const c of char.conditions ?? []) {
		const def = findCondition(c.id);
		if (!def) continue;

		result.characteristics = (result.characteristics ?? 0) + (def.modifiers.characteristics ?? 0);
		result.attacks = (result.attacks ?? 0) + (def.modifiers.attacks ?? 0);
		result.skills = (result.skills ?? 0) + (def.modifiers.skills ?? 0);
		result.saves = (result.saves ?? 0) + (def.modifiers.saves ?? 0);
		result.armor = (result.armor ?? 0) + (def.modifiers.armor ?? 0);
		result.speed = (result.speed ?? 0) + (def.modifiers.speed ?? 0);
		result.maxStamina = (result.maxStamina ?? 0) + (def.modifiers.maxStamina ?? 0);
		if (def.modifiers.skipTurn) result.skipTurn = true;
		if (def.modifiers.canAct === false) result.canAct = false;
	}

	return result;
}

/** Проверка избавления для конкретного состояния.
 *  Возвращает { target, label } для UI. */
export function getConditionSaveTarget(
	char: Character,
	def: ConditionDef,
	useAlternative: boolean
): { target: number; label: string } | null {
	if (!def.save) return null;

	const charId = useAlternative && def.save.charB ? def.save.charB : def.save.charA;
	const skillId = useAlternative && def.save.skillB ? def.save.skillB : def.save.skillA;

	const modifiers = getConditionModifiers(char);
	const charValue = getCharacteristicValue(char, charId, modifiers);
	const baseTarget = skillId ? getSkillCheckTarget(char, skillId, modifiers) : charValue + (modifiers.skills ?? 0);
	const fortitudeBonus = ['poisoned', 'diseased', 'exhausted'].includes(def.id) && charId === 'strength'
		? Math.max(
			isAbilityLearned(char, 'fortitude_strong_body') ? 5 : 0,
			isAbilityLearned(char, 'fortitude_strong_body2') ? 10 : 0,
			isAbilityLearned(char, 'fortitude_strong_body3') ? 15 : 0
		) : 0;
	const target = Math.min(95, Math.max(0, baseTarget + (modifiers.saves ?? 0) + fortitudeBonus));

	const charName = CHARACTERISTICS.find((item) => item.id === charId)?.short ?? charId;
	const skillName = skillId ? SKILLS.find((item) => item.id === skillId)?.name ?? skillId : '';

	return {
		target,
		label: `${charName}${skillId ? ` + ${skillName}` : ''} = ${target}${fortitudeBonus ? ` (+${fortitudeBonus} от умений)` : ''}`
	};
}

/** Бросить урон в конце хода от всех DOT-эффектов */
export function rollConditionsDotDamage(char: Character, die: (sides: number) => number = (sides) => Math.floor(Math.random() * sides) + 1): { total: number; details: string[] } {
	let total = 0;
	const details: string[] = [];

	for (const c of char.conditions ?? []) {
		const def = findCondition(c.id);
		if (!def || !def.dotDamage) continue;

		const m = def.dotDamage.match(/^(\d+)[кd](\d+)$/i);
		if (!m) continue;
		const count = Number(m[1]);
		const sides = Number(m[2]);
		let sum = 0;
		const rolls: number[] = [];
		for (let i = 0; i < count; i++) {
			const r = die(sides);
			rolls.push(r);
			sum += r;
		}
		total += sum;
		details.push(`${def.name}: ${def.dotDamage} = [${rolls.join(', ')}] = ${sum}`);
	}

	return { total, details };
}
