import { contextTip } from './help-content';

export const HELP_DAY = 86_400_000;
export const HELP_WEEK = 7 * HELP_DAY;
export const HELP_ABSENCE = 30 * HELP_DAY;
export const HELP_METADATA_KEY = 'parma_help_v1';

export interface HelpHistory {
  lastActive: number;
  returnUntil: number;
  hiddenUntil: number;
  dismissed: string[];
}
export interface HelpWindow { until: number; returning: boolean }

export function helpHistory(value: unknown): HelpHistory {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const time = (key: string) => typeof data[key] === 'number' && Number.isFinite(data[key]) && data[key] >= 0 ? data[key] as number : 0;
  return { lastActive: time('lastActive'), returnUntil: time('returnUntil'), hiddenUntil: time('hiddenUntil'),
    dismissed: Array.isArray(data.dismissed) ? data.dismissed.filter((v): v is string => typeof v === 'string').slice(0, 100) : [] };
}

export function mergeHelpHistory(remote: unknown, local: unknown): HelpHistory {
  const a = helpHistory(remote), b = helpHistory(local);
  return { lastActive: Math.max(a.lastActive, b.lastActive), returnUntil: Math.max(a.returnUntil, b.returnUntil),
    hiddenUntil: Math.max(a.hiddenUntil, b.hiddenUntil), dismissed: [...new Set([...a.dismissed, ...b.dismissed])].slice(-100) };
}

export function helpWindow(createdAt: string, history: HelpHistory, now: number): HelpWindow {
  const created = Date.parse(createdAt);
  const initialUntil = Number.isFinite(created) && created <= now ? created + HELP_WEEK : 0;
  return { until: Math.max(initialUntil, history.returnUntil), returning: history.returnUntil > initialUntil };
}

export function recordHelpActivity(createdAt: string, value: unknown, now: number): HelpHistory {
  const history = helpHistory(value);
  // Decide from the previous visit before recording this one. An expired window
  // never restarts because of a refresh or an ordinary daily visit.
  if (history.lastActive > 0 && now - history.lastActive >= HELP_ABSENCE) {
    history.returnUntil = now + HELP_WEEK;
    history.hiddenUntil = 0;
    history.dismissed = [];
  }
  history.lastActive = Math.max(history.lastActive, now);
  const window = helpWindow(createdAt, history, now);
  if (window.until <= now) history.dismissed = [];
  return history;
}

export function shouldShowHelp(createdAt: string, history: HelpHistory, now: number): boolean {
  const { until } = helpWindow(createdAt, history, now);
  return until > now && history.hiddenUntil < until;
}

export type ContextTip = ReturnType<typeof contextTip>;
export function contextHelp(path: string, hash = ''): { id: string; tips: ContextTip[] } | null {

  if (path === '/characters') return { id: 'characters', tips: [contextTip('character-concept'), contextTip('character-backup'), contextTip('account-storage')] };
  if (path === '/') return { id: 'home', tips: [
    contextTip('character-concept'),
    contextTip('reading-start'),
    contextTip('character-backup') ] };
  if (path === '/new') return { id: 'creation', tips: [
    contextTip('creation-learning'),
    contextTip('character-skills') ] };
  if (/^\/char\/[^/]+\/levelup$/.test(path)) return { id: 'levelup', tips: [contextTip('character-growth')] };
  if (path.startsWith('/char/')) {
    const section = hash.slice(1);
    const sections: Record<string, ContextTip[]> = {
      resources: [contextTip('resources')],
      battle: [contextTip('weapon-combat')],
      skills: [contextTip('skill-check')],
      abilities: [contextTip('ability-trees')],
      spells: [contextTip('spellcasting'), contextTip('spell-resource')],
      inventory: [contextTip('inventory')],
      relationships: [contextTip('player-relationships')],
      personality: [contextTip('personality')],
      conditions: [contextTip('conditions')],
      decay: [contextTip('decay')],
      rest: [contextTip('rest-and-growth')]
    };
    return { id: `sheet-${sections[section] ? section : 'overview'}`, tips: sections[section] ?? [
      contextTip('sheet-navigation'),
      contextTip('roll-mode') ] };
  }
  if (path === '/lore' || path === '/mechanics') return { id: path.slice(1), tips: [
    contextTip('reference-search'),
    contextTip('reference-open') ] };
  if (path.startsWith('/adventures')) return { id: 'adventures', tips: [
    contextTip('adventure-spoilers'),
    contextTip('adventure-preparation') ] };
  if (path === '/gm/adventure-report/export') return { id: 'report-export', tips: [contextTip('gm-report-export')] };
  if (path === '/gm/adventure-report') return { id: 'adventure-report', tips: [contextTip('gm-report')] };
  if (path === '/gm') return { id: 'gm', tips: [
    contextTip('room-start'),
    contextTip('storyteller-tools') ] };
  if (path.startsWith('/room')) return { id: 'room', tips: [contextTip('room-session') ] };
  if (path === '/gm/combat') return { id: 'combat', tips: [contextTip('encounter-setup') ] };
  if (path === '/gm/bestiary') return { id: 'bestiary', tips: [contextTip('bestiary') ] };
  if (path === '/account') return { id: 'account', tips: [contextTip('account-storage') ] };
  if (path === '/lavka') return { id: 'shop', tips: [contextTip('shopping') ] };
  if (path === '/tavern') return { id: 'tavern', tips: [contextTip('player-tavern')] };
  if (path === '/events') return { id: 'events', tips: [contextTip('random-events') ] };
  return null;
}
