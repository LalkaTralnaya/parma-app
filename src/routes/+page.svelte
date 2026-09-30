<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { listCharacters, deleteCharacter } from '../lib/db/characters';
	import { RACES } from '../lib/rules/races';
	import type { Character } from '../lib/types';

	let characters = $state<Character[]>([]);
	let loading = $state(true);

	async function load() {
		characters = await listCharacters();
		loading = false;
	}

	async function remove(id: string, e: MouseEvent) {
		e.stopPropagation();
		if (!confirm('Удалить персонажа?')) return;
		await deleteCharacter(id);
		await load();
	}

	function raceName(id: string) {
		return RACES.find((r) => r.id === id)?.name ?? id;
	}

	onMount(load);
</script>

<main class="max-w-3xl mx-auto p-6">
	<header class="flex justify-between items-center mb-6 flex-wrap gap-2">
		<h1 class="text-3xl font-bold">Парма</h1>
		<div class="flex gap-2">
			<a
				href="/gm"
				class="px-4 py-2 border border-purple-300 text-purple-700 rounded hover:bg-purple-50">
				🎲 Режим мастера
			</a>
			<a
				href="/new"
				class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
				+ Новый персонаж
			</a>
		</div>
	</header>

	{#if loading}
		<p class="text-gray-500">Загрузка…</p>
	{:else if characters.length === 0}
		<div class="border-2 border-dashed rounded-lg p-10 text-center text-gray-500">
			<p class="mb-4 text-lg">Пока нет ни одного персонажа</p>
			<a
				href="/new"
				class="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
				Создать первого
			</a>
		</div>
	{:else}
		<ul class="space-y-2">
			{#each characters as c (c.id)}
				<li
					class="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
					onclick={() => goto(`/char/${c.id}`)}>
					<div>
						<div class="font-semibold">{c.name || '(без имени)'}</div>
						<div class="text-sm text-gray-500">
							{raceName(c.raceId)} · {c.level} уровень
						</div>
					</div>
					<button
						class="text-red-500 hover:text-red-700 px-3 py-1 text-xl"
						onclick={(e) => remove(c.id, e)}
						title="Удалить">
						✕
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</main>