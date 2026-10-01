<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import {
	findRoomByCode, joinRoom, getRoomParticipants, getRecentRolls,
	leaveRoom, updateCharacterSnapshot, subscribeToRoom,
	setCurrentRoom, clearCurrentRoom,
	type Room, type RoomParticipant, type RoomRoll
} from '../../../lib/engine/rooms';
	import { listCharacters, getCharacter } from '../../../lib/db/characters';
	import { getDeviceId } from '../../../lib/supabase/client';
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
</main>