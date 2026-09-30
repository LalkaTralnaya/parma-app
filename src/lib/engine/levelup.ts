import { RESOURCES } from '../rules/resources';
import { getCharacteristicValue, getModifier } from './character';
import type { Character } from '../types';

/** Результат броска одного ресурса на уровень */
export interface ResourceLevelRoll {
	resourceId: string;
	resourceName: string;
	resourceShort: string;
	dice: string;        // например "1к6"
	dieResult: number;   // что выпало на кубе
	modValue: number;    // модификатор характеристики
	total: number;       // dieResult + modValue
}

/** Бросаем один куб нужного размера */
function rollDice(dice: string): number {
	const m = dice.match(/^1[кd](\d+)$/i);
	if (!m) return 0;
	const sides = parseInt(m[1], 10);
	return Math.floor(Math.random() * sides) + 1;
}

/** Модификатор характеристики после потенциального бонуса от уровня */
function getModWithBonus(
	char: Character,
	parentId: string,
	levelUpBonusToChar: string | null
): number {
	let value = getCharacteristicValue(char, parentId);
	// Если сейчас раздаём +1 именно этой характеристике — учитываем
	if (levelUpBonusToChar === parentId) value += 1;
	return getModifier(value);
}

/** Бросок роста всех 5 ресурсов.
 *  charStatBonus — какая характеристика получит +1 в этом уровне (для правильного модификатора). */
export function rollResourceGrowth(
	char: Character,
	charStatBonus: string | null
): ResourceLevelRoll[] {
	return RESOURCES.map((res) => {
		const dieResult = rollDice(res.perLevelDice);
		const modValue = getModWithBonus(char, res.parent, charStatBonus);
		return {
			resourceId: res.id,
			resourceName: res.name,
			resourceShort: res.short,
			dice: res.perLevelDice.replace('d', 'к'),
			dieResult,
			modValue,
			total: dieResult + modValue
		};
	});
}

/** Применить левелап: +1 к уровню, +1 к характеристике, записать броски в историю */
export function applyLevelUp(
	char: Character,
	charStatBonus: string,
	rolls: ResourceLevelRoll[]
): Character {
	const updated = JSON.parse(JSON.stringify(char)) as Character;

	// Уровень +1
	updated.level += 1;

	// +1 к характеристике
	if (!updated.characteristics[charStatBonus]) {
		updated.characteristics[charStatBonus] = { levelUpBonus: 0 };
	}
	updated.characteristics[charStatBonus].levelUpBonus += 1;

	// Записать броски в историю
	if (!updated.resourceRolls) updated.resourceRolls = {};
	for (const r of rolls) {
		if (!updated.resourceRolls[r.resourceId]) {
			updated.resourceRolls[r.resourceId] = [];
		}
		updated.resourceRolls[r.resourceId].push(r.total);
	}

	// Текущее значение ресурса тоже поднять, чтобы не «терять» новое
	if (!updated.currentResources) updated.currentResources = {};
	for (const r of rolls) {
		updated.currentResources[r.resourceId] =
			(updated.currentResources[r.resourceId] ?? 0) + r.total;
	}

	return updated;
}