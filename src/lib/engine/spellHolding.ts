import type { Character, HeldSpell } from '$lib/type';
import { SPELLS, type Spell } from '../rules/spells';
import { getResourceMax } from './character';
import { rollSpellEffect, type SpellEffectRoll, type SpellOutcome } from './spells';

export function canHoldSpell(spell: Spell): boolean {
	return spell.holdCost !== undefined && spell.holdCost >= 0;
}

export function startSpellHolding(char: Character, spell: Spell, outcome: SpellOutcome, options: Omit<HeldSpell, 'spellId' | 'round'>): Character {
	if (!canHoldSpell(spell) || (outcome !== 'success' && outcome !== 'critical_success')) return char;
	return { ...char, heldSpell: { ...options, spellId: spell.id, round: 1 } };
}

export function getHeldSpell(char: Character): Spell | undefined {
	return SPELLS.find((spell) => spell.id === char.heldSpell?.spellId && canHoldSpell(spell));
}

/** Удержание оплачивается Живой по holdCost, независимо от ресурса сотворения. */
export function advanceSpellHolding(char: Character): { character: Character; cost: number; round: number; ended: boolean; reason?: string } {
	const held = char.heldSpell;
	const spell = getHeldSpell(char);
	if (!held || !spell) return { character: { ...char, heldSpell: null }, cost: 0, round: 0, ended: true, reason: 'Нет удерживаемого заклинания.' };
	if (spell.holdRounds && held.round >= spell.holdRounds) return { character: { ...char, heldSpell: null }, cost: 0, round: held.round, ended: true, reason: 'Длительность заклинания истекла.' };
	const cost = spell.holdCost ?? 0;
	const current = char.currentResources?.mana ?? getResourceMax(char, 'mana');
	if (current < cost) return { character: { ...char, heldSpell: null }, cost: 0, round: held.round, ended: true, reason: 'Не хватает Живы. Удержание прекращено.' };
	const round = held.round + 1;
	const ended = Boolean(spell.holdRounds && round >= spell.holdRounds);
	return {
		character: { ...char, currentResources: { ...char.currentResources, mana: current - cost }, heldSpell: ended ? null : { ...held, round } },
		cost, round, ended
	};
}

export function rollHeldSpellEffect(char: Character, spell: Spell, held: HeldSpell, die: (sides: number) => number = (sides) => Math.floor(Math.random() * sides) + 1): SpellEffectRoll | null {
	// Урон удержания указан отдельно: он не повторяет урон первоначального сотворения.
	if (spell.holdDamage) {
		const match = spell.holdDamage.match(/(\d+)[кd](\d+)/i);
		if (!match) return null;
		const diceCount = Number(match[1]), diceSides = Number(match[2]);
		const rolls = Array.from({ length: diceCount }, () => die(diceSides));
		return { total: rolls.reduce((a, b) => a + b, 0), rolls, diceCount, diceSides, modValue: 0, modId: null, typeLabel: 'Урон удержания', extraDice: 0, abilityBonus: 0 };
	}
	if (spell.holdEffect) return rollSpellEffect(char, { ...spell, damage: undefined, effect: spell.holdEffect }, held.useTwoHands, held.useGrace, die);
	return null;
}
