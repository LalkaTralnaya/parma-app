import type { Character } from '../type';
import type { CombatParticipant } from '../sync/combat';
import { getResourceMax } from './character';
import { applyItemTreatments } from './itemTreatment';

export function characterCombatHealth(character: Character): number {
	const current = character.currentResources?.hp ?? getResourceMax(character, 'hp');
	return current + (character.tempHp ?? 0);
}

export function changeCharacterHealth(character: Character, delta: number): Character {
	const max = getResourceMax(character, 'hp');
	const current = character.currentResources?.hp ?? max;
	if (delta < 0) {
		const temporary = character.tempHp ?? 0;
		const absorbed = Math.min(temporary, -delta);
		const remaining = -delta - absorbed;
		return {
			...character,
			tempHp: temporary - absorbed,
			...(remaining > 0 ? { currentResources: { ...character.currentResources, hp: Math.max(0, current - remaining) } } : {})
		};
	}
	return { ...character, currentResources: { ...character.currentResources, hp: Math.min(max, current + delta) } };
}

export function reconcileCharacterCombat(
	character: Character,
	participant: CombatParticipant,
	active: boolean,
	previousHealth: number | null
) {
	const treated = applyItemTreatments(character, participant);
	const observedHealth = participant.currentHp;
	if (!active) return { character: treated, observedHealth: previousHealth, correction: null };
	if (previousHealth === null || previousHealth === observedHealth) {
		return { character: treated, observedHealth, correction: null };
	}

	const delta = observedHealth - previousHealth;
	const updated = changeCharacterHealth(treated, delta);
	const correctedHealth = characterCombatHealth(updated);
	return {
		character: updated,
		observedHealth,
		correction: delta < 0 && correctedHealth !== observedHealth ? correctedHealth : null
	};
}
