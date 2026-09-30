export function rollD100(): number {
	return Math.floor(Math.random() * 100) + 1;
}

export function rollDie(sides: number, count = 1): number {
	let sum = 0;
	for (let i = 0; i < count; i++) sum += Math.floor(Math.random() * sides) + 1;
	return sum;
}

export function rollFormula(formula: string): number {
	const m = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/);
	if (!m) return 0;
	const [, count, sides, mod] = m;
	return rollDie(Number(sides), Number(count)) + (mod ? Number(mod) : 0);
}

export type RollResult = 'crit_success' | 'success' | 'fail' | 'crit_fail' | 'double';

export function classifyRoll(roll: number, target: number): RollResult {
	if (roll === 1) return 'crit_success';
	if (roll === 100) return 'crit_fail';
	if (roll % 11 === 0 && roll <= 99 && roll <= target) return 'double';
	return roll <= target ? 'success' : 'fail';
}