import { WEAPONS, ARMORS, SHIELDS, type Weapon, type Armor, type Shield, type AttackType, ATTACK_SPEED_BONUS } from '../rules/weapons';
import { getCharacteristicValue, getModifier, getSkillTotal } from './character';
import type { Character } from '../types';

/** Прыть (инициатива): d20 + мод Ловкости */
export function rollInitiative(char: Character): { roll: number; mod: number; total: number } {
	const mod = getModifier(getCharacteristicValue(char, 'dexterity'));
	const roll = Math.floor(Math.random() * 20) + 1;
	return { roll, mod, total: roll + mod };
}

/** Полная Броня: мод Ловкости + доспех + щит */
export function getArmorValue(char: Character): { total: number; dexMod: number; armor: number; shield: number } {
	const dexMod = getModifier(getCharacteristicValue(char, 'dexterity'));
	const armor = ARMORS.find((a) => a.id === (char.equipment?.armorId ?? 'none'));
	const shield = SHIELDS.find((s) => s.id === (char.equipment?.shieldId ?? 'none'));
	const armorBonus = armor?.armorBonus ?? 0;
	const shieldBonus = shield?.armorBonus ?? 0;
	return { total: dexMod + armorBonus + shieldBonus, dexMod, armor: armorBonus, shield: shieldBonus };
}

/** Взять оружие из экипировки */
export function getEquippedWeapon(char: Character): Weapon | undefined {
	return WEAPONS.find((w) => w.id === (char.equipment?.weaponId ?? ''));
}

export function getEquippedArmor(char: Character): Armor | undefined {
	return ARMORS.find((a) => a.id === (char.equipment?.armorId ?? 'none'));
}

export function getEquippedShield(char: Character): Shield | undefined {
	return SHIELDS.find((s) => s.id === (char.equipment?.shieldId ?? 'none'));
}

/** Целевое число для попадания оружием */
export function getAttackTarget(
	char: Character,
	weapon: Weapon,
	attackType: AttackType,
	targetArmor: number,
	useTwoHands: boolean
): { target: number; parts: { label: string; value: number }[] } {
	const charValue = getCharacteristicValue(char, weapon.parent);
	const charMod = getModifier(charValue);
	const skillTotal = getSkillTotal(char, weapon.skill);
	const speedBonus = ATTACK_SPEED_BONUS[attackType];
	const weaponBonus = weapon.attackBonus ?? 0;

	// Атака = 30 + мод.хар + мод.навыка (как бонус от умений) + скорость + оружие - Броня цели
	// В системе из книги: 30 + мод.хар + бонус скорости - Броня.
	// Но навык тоже даёт бонус к попаданию, поэтому учитываем его.
	const target = 30 + charMod + skillTotal + speedBonus + weaponBonus - targetArmor;

	return {
		target,
		parts: [
			{ label: 'база', value: 30 },,
			{ label: `мод. ${weapon.parent === 'strength' ? 'СИЛ' : 'ЛОВ'}`, value: charMod },
			{ label: `навык ${weapon.skill}`, value: skillTotal },
			{ label: `скорость (${attackType})`, value: speedBonus },
			...(weaponBonus ? [{ label: 'бонус оружия', value: weaponBonus }] : []),
			{ label: 'Броня цели', value: -targetArmor }
		]
	};
}

/** Разбор строки урона "1d6" в кубики */
function parseDamageDice(s: string): { count: number; sides: number } {
	const m = s.match(/^(\d+)[dк](\d+)$/i);
	if (!m) return { count: 1, sides: 4 };
	return { count: parseInt(m[1], 10), sides: parseInt(m[2], 10) };
}

/** Бонусные кубики (например, урон стрел) */
export interface BonusDice {
	label: string;
	count: number;
	sides: number;
}

/** Бросок урона оружием */
export interface DamageRoll {
	total: number;
	rolls: number[];
	diceCount: number;
	diceSides: number;
	modValue: number;
	extraDice: number;
	extraRolls?: {
		label: string;
		rolls: number[];
		sum: number;
		diceCount: number;
		diceSides: number;
	}[];
}

export function rollWeaponDamage(
	char: Character,
	weapon: Weapon,
	attackType: AttackType,
	useTwoHands: boolean,
	criticalSuccess: boolean = false,
	bonus: BonusDice[] = []
): DamageRoll {
	const damageStr = useTwoHands && weapon.damageTwoHands
		? weapon.damageTwoHands
		: weapon.damageOneHand;

	const parsed = parseDamageDice(damageStr);

	let extraDice = attackType === 'strong' ? 1 : 0;

	const totalDice = parsed.count + extraDice;
	const rolls: number[] = [];
	for (let i = 0; i < totalDice; i++) {
		rolls.push(Math.floor(Math.random() * parsed.sides) + 1);
	}

	const effectiveRolls = criticalSuccess ? rolls.map(() => parsed.sides) : rolls;
	const sum = effectiveRolls.reduce((a, b) => a + b, 0);

	const bonusRolls: DamageRoll['extraRolls'] = [];
	let bonusSum = 0;
	for (const b of bonus) {
		const rollsB: number[] = [];
		for (let i = 0; i < b.count; i++) {
			rollsB.push(Math.floor(Math.random() * b.sides) + 1);
		}
		const effective = criticalSuccess ? rollsB.map(() => b.sides) : rollsB;
		const s = effective.reduce((a, b) => a + b, 0);
		bonusRolls!.push({
			label: b.label,
			rolls: effective,
			sum: s,
			diceCount: b.count,
			diceSides: b.sides
		});
		bonusSum += s;
	}

	const charMod = getModifier(getCharacteristicValue(char, weapon.parent));

	return {
		total: sum + bonusSum + charMod,
		rolls: effectiveRolls,
		diceCount: totalDice,
		diceSides: parsed.sides,
		modValue: charMod,
		extraDice,
		extraRolls: bonusRolls.length > 0 ? bonusRolls : undefined
	};
}

/** Результат броска атаки */
export type AttackOutcome = 'hit' | 'miss' | 'critical_hit' | 'critical_miss' | 'double';

export function classifyAttack(roll: number, target: number): AttackOutcome {
	if (roll === 1) return 'critical_hit';
	if (roll === 100) return 'critical_miss';
	if (roll % 11 === 0 && roll <= 99 && roll <= target) return 'double';
	return roll <= target ? 'hit' : 'miss';
}
/** Бросок одной атаки со своим к100 */
export interface SingleAttackRoll {
	roll: number;
	target: number;
	outcome: AttackOutcome;
	damage?: DamageRoll;
}

/** Бросок полной атаки — для быстрой две, для остальных одна */
export function rollAttack(
	char: Character,
	weapon: Weapon,
	attackType: AttackType,
	targetArmor: number,
	useTwoHands: boolean,
	bonus: BonusDice[] = []
): SingleAttackRoll[] {
	const { target } = getAttackTarget(char, weapon, attackType, targetArmor, useTwoHands);
	const attacks: SingleAttackRoll[] = [];
	const attackCount = attackType === 'fast' ? 2 : 1;

	for (let i = 0; i < attackCount; i++) {
		const roll = Math.floor(Math.random() * 100) + 1;
		const outcome = classifyAttack(roll, target);

		let damage: DamageRoll | undefined;
		if (outcome === 'hit' || outcome === 'critical_hit' || outcome === 'double') {
			damage = rollWeaponDamage(char, weapon, attackType, useTwoHands, outcome === 'critical_hit', bonus);
		}

		attacks.push({ roll, target, outcome, damage });
	}

	return attacks;
}