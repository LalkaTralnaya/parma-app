import { findCondition, type ConditionDef, type ConditionModifiers } from '../rules/conditions';
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

	const charValue = getCharValue(char, charId);
	const skillBonus = skillId ? getSkillBonus(char, skillId) : 0;

	const charName = getCharShort(charId);
	const skillName = skillId ? getSkillShort(skillId) : '';

	return {
		target: Math.min(95, charValue + skillBonus),
		label: `${charName}${skillBonus > 0 ? ` + ${skillName} ${skillBonus >= 0 ? '+' : ''}${skillBonus}` : ''}`
	};
}

// Небольшие хелперы, чтобы не тянуть тяжёлый engine/character
function getCharValue(char: Character, charId: string): number {
	// 36 + расовый бонус + levelUpBonus
	const base = 36;
	const raceBonus = 0; // упрощённо — реальный расчёт в engine/character
	const levelBonus = char.characteristics[charId]?.levelUpBonus ?? 0;
	return base + raceBonus + levelBonus;
}

function getSkillBonus(char: Character, skillId: string): number {
	return char.skillPoints[skillId] ?? 0;
}

function getCharShort(charId: string): string {
	const map: Record<string, string> = {
		strength: 'СИЛ',
		intelligence: 'ИНТ',
		dexterity: 'ЛОВ',
		eloquence: 'КРА',
		religion: 'РЕЛ'
	};
	return map[charId] ?? charId;
}

function getSkillShort(skillId: string): string {
	// Возвращаем название навыка — грубо, для отображения
	const map: Record<string, string> = {
		fortitude: 'Стойкость',
		blocking: 'Блокирование',
		restoration: 'Восстановление',
		eloquence: 'Красноречие',
		witchcraft: 'Колдовство',
		enchantment: 'Зачарование',
		light_armor: 'Лёгкая броня',
		heavy_armor: 'Тяжёлая броня',
		prayer: 'Молитва'
	};
	return map[skillId] ?? skillId;
}

/** Бросить урон в конце хода от всех DOT-эффектов */
export function rollConditionsDotDamage(char: Character): { total: number; details: string[] } {
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
			const r = Math.floor(Math.random() * sides) + 1;
			rolls.push(r);
			sum += r;
		}
		total += sum;
		details.push(`${def.name}: ${def.dotDamage} = [${rolls.join(', ')}] = ${sum}`);
	}

	return { total, details };
}