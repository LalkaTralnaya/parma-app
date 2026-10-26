export type PlotNodeType = 'character' | 'npc' | 'organization' | 'quest' | 'location' | 'clue' | 'event' | 'secret';

export interface PlotNode {
	id: string;
	type: PlotNodeType;
	name: string;
	description: string;
}

export interface PlotEdge {
	id: string;
	from: string;
	to: string;
	label: string;
	notes: string;
}

export interface StoryPlotWeb {
	version: 1;
	nodes: PlotNode[];
	edges: PlotEdge[];
}

export const EMPTY_STORY_PLOT_WEB: StoryPlotWeb = { version: 1, nodes: [], edges: [] };
export const STORY_PLOT_STORAGE_KEY = 'parma_story_plot_web';

const PLOT_NODE_TYPES: PlotNodeType[] = ['character', 'npc', 'organization', 'quest', 'location', 'clue', 'event', 'secret'];

export function normalizeStoryPlotWeb(value: unknown): StoryPlotWeb {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return EMPTY_STORY_PLOT_WEB;
	const raw = value as { nodes?: unknown; edges?: unknown };
	const nodes = Array.isArray(raw.nodes) ? raw.nodes.flatMap((value): PlotNode[] => {
		if (!value || typeof value !== 'object') return [];
		const node = value as Partial<PlotNode>;
		if (typeof node.id !== 'string' || !node.id || typeof node.name !== 'string' || !node.name.trim()) return [];
		return [{ id: node.id, type: PLOT_NODE_TYPES.includes(node.type as PlotNodeType) ? node.type as PlotNodeType : 'event', name: node.name.trim(), description: typeof node.description === 'string' ? node.description : '' }];
	}) : [];
	const ids = new Set(nodes.map((node) => node.id));
	const edges = Array.isArray(raw.edges) ? raw.edges.flatMap((value): PlotEdge[] => {
		if (!value || typeof value !== 'object') return [];
		const edge = value as Partial<PlotEdge>;
		if (typeof edge.from !== 'string' || typeof edge.to !== 'string' || edge.from === edge.to || !ids.has(edge.from) || !ids.has(edge.to)) return [];
		return [{ id: typeof edge.id === 'string' && edge.id ? edge.id : crypto.randomUUID(), from: edge.from, to: edge.to, label: typeof edge.label === 'string' ? edge.label : '', notes: typeof edge.notes === 'string' ? edge.notes : '' }];
	}) : [];
	return { version: 1, nodes, edges };
}

export function readLocalStoryPlotWeb(): StoryPlotWeb {
	if (typeof window === 'undefined') return EMPTY_STORY_PLOT_WEB;
	try { return normalizeStoryPlotWeb(JSON.parse(localStorage.getItem(STORY_PLOT_STORAGE_KEY) ?? 'null')); }
	catch { return EMPTY_STORY_PLOT_WEB; }
}

export function writeLocalStoryPlotWeb(web: StoryPlotWeb): void {
	if (typeof window === 'undefined') return;
	try { localStorage.setItem(STORY_PLOT_STORAGE_KEY, JSON.stringify(web)); }
	catch { /* Supabase storage remains the durable copy. */ }
}

export function clearLocalStoryPlotWeb(): void {
	if (typeof window === 'undefined') return;
	try { localStorage.removeItem(STORY_PLOT_STORAGE_KEY); } catch { /* Nothing else depends on this temporary copy. */ }
}

export function plotNodeTypeLabel(type: PlotNodeType): string {
	return ({ character: 'Персонаж', npc: 'НИП', organization: 'Организация', quest: 'Поручение', location: 'Место', clue: 'Зацепка', event: 'Событие', secret: 'Тайна' })[type];
}
