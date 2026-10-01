import { supabase, getDeviceId, getPlayerName } from '../supabase/client';
import type { Character } from '../types';

export interface Room {
	id: string;
	code: string;
	name: string | null;
	master_device_id: string;
	created_at: string;
	updated_at: string;
}

export interface RoomParticipant {
	id: string;
	room_id: string;
	device_id: string;
	display_name: string | null;
	character_snapshot: Character | null;
	role: 'master' | 'player';
	joined_at: string;
	last_seen: string;
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
	const { data, error } = await supabase
		.from('rooms')
		.select('*')
		.eq('code', code.toUpperCase())
		.maybeSingle();

	if (error) throw new Error(`Ошибка поиска: ${error.message}`);
	return data as Room | null;
}

/** Присоединиться к комнате (создаёт запись участника или обновляет) */
export async function joinRoom(
	roomId: string,
	displayName: string,
	characterSnapshot: Character | null
): Promise<RoomParticipant> {
	const deviceId = getDeviceId();

	// Проверяем, не участник ли уже
	const { data: existing } = await supabase
		.from('room_participants')
		.select('*')
		.eq('room_id', roomId)
		.eq('device_id', deviceId)
		.maybeSingle();

	if (existing) {
		const { data, error } = await supabase
			.from('room_participants')
			.update({
				display_name: displayName,
				character_snapshot: characterSnapshot,
				last_seen: new Date().toISOString()
			})
			.eq('id', existing.id)
			.select()
			.single();

		if (error) throw new Error(`Ошибка обновления: ${error.message}`);
		return data as RoomParticipant;
	}

	// Новый участник
	const { data, error } = await supabase
		.from('room_participants')
		.insert({
			room_id: roomId,
			device_id: deviceId,
			display_name: displayName,
			character_snapshot: characterSnapshot,
			role: 'player'
		})
		.select()
		.single();

	if (error) throw new Error(`Ошибка входа: ${error.message}`);
	return data as RoomParticipant;
}

/** Список участников комнаты */
export async function getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
	const { data, error } = await supabase
		.from('room_participants')
		.select('*')
		.eq('room_id', roomId)
		.order('joined_at', { ascending: true });

	if (error) throw new Error(`Ошибка загрузки участников: ${error.message}`);
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
	const { data, error } = await supabase
		.from('room_rolls')
		.select('*')
		.eq('room_id', roomId)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) throw new Error(`Ошибка загрузки бросков: ${error.message}`);
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
export function subscribeToRoom(
	roomId: string,
	onParticipantsChange: () => void,
	onRollAdded: (roll: RoomRoll) => void
): () => void {
	const channel = supabase
		.channel(`room:${roomId}`)
		.on(
			'postgres_changes',
			{ event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${roomId}` },
			() => onParticipantsChange()
		)
		.on(
			'postgres_changes',
			{ event: 'INSERT', schema: 'public', table: 'room_rolls', filter: `room_id=eq.${roomId}` },
			(payload) => onRollAdded(payload.new as RoomRoll)
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