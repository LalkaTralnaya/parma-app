export type SessionRequestType = 'initiative' | 'stealth' | 'perception' | 'survival';

export interface SessionResult {
	characterId: string;
	characterName: string;
	roll: number;
	target: number;
	modifier: number;
	result: 'crit_success' | 'success' | 'fail' | 'crit_fail' | 'double';
	timestamp: number;
}

export interface SessionRequest {
	id: string;
	type: SessionRequestType;
	label: string;
	timestamp: number;
	results: Record<string, SessionResult>;
}

const STORAGE_KEY = 'parma_session';
const CHANNEL_NAME = 'parma_session_channel';

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
	if (typeof window === 'undefined') return null;
	if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
	return channel;
}

export function getSession(): SessionRequest | null {
	if (typeof window === 'undefined') return null;
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as SessionRequest;
	} catch {
		return null;
	}
}

export function saveSession(session: SessionRequest | null): void {
	if (typeof window === 'undefined') return;
	if (session === null) {
		localStorage.removeItem(STORAGE_KEY);
	} else {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
	}
	getChannel()?.postMessage({ type: 'update', session });
}

export function createRequest(type: SessionRequestType, label: string): SessionRequest {
	const session: SessionRequest = {
		id: crypto.randomUUID(),
		type,
		label,
		timestamp: Date.now(),
		results: {}
	};
	saveSession(session);
	return session;
}

export function submitResult(result: SessionResult): void {
	const session = getSession();
	if (!session) return;
	session.results[result.characterId] = result;
	saveSession(session);
}

export function clearSession(): void {
	saveSession(null);
}

export function subscribe(callback: (session: SessionRequest | null) => void): () => void {
	if (typeof window === 'undefined') return () => {};

	const ch = getChannel();
	if (!ch) return () => {};

	const handler = (e: MessageEvent) => {
		if (e.data?.type === 'update') callback(e.data.session);
	};
	ch.addEventListener('message', handler);

	const storageHandler = (e: StorageEvent) => {
		if (e.key === STORAGE_KEY) callback(getSession());
	};
	window.addEventListener('storage', storageHandler);

	return () => {
		ch.removeEventListener('message', handler);
		window.removeEventListener('storage', storageHandler);
	};
}

export const SESSION_LABELS: Record<SessionRequestType, string> = {
	initiative: 'Бросить прыть',
	stealth: 'Скрытность',
	perception: 'Наблюдательность',
	survival: 'Выживание'
};

export const SESSION_SKILLS: Record<SessionRequestType, string | null> = {
	initiative: null,
	stealth: 'stealth',
	perception: 'perception',
	survival: 'survival'
};