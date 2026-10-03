import type { Character } from '$lib/types';

/** Скачать персонажа как JSON-файл */
export function exportCharacterToJson(char: Character): void {
	// Снимаем прокси-обёртку Svelte
	const plain = JSON.parse(JSON.stringify(char));

	const blob = new Blob([JSON.stringify(plain, null, 2)], {
		type: 'application/json'
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	const safeName = (char.name || 'character').replace(/[^\p{L}\p{N}\-_]/gu, '_');
	a.href = url;
	a.download = `${safeName}-${Date.now()}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/** Прочитать персонажа из JSON-файла */
export function importCharacterFromJson(file: File): Promise<Character> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const char = JSON.parse(reader.result as string) as Character;
				if (!char || typeof char !== 'object') {
					throw new Error('Файл не похож на персонажа');
				}
				if (!char.id || !char.name === undefined) {
					throw new Error('В файле нет полей персонажа (id, name)');
				}
				resolve(char);
			} catch (e) {
				reject(e);
			}
		};
		reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
		reader.readAsText(file);
	});
}

/** Скачать всех персонажей сразу (пачка) */
export function exportAllCharactersToJson(chars: Character[]): void {
	const plain = JSON.parse(JSON.stringify(chars));
	const blob = new Blob([JSON.stringify(plain, null, 2)], {
		type: 'application/json'
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `parma-characters-${Date.now()}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}