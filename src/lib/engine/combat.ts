import { WEAPONS, ARMORS, SHIELDS, type Weapon, type Armor, type Shield, type AttackType, ATTACK_SPEED_BONUS } from '../rules/weapons';
import { getCharacteristicValue, getModifier, getSkillTotal } from './character';
import { SKILLS } from '../rules/skills';
import type { Character } from '$lib/type';

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
	const skill = SKILLS.find((item) => item.id === weapon.skill);
	const skillParentValue = skill ? getCharacteristicValue(char, skill.parent) : charValue;
	const skillModifier = getModifier(skillParentValue);
	const skillValue = char.skillPoints[weapon.skill] ?? 0;
	const skillTotal = getSkillTotal(char, weapon.skill);
	const otherSkillBonuses = skillTotal - skillModifier - skillValue;
	const speedBonus = ATTACK_SPEED_BONUS[attackType];
	const weaponBonus = weapon.attackBonus ?? 0;

	// Атака: значение характеристики + модификатор навыка + вложенное значение навыка (если есть)
	// + скорость и прочие применимые бонусы − Броня цели.
	const target = charValue + skillTotal + speedBonus + weaponBonus - targetArmor;
	const characteristicLabel = weapon.parent === 'strength' ? 'Сила' : 'Ловкость';
	const skillLabel = skill?.name ?? weapon.skill;

	return {
		target,
		parts: [
			{ label: `значение ${characteristicLabel}`, value: charValue },
			{ label: `мод. навыка ${skillLabel}`, value: skillModifier },
			...(skillValue ? [{ label: `значение навыка ${skillLabel}`, value: skillValue }] : []),
			...(otherSkillBonuses ? [{ label: 'расовые бонусы и умения', value: otherSkillBonuses }] : []),
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
	effect?: CombatAttackEffect;
}

export interface CombatAttackEffect {
	table: 'Правь' | 'Явь' | 'Навь';
	roll: number;
	label: string;
	extraDamageRolls?: number[];
	extraDamageFormula?: string;
}

/** Бросить эффект по таблицам Прави/Яви/Нави из боевого раздела книги. */
export function rollCombatAttackEffect(
	outcome: AttackOutcome,
	weaponCategory?: Weapon['category']
): CombatAttackEffect | undefined {
	if (outcome !== 'critical_hit' && outcome !== 'double' && outcome !== 'critical_miss') return undefined;
	const critical = outcome === 'critical_hit';
	const fumble = outcome === 'critical_miss';
	const roll = Math.floor(Math.random() * (fumble || critical ? 12 : 10)) + 1;
	let label = '';
	let extraDamageFormula: string | undefined;
	let extraDamageRolls: number[] | undefined;
	if (critical) {
		if (roll <= 2) { label = 'Сокрушительный удар'; extraDamageFormula = weaponCategory === 'two_handed' ? '1к8' : '1к6'; }
		else if (roll <= 4) label = 'Отсечение конечности';
		else if (roll <= 6) label = 'Слом щита/доспеха';
		else if (roll <= 8) label = 'Руда: кровотечение на 3 раунда';
		else if (roll <= 10) label = 'Оглушение: цель пропускает следующий ход';
		else label = 'Отбрасывание на 2 сажени и падение ничком';
	} else if (!fumble) {
		if (roll <= 2) { label = 'Точный удар'; extraDamageFormula = weaponCategory === 'two_handed' ? '1к6' : '1к4'; }
		else if (roll <= 4) label = 'Выбивание оружия';
		else if (roll <= 6) label = 'Оружие/доспех получает 1 Очко Резонанса';
		else if (roll <= 8) label = 'Стойка: +5 к Броне до конца следующего раунда';
		else label = 'Знамение: −5 к следующей проверке Наблюдательности цели';
	} else {
		if (roll <= 2) label = 'Потеря оружия';
		else if (roll <= 4) label = 'Потеря равновесия: падение ничком';
		else if (roll <= 6) label = 'Застревание оружия: действие на извлечение';
		else if (roll <= 8) label = 'Удар по союзнику: половина обычного урона';
		else if (roll <= 10) label = 'Трещина в оружии: −2 прочности';
		else label = 'Растяжение: Изнеможение на 1 раунд';
	}
	if (extraDamageFormula) {
		const match = extraDamageFormula.match(/^(\d+)[кd](\d+)$/i)!;
		extraDamageRolls = Array.from({ length: Number(match[1]) }, () => Math.floor(Math.random() * Number(match[2])) + 1);
	}
	return { table: critical ? 'Правь' : fumble ? 'Навь' : 'Явь', roll, label, extraDamageFormula, extraDamageRolls };
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
		const effect = rollCombatAttackEffect(outcome, weapon.category);

		let damage: DamageRoll | undefined;
		if (outcome === 'hit' || outcome === 'critical_hit' || outcome === 'double') {
			damage = rollWeaponDamage(char, weapon, attackType, useTwoHands, outcome === 'critical_hit', bonus);
			if (effect?.extraDamageRolls?.length && effect.extraDamageFormula) {
				const [count, sides] = effect.extraDamageFormula.match(/^(\d+)[кd](\d+)$/i)!.slice(1).map(Number);
				const sum = effect.extraDamageRolls.reduce((a, b) => a + b, 0);
				damage.total += sum;
				damage.extraRolls = [
					...(damage.extraRolls ?? []),
					{ label: effect.label, rolls: effect.extraDamageRolls, sum, diceCount: count, diceSides: sides }
				];
			}
		}

		attacks.push({ roll, target, outcome, damage, effect });
	}

	return attacks;
}
