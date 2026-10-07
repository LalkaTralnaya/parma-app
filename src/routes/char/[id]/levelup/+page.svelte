<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getCharacter, saveCharacter } from '../../../../lib/db/characters';
	import { CHARACTERISTICS } from '../../../../lib/rules/characteristics';
	import {
		rollResourceGrowth,
		applyLevelUp,
		type ResourceLevelRoll
	} from '../../../../lib/engine/levelup';
	import { getCharacteristicValue, getModifier } from '../../../../lib/engine/character';
	import type { Character } from '$lib/type';

	let char = $state<Character | null>(null);
	let loading = $state(true);
	let charStatBonus = $state('strength');
	let rolls = $state<ResourceLevelRoll[] | null>(null);
	let saving = $state(false);

	onMount(async () => {
		const found = await getCharacter(page.params.id ?? '');
		if (!found) {
			goto('/');
			return;
		}
		char = found;
		charStatBonus = 'strength';
		loading = false;
	});

	function doRoll() {
		if (!char) return;
		rolls = rollResourceGrowth(char, charStatBonus);
	}

	async function confirm() {
		if (!char || !rolls) return;
		saving = true;
		const updated = applyLevelUp(char, charStatBonus, rolls);
		await saveCharacter($state.snapshot(updated) as Character);
		goto(`/char/${char.id}`);
	}

	const newCharValue = $derived(
		char ? getCharacteristicValue(char, charStatBonus) + 6 : 0
	);
	const newCharMod = $derived(getModifier(newCharValue));
</script>

<main class="max-w-3xl mx-auto p-6 space-y-6">
	{#if loading}
		<p class="text-gray-500">Загрузка…</p>
	{:else if char}
		<header class="flex justify-between items-center">
			<div>
				<h1 class="text-3xl font-bold">Рост</h1>
				<p class="text-gray-600">{char.name} — сейчас {char.level} уровень → станет {char.level + 1}</p>
			</div>
			<a href="/char/{char.id}" class="px-3 py-2 border rounded hover:bg-gray-50">← Отмена</a>
		</header>

		<!-- Выбор характеристики -->
		<section class="border rounded-lg p-4 bg-white space-y-3">
			<h2 class="font-semibold text-lg">Шаг 1. Повышение характеристики</h2>
			<p class="text-sm text-gray-600">
				Выбери характеристику, которая получит <strong>+6</strong>. Навыки вырастут автоматически по её новому модификатору. Умения можно будет изучить за очки по порогам 42 / 54 / 72.
			</p>

			<div class="grid grid-cols-5 gap-2">
				{#each CHARACTERISTICS as c}
					{@const cur = getCharacteristicValue(char, c.id)}
					{@const wouldBe = c.id === charStatBonus ? cur + 6 : cur}
					<label
						class="border-2 rounded-lg p-3 text-center cursor-pointer transition
							{c.id === charStatBonus ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-400'}">
						<input
							type="radio"
							name="stat"
							value={c.id}
							bind:group={charStatBonus}
							onchange={() => (rolls = null)}
							class="sr-only" />
						<div class="text-xs uppercase text-gray-500">{c.short}</div>
						<div class="text-lg font-bold">
							{c.id === charStatBonus ? wouldBe : cur}
							{#if c.id === charStatBonus}
								<span class="text-green-700 text-xs">(+6)</span>
							{/if}
						</div>
						<div class="text-xs text-green-700">
							+{c.id === charStatBonus ? getModifier(wouldBe) : getModifier(cur)}
						</div>
					</label>
				{/each}
			</div>

			<p class="text-xs text-gray-500">
				Модификатор {CHARACTERISTICS.find((c) => c.id === charStatBonus)?.name}
				будет <strong>+{newCharMod}</strong> (было +{getModifier(getCharacteristicValue(char, charStatBonus))}).
			</p>
		</section>

		<!-- Бросок ресурсов -->
		<section class="border rounded-lg p-4 bg-white space-y-3">
			<h2 class="font-semibold text-lg">Шаг 2. Бросок роста ресурсов</h2>
			<p class="text-sm text-gray-600">
				Каждый ресурс получает бросок куба + модификатор своей характеристики.
				Модификаторы уже посчитаны с учётом шага 1.
			</p>

			{#if !rolls}
				<button
					class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
					onclick={doRoll}>
					Бросить кубы на все 5 ресурсов
				</button>
			{:else}
				<div class="grid grid-cols-5 gap-3">
					{#each rolls as r}
						<div class="border rounded-lg p-3 text-center bg-gray-50">
							<div class="text-xs uppercase text-gray-500">{r.resourceShort}</div>
							<div class="text-xs text-gray-500 mt-1">{r.dice} + {r.modValue} мод.</div>
							<div class="text-2xl font-bold text-blue-700 mt-1">+{r.total}</div>
							<div class="text-xs text-gray-500">
								на кубе: {r.dieResult}
							</div>
						</div>
					{/each}
				</div>
				<p class="text-xs text-gray-500">
					Эти значения прибавятся к максимуму каждого ресурса. История сохранится.
				</p>
			{/if}
		</section>

		<!-- Подтверждение -->
		{#if rolls}
			<section class="border-2 border-blue-300 rounded-lg p-4 bg-blue-50 space-y-3">
				<h2 class="font-semibold text-lg">Шаг 3. Подтвердить</h2>
				<ul class="text-sm space-y-1">
					<li>• Уровень: <strong>{char.level} → {char.level + 1}</strong></li>
					<li>• Очки умений: <strong>+5</strong> → {(char.abilityPoints ?? 0) + 5} доступно для изучения</li>
					<li>• {CHARACTERISTICS.find((c) => c.id === charStatBonus)?.name}:
						<strong>+6</strong> → {newCharValue} (мод. +{newCharMod})</li>
					<li>• ЗДР: +{rolls.find((r) => r.resourceId === 'hp')?.total ?? 0}</li>
					<li>• ЖИВ: +{rolls.find((r) => r.resourceId === 'mana')?.total ?? 0}</li>
					<li>• БДР: +{rolls.find((r) => r.resourceId === 'stamina')?.total ?? 0}</li>
					<li>• ВЛН: +{rolls.find((r) => r.resourceId === 'influence')?.total ?? 0}</li>
					<li>• БЛГ: +{rolls.find((r) => r.resourceId === 'grace')?.total ?? 0}</li>
				</ul>
				<div class="flex gap-2">
					<button
						class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold disabled:opacity-50"
						onclick={confirm}
						disabled={saving}>
						{saving ? 'Сохранение…' : 'Подтвердить и поднять уровень'}
					</button>
					<button
						class="px-4 py-2 border rounded hover:bg-gray-100"
						onclick={() => (rolls = null)}>
						Перебросить
					</button>
				</div>
			</section>
		{/if}
	{/if}
</main>
