<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import {
	findRoomByCode, joinRoom, getRoomParticipants, getRecentRolls,
	leaveRoom, updateCharacterSnapshot, subscribeToRoom,
	setCurrentRoom, clearCurrentRoom, deleteRoom, listMyMasterRooms,
	setPendingCharacter, clearPendingCharacter,
	type Room, type RoomParticipant, type RoomRoll
} from '../../../lib/engine/rooms';
	import { listCharacters, getCharacter, saveCharacter } from '../../../lib/db/characters';
	import { getDeviceId } from '../../../lib/supabase/client';
	import { RACES } from '../../../lib/rules/races';
	import type { Character } from '../../../lib/types';

	let room = $state<Room | null>(null);
	let participants = $state<RoomParticipant[]>([]);
	let rolls = $state<RoomRoll[]>([]);
	let loading = $state(true);
	let error = $state('');
	let myCharacters = $state<Character[]>([]);
	let showCharPicker = $state(false);
	let selectedCharacterId = $state<string>('');
	let unsubscribe: (() => void) | null = null;
	// ─── Передача персонажа ───
// ─── Передача персонажа ───
let showGiftForm = $state(false);
let giftTarget = $state<RoomParticipant | null>(null);
let giftBusy = $state(false);

function openGiftForm(p: RoomParticipant) {
	giftTarget = p;
	showGiftForm = true;
}

/** Передать существующий чарлист игроку */
async function confirmGift(char: Character) {
	if (!room || !giftTarget || giftBusy) return;
	giftBusy = true;

	// 1. Снимаем реактивную обёртку (иначе Supabase получит Proxy и упадёт)
	const plain = $state.snapshot(char) as Character;

	// 2. Клонируем с новым id, чтобы не перетереть чарлистов игрока
	const copy: Character = {
		...plain,
		id:
			typeof crypto !== 'undefined' && 'randomUUID' in crypto
				? crypto.randomUUID()
				: `gift-${Date.now()}-${Math.random().toString(36).slice(2)}`
	};

	const targetName = giftTarget.display_name ?? 'игроку';
	const targetId = giftTarget.id;

	try {
		await setPendingCharacter(targetId, copy);
		participants = await getRoomParticipants(room.id);
		showGiftForm = false;
		giftTarget = null;
		alert(`Персонаж «${copy.name || '(без имени)'}» передан ${targetName}.`);
	} catch (e) {
		alert((e as Error).message);
	} finally {
		giftBusy = false;
	}
	// Запоминаем, что этот персонаж отдан
		const { data: roomData } = await supabase
			.from('rooms')
			.select('gifted_character_ids')
			.eq('id', room.id)
			.maybeSingle();

		const gifted = new Set(roomData?.gifted_character_ids ?? []);
		gifted.add(char.id);

		await supabase
			.from('rooms')
			.update({ gifted_character_ids: Array.from(gifted) })
			.eq('id', room.id);
}

async function acceptGift(p: RoomParticipant) {
	if (!p.pending_character || !room) return;

	// Снимаем Proxy с реактивного объекта — иначе IndexedDB падает с DataCloneError
	const plainCharacter = $state.snapshot(p.pending_character) as Character;

	try {
		// 1. Сохраняем в локальную базу игрока — теперь у него есть полноценный чарлист
		await saveCharacter(plainCharacter);

		// 2. Становимся «активным» участником с этим персонажем в комнате
		await joinRoom(room.id, p.display_name ?? 'Игрок', plainCharacter);

		// 3. Убираем «подарок» — он больше не pending
		await clearPendingCharacter(p.id);

		// 4. Обновляем данные
		participants = await getRoomParticipants(room.id);
		myCharacters = await listCharacters();

		alert(`Персонаж принят! Он появился в вашем списке на главной странице.`);
	} catch (e) {
		alert((e as Error).message);
	}
}

async function declineGift(p: RoomParticipant) {
	if (!confirm('Отклонить персонажа от мастера?')) return;
	if (!room) return;
	try {
		await clearPendingCharacter(p.id);
		participants = await getRoomParticipants(room.id);
	} catch (e) {
		alert((e as Error).message);
	}
}

	const deviceId = getDeviceId();
	const isMaster = $derived(room?.master_device_id === deviceId);

	onMount(async () => {
		const code = page.params.code;
		if (!code) {
			goto('/room');
			return;
		}

		try {
			const r = await findRoomByCode(code);
			if (!r) {
				error = 'Комната не найдена';
				loading = false;
				return;
			}
			room = r;
			setCurrentRoom(r.code);

			// Загружаем список локальных персонажей
			myCharacters = await listCharacters();

			// Присоединяемся (если уже в комнате — обновляем)
			const displayName = localStorage.getItem('parma_player_name') || 'Гость';
			const char = selectedCharacterId ? await getCharacter(selectedCharacterId) : null;
			await joinRoom(r.id, displayName, char);

			// Загружаем всех участников и броски
			participants = await getRoomParticipants(r.id);
			rolls = await getRecentRolls(r.id);

			// Подписываемся на real-time
			unsubscribe = subscribeToRoom(
				r.id,
				async () => {
					participants = await getRoomParticipants(r.id);
				},
				(roll) => {
					rolls = [roll, ...rolls].slice(0, 30);
				}
			);

			loading = false;
		} catch (e) {
			error = (e as Error).message;
			loading = false;
		}
	});

	onDestroy(() => {
		unsubscribe?.();
	});

	async function pickCharacter(charId: string) {
		selectedCharacterId = charId;
		if (!room) return;
		const char = await getCharacter(charId);
		const displayName = localStorage.getItem('parma_player_name') || 'Гость';
		await joinRoom(room.id, displayName, char);
		participants = await getRoomParticipants(room.id);
		showCharPicker = false;
	}

	async function syncSnapshot() {
		if (!room || !selectedCharacterId) return;
		const char = await getCharacter(selectedCharacterId);
		if (!char) return;
		await updateCharacterSnapshot(room.id, char);
		participants = await getRoomParticipants(room.id);
	}

		async function handleLeave() {
		if (!room) return;
		if (!confirm('Покинуть комнату?')) return;
		await leaveRoom(room.id);
		clearCurrentRoom();
		goto('/room');
	}

	function timeAgo(iso: string): string {
		const diff = Date.now() - new Date(iso).getTime();
		const sec = Math.floor(diff / 1000);
		if (sec < 10) return 'только что';
		if (sec < 60) return `${sec} сек назад`;
		const min = Math.floor(sec / 60);
		if (min < 60) return `${min} мин назад`;
		const hours = Math.floor(min / 60);
		return `${hours} ч назад`;
	}

	/** Перевод технического результата в читаемый текст */
	function translateResult(result: string): string {
		const map: Record<string, string> = {
			crit_success: 'Правь! Критический успех',
			success: 'Успех',
			fail: 'Провал',
			crit_fail: 'Навь! Критический провал',
			double: 'Явь! Дубль'
		};
		return map[result] ?? result;
	}

	/** Цветовая схема для результата */
	function resultColorClass(result: string): string {
		if (result === 'crit_success') return 'text-green-700 font-bold';
		if (result === 'success') return 'text-green-700';
		if (result === 'double') return 'text-blue-700 font-bold';
		if (result === 'crit_fail') return 'text-red-700 font-bold';
		if (result === 'fail') return 'text-red-600';
		return 'text-gray-700';
	}

	function rollSummary(roll: RoomRoll): { text: string; resultClass: string } {
		const d = roll.roll_data as Record<string, unknown>;
		const r = (d.result as string) ?? '';

		if (roll.roll_type === 'skill') {
			return {
				text: `${d.skillName}: к100 = ${d.roll} ≤ ${d.target} — ${translateResult(r)}`,
				resultClass: resultColorClass(r)
			};
		}
		if (roll.roll_type === 'characteristic') {
			return {
				text: `${d.charName}: к100 = ${d.roll} ≤ ${d.target} — ${translateResult(r)}`,
				resultClass: resultColorClass(r)
			};
		}
		if (roll.roll_type === 'initiative') {
			return {
				text: `Прыть: к20 = ${d.roll} + ${d.modifier} = ${d.total}`,
				resultClass: 'text-purple-700 font-bold'
			};
		}
		if (roll.roll_type === 'attack') {
			return {
				text: `Атака ${d.weaponName ?? ''}: к100 = ${d.roll} ≤ ${d.target} — ${translateResult(r)}`,
				resultClass: resultColorClass(r)
			};
		}
		if (roll.roll_type === 'spell') {
			return {
				text: `Заклинание ${d.spellName ?? ''}: к100 = ${d.roll} ≤ ${d.target} — ${translateResult(r)}${d.damage ? `, урон ${d.damage}` : ''}`,
				resultClass: resultColorClass(r)
			};
		}
		return { text: JSON.stringify(d), resultClass: 'text-gray-700' };
	}
	async function deleteThisRoom() {
	if (!room) return;
	if (!confirm(`Удалить комнату «${room.name || room.code}»? Все данные (участники, броски) будут стёрты безвозвратно.`)) return;
	try {
		await deleteRoom(room.id);
		clearCurrentRoom();
		goto('/room');
	} catch (e) {
		alert((e as Error).message);
	}
}
</script>

<main class="max-w-4xl mx-auto p-6">
	{#if loading}
		<p class="text-gray-500">Загрузка комнаты…</p>
	{:else if error}
		<div class="border-2 border-red-300 bg-red-50 rounded-lg p-6 text-center">
			<div class="text-red-800 font-semibold mb-2">{error}</div>
			<a href="/room" class="text-sm text-red-700 hover:underline">← Вернуться</a>
		</div>
	{:else if room}
		<header class="mb-6 flex justify-between items-start flex-wrap gap-3">
			<div>
				<div class="text-sm text-gray-500">{isMaster ? 'Вы — мастер' : 'Вы — игрок'}</div>
				<h1 class="text-3xl font-bold">{room.name || 'Комната'}</h1>
				<div class="text-sm text-gray-600 mt-1">
					Код для входа:
					<span class="font-mono text-2xl font-bold tracking-widest text-blue-700 ml-2">
						{room.code}
					</span>
				</div>
			</div>
			<div class="flex gap-2">
				<button
					class="px-3 py-2 border rounded hover:bg-gray-50 text-sm"
					onclick={() => (showCharPicker = !showCharPicker)}>
					🎭 Сменить персонажа
				</button>
				{#if selectedCharacterId}
					<button
						class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
						onclick={syncSnapshot}>
						↻ Обновить снимок
					</button>
				{/if}
				<button
					class="px-3 py-2 text-red-600 border border-red-300 rounded hover:bg-red-50 text-sm"
					onclick={handleLeave}>
					Выйти
				</button>
				{#if isMaster}
					<button
						class="px-3 py-2 text-red-700 border border-red-400 rounded hover:bg-red-50 text-sm"
						onclick={deleteThisRoom}>
						Удалить комнату
					</button>
				{/if}
			</div>
		</header>

		{#if showCharPicker}
			<div class="border rounded-lg bg-blue-50 p-4 mb-4">
				<div class="text-sm font-semibold mb-2">Выберите персонажа:</div>
				<div class="space-y-1 max-h-64 overflow-y-auto">
					{#each myCharacters as c}
						<button
							class="w-full text-left px-3 py-2 border rounded hover:bg-white text-sm {selectedCharacterId === c.id ? 'bg-white border-blue-500' : 'bg-white/50'}"
							onclick={() => pickCharacter(c.id)}>
							{c.name || '(без имени)'} · {c.level} ур.
						</button>
					{/each}
					{#if myCharacters.length === 0}
						<p class="text-sm text-gray-500">
							У вас нет персонажей. <a href="/new" class="text-blue-600 hover:underline">Создать</a>
						</p>
					{/if}
				</div>
			</div>
		{/if}

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Участники -->
			<section>
				<h2 class="text-lg font-semibold mb-3">Участники ({participants.length})</h2>
				<div class="space-y-2">
					{#each participants as p (p.id)}
						<div class="border rounded-lg p-3 bg-white">
							<div class="flex justify-between items-start mb-1">
								<div class="font-semibold">
									{p.display_name || 'Безымянный'}
									{#if p.role === 'master'}
										<span class="text-xs text-amber-700 ml-2">мастер</span>
									{/if}
									{#if p.device_id === deviceId}
										<span class="text-xs text-blue-700 ml-2">вы</span>
									{/if}
								</div>
								<!-- Кнопка мастера: подарить персонажа игроку -->
								{#if isMaster && p.device_id !== deviceId && p.role !== 'master'}
									<button
										class="mt-2 px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
										onclick={() => openGiftForm(p)}>
										🎁 Дать персонажа
									</button>
								{/if}

								<!-- Уведомление для игрока: мастер передал персонажа -->
								{#if p.device_id === deviceId && p.pending_character}
									<div class="mt-2 border-2 border-purple-400 bg-purple-50 rounded-lg p-2">
										<div class="text-xs font-semibold text-purple-900 mb-1">
											🎁 Мастер передал вам персонажа
										</div>
										<div class="text-sm font-medium">{p.pending_character.name || '(без имени)'}</div>
										<div class="text-xs text-purple-700 mb-2">
											{p.pending_character.level} ур. · {RACES.find(r => r.id === p.pending_character?.raceId)?.name ?? '—'}
										</div>
										<div class="flex gap-1">
											<button
												class="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
												onclick={() => acceptGift(p)}>
												Принять
											</button>
											<button
												class="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50"
												onclick={() => declineGift(p)}>
												Отклонить
											</button>
										</div>
									</div>
								{/if}
							</div>
							{#if p.character_snapshot}
								<div class="text-sm text-gray-600">
									{p.character_snapshot.name} · {p.character_snapshot.level} ур.
								</div>
								<div class="text-xs text-gray-500 mt-1">
									ЖВЧ:
									<span class="font-semibold">
										{p.character_snapshot.currentResources?.hp ?? '—'}
									</span>
								</div>
							{:else}
								<div class="text-sm text-gray-400 italic">Персонаж не выбран</div>
							{/if}
						</div>
					{/each}
				</div>
			</section>

			<!-- Лог бросков -->
			<section>
				<h2 class="text-lg font-semibold mb-3">Броски</h2>
				{#if rolls.length === 0}
					<p class="text-sm text-gray-500">Пока никто не бросал кубик.</p>
				{:else}
					<div class="space-y-2 max-h-96 overflow-y-auto">
						{#each rolls as roll (roll.id)}
						{@const summary = rollSummary(roll)}
							<div class="border rounded-lg p-2 bg-white text-sm">
								<div class="flex justify-between items-baseline">
									<div class="font-semibold">{roll.character_name || 'Кто-то'}</div>
									<div class="text-xs text-gray-500">{timeAgo(roll.created_at)}</div>
								</div>
								<div class="{summary.resultClass} mt-1">{summary.text}</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		</div>
	{/if}
	{#if showGiftForm && giftTarget}
		<div
			class="fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center p-4"
			onclick={() => (showGiftForm = false)}
			role="presentation"
		>
			<div
				class="bg-white rounded-lg max-w-md w-full p-4 max-h-[90vh] overflow-y-auto z-[9999]"
				onclick={(e) => e.stopPropagation()}
				role="dialog"
			>
				<h3 class="text-lg font-semibold mb-3">
					Передать персонажа игроку
					<span class="text-purple-700">{giftTarget.display_name || 'без имени'}</span>
				</h3>

				{#if myCharacters.length === 0}
					<p class="text-sm text-gray-500 mb-4">
						У вас нет сохранённых персонажей.
						<a href="/new" class="text-blue-600 hover:underline">Создать персонажа</a>
					</p>
				{:else}
					<div class="text-xs text-gray-500 mb-2">
						Выберите чарлист для передачи. Копия появится у игрока, ваш оригинал останется у вас.
					</div>
					<div class="space-y-1 max-h-[60vh] overflow-y-auto mb-3">
						{#each myCharacters as c (c.id)}
							{#if !(room?.gifted_character_ids ?? []).includes(c.id)}
								<button onclick={() => confirmGift(c)}>
									{c.name || '(без имени)'} · {c.level} ур.
								</button>
							{/if}
						{/each}
					</div>
				{/if}

				<div class="flex gap-2">
					<button
						class="flex-1 px-3 py-2 border rounded hover:bg-gray-50"
						onclick={() => {
							showGiftForm = false;
							giftTarget = null;
						}}
					>
						Отмена
					</button>
				</div>
			</div>
		</div>
	{/if}
</main>