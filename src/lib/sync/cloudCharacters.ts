import type { Character } from '$lib/type';
import { supabase } from '$lib/supabase/client';
import { getCharacterDb, migrateCharacter } from '$lib/db/characters';

type CloudCharacter = {
	character_id: string;
	payload: Character | null;
	client_updated_at: number;
	is_deleted: boolean;
};

type CharacterWrite = CloudCharacter & { user_id: string };

const writeBatchSize = 25;
const syncs = new Map<string, { promise: Promise<void>; pending: boolean }>();

function characterWrite(userId: string, char: Character): CharacterWrite {
	return {
		user_id: userId,
		character_id: char.id,
		payload: char,
		client_updated_at: char.updatedAt,
		is_deleted: false
	};
}

function deletionWrite(userId: string, id: string, timestamp: number): CharacterWrite {
	return {
		user_id: userId, character_id: id, payload: null,
		client_updated_at: timestamp, is_deleted: true
	};
}

async function writeCharacters(rows: CharacterWrite[]): Promise<void> {
	for (let offset = 0; offset < rows.length; offset += writeBatchSize) {
		const batch = rows.slice(offset, offset + writeBatchSize);
		const { error } = await supabase.from('user_characters')
			.upsert(batch.length === 1 ? batch[0] : batch, { onConflict: 'user_id,character_id' });
		if (error) throw error;
	}
}

async function verifiedUserId(): Promise<string | undefined> {
	const { data: { user }, error } = await supabase.auth.getUser();
	if (error) throw error;
	return user?.id;
}

/** Save local edits to the signed-in user's private Supabase table. */
export async function queueCharactersSync(characters: Character[], expectedUserId: string): Promise<void> {
	if (characters.length === 0) return;
	const userId = await verifiedUserId();
	if (!userId || userId !== expectedUserId) return;

	// IndexedDB keeps the last record when a single save contains the same ID twice.
	const writes = new Map(characters.map(char => [char.id, characterWrite(userId, char)]));
	await writeCharacters([...writes.values()]);
}

export async function queueCharacterDeletion(id: string, timestamp: number, expectedUserId: string): Promise<void> {
	const userId = await verifiedUserId();
	if (!userId || userId !== expectedUserId) return;
	await writeCharacters([deletionWrite(userId, id, timestamp)]);
}

/** Reconcile by last edit timestamp, preserving local-only data and cloud tombstones. */
export function syncCharacters(userId: string): Promise<void> {
	const running = syncs.get(userId);
	if (running) {
		running.pending = true;
		return running.promise;
	}

	const state = { pending: false, promise: Promise.resolve() };
	state.promise = (async () => {
		do {
			state.pending = false;
			await reconcileCharacters(userId);
		} while (state.pending);
	})().finally(() => { syncs.delete(userId); });
	syncs.set(userId, state);
	return state.promise;
}

async function reconcileCharacters(userId: string): Promise<void> {
	const verifiedId = await verifiedUserId();
	if (verifiedId !== userId) throw new Error('Сессия аккаунта изменилась. Войдите снова.');
	const db = getCharacterDb(userId);
	const { data, error } = await supabase.from('user_characters')
		.select('character_id,payload,client_updated_at,is_deleted').eq('user_id', userId);
	if (error) throw error;

	const cloud = (data ?? []) as CloudCharacter[];
	const { localById, deletedById, cloudById } = await db.transaction('rw', db.characters, db.deletions, async () => {
		const local = await db.characters.toArray();
		const deletions = await db.deletions.toArray();
		const deletedById = new Map(deletions.map(row => [row.id, row.deletedAt]));
		const localById = new Map(local.map(char => [char.id, char]));
		const cloudById = new Map(cloud.map(row => [row.character_id, row]));

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
			if (!row.payload || deletedAt > row.client_updated_at) continue;
			if (!here || row.client_updated_at > here.updatedAt) {
				const incoming = migrateCharacter(row.payload);
				incoming.updatedAt = row.client_updated_at;
				await db.characters.put(incoming);
				localById.set(incoming.id, incoming);
				if (deletedAt) await db.deletions.delete(row.character_id);
			}
		}
		return { localById, deletedById, cloudById };
	});

	const remoteDeletions: CharacterWrite[] = [];
	for (const [id, deletedAt] of deletedById) {
		const remote = cloudById.get(id);
		if (!remote || (!remote.is_deleted && deletedAt > remote.client_updated_at)) {
			remoteDeletions.push(deletionWrite(userId, id, deletedAt));
		} else if (remote.is_deleted && remote.client_updated_at >= deletedAt) {
			// A newer local deletion can appear while a cloud request is in flight.
			await db.deletions.where('id').equals(id).and(row => row.deletedAt === deletedAt).delete();
		}
	}
	await writeCharacters(remoteDeletions);

	const remoteEdits: CharacterWrite[] = [];
	for (const char of localById.values()) {
		const remote = cloudById.get(char.id);
		if (!deletedById.has(char.id) && (!remote || char.updatedAt > remote.client_updated_at)) {
			remoteEdits.push(characterWrite(userId, migrateCharacter(char)));
		}
	}
	await writeCharacters(remoteEdits);
}
