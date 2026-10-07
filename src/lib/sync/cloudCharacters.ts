import type { Character } from '$lib/type';
import { supabase } from '$lib/supabase/client';
import { getCharacterDb, migrateCharacter } from '$lib/db/characters';

type CloudCharacter = {
	character_id: string;
	payload: Character | null;
	client_updated_at: number;
	is_deleted: boolean;
};

let syncPromise: Promise<void> | null = null;
let pending = false;

/** Save one local edit to the signed-in user's private Supabase table. */
export async function queueCharacterSync(char: Character, expectedUserId?: string): Promise<void> {
	const { data: { user } } = await supabase.auth.getUser();
	if (!user || (expectedUserId && user.id !== expectedUserId)) return;
	const { error } = await supabase.from('user_characters').upsert({
		user_id: user.id,
		character_id: char.id,
		payload: char,
		client_updated_at: char.updatedAt,
		is_deleted: false
	}, { onConflict: 'user_id,character_id' });
	if (error) throw error;
}

export async function queueCharacterDeletion(id: string, timestamp = Date.now(), expectedUserId?: string): Promise<void> {
	const { data: { user } } = await supabase.auth.getUser();
	if (!user || (expectedUserId && user.id !== expectedUserId)) return;
	const { error } = await supabase.from('user_characters').upsert({
		user_id: user.id, character_id: id, payload: null,
		client_updated_at: timestamp, is_deleted: true
	}, { onConflict: 'user_id,character_id' });
	if (error) throw error;
}

/** Reconcile by last edit timestamp, preserving local-only data and cloud tombstones. */
export function syncCharacters(): Promise<void> {
	if (syncPromise) { pending = true; return syncPromise; }
	syncPromise = (async () => {
		do {
			pending = false;
			await reconcileCharacters();
		} while (pending);
	})().finally(() => { syncPromise = null; });
	return syncPromise;
}

async function reconcileCharacters(): Promise<void> {
	try {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) return;
		const db = getCharacterDb(user.id);
		const { data, error } = await supabase.from('user_characters').select('character_id,payload,client_updated_at,is_deleted');
		if (error) throw error;
		const cloud = (data ?? []) as CloudCharacter[];
		const local = await db.characters.toArray();
		const deletions = await db.deletions.toArray();
		const deletedById = new Map(deletions.map(row => [row.id, row.deletedAt]));
		const localById = new Map(local.map(c => [c.id, migrateCharacter(c)]));
		const cloudById = new Map(cloud.map(c => [c.character_id, c]));
		for (const row of cloud) {
			const here = localById.get(row.character_id);
			const deletedAt = deletedById.get(row.character_id) ?? 0;
			if (row.is_deleted) {
				if (here && here.updatedAt <= row.client_updated_at) {
					await db.characters.delete(row.character_id);
					localById.delete(row.character_id);
				}
				continue;
			}
			if (!row.payload) continue;
			if (deletedAt > row.client_updated_at) continue;
			if (!here || row.client_updated_at > here.updatedAt) {
				const incoming = migrateCharacter(row.payload);
				incoming.updatedAt = row.client_updated_at;
				await db.characters.put(incoming);
				localById.set(incoming.id, incoming);
				if (deletedAt) await db.deletions.delete(row.character_id);
			}
		}
		for (const [id, deletedAt] of deletedById) {
			const remote = cloudById.get(id);
			if (!remote || (!remote.is_deleted && deletedAt > remote.client_updated_at)) await queueCharacterDeletion(id, deletedAt, user.id);
			else if (remote.is_deleted && remote.client_updated_at >= deletedAt) await db.deletions.delete(id);
		}
		for (const char of localById.values()) {
			const remote = cloudById.get(char.id);
			if (!deletedById.has(char.id) && (!remote || char.updatedAt > remote.client_updated_at)) await queueCharacterSync(char, user.id);
		}
	} catch (error) {
		console.error('Ошибка синхронизации персонажей', error);
		throw error;
	}
}
