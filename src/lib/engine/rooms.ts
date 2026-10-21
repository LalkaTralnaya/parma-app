import { roomSupabase, getPlayerName, ensureRoomSession } from '../supabase/client';
import type { Character } from '../type';

const ROOM_REQUEST_TIMEOUT_MS = 15_000;
const ROOM_CONNECTION_ERROR = 'Нет связи с сервером комнат. Проверьте мобильную сеть, Wi-Fi или VPN и повторите попытку.';

function isNetworkError(message: string): boolean {
	return /failed to fetch|fetch failed|load failed|network|timeout|timed out|abort/i.test(message);
}

function isRoomMigrationMissing(message: string): boolean {
	return /could not find the function public\.(create_secure_room|lookup_room_by_invite|join_secure_room)|PGRST202/i.test(message);
}

async function roomRequest<T>(query: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
	await ensureRoomSession();
	const controller = new AbortController();
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(new Error(`Нет ответа от сервера комнат за ${ROOM_REQUEST_TIMEOUT_MS / 1000} секунд. Проверьте мобильную сеть, Wi-Fi или VPN и повторите попытку.`));
			controller.abort();
		}, ROOM_REQUEST_TIMEOUT_MS);
	});
	try {
		return await Promise.race([Promise.resolve(query(controller.signal)), timeout]);
	} catch (error) {
		if (isNetworkError((error as Error).message ?? '')) throw new Error(ROOM_CONNECTION_ERROR);
		throw error;
	} finally {
		clearTimeout(timeoutId);
	}
}

export interface Room {
	id: string;
	code: string;
	name: string | null;
	master_device_id: string;
	master_auth_id: string | null;
	created_at: string;
	updated_at: string;
	gifted_character_ids?: string[];
}

export interface RoomParticipant {
	id: string;
	room_id: string;
	device_id: string;
	auth_user_id: string;
	display_name: string | null;
	character_snapshot: Character | null;
	pending_character: Character | null;
	role: 'master' | 'player';
	joined_at: string;
	last_seen: string;
	character_locked?: boolean;
}

export interface RoomRoll {
	id: string;
	room_id: string;
	device_id: string;
	character_name: string | null;
	roll_type: string;
	roll_data: Record<string, unknown>;
	created_at: string;
}

/** A 256-bit invitation secret encoded as 64 URL-safe hexadecimal characters. */
function generateRoomCode(): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Создать комнату. Возвращает созданную комнату. */
export async function createRoom(name: string): Promise<Room> {
	await ensureRoomSession();

	// Пробуем несколько раз, если код случайно занят
	for (let attempt = 0; attempt < 5; attempt++) {
		const code = generateRoomCode();
		const { data, error } = await roomSupabase.rpc('create_secure_room', {
			p_code: code,
			p_name: name,
			p_display_name: getPlayerName() || 'Сказитель'
		});

		if (!error && data) {
			return data as Room;
		}

		// Если ошибка не про дубликат кода — выходим
		if (error && !error.message.includes('duplicate')) {
			if (isRoomMigrationMissing(error.message)) {
				throw new Error('База Supabase ещё не обновлена для защищённых комнат. Сначала опубликуйте эту версию приложения, затем примените SQL-миграцию безопасных приглашений.');
			}
			throw new Error(`Не удалось создать комнату: ${error.message}`);
		}
	}

	throw new Error('Не удалось сгенерировать уникальный код за 5 попыток');
}

/** Найти комнату по коду */
export async function findRoomByCode(code: string): Promise<Room | null> {
	await ensureRoomSession();
	const { data, error } = await roomRequest((signal) => roomSupabase
		.rpc('lookup_room_by_invite', { p_code: code.trim().toLowerCase() })
		.abortSignal(signal));

	if (error) {
		if (isRoomMigrationMissing(error.message)) {
			throw new Error('База Supabase ещё не обновлена для защищённых комнат. Сначала опубликуйте эту версию приложения, затем примените SQL-миграцию безопасных приглашений.');
		}
		throw new Error(isNetworkError(error.message) ? ROOM_CONNECTION_ERROR : `Ошибка поиска: ${error.message}`);
	}
	return data as Room | null;
}

/** Присоединиться к комнате (создаёт запись участника или обновляет) */
export async function joinRoom(
	roomId: string,
	displayName: string,
	characterSnapshot: Character | null,
	inviteCode: string
): Promise<RoomParticipant> {
	await ensureRoomSession();
	const { data, error } = await roomRequest((signal) => roomSupabase.rpc('join_secure_room', {
		p_room_id: roomId,
		p_code: inviteCode.trim().toLowerCase(),
		p_display_name: displayName,
		p_character_snapshot: characterSnapshot
	}).abortSignal(signal));

	if (error) {
		if (isRoomMigrationMissing(error.message)) {
			throw new Error('База Supabase ещё не обновлена для защищённых комнат. Сначала опубликуйте эту версию приложения, затем примените SQL-миграцию безопасных приглашений.');
		}
		throw new Error(isNetworkError(error.message) ? ROOM_CONNECTION_ERROR : `Ошибка входа: ${error.message}`);
	}
	return data as RoomParticipant;
}

/** Список участников комнаты */
export async function getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
	await ensureRoomSession();
	const { data, error } = await roomRequest((signal) => roomSupabase
		.from('room_participants')
		.select('*')
		.eq('room_id', roomId)
		.order('joined_at', { ascending: true })
		.abortSignal(signal));

	if (error) throw new Error(isNetworkError(error.message) ? ROOM_CONNECTION_ERROR : `Ошибка загрузки участников: ${error.message}`);
	return (data ?? []) as RoomParticipant[];
}

/** Обновить снимок персонажа (например, когда игрок потратил ресурс) */
export async function updateCharacterSnapshot(
	roomId: string,
	character: Character
): Promise<void> {
	const authId = await ensureRoomSession();
	await roomSupabase
		.from('room_participants')
		.update({
			character_snapshot: character,
			last_seen: new Date().toISOString()
		})
		.eq('room_id', roomId)
		.eq('auth_user_id', authId);
}

/** Отправить бросок в комнату (все увидят) */
export async function publishRoll(
	roomId: string,
	characterName: string,
	rollType: string,
	rollData: Record<string, unknown>
): Promise<void> {
	const authId = await ensureRoomSession();
	const { error } = await roomSupabase.from('room_rolls').insert({
		room_id: roomId,
		device_id: authId,
		character_name: characterName,
		roll_type: rollType,
		roll_data: rollData
	});
	if (error) throw new Error(`Ошибка отправки броска: ${error.message}`);
}

/** Последние N бросков комнаты */
export async function getRecentRolls(roomId: string, limit = 30): Promise<RoomRoll[]> {
	const { data, error } = await roomRequest((signal) => roomSupabase
		.from('room_rolls')
		.select('*')
		.eq('room_id', roomId)
		.gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
		.order('created_at', { ascending: false })
		.limit(limit)
		.abortSignal(signal));

	if (error) throw new Error(isNetworkError(error.message) ? ROOM_CONNECTION_ERROR : `Ошибка загрузки бросков: ${error.message}`);
	return (data ?? []) as RoomRoll[];
}

/** Покинуть комнату */
export async function leaveRoom(roomId: string): Promise<void> {
	const authId = await ensureRoomSession();
	await roomSupabase
		.from('room_participants')
		.delete()
		.eq('room_id', roomId)
		.eq('auth_user_id', authId);
}

/** Подписка на изменения в комнате — участники + броски */
export function subscribeToRoom(
	roomId: string,
	onParticipantsChange: () => void,
	onRoll: (roll: RoomRoll) => void
) {
	// Уникальный суффикс, чтобы Supabase не возвращал старый канал
	const uniqueName = `room:${roomId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

	const channel = roomSupabase
		.channel(uniqueName)
		.on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'room_participants',
				filter: `room_id=eq.${roomId}`
			},
			() => onParticipantsChange()
		)
		.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'room_rolls',
				filter: `room_id=eq.${roomId}`
			},
			(payload) => {
				console.log('[combat] пришло изменение!', payload.new);
				const s = (payload.new as { state?: CombatState }).state ?? null;
				onRoll(payload.new as RoomRoll);
			}
		)
		.subscribe();

	return () => {
		roomSupabase.removeChannel(channel);
	};
}
/** Запомнить, что игрок сейчас в комнате (для автопубликации бросков) */
export function setCurrentRoom(code: string): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem('parma_current_room_code', code.toUpperCase());
}

/** Получить код активной комнаты (или null) */
export function getCurrentRoom(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem('parma_current_room_code');
}

/** Очистить активную комнату */
export function clearCurrentRoom(): void {
	if (typeof window === 'undefined') return;
	localStorage.removeItem('parma_current_room_code');
}

/** Публикация броска в активную комнату (если игрок в ней).
 *  Тихо ничего не делает, если комнаты нет. */
export async function publishToActiveRoom(
	characterName: string,
	rollType: string,
	rollData: Record<string, unknown>
): Promise<void> {
	const code = getCurrentRoom();
	if (!code) return;

	try {
		const room = await findRoomByCode(code);
		if (!room) return;
		await publishRoll(room.id, characterName, rollType, rollData);
	} catch {
		// молча — не хотим ломать бросок из-за проблем с сетью
	}
}
/** Список комнат, где текущий пользователь — сказитель */
export async function listMyMasterRooms(): Promise<Room[]> {
	const authId = await ensureRoomSession();
	const { data, error } = await roomSupabase
		.from('rooms')
		.select('*')
		.eq('master_auth_id', authId)
		.order('updated_at', { ascending: false });
	if (error) throw new Error(`Ошибка загрузки комнат: ${error.message}`);
	return (data ?? []) as Room[];
}

/** Удалить комнату целиком (только для сказителя) */
export async function deleteRoom(roomId: string): Promise<void> {
	await ensureRoomSession();
	const { error } = await roomSupabase.rpc('delete_secure_room', { p_room_id: roomId });
	if (error) throw new Error(`Не удалось удалить комнату: ${error.message}`);
}

/** Revoke the current invitation and issue a fresh unguessable link. */
export async function rotateRoomInvite(roomId: string): Promise<string> {
	await ensureRoomSession();
	const { data, error } = await roomSupabase.rpc('rotate_room_invite', { p_room_id: roomId });
	if (error) throw new Error(`Не удалось перевыпустить приглашение: ${error.message}`);
	return data as string;
}

/** Обновить время активности комнаты (чтобы сортировка «свежие сверху» работала) */
export async function touchRoom(roomId: string): Promise<void> {
	await ensureRoomSession();
	await roomSupabase
		.from('rooms')
		.update({ updated_at: new Date().toISOString() })
		.eq('id', roomId);
}
/** Сказитель передаёт персонажа игроку (сохраняет как «подарок») */
export async function setPendingCharacter(
	participantId: string,
	character: Character
): Promise<void> {
	await ensureRoomSession();
	const { error } = await roomSupabase
		.from('room_participants')
		.update({ pending_character: character })
		.eq('id', participantId);
	if (error) throw new Error(`Ошибка передачи персонажа: ${error.message}`);
}

/** Игрок принял или отклонил — очищаем поле */
export async function clearPendingCharacter(participantId: string): Promise<void> {
	await ensureRoomSession();
	const { error } = await roomSupabase
		.from('room_participants')
		.update({ pending_character: null })
		.eq('id', participantId);
	if (error) throw new Error(`Ошибка очистки передачи: ${error.message}`);
}
// ─── Состояние боя в комнате ───

export interface Combatant {
	id: string;                 // уникальный id бойца внутри боя
	participantId: string | null; // id участника комнаты (если это игрок)
	deviceId: string | null;    // device_id владельца (для прав)
	name: string;
	level: number;
	raceId: string;
	kind: 'player' | 'enemy' | 'npc';
	initiative: number;
	hp: number;
	hpMax: number;
	armor: number;
	// сюда можно докинуть любые поля на будущее
	extra?: Record<string, unknown>;
}

export interface RoomCombatState {
	combatants: Combatant[];
	currentTurnIndex: number;   // чей сейчас ход
	round: number;
	started: boolean;
	updatedAt: string;
}

const EMPTY_COMBAT: RoomCombatState = {
	combatants: [],
	currentTurnIndex: 0,
	round: 0,
	started: false,
	updatedAt: new Date(0).toISOString()
};

/** Прочитать состояние боя из комнаты */
export async function getRoomCombat(roomId: string): Promise<RoomCombatState> {
	await ensureRoomSession();
	const { data, error } = await roomSupabase
		.from('room_combat')
		.select('state')
		.eq('room_id', roomId)
		.maybeSingle();

	if (error) throw new Error(`Ошибка загрузки боя: ${error.message}`);
	if (!data || !data.state) return { ...EMPTY_COMBAT };

	const state = data.state as Partial<RoomCombatState>;
	return {
		combatants: state.combatants ?? [],
		currentTurnIndex: state.currentTurnIndex ?? 0,
		round: state.round ?? 0,
		started: state.started ?? false,
		updatedAt: state.updatedAt ?? new Date().toISOString()
	};
}

/** Записать состояние боя (только сказитель обычно) */
export async function updateRoomCombat(
	roomId: string,
	state: RoomCombatState
): Promise<void> {
	await ensureRoomSession();
	const payload = { ...state, updatedAt: new Date().toISOString() };
	const { error } = await roomSupabase
		.from('room_combat')
		.update({ state: payload })
		.eq('room_id', roomId);

	if (error) throw new Error(`Ошибка сохранения боя: ${error.message}`);
}

/** Подписка на изменения состояния боя */
export function subscribeToCombat(
	roomId: string,
	onChange: (state: RoomCombatState) => void
): () => void {
	const uniqueName = `combat:${roomId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

	const channel = roomSupabase
		.channel(uniqueName)
		.on(
			'postgres_changes',
			{
				event: 'UPDATE',
				schema: 'public',
				table: 'room_combat',
				filter: `room_id=eq.${roomId}`
			},
			(payload) => {
				const s = (payload.new as { state?: Partial<RoomCombatState> }).state;
				if (!s) return;
				onChange({
					combatants: s.combatants ?? [],
					currentTurnIndex: s.currentTurnIndex ?? 0,
					round: s.round ?? 0,
					started: s.started ?? false,
					updatedAt: s.updatedAt ?? new Date().toISOString()
				});
			}
		)
		.subscribe();

	return () => {
		roomSupabase.removeChannel(channel);
	};
}
import type { CombatState } from '$lib/sync/combat';

/** Прочитать состояние боя из комнаты (или null, если пусто) */
export async function getRoomCombatState(roomId: string): Promise<CombatState | null> {
	await ensureRoomSession();
	const { data, error } = await roomSupabase
		.from('room_combat')
		.select('state')
		.eq('room_id', roomId)
		.maybeSingle();
	if (error) return null;
	if (!data || !data.state) return null;
	const s = data.state as CombatState | Record<string, never>;
	if (!s || Object.keys(s).length === 0) return null;
	return s as CombatState;
}

/** Записать состояние боя в комнату */
export async function saveRoomCombatState(
	roomId: string,
	state: CombatState
): Promise<void> {
	await ensureRoomSession();
	console.log('[combat] сохраняем состояние в комнату', roomId, state);
	const { data, error, count } = await roomSupabase
		.from('room_combat')
		.update({ state })
		.eq('room_id', roomId)
		.select();

	if (error) {
		console.error('[combat] ошибка сохранения:', error);
		throw new Error(`Ошибка сохранения боя: ${error.message}`);
	}
	console.log('[combat] сохранено, затронуто строк:', data?.length ?? 0);
	if (!data || data.length === 0) {
		console.warn('[combat] ⚠️ НИ ОДНОЙ строки не обновлено! Проверь room_id или наличие строки.');
	}
}

/** Подписка на изменения боя в комнате */
export function subscribeToRoomCombat(
	roomId: string,
	onChange: (state: CombatState | null) => void
): () => void {
	const uniqueName = `combat:${roomId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

	const channel = roomSupabase
		.channel(uniqueName)
		.on(
			'postgres_changes',
			{
				event: 'UPDATE',
				schema: 'public',
				table: 'room_combat',
				filter: `room_id=eq.${roomId}`
			},
			(payload) => {
				const s = (payload.new as { state?: CombatState }).state ?? null;
				onChange(s);
			}
		)
		.subscribe((status) => {
			console.log('[combat] статус подписки:', status);
		});
	return () => {
		roomSupabase.removeChannel(channel);
	};
}
/** Обновить список подаренных персонажей в комнате */
export async function updateRoomGifted(
	roomId: string,
	giftedIds: string[]
): Promise<void> {
	await ensureRoomSession();
	const { error } = await roomSupabase
		.from('rooms')
		.update({ gifted_character_ids: giftedIds })
		.eq('id', roomId);
	if (error) throw new Error(`Ошибка обновления gifted: ${error.message}`);
}
/** Установить/снять замок смены персонажа у участника */
export async function setCharacterLock(
	participantId: string,
	locked: boolean
): Promise<void> {
	await ensureRoomSession();
	const { error } = await roomSupabase
		.from('room_participants')
		.update({ character_locked: locked })
		.eq('id', participantId);
	if (error) throw new Error(`Ошибка замка персонажа: ${error.message}`);
}
// ─── Запросы сказителя к игрокам (через Supabase) ───

export interface RoomRequestResult {
	characterId: string;
	characterName: string;
	roll: number;
	target: number;
	modifier: number;
	result: string;
	timestamp: number;
}

export interface RoomRequest {
	id: string;
	room_id: string;
	request_type: string;
	label: string;
	results: Record<string, RoomRequestResult>;
	created_at: string;
	closed: boolean;
}

/** Создать запрос от сказителя */
export async function createRoomRequest(
	roomId: string,
	requestType: string,
	label: string
): Promise<RoomRequest> {
	await ensureRoomSession();
	const { data, error } = await roomSupabase
		.from('room_requests')
		.insert({ room_id: roomId, request_type: requestType, label })
		.select()
		.single();
	if (error) throw new Error(`Ошибка создания запроса: ${error.message}`);
	return data as RoomRequest;
}

/** Получить активный (не закрытый) запрос в комнате */
export async function getActiveRoomRequest(roomId: string): Promise<RoomRequest | null> {
	await ensureRoomSession();
	const { data, error } = await roomSupabase
		.from('room_requests')
		.select('*')
		.eq('room_id', roomId)
		.eq('closed', false)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) return null;
	return data as RoomRequest | null;
}

/** Игрок отправляет результат */
export async function submitRoomRequestResult(
	requestId: string,
	characterId: string,
	result: RoomRequestResult
): Promise<void> {
	await ensureRoomSession();
	const { error } = await roomSupabase.rpc('submit_room_request_result', {
		p_request_id: requestId,
		p_character_id: characterId,
		p_result: result
	});
	if (error) throw new Error(`Ошибка отправки результата: ${error.message}`);
}

/** Сказитель закрывает запрос */
export async function closeRoomRequest(requestId: string): Promise<void> {
	await ensureRoomSession();
	const { error } = await roomSupabase
		.from('room_requests')
		.update({ closed: true })
		.eq('id', requestId);
	if (error) throw new Error(`Ошибка закрытия запроса: ${error.message}`);
}

/** Подписка на изменения активного запроса */
export function subscribeToRoomRequests(
	roomId: string,
	onUpdate: (request: RoomRequest | null) => void
): () => void {
	const uniqueName = `requests:${roomId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

	const channel = roomSupabase
		.channel(uniqueName)
		.on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'room_requests',
				filter: `room_id=eq.${roomId}`
			},
			async () => {
				const active = await getActiveRoomRequest(roomId);
				onUpdate(active);
			}
		)
		.subscribe((status) => {
			console.log('[requests] статус подписки:', status);
		});

	return () => {
		roomSupabase.removeChannel(channel);
	};
}
