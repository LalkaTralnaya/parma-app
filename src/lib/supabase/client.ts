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
	realtime: {
		params: {
			eventsPerSecond: 10
		}
	}
});

// Room guests keep an isolated anonymous Auth session so logging in or out of an
// ordinary Parma account cannot silently change room ownership.
export const roomSupabase = createClient(supabaseUrl, PUBLIC_SUPABASE_ANON_KEY, {
	auth: {
		storageKey: `sb-${new URL(PUBLIC_SUPABASE_URL).hostname.split('.')[0]}-room-auth-v2`
	},
	realtime: {
		params: { eventsPerSecond: 10 }
	}
});

let roomSessionPromise: Promise<string> | null = null;
roomSupabase.auth.onAuthStateChange((event) => {
	if (event === 'SIGNED_OUT') roomSessionPromise = null;
});

/** Make guest-room requests with a Supabase Auth identity instead of trusting a client-supplied device ID. */
export function ensureRoomSession(): Promise<string> {
	if (typeof window === 'undefined') return Promise.reject(new Error('Гостевая сессия доступна только в браузере'));
	if (roomSessionPromise) return roomSessionPromise;
	roomSessionPromise = (async () => {
		const { data: current, error: sessionError } = await roomSupabase.auth.getSession();
		if (sessionError) throw new Error(`Не удалось проверить гостевую сессию: ${sessionError.message}`);
		if (current.session?.user) return current.session.user.id;

		const { data, error } = await roomSupabase.auth.signInAnonymously();
		if (error) {
			if (error.code === 'anonymous_provider_disabled') {
				throw new Error('В Supabase ещё не включён анонимный вход. Включите Anonymous Sign-Ins в настройках Auth и повторите попытку.');
			}
			throw new Error(`Не удалось создать защищённую гостевую сессию: ${error.message}`);
		}
		if (!data.user) throw new Error('Supabase не вернул гостевую сессию');
		return data.user.id;
	})().catch((error) => {
		roomSessionPromise = null;
		throw error;
	});
	return roomSessionPromise;
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
