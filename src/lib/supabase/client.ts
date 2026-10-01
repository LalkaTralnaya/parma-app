import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
	throw new Error('Не заданы PUBLIC_SUPABASE_URL или PUBLIC_SUPABASE_ANON_KEY в .env');
}

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
	realtime: {
		params: {
			eventsPerSecond: 10
		}
	}
});

/**
 * Уникальный идентификатор устройства.
 * Хранится в localStorage. Используется вместо логина в MVP.
 * Если пользователь заходит с телефона — у него один id, с компа — другой.
 */
export function getDeviceId(): string {
	if (typeof window === 'undefined') return '';
	let id = localStorage.getItem('parma_device_id');
	if (!id) {
		id = crypto.randomUUID();
		localStorage.setItem('parma_device_id', id);
	}
	return id;
}

/**
 * Имя игрока (для отображения в комнате).
 * Тоже хранится локально — можно задать один раз.
 */
export function getPlayerName(): string {
	if (typeof window === 'undefined') return '';
	return localStorage.getItem('parma_player_name') ?? '';
}

export function setPlayerName(name: string): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem('parma_player_name', name);
}