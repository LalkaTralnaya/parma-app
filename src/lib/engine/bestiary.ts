import type { BaseMonster, MonsterAttack } from '../rules/bestiary';

export interface ScaledMonster {
	base: BaseMonster;
	level: number;
	levelsGained: number;
	scaledMods: Record<string, number>;
	scaledHp: number;
	hpRolls: number[];
	scaledArmor: number;
	scaledAttacks: MonsterAttack[];
	primaryModGrowth: number;
}

function rollDie(sides: number): number {
	return Math.floor(Math.random() * sides) + 1;
}

/**
 * Масштабирует монстра под уровень.
 * За каждый уровень: +1 к основному модификатору (= +6 к характеристике).
 * ЖВЧ: baseHp + Σ(1к6 + базовый модификатор характеристики ЖВЧ из стат-блока).
 * Попадание: значение характеристики + её модификатор + отдельный бонус.
 * Урон: кубики + модификатор указанной в атаке характеристики либо фиксированный бонус.
 * Броня: не растёт (защита не улучшается от Силы).
 */
export function scaleMonster(base: BaseMonster, targetLevel: number): ScaledMonster {
	const level = Number.isFinite(targetLevel) ? Math.max(base.baseLevel, Math.trunc(targetLevel)) : base.baseLevel;
	const levelsGained = level - base.baseLevel;
	const growth = levelsGained;

	// Рост модификаторов — только основная характеристика
	const scaledMods: Record<string, number> = { ...base.baseMods };
	scaledMods[base.primaryStat] = (base.baseMods[base.primaryStat] ?? 0) + growth;

	// В книге у большинства ЖВЧ опирается на Силу; у нескольких духов — на Интеллект.
	const hpRolls: number[] = [];
	const hpBaseMod = base.baseMods[base.hpStat ?? 'strength'] ?? 0;
	let hp = base.hp;
	for (let i = 0; i < levelsGained; i++) {
		const roll = rollDie(6);
		hpRolls.push(roll);
		hp += roll + hpBaseMod;
	}

	// Все атаки бестиария явно указывают характеристики для попадания и урона.
	const scaledAttacks: MonsterAttack[] = base.attacks.map((a) => {
		const statMod = scaledMods[a.attackStat] ?? 0;
		const attackBonus = a.attackBonus ?? 0;
		const hitBonus = statMod + attackBonus;
		return {
			...a,
			attackBonus,
			hitBonus,
			hitTarget: statMod * 6 + hitBonus,
			damageModifier: a.damageStat ? (scaledMods[a.damageStat] ?? 0) : (a.damageModifier ?? 0)
		};
	});

	return {
		base,
		level,
		levelsGained,
		scaledMods,
		scaledHp: hp,
		hpRolls,
		scaledArmor: base.armor, // броня не растёт
		scaledAttacks,
		primaryModGrowth: growth
	};
}

/** Средний уровень группы */
export function averageGroupLevel(levels: number[]): number {
	if (levels.length === 0) return 1;
	return Math.round(levels.reduce((a, b) => a + b, 0) / levels.length);
}
