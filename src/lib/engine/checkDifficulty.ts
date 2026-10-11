import type { Character } from '../type';

export function getCheckDifficulty(char: Pick<Character, 'checkDifficulty'>): number {
	return normalizeCheckDifficulty(char.checkDifficulty);
}

export function normalizeCheckDifficulty(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) ? Math.max(-95,Math.min(95,Math.trunc(value))) : 0;
}

export function applyCheckDifficulty(target: number, char: Pick<Character, 'checkDifficulty'>): number {
	return Math.min(95,Math.max(0,target+getCheckDifficulty(char)));
}
