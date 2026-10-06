import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

const PUBLIC_SUPABASE_URL = env.PUBLIC_SUPABASE_URL;
const PUBLIC_SUPABASE_ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY;

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
	throw new Error('Не заданы PUBLIC_SUPABASE_URL или PUBLIC_SUPABASE_ANON_KEY в .env');
}

const supabaseUrl = typeof window === 'undefined'
	? PUBLIC_SUPABASE_URL
	: `${window.location.origin}/api/supabase`;

export const supabase = createClient(supabaseUrl, PUBLIC_SUPABASE_ANON_KEY, {
	auth: {
		storageKey: `sb-${new URL(PUBLIC_SUPABASE_URL).hostname.split('.')[0]}-auth-token`
	},
	global: {
		fetch: (input, init = {}) => {
			const headers = new Headers(typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined);
			new Headers(init.headers).forEach((value, key) => headers.set(key, value));
			if (typeof window !== 'undefined') {
				let deviceId = window.localStorage.getItem('parma_device_id');
				if (!deviceId) {
					deviceId = crypto.randomUUID();
					window.localStorage.setItem('parma_device_id', deviceId);
				}
				headers.set('x-device-id', deviceId);
			}
			return fetch(input, { ...init, headers });
		}
	},
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
