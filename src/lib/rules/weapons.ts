import { EQUIPMENT_WEAPONS, EQUIPMENT_ARMORS, EQUIPMENT_SHIELDS, mergeEquipment } from './equipment-catalog';

export type DamageType = 'cutting' | 'piercing' | 'crushing';
export type WeaponCategory = 'one_handed' | 'two_handed' | 'ranged';

export interface Weapon {
	ammunition?: 'arrow' | 'bolt' | 'sling';
	noFastAttack?: boolean;
	id: string;
	durability?: number;
	name: string;
	category: WeaponCategory;
	/** Кубик урона одной рукой */
	damageOneHand: string;
	/** Кубик урона двумя руками (для универсальных) */
	damageTwoHands?: string;
	damageType: DamageType;
	/** Характеристика, от которой считается атака и урон */
	parent: 'strength' | 'dexterity';
	/** Навык владения */
	skill: string;
	/** Модификатор к атаке (некоторые виды оружия дают +1) */
	attackBonus?: number;
	description?: string;
}

const LEGACY_WEAPONS: Weapon[] = [
	{ id: 'throwing_knives', name: 'Метательные ножи', category: 'one_handed', damageOneHand: '1d4', damageType: 'piercing', parent: 'strength', skill: 'one_handed' },
	{ id: 'hunting_knife', name: 'Охотничий нож', category: 'one_handed', damageOneHand: '1d4', damageType: 'piercing', parent: 'strength', skill: 'one_handed' },
	{ id: 'smith_hammer', name: 'Кузнечный молот', category: 'one_handed', damageOneHand: '1d6', damageType: 'crushing', parent: 'strength', skill: 'one_handed' },
	{ id: 'staff', name: 'Крепкий посох', category: 'two_handed', damageOneHand: '1d8', damageType: 'crushing', parent: 'strength', skill: 'two_handed' },
	{ id: 'ritual_dagger', name: 'Ритуальный нож', category: 'one_handed', damageOneHand: '1d4', damageType: 'piercing', parent: 'strength', skill: 'one_handed' },
	{ id: 'cane_dagger', name: 'Трость-кинжал', category: 'one_handed', damageOneHand: '1d4', damageType: 'piercing', parent: 'strength', skill: 'one_handed' },
	// ─── Одноручное ───
	{
		id: 'dagger', name: 'Кинжал', category: 'one_handed',
		damageOneHand: '1d4', damageType: 'piercing',
		parent: 'strength', skill: 'one_handed',
		description: 'Лёгкое. Можно нанести два удара за действие без штрафов.'
	},
	{
		id: 'short_sword', name: 'Короткий меч', category: 'one_handed',
		damageOneHand: '1d6', damageType: 'cutting',
		parent: 'strength', skill: 'one_handed',
		description: 'Быстрые атаки могут снизить Броню цели на 1 (до −5).'
	},
	{
		id: 'bastard_sword', name: 'Полуторный меч', category: 'one_handed',
		damageOneHand: '1d6', damageTwoHands: '1d8', damageType: 'cutting',
		parent: 'strength', skill: 'one_handed',
		description: 'Можно перехватить двумя руками для большего урона.'
	},
	{
		id: 'battle_axe', name: 'Боевой топор', category: 'one_handed',
		damageOneHand: '1d6', damageTwoHands: '1d8', damageType: 'cutting',
		parent: 'strength', skill: 'one_handed',
		description: 'Сильная атака может сломать щит противника.'
	},
	{
		id: 'war_hammer', name: 'Боевой молот', category: 'one_handed',
		damageOneHand: '1d6', damageTwoHands: '1d8', damageType: 'crushing',
		parent: 'strength', skill: 'one_handed',
		description: 'Сильная атака повреждает тяжёлый доспех.'
	},

	// ─── Двуручное ───
	{
		id: 'greatsword', name: 'Двуручный меч', category: 'two_handed',
		damageOneHand: '1d10', damageType: 'cutting',
		parent: 'strength', skill: 'two_handed',
		description: 'Сильная атака может отсечь конечность.'
	},
	{
		id: 'halberd', name: 'Алебарда', category: 'two_handed',
		damageOneHand: '1d12', damageType: 'cutting',
		parent: 'strength', skill: 'two_handed',
		description: 'Сильная атака может сломать щит. Подсечка (Избавление Силы).'
	},

	// ─── Стрелковое ───
	{
		id: 'short_bow', name: 'Короткий лук', category: 'ranged',
		damageOneHand: '1d6', damageType: 'piercing',
		parent: 'dexterity', skill: 'archery',
		description: 'Мобильный, можно использовать верхом.'
	},
	{
		id: 'long_bow', name: 'Длинный лук', category: 'ranged',
		damageOneHand: '1d8', damageType: 'piercing',
		parent: 'dexterity', skill: 'archery',
		description: 'Требуется Сила 42+ для полного эффекта.'
	}
];

// ─── Доспехи ───
export interface Armor {
	itemId?: string;
	stealthPenalty?: number;
	id: string;
	durability?: number;
	name: string;
	armorBonus: number;
	category: 'light' | 'heavy';
	skill: string;
	description?: string;
}

const LEGACY_ARMORS: Armor[] = [
	{ id: 'none', name: '— нет —', armorBonus: 0, category: 'light', skill: '' },
	{ id: 'light_armor', name: 'Лёгкий доспех (кожаный)', armorBonus: 5, category: 'light', skill: 'light_armor' },
	{ id: 'heavy_armor', name: 'Тяжёлый доспех (кольчуга)', armorBonus: 10, category: 'heavy', skill: 'heavy_armor' }
];

export interface Shield {
	description?: string;
	id: string;
	durability?: number;
	name: string;
	armorBonus: number;
	skill: string;
}

const LEGACY_SHIELDS: Shield[] = [
	{ id: 'none', name: '— нет —', armorBonus: 0, skill: '' },
	{ id: 'wooden_shield', name: 'Деревянный щит', armorBonus: 5, skill: 'blocking' }
];

export const WEAPONS = mergeEquipment(LEGACY_WEAPONS, EQUIPMENT_WEAPONS);
export const ARMORS = mergeEquipment(LEGACY_ARMORS, EQUIPMENT_ARMORS);
export const SHIELDS = mergeEquipment(LEGACY_SHIELDS, EQUIPMENT_SHIELDS);

export type AttackType = 'normal' | 'strong' | 'fast';

export const ATTACK_SPEED_BONUS: Record<AttackType, number> = {
	normal: 0,
	strong: 10,
	fast: -5
};

export const ATTACK_TYPE_LABEL: Record<AttackType, string> = {
	normal: 'Обычная',
	strong: 'Силовая (+10 к атаке, +1 куб урона)',
	fast: 'Быстрая (−5 к атаке, два удара)'
};

export const DAMAGE_TYPE_LABEL: Record<DamageType, string> = {
	cutting: 'режущий',
	piercing: 'колющий',
	crushing: 'дробящий'
};