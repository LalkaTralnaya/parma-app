import type { Spell } from '../rules/spells';
import type { CombatParticipant, CombatState } from '../sync/combat';
import { changeCombatParticipantHealth } from '../sync/combat';
import { effectSaveTarget, type CombatEffect } from './combatEffects';

export function spellDamageSaveTarget(target: CombatParticipant, spell: Spell): number | null {
	if (!spell.damageSave) return null;
	const effect: CombatEffect = {
		id: 'spell-damage-save', name: spell.name, sourceId: '', sourceName: '',
		description: '', modifiers: {}, save: spell.damageSave, penalty: 0, roundsLeft: null
	};
	return effectSaveTarget(target, effect);
}

function damageSaveSucceeded(roll: number | null, target: number | null): boolean {
	if (roll === null || target === null) return false;
	if (!Number.isInteger(roll) || roll < 1 || roll > 100) throw new Error('К100 должен быть от 1 до 100.');
	return roll === 1 || (roll !== 100 && roll <= target);
}

export function spellDamageAfterSave(damage: number, roll: number | null, target: number | null): number {
	return damageSaveSucceeded(roll, target) ? Math.floor(damage / 2) : damage;
}

export async function resolveSpellCombatDamage(
	encounter: CombatState,
	spell: Spell,
	total: number,
	targetIds: readonly string[],
	requestSave: (victim: CombatParticipant, target: number) => Promise<number | null>
) {
	let encounterAfter = encounter;
	let damageApplied = 0;
	let drainedHp = 0;

	for (const id of targetIds) {
		const victim = encounterAfter.participants.find(participant => participant.id === id);
		if (!victim) continue;
		const target = spellDamageSaveTarget(victim, spell);
		const roll = target === null ? null : await requestSave(victim, target);
		if (target !== null && roll === null) return null;

		const saved = damageSaveSucceeded(roll, target);
		const damage = saved ? Math.floor(total / 2) : total;
		const lostHealth = Math.min(victim.currentHp, damage);
		damageApplied += lostHealth;
		if (spell.id === 'life_drain' && !saved) drainedHp += lostHealth;
		encounterAfter = changeCombatParticipantHealth(encounterAfter, id, health => health - damage);
	}

	return { encounter: encounterAfter, damageApplied, drainedHp };
}
