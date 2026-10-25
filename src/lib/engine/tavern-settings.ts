import { PARMA_SEASONS, type ParmaSeason } from '$lib/rules/tavern-menu';

export interface TavernSettings {
	season: ParmaSeason;
}

export const TAVERN_SETTINGS_KEY = 'parma_tavern_settings';
export const DEFAULT_TAVERN_SETTINGS: TavernSettings = { season: 'spring' };

export function normalizeTavernSettings(value: unknown): TavernSettings | null {
	if (!value || typeof value !== 'object') return null;
	const season = (value as { season?: unknown }).season;
	return PARMA_SEASONS.some((option) => option.id === season) ? { season: season as ParmaSeason } : null;
}

export function readLocalTavernSettings(): TavernSettings {
	if (typeof window === 'undefined') return DEFAULT_TAVERN_SETTINGS;
	try {
		return normalizeTavernSettings(JSON.parse(localStorage.getItem(TAVERN_SETTINGS_KEY) ?? 'null')) ?? DEFAULT_TAVERN_SETTINGS;
	} catch {
		return DEFAULT_TAVERN_SETTINGS;
	}
}

export function writeLocalTavernSettings(settings: TavernSettings): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(TAVERN_SETTINGS_KEY, JSON.stringify(settings));
		window.dispatchEvent(new CustomEvent('parma-tavern-settings', { detail: settings }));
	} catch {
		// Настройки комнаты в Supabase всё ещё могут быть сохранены отдельно.
	}
}
