<script lang="ts">
	import { goto } from '$app/navigation';
	import { RACES } from '../../lib/rules/races';
	import { SKILLS } from '../../lib/rules/skills';
	import { CHARACTERISTICS } from '../../lib/rules/characteristics';
	import { createEmptyCharacter, saveCharacter, giveStartingInventory } from '../../lib/db/characters';
	import { BACKGROUNDS } from '../../lib/rules/backgrounds';

	let name = $state('');
	let raceId = $state('human');
	let raceVariantId = $state('');
	let raceChoice = $state('strength');
	let skillPoints = $state<Record<string, number>>({});
	let backgroundId = $state('blacksmith');

	const selectedRace = $derived(RACES.find((r) => r.id === raceId)!);
	const spentPoints = $derived(Object.values(skillPoints).reduce((a, b) => a + b, 0));
	const pointsLeft = $derived(10 - spentPoints);
	const selectedBackground = $derived(BACKGROUNDS.find((b) => b.id === backgroundId)!);

	function increment(skillId: string) {
		const current = skillPoints[skillId] ?? 0;
		if (current >= 2) return;
		if (spentPoints >= 10) return;
		skillPoints = { ...skillPoints, [skillId]: current + 1 };
	}

	function decrement(skillId: string) {
		const current = skillPoints[skillId] ?? 0;
		if (current <= 0) return;
		skillPoints = { ...skillPoints, [skillId]: current - 1 };
	}

	async function save() {
		if (!name.trim()) {
			alert('Введите имя персонажа');
			return;
		}
		const char = createEmptyCharacter();
		char.name = name.trim();
		char.raceId = raceId;
		char.raceVariantId = raceVariantId || undefined;
		char.raceChoice = selectedRace.bonusChoice ? raceChoice : undefined;
		char.backgroundId = backgroundId;
		char.skillPoints = { ...skillPoints };
		giveStartingInventory(char, backgroundId);
		await saveCharacter(char);
		goto(`/char/${char.id}`);
	}
</script>

<main class="max-w-3xl mx-auto p-6 space-y-6">
	<header class="flex justify-between items-center">
		<h1 class="text-3xl font-bold">Новый персонаж</h1>
		<a href="/" class="px-3 py-2 border rounded hover:bg-gray-50">← Отмена</a>
	</header>

	<!-- Имя -->
	<section class="border rounded-lg p-4 bg-white">
		<label class="block mb-2 font-semibold">Имя персонажа</label>
		<input
			type="text"
			bind:value={name}
			placeholder="Например, Радомир"
			class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
	</section>

	<!-- Раса -->
	<section class="border rounded-lg p-4 bg-white space-y-3">
		<div>
			<label class="block mb-2 font-semibold">Раса</label>
			<select
				bind:value={raceId}
				class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
				{#each RACES as r}
					<option value={r.id}>{r.name}</option>
				{/each}
			</select>
			<p class="text-sm text-gray-500 mt-2">{selectedRace.description}</p>
		</div>

		{#if selectedRace.variants}
			<div>
				<label class="block mb-2 font-semibold">Вариант расы</label>
				<select
					bind:value={raceVariantId}
					class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
					<option value="">— выберите —</option>
					{#each selectedRace.variants as v}
						<option value={v.id}>{v.name} — {v.note}</option>
					{/each}
				</select>
			</div>
		{/if}

		{#if selectedRace.bonusChoice}
			<div>
				<label class="block mb-2 font-semibold">
					+{selectedRace.bonusChoice.amount} к характеристике (на выбор)
				</label>
				<select
					bind:value={raceChoice}
					class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
					{#each CHARACTERISTICS as c}
						{#if selectedRace.bonusChoice!.from.includes(c.id)}
							<option value={c.id}>{c.name}</option>
						{/if}
					{/each}
				</select>
			</div>
		{/if}

		{#if selectedRace.bonus}
			<div class="text-sm text-gray-600">
				Бонусы расы:
				{#each Object.entries(selectedRace.bonus) as [key, val]}
					{@const c = CHARACTERISTICS.find((x) => x.id === key)}
					<span class="mr-3">+{val} {c?.name}</span>
				{/each}
			</div>
		{/if}
	</section>
	<!-- Предыстория -->
	<section class="border rounded-lg p-4 bg-white space-y-3">
		<div>
			<label class="block mb-2 font-semibold">Предыстория</label>
			<select
				bind:value={backgroundId}
				class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
				{#each BACKGROUNDS as bg}
					<option value={bg.id}>{bg.name} {bg.subtitle}</option>
				{/each}
			</select>
		</div>

		<p class="text-sm text-gray-600">{selectedBackground.description}</p>

		<div class="text-sm">
			<span class="font-semibold">Бонусы к навыкам: </span>
			{#each Object.entries(selectedBackground.skillBonuses) as [skillId, bonus]}
				{@const skillName = SKILLS.find((s) => s.id === skillId)?.name ?? skillId}
				<span class="mr-3 text-green-700">{skillName} +{bonus}</span>
			{/each}
		</div>

		<div class="border-t pt-3">
			<div class="font-semibold text-sm mb-1">Особенность «{selectedBackground.feature.name}»</div>
			<p class="text-sm text-gray-600">{selectedBackground.feature.description}</p>
		</div>

		<div class="text-xs text-gray-500">
			<strong>Снаряжение:</strong> {selectedBackground.equipment}
			<br />
			<strong>Оружие:</strong> {selectedBackground.weapon}
		</div>
	</section>
	<!-- Навыки -->
	<section class="border rounded-lg p-4 bg-white">
		<div class="flex justify-between items-center mb-3">
			<h2 class="font-semibold text-lg">Очки навыков</h2>
			<div class="text-sm">
				Осталось: <span class="font-bold {pointsLeft === 0 ? 'text-green-700' : 'text-blue-700'}">{pointsLeft}</span> из 10
			</div>
		</div>
		<p class="text-xs text-gray-500 mb-3">Максимум 2 очка в один навык.</p>

		<div class="space-y-4">
			{#each CHARACTERISTICS as c}
				<div>
					<h3 class="text-sm font-semibold text-gray-700 mb-1">{c.name}</h3>
					<div class="grid grid-cols-2 gap-x-4 gap-y-1">
						{#each SKILLS.filter((s) => s.parent === c.id) as s}
							{@const pts = skillPoints[s.id] ?? 0}
							<div class="flex items-center justify-between py-1 border-b">
								<span class="text-sm">{s.name}</span>
								<div class="flex items-center gap-1">
									<button
										class="w-7 h-7 rounded border hover:bg-gray-100 disabled:opacity-30"
										disabled={pts <= 0}
										onclick={() => decrement(s.id)}>−</button>
									<span class="w-6 text-center font-mono">{pts}</span>
									<button
										class="w-7 h-7 rounded border hover:bg-gray-100 disabled:opacity-30"
										disabled={pts >= 2 || spentPoints >= 10}
										onclick={() => increment(s.id)}>+</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Кнопка -->
	<div class="flex gap-3">
		<button
			class="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
			onclick={save}>
			Сохранить персонажа
		</button>
	</div>
</main>