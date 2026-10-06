import { normalizeDecay } from '../engine/decay';
import Dexie, { type Table } from 'dexie';
import type { Character } from '$lib/type';

class ParmaDB extends Dexie {
	characters!: Table<Character, string>;
	deletions!: Table<{ id: string; deletedAt: number }, string>;

	constructor() {
		super('parma');
		this.version(1).stores({
			characters: 'id, name, raceId, createdAt'
		});
		this.version(2).stores({
			characters: 'id, name, raceId, createdAt',
			deletions: 'id, deletedAt'
		});
	}
}

export const db = new ParmaDB();

export async function listCharacters(): Promise<Character[]> {
	return db.characters.orderBy('createdAt').reverse().toArray();
}

export async function getCharacter(id: string): Promise<Character | undefined> {
	const found = await db.characters.get(id);
	if (!found) return undefined;
	return migrateCharacter(found);
}

export async function saveCharacter(char: Character): Promise<void> {
	char.updatedAt = Date.now();
	await db.characters.put(char);
	await db.deletions.delete(char.id);
	void import('$lib/sync/cloudCharacters').then(({ queueCharacterSync }) => queueCharacterSync(char));
}

export async function deleteCharacter(id: string): Promise<void> {
	await db.characters.delete(id);
	const deletedAt = Date.now();
	await db.deletions.put({ id, deletedAt });
	void import('$lib/sync/cloudCharacters').then(({ queueCharacterDeletion }) => queueCharacterDeletion(id, deletedAt));
}

export function createEmptyCharacter(): Character {
	const now = Date.now();
	return {
		id: crypto.randomUUID(),
		name: '',
		raceId: 'human',
		level: 1,
		characteristics: {
			strength:     { levelUpBonus: 0 },
			intelligence: { levelUpBonus: 0 },
			dexterity:    { levelUpBonus: 0 },
			eloquence:    { levelUpBonus: 0 },
			religion:     { levelUpBonus: 0 }
		},
		skillPoints: {},
		resourceRolls: { hp: [], mana: [], stamina: [], influence: [], grace: [] },
		currentResources: { hp: 0, mana: 0, stamina: 0, influence: 0, grace: 0 },
		abilities: [],
		abilityPoints: 0,
		spells: [],
		useGraceForSpells: false,
		equipment: { weaponId: 'dagger', armorId: 'none', shieldId: 'none' },
		inventory: [],
		money: { copper: 0, silver: 0, gold: 0 },
				conditions: [],
		decay: { stage: 0, points: 0 },
		death: {
			usedVoiceOfBlood: false,
			usedCallOfZhiva: false,
			debtMark: 0,
			metkaNavi: false,
			deathCount: 0
		},
		tempHp: 0,
		inspiration: 0,
				bio: {
			appearance: '',
			personalityKey: '',
			personalityText: '',
			idealKey: '',
			idealText: '',
			bondKey: '',
			bondText: '',
			flawKey: '',
			flawText: '',
			backstory: '',
			goals: ''
		},
		createdAt: now,
		updatedAt: now
	};

}
/** Текущее значение ресурса с фоллбэком для старых персонажей без поля */
export function getCurrentResource(char: Character, resourceId: string, max: number): number {
	return char.currentResources?.[resourceId] ?? max;
}

/** Списать ресурс. Возвращает новое значение. */
export function spendResource(char: Character, resourceId: string, amount: number, max: number): number {
	const current = getCurrentResource(char, resourceId, max);
	const next = Math.max(0, current - amount);
	char.currentResources = { ...(char.currentResources ?? {}), [resourceId]: next };
	return next;
}

/** Восстановить ресурс. Возвращает новое значение. */
export function restoreResource(char: Character, resourceId: string, amount: number, max: number): number {
	const current = getCurrentResource(char, resourceId, max);
	const next = Math.min(max, current + amount);
	char.currentResources = { ...(char.currentResources ?? {}), [resourceId]: next };
	return next;
}
export async function toggleGraceMode(char: Character): Promise<void> {
	char.useGraceForSpells = !char.useGraceForSpells;
	char.updatedAt = Date.now();
	const clean = JSON.parse(JSON.stringify(char));
	await db.characters.put(clean);
}
/** Выдать персонажу стартовый набор из предыстории */
export function giveStartingInventory(char: Character, backgroundId: string | undefined): void {
	if (!char.inventory) char.inventory = [];
	if (!char.money) char.money = { copper: 0, silver: 0, gold: 0 };

	const addItem = (itemId: string, qty: number = 1) => {
		char.inventory.push({
			instanceId: crypto.randomUUID(),
			itemId,
			quantity: qty
		});
	};

	// Общий минимум для всех
	addItem('clothes');
	addItem('cloak');
	addItem('boots');
	addItem('bag');
	addItem('mug');
	addItem('bedroll');
	addItem('waterskin');
	addItem('matches');
	addItem('rations', 3);
	addItem('torch', 3);
	addItem('rope');

	// По предыстории
	switch (backgroundId) {
		case 'blacksmith':
			addItem('smithing_kit');
			addItem('smith_hammer');
			addItem('iron_ingot', 5);
			char.money.silver += 15;
			break;
		case 'healer':
			addItem('medical_kit');
			addItem('ritual_dagger');
			addItem('bandage', 5);
			char.money.silver += 10;
			break;
		case 'alchemist':
			addItem('alchemy_kit');
			addItem('throwing_knives', 3);
			addItem('oil_flask', 2);
			char.money.silver += 10;
			break;
		case 'merchant':
			addItem('dagger');
			char.money.silver += 50;
			break;
		case 'hunter':
			addItem('short_bow');
			addItem('arrows', 20);
			addItem('hunting_knife');
			char.money.silver += 20;
			break;
		case 'veteran':
			addItem('short_sword');
			addItem('wooden_shield');
			addItem('light_armor_item');
			char.money.silver += 20;
			break;
		case 'actor':
			addItem('disguise_kit');
			addItem('throwing_knives', 3);
			addItem('wine', 2);
			char.money.silver += 10;
			break;
		case 'novice':
			addItem('staff');
			addItem('ritual_kit');
			char.money.silver += 5;
			break;
		case 'freelancer':
			addItem('long_bow');
			addItem('arrows', 20);
			addItem('dagger');
			char.money.silver += 15;
			break;
		case 'handyman':
			addItem('thieves_tools');
			addItem('dagger');
			char.money.silver += 20;
			break;
		case 'storyteller':
			addItem('cane_dagger');
			addItem('magic_ink');
			char.money.silver += 10;
			break;
		case 'hermit':
			addItem('staff');
			addItem('short_bow');
			addItem('arrows', 10);
			char.money.silver += 5;
			break;
		default:
			// на всякий случай — ничего дополнительно
			break;
	}
}
/** Дополняет старых персонажей новыми полями bio, чтобы избежать ошибок */
export function migrateCharacter(c: Character): Character {
	const bio = c.bio ?? ({} as Character['bio']);

	const conditions: Character['conditions'] = Array.isArray(c.conditions)
		? c.conditions
				.filter((x): x is { id: string; roundsLeft: number | null; source?: string; notes?: string } =>
					Boolean(x && typeof x === 'object' && 'id' in x)
				)
		: [];

	const death = (c as any).death ?? {
		usedVoiceOfBlood: false,
		usedCallOfZhiva: false,
		debtMark: 0,
		metkaNavi: false,
		deathCount: 0
	};

	const tempHp = (c as any).tempHp ?? 0;
	const decay = normalizeDecay((c as any).decay);

	return {
		...c,
		abilities: Array.isArray(c.abilities) ? c.abilities : [],
		abilityPoints: Number.isInteger(c.abilityPoints) && (c.abilityPoints ?? 0) >= 0
			? c.abilityPoints
			: Math.max(0, (Math.max(1, c.level) - 1) * 5 - (Array.isArray(c.abilities) ? c.abilities.length : 0)),
		bio: {
			appearance: bio.appearance ?? '',
			personalityKey: bio.personalityKey ?? '',
			personalityText: bio.personalityText ?? '',
			idealKey: bio.idealKey ?? '',
			idealText: bio.idealText ?? '',
			bondKey: bio.bondKey ?? '',
			bondText: bio.bondText ?? '',
			flawKey: bio.flawKey ?? '',
			flawText: bio.flawText ?? '',
			backstory: bio.backstory ?? '',
			goals: bio.goals ?? ''
		},
		conditions,
		decay,
		death,
		tempHp
	};
}
