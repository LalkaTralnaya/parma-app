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
 * ЖВЧ: baseHp + Σ(1к6 + мод.Силы) за каждый новый уровень.
 * Атака: hitBonus + growth.
 * Урон: тот же кубик + growth.
 * Броня: не растёт (защита не улучшается от Силы).
 */
export function scaleMonster(base: BaseMonster, targetLevel: number): ScaledMonster {
	const levelsGained = Math.max(0, targetLevel - base.baseLevel);
	const growth = levelsGained;

	// Рост модификаторов — только основная характеристика
	const scaledMods: Record<string, number> = { ...base.baseMods };
	scaledMods[base.primaryStat] = (base.baseMods[base.primaryStat] ?? 0) + growth;

	// ЖВЧ: base + N раз по (1к6 + базовый мод.Силы)
	const hpRolls: number[] = [];
	const primaryBaseMod = base.baseMods[base.primaryStat] ?? 0;
	let hp = base.hp;
	for (let i = 0; i < levelsGained; i++) {
		const roll = rollDie(6);
		hpRolls.push(roll);
		hp += roll + primaryBaseMod;
	}

	// Значение атаки существа = значение используемой характеристики + её модификатор + бонус атаки.
	// Старые hitBonus содержали модификатор характеристики и возможный отдельный бонус.
	const scaledAttacks: MonsterAttack[] = base.attacks.map((a) => {
		const primaryMod = base.baseMods[base.primaryStat] ?? 0;
		const matchingStats = Object.entries(base.baseMods)
			.filter(([, mod]) => mod === a.hitBonus)
			.map(([stat]) => stat as NonNullable<MonsterAttack['attackStat']>);
		const inferredStat = a.attackStat ?? (
			a.hitBonus >= primaryMod || matchingStats.length !== 1 ? base.primaryStat : matchingStats[0]
		);
		const baseStatMod = base.baseMods[inferredStat] ?? primaryMod;
		const attackBonus = a.attackBonus ?? (a.hitBonus - baseStatMod);
		const statMod = scaledMods[inferredStat] ?? baseStatMod;
		const hitBonus = statMod + attackBonus;
		return {
			...a,
			attackStat: inferredStat,
			attackBonus,
			hitBonus,
			hitTarget: statMod * 6 + hitBonus,
			notes: a.notes
				? `${a.notes} (+${growth} к урону)`
				: growth > 0 ? `+${growth} к урону` : undefined
		};
	});

	return {
		base,
		level: targetLevel,
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