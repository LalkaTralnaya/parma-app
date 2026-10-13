import type { Character } from '$lib/type';

/** Character records are JSON data; detach nested reactive proxies before IndexedDB or cloud writes. */
export function characterSnapshot(character: Character): Character {
	return JSON.parse(JSON.stringify(character)) as Character;
}
