import type { Character } from '$lib/type';
import { supabase } from '$lib/supabase/client';
import { db, migrateCharacter } from '$lib/db/characters';

type CloudCharacter = {
	character_id: string;
	payload: Character | null;
	client_updated_at: number;
	is_deleted: boolean;
};

let syncing = false;
let pending = false;

/** Save one local edit to the signed-in user's private Supabase table. */
export async function queueCharacterSync(char: Character): Promise<void> {
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return;
	const { error } = await supabase.from('user_characters').upsert({
		user_id: user.id,
		character_id: char.id,
		payload: char,
		client_updated_at: char.updatedAt,
		is_deleted: false
	}, { onConflict: 'user_id,character_id' });
	if (error) console.error('Не удалось сохранить персонажа в облако', error.message);
}

export async function queueCharacterDeletion(id: string, timestamp = Date.now()): Promise<void> {
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return;
	const { error } = await supabase.from('user_characters').upsert({
		user_id: user.id, character_id: id, payload: null,
		client_updated_at: timestamp, is_deleted: true
	}, { onConflict: 'user_id,character_id' });
	if (error) console.error('Не удалось удалить персонажа из облака', error.message);
}

/** Reconcile by last edit timestamp, preserving local-only data and cloud tombstones. */
export async function syncCharacters(): Promise<void> {
	if (syncing) { pending = true; return; }
	syncing = true;
	try {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) return;
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
			if (row.is_deleted) {
				if (here && here.updatedAt <= row.client_updated_at) await db.characters.delete(row.character_id);
				continue;
			}
			if (!row.payload) continue;
			if (!here || row.client_updated_at > here.updatedAt) {
				const incoming = migrateCharacter(row.payload);
				incoming.updatedAt = row.client_updated_at;
				await db.characters.put(incoming);
				localById.set(incoming.id, incoming);
			}
		}
		for (const [id, deletedAt] of deletedById) {
			const remote = cloudById.get(id);
			if (!remote || (!remote.is_deleted && deletedAt > remote.client_updated_at)) await queueCharacterDeletion(id, deletedAt);
			else if (remote.is_deleted && remote.client_updated_at >= deletedAt) await db.deletions.delete(id);
		}
		for (const char of localById.values()) {
			const remote = cloudById.get(char.id);
			if (!deletedById.has(char.id) && (!remote || (!remote.is_deleted && char.updatedAt > remote.client_updated_at))) await queueCharacterSync(char);
		}
	} catch (error) {
		console.error('Ошибка синхронизации персонажей', error);
	} finally {
		syncing = false;
		if (pending) { pending = false; void syncCharacters(); }
	}
}
