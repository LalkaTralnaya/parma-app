<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
	createRoom,
	findRoomByCode,
	joinRoom,
	listMyMasterRooms,
	deleteRoom,
	touchRoom,
	type Room
} from '$lib/engine/rooms';
	import { getDeviceId, getPlayerName, setPlayerName } from '../../lib/supabase/client';

	let mode = $state<'choose' | 'create' | 'join'>('choose');
	let roomName = $state('');
	let code = $state('');
	let name = $state('');
	let busy = $state(false);
	let error = $state('');

	onMount(() => {
		name = getPlayerName();
	});

	async function handleCreate() {
		if (!name.trim()) {
			error = 'Введите имя';
			return;
		}
		error = '';
		busy = true;
		try {
			setPlayerName(name.trim());
			const room = await createRoom(roomName.trim() || `Комната ${name.trim()}`);
			await goto(`/room/${room.code}`);
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	}

	async function handleJoin() {
		if (!name.trim()) {
			error = 'Введите имя';
			return;
		}
		if (!code.trim()) {
			error = 'Введите код комнаты';
			return;
		}
		error = '';
		busy = true;
		try {
			setPlayerName(name.trim());
			const room = await findRoomByCode(code.trim());
			if (!room) {
				error = 'Комната с таким кодом не найдена';
				return;
			}
			await goto(`/room/${room.code}`);
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	}
	let myRooms = $state<Room[]>([]);

async function loadMyRooms() {
	try {
		myRooms = await listMyMasterRooms();
	} catch {
		myRooms = [];
	}
}

async function openMyRoom(room: Room) {
	await joinRoom(room.id, localStorage.getItem('parma_player_name') || 'Мастер', null);
	await touchRoom(room.id);
	goto(`/room/${room.code}`);
}

async function removeMyRoom(room: Room) {
	if (!confirm(`Удалить комнату «${room.name || room.code}»? Все броски и участники будут удалены.`)) return;
	try {
		await deleteRoom(room.id);
		await loadMyRooms();
	} catch (e) {
		alert((e as Error).message);
	}
}

onMount(() => {
	loadMyRooms();
});
</script>

<main class="max-w-2xl mx-auto p-6">
	<header class="mb-6">
		<a href="/" class="text-sm text-gray-500 hover:text-gray-700">← На главную</a>
		<h1 class="text-3xl font-bold mt-2">Комната</h1>
		<p class="text-gray-600">Собирайтесь вместе за одним столом</p>
	</header>
{#if myRooms.length > 0}
	<section class="mb-6 border rounded-lg bg-white p-4">
		<h2 class="text-lg font-semibold mb-3">Мои комнаты</h2>
		<div class="space-y-2">
			{#each myRooms as r (r.id)}
				<div class="flex items-center gap-2 border rounded p-2 bg-gray-50">
					<div class="flex-1 min-w-0">
						<div class="font-semibold truncate">{r.name || 'Без названия'}</div>
						<div class="text-xs text-gray-500">
							Код: <span class="font-mono font-bold">{r.code}</span>
							· создана {new Date(r.created_at).toLocaleDateString('ru-RU')}
						</div>
					</div>
					<button
						class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
						onclick={() => openMyRoom(r)}>
						Открыть
					</button>
					<button
						class="px-2 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
						onclick={() => removeMyRoom(r)}>
						Удалить
					</button>
				</div>
			{/each}
		</div>
	</section>
{/if}
	{#if mode === 'choose'}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<button
				class="border-2 border-green-300 rounded-lg p-6 text-left hover:bg-green-50 transition-colors"
				onclick={() => (mode = 'create')}>
				<div class="text-2xl font-bold text-green-800 mb-2">Я мастер</div>
				<div class="text-sm text-gray-600">
					Создать комнату и получить код для игроков
				</div>
			</button>

			<button
				class="border-2 border-blue-300 rounded-lg p-6 text-left hover:bg-blue-50 transition-colors"
				onclick={() => (mode = 'join')}>
				<div class="text-2xl font-bold text-blue-800 mb-2">Я игрок</div>
				<div class="text-sm text-gray-600">
					Войти по коду мастера
				</div>
			</button>
		</div>
	{:else if mode === 'create'}
		<div class="border rounded-lg p-6 bg-white space-y-4">
			<h2 class="text-xl font-semibold">Создать комнату</h2>

			<div>
				<label for="master-name" class="block text-sm text-gray-600 mb-1">Ваше имя</label>
				<input
					id="master-name"
					type="text"
					bind:value={name}
					placeholder="Например, Мастер Владислав"
					class="w-full px-3 py-2 border rounded" />
			</div>

			<div>
				<label for="room-name" class="block text-sm text-gray-600 mb-1">Название комнаты (необязательно)</label>
				<input
					id="room-name"
					type="text"
					bind:value={roomName}
					placeholder="Погоня за полуденницей"
					class="w-full px-3 py-2 border rounded" />
			</div>

			{#if error}
				<div class="text-sm text-red-600 p-2 bg-red-50 rounded">{error}</div>
			{/if}

			<div class="flex gap-2">
				<button
					class="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
					disabled={busy}
					onclick={handleCreate}>
					{busy ? 'Создаём…' : 'Создать комнату'}
				</button>
				<button
					class="px-4 py-2 border rounded hover:bg-gray-50"
					onclick={() => { mode = 'choose'; error = ''; }}>
					Назад
				</button>
			</div>
		</div>
	{:else if mode === 'join'}
		<div class="border rounded-lg p-6 bg-white space-y-4">
			<h2 class="text-xl font-semibold">Войти в комнату</h2>

			<div>
				<label for="player-name" class="block text-sm text-gray-600 mb-1">Ваше имя</label>
				<input
					id="player-name"
					type="text"
					bind:value={name}
					placeholder="Например, Радомир"
					class="w-full px-3 py-2 border rounded" />
			</div>

			<div>
				<label for="room-code" class="block text-sm text-gray-600 mb-1">Код комнаты</label>
				<input
					id="room-code"
					type="text"
					bind:value={code}
					placeholder="ABC123"
					maxlength="6"
					class="w-full px-3 py-2 border rounded text-center text-2xl font-mono tracking-widest uppercase" />
			</div>

			{#if error}
				<div class="text-sm text-red-600 p-2 bg-red-50 rounded">{error}</div>
			{/if}

			<div class="flex gap-2">
				<button
					class="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
					disabled={busy}
					onclick={handleJoin}>
					{busy ? 'Входим…' : 'Войти'}
				</button>
				<button
					class="px-4 py-2 border rounded hover:bg-gray-50"
					onclick={() => { mode = 'choose'; error = ''; }}>
					Назад
				</button>
			</div>
		</div>
	{/if}
</main>
