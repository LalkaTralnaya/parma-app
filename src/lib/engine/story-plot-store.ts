import { ensureRoomSession, roomSupabase } from '$lib/supabase/client';
import { normalizeStoryPlotWeb, type StoryPlotWeb } from './story-plot-web';

function storageError(message: string): Error {
	if (/PGRST|relation .*does not exist|schema cache|could not find/i.test(message)) {
		return new Error('Приватное хранилище сюжета ещё не подключено. Примените миграцию story_plot_web.sql.');
	}
	return new Error(`Не удалось сохранить паутину сюжета: ${message}`);
}

export async function loadStoryPlotWeb(): Promise<StoryPlotWeb> {
	const ownerId = await ensureRoomSession();
	const result = await roomSupabase.from('story_plot_templates').upsert(
		{ owner_id: ownerId, data: { version: 1, nodes: [], edges: [] } },
		{ onConflict: 'owner_id', ignoreDuplicates: true }
	);
	if (result.error) throw storageError(result.error.message);
	const loaded = await roomSupabase.from('story_plot_templates').select('data').eq('owner_id', ownerId).single();
	if (loaded.error) throw storageError(loaded.error.message);
	return normalizeStoryPlotWeb(loaded.data.data);
}

export async function saveStoryPlotWeb(web: StoryPlotWeb): Promise<void> {
	const ownerId = await ensureRoomSession();
	const result = await roomSupabase.from('story_plot_templates')
		.update({ data: normalizeStoryPlotWeb(web), updated_at: new Date().toISOString() })
		.eq('owner_id', ownerId)
		.select('owner_id');
	if (result.error) throw storageError(result.error.message);
	if (!result.data?.length) throw new Error('Не найдено приватное хранилище сюжета. Обновите страницу и повторите.');
}
