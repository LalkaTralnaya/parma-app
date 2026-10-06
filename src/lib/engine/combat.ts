import { WEAPONS, ARMORS, SHIELDS, type Weapon, type Armor, type Shield, type AttackType, ATTACK_SPEED_BONUS } from '../rules/weapons';
import { getCharacteristicValue, getModifier, getSkillTotal, isAbilityLearned } from './character';
import { SKILLS } from '../rules/skills';
import type { Character } from '$lib/type';

/** Прыть (инициатива): d20 + мод Ловкости */
export function rollInitiative(char: Character, suppliedRoll?: number): { roll: number; mod: number; total: number } {
	const mod = getModifier(getCharacteristicValue(char, 'dexterity'));
	const roll = suppliedRoll ?? Math.floor(Math.random() * 20) + 1;
	return { roll, mod, total: roll + mod };
}

/** Полная Броня: мод Ловкости + доспех + щит */
export function getArmorValue(char: Character): { total: number; dexMod: number; armor: number; shield: number } {
	const dexMod = getModifier(getCharacteristicValue(char, 'dexterity'));
	const armor = ARMORS.find((a) => a.id === (char.equipment?.armorId ?? 'none'));
	const shield = SHIELDS.find((s) => s.id === (char.equipment?.shieldId ?? 'none'));
	const armorSkill = armor?.category === 'heavy' ? 'heavy_armor' : 'light_armor';
	const armorTraining = armor?.id !== 'none' && isAbilityLearned(char, `${armorSkill}_base`)
		? Math.min(6, char.skillPoints[armorSkill] ?? 0) : 0;
	const armorRanks = armor?.category === 'heavy'
		? ['heavy_armor_prof', 'heavy_armor_prof2', 'heavy_armor_prof3']
		: ['light_armor_defense', 'light_armor_defense2', 'light_armor_defense3'];
	const armorMastery = armor?.id !== 'none'
		? Math.max(...armorRanks.map((id, index) => isAbilityLearned(char, id) ? (index + 1) * 2 : 0)) : 0;
	const armorBonus = (armor?.armorBonus ?? 0) + armorTraining + armorMastery;
	const shieldTraining = shield && shield.id !== 'none' && isAbilityLearned(char, 'blocking_base')
		? Math.min(6, char.skillPoints.blocking ?? 0) : 0;
	const shieldBearer = Math.max(
		isAbilityLearned(char, 'blocking_shield_bearer') ? 2 : 0,
		isAbilityLearned(char, 'blocking_shield_bearer2') ? 4 : 0,
		isAbilityLearned(char, 'blocking_shield_bearer3') ? 6 : 0
	);
	const shieldBonus = (shield?.armorBonus ?? 0) + (shield?.id !== 'none' ? shieldTraining + shieldBearer : 0);
	return { total: dexMod + armorBonus + shieldBonus, dexMod, armor: armorBonus, shield: shieldBonus };
}

/** Бонусы изученных оружейных умений; улучшения I–III не складываются между собой. */
function getWeaponAbilityBonuses(char: Character, weapon: Weapon, attackType: AttackType): { attack: number; damage: number } {
	const skill = weapon.skill;
	if (!['two_handed', 'one_handed', 'archery'].includes(skill)) return { attack: 0, damage: 0 };
	const baseDamage = isAbilityLearned(char, `${skill}_base`) ? (char.skillPoints[skill] ?? 0) : 0;
	const line = skill === 'two_handed' ? 'barbarian' : skill === 'one_handed' ? 'strong' : 'tension';
	const learnedTier = Math.max(
		isAbilityLearned(char, `${skill}_${line}`) ? 2 : 0,
		isAbilityLearned(char, `${skill}_${line}2`) ? 4 : 0,
		isAbilityLearned(char, `${skill}_${line}3`) ? 6 : 0
	);
	const quick = skill === 'one_handed' && attackType === 'fast' && isAbilityLearned(char, 'one_handed_quick') ? 5 : 0;
	const rapid = skill === 'archery' && isAbilityLearned(char, 'archery_rapid')
		? (attackType === 'fast' ? 5 : attackType === 'normal' ? 10 : 0) : 0;
	return { attack: learnedTier + quick + rapid, damage: baseDamage + learnedTier };
}

export function getAttackCount(char: Character, weapon: Weapon, attackType: AttackType): number {
	if (weapon.skill === 'archery' && isAbilityLearned(char, 'archery_rapid')) {
		return attackType === 'fast' ? 3 : attackType === 'normal' ? 2 : 1;
	}
	return attackType === 'fast' ? 2 : 1;
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
	const abilityBonus = getWeaponAbilityBonuses(char, weapon, attackType).attack;
	const armorPierce = weapon.category === 'two_handed' && weapon.id === 'halberd'
		? Math.min(targetArmor, Math.max(
			isAbilityLearned(char, 'two_handed_crusher') ? 2 : 0,
			isAbilityLearned(char, 'two_handed_crusher2') ? 4 : 0,
			isAbilityLearned(char, 'two_handed_crusher3') ? 6 : 0
		)) : 0;

	// Атака: значение характеристики + модификатор навыка + вложенное значение навыка (если есть)
	// + скорость и прочие применимые бонусы − Броня цели.
	const target = charValue + skillTotal + speedBonus + weaponBonus + abilityBonus - targetArmor + armorPierce;
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
			...(abilityBonus ? [{ label: 'изученные умения', value: abilityBonus }] : []),
			...(armorPierce ? [{ label: 'пробивание Брони', value: armorPierce }] : []),
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
	abilityBonus: number;
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
	bonus: BonusDice[] = [],
	die: (sides: number) => number = (sides) => Math.floor(Math.random() * sides) + 1
): DamageRoll {
	const damageStr = useTwoHands && weapon.damageTwoHands
		? weapon.damageTwoHands
		: weapon.damageOneHand;

	const parsed = parseDamageDice(damageStr);

	let extraDice = attackType === 'strong' ? 1 : 0;

	const totalDice = parsed.count + extraDice;
	const rolls: number[] = [];
	for (let i = 0; i < totalDice; i++) {
		rolls.push(criticalSuccess ? parsed.sides : die(parsed.sides));
	}

	const effectiveRolls = criticalSuccess ? rolls.map(() => parsed.sides) : rolls;
	const sum = effectiveRolls.reduce((a, b) => a + b, 0);

	const bonusRolls: DamageRoll['extraRolls'] = [];
	let bonusSum = 0;
	for (const b of bonus) {
		const rollsB: number[] = [];
		for (let i = 0; i < b.count; i++) {
			rollsB.push(criticalSuccess ? b.sides : die(b.sides));
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
	const extraMod = weapon.skill === 'archery'
		? (isAbilityLearned(char, 'archery_steady_hand2') ? 2 : isAbilityLearned(char, 'archery_steady_hand') ? 1 : 0)
		: weapon.skill === 'two_handed' && attackType === 'strong' && isAbilityLearned(char, 'two_handed_crushing') ? 1 : 0;
	const abilityDamage = getWeaponAbilityBonuses(char, weapon, attackType).damage + extraMod * charMod;

	return {
		total: sum + bonusSum + charMod + abilityDamage,
		rolls: effectiveRolls,
		diceCount: totalDice,
		diceSides: parsed.sides,
		modValue: charMod,
		abilityBonus: abilityDamage,
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
	weaponCategory?: Weapon['category'],
	die: (sides: number) => number = (sides) => Math.floor(Math.random() * sides) + 1
): CombatAttackEffect | undefined {
	if (outcome !== 'critical_hit' && outcome !== 'double' && outcome !== 'critical_miss') return undefined;
	const critical = outcome === 'critical_hit';
	const fumble = outcome === 'critical_miss';
	const roll = die(fumble || critical ? 12 : 10);
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
		extraDamageRolls = Array.from({ length: Number(match[1]) }, () => die(Number(match[2])));
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
	bonus: BonusDice[] = [],
	die: (sides: number) => number = (sides) => Math.floor(Math.random() * sides) + 1
): SingleAttackRoll[] {
	const { target } = getAttackTarget(char, weapon, attackType, targetArmor, useTwoHands);
	const attacks: SingleAttackRoll[] = [];
	const attackCount = getAttackCount(char, weapon, attackType);

	for (let i = 0; i < attackCount; i++) {
		const roll = die(100);
		const outcome = classifyAttack(roll, target);
		const effect = rollCombatAttackEffect(outcome, weapon.category, die);

		let damage: DamageRoll | undefined;
		if (outcome === 'hit' || outcome === 'critical_hit' || outcome === 'double') {
			damage = rollWeaponDamage(char, weapon, attackType, useTwoHands, outcome === 'critical_hit', bonus, die);
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
