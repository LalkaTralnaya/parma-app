import type { LibraryEntry } from './parma-library';
import { WELL_ADVENTURE } from './well-adventure';

export interface AdventureScene {
	id: string;
	title: string;
	readAloud: string;
	goals: string[];
	checks: string[];
	outcomes: string[];
	dialogue?: string[];
}

export interface AdventureMapMarker {
	id: string;
	label: string;
	x: number;
	y: number;
	gmOnly?: boolean;
	note: string;
}

export interface Adventure {
	/** Полный текст для Сказителя; отсутствует у пользовательских приключений. */
	guide?: LibraryEntry[];
	slug: string;
	title: string;
	label: string;
	summary: string;
	region: string;
	levels: string;
	players: string;
	duration: string;
	tags: string[];
	opening: string;
	hooks: string[];
	secret: string;
	map: { src: string; alt: string; caption: string; markers: AdventureMapMarker[] };
	pacing: string[];
	clues: string[];
	locations: { name: string; atmosphere: string; use: string }[];
	npcs: { name: string; role: string; motive: string; voice: string }[];
	scenes: AdventureScene[];
	handouts: { title: string; text: string }[];
	encounter: { name: string; bestiaryId: string; advice: string };
	endings: string[];
	rewards: string[];
}

/** Сценарий: местные события и обряд не устанавливают новый канон мира. */
export const ADVENTURES: Adventure[] = [WELL_ADVENTURE];

export function getAdventure(slug: string): Adventure | undefined {
	return ADVENTURES.find((adventure) => adventure.slug === slug);
}
