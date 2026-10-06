import { supabase, getDeviceId, getPlayerName } from '../supabase/client';
import type { Character } from '../type';

const ROOM_REQUEST_TIMEOUT_MS = 15_000;
const ROOM_CONNECTION_ERROR = 'Нет связи с сервером комнат. Проверьте мобильную сеть, Wi-Fi или VPN и повторите попытку.';

function isNetworkError(message: string): boolean {
	return /failed to fetch|fetch failed|load failed|network|timeout|timed out|abort/i.test(message);
}

async function roomRequest<T>(query: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
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
	created_at: string;
	updated_at: string;
	gifted_character_ids?: string[];
}

export interface RoomParticipant {
	id: string;
	room_id: string;
	device_id: string;
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

/** Генерация кода из 6 символов без похожих букв (0/O, 1/I) */
function generateRoomCode(): string {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	let code = '';
	for (let i = 0; i < 6; i++) {
		code += alphabet[Math.floor(Math.random() * alphabet.length)];
	}
	return code;
}

/** Создать комнату. Возвращает созданную комнату. */
export async function createRoom(name: string): Promise<Room> {
	const deviceId = getDeviceId();

	// Пробуем несколько раз, если код случайно занят
	for (let attempt = 0; attempt < 5; attempt++) {
		const code = generateRoomCode();
		const { data, error } = await supabase
			.from('rooms')
			.insert({ code, name, master_device_id: deviceId })
			.select()
			.single();

		if (!error && data) {
			// Мастер автоматически становится участником
			await supabase.from('room_participants').insert({
				room_id: data.id,
				device_id: deviceId,
				display_name: getPlayerName() || 'Мастер',
				role: 'master'
			});
			// Создаём пустое состояние боя
			await supabase.from('room_combat').insert({
				room_id: data.id,
				state: {}
			});
			return data as Room;
		}

		// Если ошибка не про дубликат кода — выходим
		if (error && !error.message.includes('duplicate')) {
			throw new Error(`Не удалось создать комнату: ${error.message}`);
		}
	}

	throw new Error('Не удалось сгенерировать уникальный код за 5 попыток');
}

/** Найти комнату по коду */
export async function findRoomByCode(code: string): Promise<Room | null> {
	const { data, error } = await roomRequest((signal) => supabase
		.from('rooms')
		.select('*')
		.eq('code', code.toUpperCase())
		.abortSignal(signal)
		.maybeSingle());

	if (error) throw new Error(isNetworkError(error.message) ? ROOM_CONNECTION_ERROR : `Ошибка поиска: ${error.message}`);
	return data as Room | null;
}

/** Присоединиться к комнате (создаёт запись участника или обновляет) */
/** Присоединиться к комнате (создаёт запись участника или обновляет) */
export async function joinRoom(
	roomId: string,
	displayName: string,
	characterSnapshot: Character | null
): Promise<RoomParticipant> {
	const deviceId = getDeviceId();

	// Сначала узнаём, кто мы в этой комнате
	const { data: room, error: roomError } = await roomRequest((signal) => supabase
		.from('rooms')
		.select('master_device_id')
		.eq('id', roomId)
		.abortSignal(signal)
		.maybeSingle());
	if (roomError) throw new Error(isNetworkError(roomError.message) ? ROOM_CONNECTION_ERROR : `Ошибка загрузки комнаты: ${roomError.message}`);
	if (!room) throw new Error('Комната не найдена');

	const role: 'master' | 'player' =
		room?.master_device_id === deviceId ? 'master' : 'player';

	// Проверяем, не участник ли уже
	const { data: existing, error: existingError } = await roomRequest((signal) => supabase
		.from('room_participants')
		.select('*')
		.eq('room_id', roomId)
		.eq('device_id', deviceId)
		.abortSignal(signal)
		.maybeSingle());
	if (existingError) throw new Error(isNetworkError(existingError.message) ? ROOM_CONNECTION_ERROR : `Ошибка проверки участника: ${existingError.message}`);

	if (existing) {
		const { data, error } = await roomRequest((signal) => supabase
			.from('room_participants')
			.update({
				display_name: displayName,
				character_snapshot: characterSnapshot,
				role,
				last_seen: new Date().toISOString()
			})
			.eq('id', existing.id)
			.select()
			.abortSignal(signal)
			.single());

		if (error) throw new Error(isNetworkError(error.message) ? ROOM_CONNECTION_ERROR : `Ошибка обновления: ${error.message}`);
		return data as RoomParticipant;
	}

	// Новый участник
	const { data, error } = await roomRequest((signal) => supabase
		.from('room_participants')
		.insert({
			room_id: roomId,
			device_id: deviceId,
			display_name: displayName,
			character_snapshot: characterSnapshot,
			role
		})
		.select()
		.abortSignal(signal)
		.single());

	if (error) throw new Error(isNetworkError(error.message) ? ROOM_CONNECTION_ERROR : `Ошибка входа: ${error.message}`);
	return data as RoomParticipant;
}

/** Список участников комнаты */
export async function getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
	const { data, error } = await roomRequest((signal) => supabase
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
	const deviceId = getDeviceId();
	await supabase
		.from('room_participants')
		.update({
			character_snapshot: character,
			last_seen: new Date().toISOString()
		})
		.eq('room_id', roomId)
		.eq('device_id', deviceId);
}

/** Отправить бросок в комнату (все увидят) */
export async function publishRoll(
	roomId: string,
	characterName: string,
	rollType: string,
	rollData: Record<string, unknown>
): Promise<void> {
	const deviceId = getDeviceId();
	const { error } = await supabase.from('room_rolls').insert({
		room_id: roomId,
		device_id: deviceId,
		character_name: characterName,
		roll_type: rollType,
		roll_data: rollData
	});
	if (error) throw new Error(`Ошибка отправки броска: ${error.message}`);
}

/** Последние N бросков комнаты */
export async function getRecentRolls(roomId: string, limit = 30): Promise<RoomRoll[]> {
	const { data, error } = await roomRequest((signal) => supabase
		.from('room_rolls')
		.select('*')
		.eq('room_id', roomId)
		.order('created_at', { ascending: false })
		.limit(limit)
		.abortSignal(signal));

	if (error) throw new Error(isNetworkError(error.message) ? ROOM_CONNECTION_ERROR : `Ошибка загрузки бросков: ${error.message}`);
	return (data ?? []) as RoomRoll[];
}

/** Покинуть комнату */
export async function leaveRoom(roomId: string): Promise<void> {
	const deviceId = getDeviceId();
	await supabase
		.from('room_participants')
		.delete()
		.eq('room_id', roomId)
		.eq('device_id', deviceId);
}

/** Подписка на изменения в комнате — участники + броски */
/** Подписка на изменения в комнате — участники + броски */
export function subscribeToRoom(
	roomId: string,
	onParticipantsChange: () => void,
	onRoll: (roll: RoomRoll) => void
) {
	// Уникальный суффикс, чтобы Supabase не возвращал старый канал
	const uniqueName = `room:${roomId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

	const channel = supabase
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
		supabase.removeChannel(channel);
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
/** Список комнат, где текущий пользователь — мастер */
export async function listMyMasterRooms(): Promise<Room[]> {
	const deviceId = getDeviceId();
	const { data, error } = await supabase
		.from('rooms')
		.select('*')
		.eq('master_device_id', deviceId)
		.order('updated_at', { ascending: false });
	if (error) throw new Error(`Ошибка загрузки комнат: ${error.message}`);
	return (data ?? []) as Room[];
}

/** Удалить комнату целиком (только для мастера) */
export async function deleteRoom(roomId: string): Promise<void> {
	const deviceId = getDeviceId();

	// Проверяем владельца
	const { data: room } = await supabase
		.from('rooms')
		.select('master_device_id')
		.eq('id', roomId)
		.maybeSingle();

	if (!room || room.master_device_id !== deviceId) {
		throw new Error('Это не ваша комната');
	}

	// Удаляем связанные данные
	await supabase.from('room_participants').delete().eq('room_id', roomId);
	await supabase.from('room_rolls').delete().eq('room_id', roomId);
	await supabase.from('room_combat').delete().eq('room_id', roomId);
	await supabase.from('rooms').delete().eq('id', roomId);
}

/** Обновить время активности комнаты (чтобы сортировка «свежие сверху» работала) */
export async function touchRoom(roomId: string): Promise<void> {
	await supabase
		.from('rooms')
		.update({ updated_at: new Date().toISOString() })
		.eq('id', roomId);
}
/** Мастер передаёт персонажа игроку (сохраняет как «подарок») */
export async function setPendingCharacter(
	participantId: string,
	character: Character
): Promise<void> {
	const { error } = await supabase
		.from('room_participants')
		.update({ pending_character: character })
		.eq('id', participantId);
	if (error) throw new Error(`Ошибка передачи персонажа: ${error.message}`);
}

/** Игрок принял или отклонил — очищаем поле */
export async function clearPendingCharacter(participantId: string): Promise<void> {
	const { error } = await supabase
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
	const { data, error } = await supabase
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

/** Записать состояние боя (только мастер обычно) */
export async function updateRoomCombat(
	roomId: string,
	state: RoomCombatState
): Promise<void> {
	const payload = { ...state, updatedAt: new Date().toISOString() };
	const { error } = await supabase
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

	const channel = supabase
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
		supabase.removeChannel(channel);
	};
}
import type { CombatState } from '$lib/sync/combat';

/** Прочитать состояние боя из комнаты (или null, если пусто) */
export async function getRoomCombatState(roomId: string): Promise<CombatState | null> {
	const { data, error } = await supabase
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
	console.log('[combat] сохраняем состояние в комнату', roomId, state);
	const { data, error, count } = await supabase
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

	const channel = supabase
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
		supabase.removeChannel(channel);
	};
}
/** Обновить список подаренных персонажей в комнате */
export async function updateRoomGifted(
	roomId: string,
	giftedIds: string[]
): Promise<void> {
	const { error } = await supabase
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
	const { error } = await supabase
		.from('room_participants')
		.update({ character_locked: locked })
		.eq('id', participantId);
	if (error) throw new Error(`Ошибка замка персонажа: ${error.message}`);
}
// ─── Запросы мастера к игрокам (через Supabase) ───

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

/** Создать запрос от мастера */
export async function createRoomRequest(
	roomId: string,
	requestType: string,
	label: string
): Promise<RoomRequest> {
	const { data, error } = await supabase
		.from('room_requests')
		.insert({ room_id: roomId, request_type: requestType, label })
		.select()
		.single();
	if (error) throw new Error(`Ошибка создания запроса: ${error.message}`);
	return data as RoomRequest;
}

/** Получить активный (не закрытый) запрос в комнате */
export async function getActiveRoomRequest(roomId: string): Promise<RoomRequest | null> {
	const { data, error } = await supabase
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
	const { error } = await supabase.rpc('submit_room_request_result', {
		p_request_id: requestId,
		p_character_id: characterId,
		p_result: result
	});
	if (error) throw new Error(`Ошибка отправки результата: ${error.message}`);
}

/** Мастер закрывает запрос */
export async function closeRoomRequest(requestId: string): Promise<void> {
	const { error } = await supabase
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

	const channel = supabase
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
		supabase.removeChannel(channel);
	};
}
