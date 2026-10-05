import type { Character } from '$lib/type';
import { migrateCharacter } from '$lib/db/characters';

function downloadJson(value: unknown, filename: string): void {
	const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	// Some browsers start the download after the click handler returns.
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Скачать персонажа как JSON-файл */
export function exportCharacterToJson(char: Character): void {
	const safeName = (char.name || 'character').replace(/[^\p{L}\p{N}\-_]/gu, '_');
	downloadJson(JSON.parse(JSON.stringify(char)), `${safeName}-${Date.now()}.json`);
}

/** Скачать резервную копию всех персонажей одним JSON-файлом */
export function exportAllCharactersToJson(chars: Character[]): void {
	downloadJson(JSON.parse(JSON.stringify(chars)), `parma-characters-${Date.now()}.json`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumberRecord(value: unknown): boolean {
	return isRecord(value) && Object.values(value).every((item) => typeof item === 'number' && Number.isFinite(item));
}

function validateCharacter(value: unknown): Character {
	if (!isRecord(value)) throw new Error('Файл содержит не объект персонажа');
	if (typeof value.id !== 'string' || !value.id.trim()) throw new Error('У персонажа отсутствует id');
	if (typeof value.name !== 'string') throw new Error('У персонажа отсутствует имя');
	if (typeof value.raceId !== 'string' || typeof value.level !== 'number' || !Number.isFinite(value.level)) {
		throw new Error(`«${value.name || value.id}»: неверная раса или уровень`);
	}
	if (!isRecord(value.characteristics) || !isNumberRecord(value.skillPoints) ||
		!isRecord(value.resourceRolls) || !isNumberRecord(value.currentResources) ||
		!Array.isArray(value.abilities) || !Array.isArray(value.spells) ||
		!isRecord(value.equipment) || !Array.isArray(value.inventory) || !isNumberRecord(value.money)) {
		throw new Error(`«${value.name || value.id}»: файл персонажа повреждён или имеет неподдерживаемый формат`);
	}

	const now = Date.now();
	return migrateCharacter({
		...value,
		createdAt: typeof value.createdAt === 'number' ? value.createdAt : now,
		updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : now
	} as unknown as Character);
}

/** Прочитать одного персонажа или резервную копию с несколькими персонажами */
export async function importCharactersFromJson(file: File): Promise<Character[]> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(await file.text());
	} catch {
		throw new Error('Файл не является корректным JSON');
	}

	const values = Array.isArray(parsed) ? parsed : [parsed];
	if (values.length === 0) throw new Error('В файле нет персонажей');

	const characters = values.map(validateCharacter);
	const ids = new Set<string>();
	for (const character of characters) {
		if (ids.has(character.id)) throw new Error(`В резервной копии повторяется id персонажа «${character.name}»`);
		ids.add(character.id);
	}
	return characters;
}
