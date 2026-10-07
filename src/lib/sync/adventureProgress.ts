import { supabase } from '$lib/supabase/client';

export interface AdventureProgress {
	adventureSlug: string;
	sceneIds: string[];
	notes: string;
	completedAt: string | null;
}

type ProgressRow = {
	adventure_slug: string;
	scene_ids: string[];
	notes: string;
	completed_at: string | null;
};

async function currentUserId(): Promise<string | null> {
	const { data: { session }, error: sessionError } = await supabase.auth.getSession();
	if (sessionError) throw sessionError;
	if (!session) return null;
	const { data: { user }, error: authError } = await supabase.auth.getUser();
	if (authError) throw authError;
	return user?.id ?? null;
}

function fromRow(row: ProgressRow): AdventureProgress {
	return {
		adventureSlug: row.adventure_slug,
		sceneIds: row.scene_ids ?? [],
		notes: row.notes ?? '',
		completedAt: row.completed_at
	};
}

export async function listAdventureProgress(): Promise<AdventureProgress[]> {
	if (!await currentUserId()) return [];
	const { data, error } = await supabase.from('user_adventure_progress')
		.select('adventure_slug,scene_ids,notes,completed_at');
	if (error) throw error;
	return ((data ?? []) as ProgressRow[]).map(fromRow);
}

export async function getAdventureProgress(slug: string): Promise<AdventureProgress | null> {
	if (!await currentUserId()) return null;
	const { data, error } = await supabase.from('user_adventure_progress')
		.select('adventure_slug,scene_ids,notes,completed_at')
		.eq('adventure_slug', slug).maybeSingle();
	if (error) throw error;
	return data ? fromRow(data as ProgressRow) : null;
}

export async function saveAdventureProgress(progress: AdventureProgress): Promise<AdventureProgress> {
	const userId = await currentUserId();
	if (!userId) throw new Error('Войдите в аккаунт, чтобы сохранить прогресс.');
	const { data, error } = await supabase.from('user_adventure_progress').upsert({
		user_id: userId,
		adventure_slug: progress.adventureSlug,
		scene_ids: [...new Set(progress.sceneIds)],
		notes: progress.notes.slice(0, 5000),
		completed_at: progress.completedAt
	}, { onConflict: 'user_id,adventure_slug' })
		.select('adventure_slug,scene_ids,notes,completed_at')
		.single();
	if (error) throw error;
	return fromRow(data as ProgressRow);
}
