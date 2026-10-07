export interface MonsterAttackData {
	name: string;
	hitBonus: number;
	hitTarget?: number;
	damageModifier?: number;
	attackStat?: 'strength' | 'intelligence' | 'dexterity' | 'eloquence' | 'religion';
	ignoresArmor?: boolean;
	notes?: string;
	save?: string;
	damageDice: string;
	extraDamageDice?: string[];
	damageType: string;
}

export interface CombatParticipant {
	id: string;
	name: string;
	playerName?: string; 
	sourceId?: string;
	isPlayer: boolean;
	maxHp: number;
	currentHp: number;
	armor: number;
	initiative: number;
	initiativeRoll?: number;
	initiativeMod?: number;
	traits?: string[];
	notes?: string;
	attacks?: MonsterAttackData[];
	primaryMod?: number;
}

export interface CombatState {
	participants: CombatParticipant[];
	currentTurnIndex: number;
	round: number;
	active: boolean;
	timestamp: number;
}

const STORAGE_KEY = 'parma_combat';
const CHANNEL_NAME = 'parma_combat_channel';

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
	if (typeof window === 'undefined') return null;
	if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
	return channel;
}

export function getCombat(): CombatState | null {
	if (typeof window === 'undefined') return null;
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return null;
	try {
		const s = JSON.parse(raw) as CombatState & { currentParticipantId?: string };
		// миграция со старого формата (было currentParticipantId, стало currentTurnIndex)
		if (s.currentTurnIndex === undefined) {
			s.currentTurnIndex = 0;
		}
		return s;
	} catch {
		return null;
	}
}

export function saveCombat(state: CombatState | null): void {
	if (typeof window === 'undefined') return;
	if (state === null) {
		localStorage.removeItem(STORAGE_KEY);
	} else {
		state.timestamp = Date.now();
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	}
	// Безопасная копия для BroadcastChannel — Svelte 5 Proxy не сериализуется
	try {
		const safeState = state === null ? null : JSON.parse(JSON.stringify(state));
		getChannel()?.postMessage({ type: 'update', state: safeState });
	} catch {
		// игнорируем — локально уже сохранено
	}
}

export function createEmptyCombat(): CombatState {
	return {
		participants: [],
		currentTurnIndex: 0,
		round: 1,
		active: false,
		timestamp: Date.now()
	};
}

/** Отсортированный список (по убыванию прыти) */
export function sortedParticipants(state: CombatState): CombatParticipant[] {
	return [...state.participants].sort((a, b) => b.initiative - a.initiative);
}

/** Текущий участник — берём из отсортированного списка по индексу */
export function getCurrentParticipant(state: CombatState): CombatParticipant | null {
	if (!state.active) return null;
	const sorted = sortedParticipants(state);
	if (sorted.length === 0) return null;
	const idx = state.currentTurnIndex % sorted.length;
	return sorted[idx] ?? null;
}

/** Идёт ли сейчас ход участника с этим id */
export function isParticipantTurn(state: CombatState, participantId: string): boolean {
	const current = getCurrentParticipant(state);
	return current?.id === participantId;
}

/** Найти участника по исходному id персонажа */
export function findParticipantBySource(
	state: CombatState,
	sourceId: string
): CombatParticipant | null {
	return state.participants.find((p) => p.sourceId === sourceId) ?? null;
}

/** Найти id участника в боевом трекере по id персонажа-игрока */
export function findParticipantIdBySource(sourceId: string): string | null {
	const state = getCombat();
	if (!state) return null;
	return state.participants.find((p) => p.sourceId === sourceId)?.id ?? null;
}

/** Обновить состояние участника */
export function updateParticipant(id: string, patch: Partial<CombatParticipant>): CombatState {
	const state = getCombat() ?? createEmptyCombat();
	state.participants = state.participants.map((p) =>
		p.id === id ? { ...p, ...patch } : p
	);
	saveCombat(state);
	return state;
}

/** Уменьшить/увеличить ЖВЧ конкретного участника */
export function damageParticipant(id: string, amount: number): CombatState {
	const state = getCombat() ?? createEmptyCombat();
	const p = state.participants.find((x) => x.id === id);
	if (p) {
		p.currentHp = Math.max(0, Math.min(p.maxHp, p.currentHp + amount));
	}
	saveCombat(state);
	return state;
}

/** Удалить участника, сохранив текущего действующего героя, если он остался. */
export function removeParticipant(id: string): void {
  const state = getCombat();
  if (!state || !state.participants.some(p => p.id === id)) return;
  const current = getCurrentParticipant(state);
  const oldIndex = state.currentTurnIndex;
  state.participants = state.participants.filter(p => p.id !== id);
  const sorted = sortedParticipants(state);
  const keptIndex = current ? sorted.findIndex(p => p.id === current.id) : -1;
  state.currentTurnIndex = keptIndex >= 0 ? keptIndex : sorted.length ? oldIndex % sorted.length : 0;
  if (current?.id === id && sorted.length > 0 && oldIndex >= sorted.length) state.round++;
  if (sorted.length === 0) state.active = false;
  saveCombat(state);
}

/** Продвинуть ход вперёд */
export function nextTurn(): CombatState {
	const state = getCombat() ?? createEmptyCombat();
	const sorted = sortedParticipants(state);
	if (sorted.length === 0) return state;

	state.currentTurnIndex++;
	if (state.currentTurnIndex >= sorted.length) {
		state.currentTurnIndex = 0;
		state.round++;
	}
	saveCombat(state);
	return state;
}

export function startCombat(): CombatState {
	const state = getCombat() ?? createEmptyCombat();
	state.active = true;
	state.round = 1;
	state.currentTurnIndex = 0;
	saveCombat(state);
	return state;
}

export function endCombat(): CombatState {
	const state = getCombat() ?? createEmptyCombat();
	state.active = false;
	state.round = 1;
	state.currentTurnIndex = 0;
	saveCombat(state);
	return state;
}

export function clearCombat(): void {
	saveCombat(null);
}

export function subscribeCombat(callback: (state: CombatState | null) => void): () => void {
	if (typeof window === 'undefined') return () => {};
	const ch = getChannel();
	const handler = (e: MessageEvent) => {
		if (e.data?.type === 'update') callback(e.data.state);
	};
	ch?.addEventListener('message', handler);
	const storageHandler = (e: StorageEvent) => {
		if (e.key === STORAGE_KEY) callback(getCombat());
	};
	window.addEventListener('storage', storageHandler);
	return () => {
		ch?.removeEventListener('message', handler);
		window.removeEventListener('storage', storageHandler);
	};
}
/** Уведомить другие вкладки, что персонаж изменился (например, тикнули состояния) */
export function notifyCharacterUpdate(characterId: string): void {
	const ch = getChannel();
	ch?.postMessage({ type: 'character_updated', characterId });
}

/** Подписаться на обновления персонажей из других вкладок */
export function subscribeCharacterUpdates(
	callback: (characterId: string) => void
): () => void {
	if (typeof window === 'undefined') return () => {};
	const ch = getChannel();
	if (!ch) return () => {};
	const handler = (e: MessageEvent) => {
		if (e.data?.type === 'character_updated') callback(e.data.characterId);
	};
	ch.addEventListener('message', handler);
	return () => ch.removeEventListener('message', handler);
}
/** Обновить прыть участника по id персонажа-игрока.
 *  Вызывается с листа персонажа после броска. */
export function setParticipantInitiative(
	sourceId: string,
	roll: number,
	mod: number
): void {
	const state = getCombat();
	if (!state) return;
	const p = state.participants.find((x) => x.sourceId === sourceId);
	if (!p) return;
	p.initiative = roll + mod;
	p.initiativeRoll = roll;
	p.initiativeMod = mod;
	saveCombat(state);
}
