<script lang="ts">
	import RacePortrait from '$lib/components/RacePortrait.svelte';
	import RaceSymbol from '$lib/components/RaceSymbol.svelte';
	import GuidedTour from '$lib/components/GuidedTour.svelte';
	import { CREATION_TOUR } from '$lib/ui/learning-tours';
	import BackgroundPortrait from '$lib/components/BackgroundPortrait.svelte';
	import { page } from '$app/state';
	import { getCustomAdventure, saveCustomAdventure } from '$lib/db/customAdventures';
	import { getResourceMax } from '$lib/engine/character';
	import { goto } from '$app/navigation';
	import { RACES } from '../../lib/rules/races';
	import { SKILLS } from '../../lib/rules/skills';
	import { CHARACTERISTICS } from '../../lib/rules/characteristics';
	import { createEmptyCharacter, saveCharacter, giveStartingInventory } from '../../lib/db/characters';
	import { BACKGROUNDS } from '../../lib/rules/backgrounds';

	let name = $state('');
	let saving = $state(false);
	let error = $state('');
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
		if (saving) return;
		error = '';
		if (!name.trim()) {
			error = 'Введите имя персонажа.';
			document.getElementById('character-name')?.focus();
			return;
		}
		saving = true;
		try {
		const char = createEmptyCharacter();
		char.name = name.trim();
		char.raceId = raceId;
		char.raceVariantId = raceVariantId || undefined;
		char.raceChoice = selectedRace.bonusChoice ? raceChoice : undefined;
		char.backgroundId = backgroundId;
		char.skillPoints = { ...skillPoints };
		giveStartingInventory(char, backgroundId);
  const adventureId=page.url.searchParams.get('adventure');
  if(adventureId){const record=await getCustomAdventure(adventureId);if(!record)throw new Error('Приключение не найдено.');for(const resource of Object.keys(char.currentResources))char.currentResources[resource]=getResourceMax(char,resource);await saveCharacter(char);record.readyCharacters.push(char);await saveCustomAdventure(record);await goto(`/adventures/custom/${adventureId}/edit`);}
  else {await saveCharacter(char);await goto(`/char/${char.id}`);}
		} catch {
			error = 'Не удалось сохранить персонажа. Проверьте доступ к хранилищу браузера и повторите попытку.';
		} finally { saving = false; }
	}
</script>

<svelte:head><title>Создание персонажа — Парма</title></svelte:head>
<main class="max-w-3xl mx-auto p-6 space-y-6">
	<header class="flex justify-between items-center">
		<h1 class="text-3xl font-bold">{page.url.searchParams.get("adventure") ? "Герой для приключения" : "Новый персонаж"}</h1>
		<div class="flex flex-wrap items-center gap-2"><GuidedTour steps={CREATION_TOUR} title="Создание персонажа" autoStart={page.url.searchParams.get('learn') === '1'} /><a href={page.url.searchParams.get("adventure") ? `/adventures/custom/${page.url.searchParams.get("adventure")}/edit` : "/"} class="px-3 py-2 border rounded hover:bg-gray-50">← Отмена</a></div>
	</header>
	<p class="notice">Имя, происхождение и первые умения — начало вашей истории. Выберите расу и предысторию, затем распределите до 10 очков навыков. При создании персонаж также получает 4 очка умений для дерева развития.</p>

	<!-- Имя -->
	<section class="border rounded-lg p-4 bg-white">
		<label for="character-name" class="block mb-2 font-semibold">Имя персонажа</label>
		<input
			id="character-name" type="text" required aria-invalid={!!error && !name.trim()}
			bind:value={name}
			placeholder="Например, Радомир"
			class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
	</section>

	<!-- Раса -->
	<section class="border rounded-lg p-4 bg-white">
    <div class="race-layout">
      <div class="race-art"><RacePortrait raceId={raceId} name={selectedRace.name} /><RaceSymbol id={raceId} /></div>
      <div class="race-fields space-y-3">
		<div>
			<label for="raceId" class="block mb-2 font-semibold">Раса</label>
			<select
				id="raceId" bind:value={raceId} onchange={(event) => { raceVariantId = ''; raceChoice = RACES.find(r => r.id === event.currentTarget.value)?.bonusChoice?.from[0] ?? 'strength'; }}
				class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
				{#each RACES as r}
					<option value={r.id}>{r.name}</option>
				{/each}
			</select>
			<p class="text-sm text-gray-500 mt-2">{selectedRace.description}</p>
		</div>

		{#if selectedRace.variants}
			<div>
				<label for="raceVariantId" class="block mb-2 font-semibold">Вариант расы</label>
				<select
					id="raceVariantId" bind:value={raceVariantId}
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
				<label for="race-choice" class="block mb-2 font-semibold">
					+{selectedRace.bonusChoice.amount} к характеристике (на выбор)
				</label>
				<select
					id="race-choice" bind:value={raceChoice}
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
      </div>
    </div>
	</section>
	<!-- Предыстория -->
	<section class="border rounded-lg p-4 bg-white space-y-3">
		<div>
			<label for="backgroundId" class="block mb-2 font-semibold">Предыстория</label>
			<select
				id="backgroundId" bind:value={backgroundId}
				class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
				{#each BACKGROUNDS as bg}
					<option value={bg.id}>{bg.name} {bg.subtitle}</option>
				{/each}
			</select>
		</div>

		<div class="background-intro illustrated">
      <BackgroundPortrait backgroundId={backgroundId} name={selectedBackground.name} />
      <p class="text-sm text-gray-600">{selectedBackground.description}</p>
    </div>

		<div class="text-sm">
			<span class="font-semibold">Бонусы к навыкам: </span>
			{#each Object.entries(selectedBackground.skillBonuses) as [skillId, bonus]}
				{@const skillName = SKILLS.find((s) => s.id === skillId)?.name ?? skillId}
				<span class="mr-3 text-green-700">{skillName} +{bonus}</span>
			{/each}
		</div>

		<div class="border-t pt-3">
			<div class="font-semibold text-sm mb-1">{selectedBackground.passiveFeature ? 'Умения предыстории' : `Особенность «${selectedBackground.feature.name}»`}</div>
			<p class="text-sm text-gray-600 whitespace-pre-line whitespace-pre-line">{selectedBackground.feature.description}</p>
		</div>

		<div class="text-xs text-gray-500">
			<strong>Снаряжение:</strong> {selectedBackground.equipment}
			<br />
			<strong>Оружие:</strong> {selectedBackground.weapon}
		</div>
	</section>
	<!-- Навыки -->
	<section id="creation-skills" class="border rounded-lg p-4 bg-white">
		<div class="flex justify-between items-center mb-3">
			<h2 class="font-semibold text-lg">Очки навыков</h2>
			<div class="text-sm">
				Осталось: <span class="font-bold {pointsLeft === 0 ? 'text-green-700' : 'text-blue-700'}">{pointsLeft}</span> из 10
			</div>
		</div>
		<progress class="resource-meter" max="10" value={spentPoints} aria-label="Распределено очков навыков">{spentPoints} из 10</progress>
		<p class="text-sm text-gray-500 mb-3">Максимум 2 очка в один навык.</p>
		<p class="text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded p-3 mb-4">При создании персонаж получает отдельно <strong>4 очка умений</strong>. Они сохранятся на листе и будут доступны в разделе «Умения» после создания героя; неизрасходованные очки можно оставить на будущее.</p>

		<div class="space-y-4">
			{#each CHARACTERISTICS as c}
				<div>
					<h3 class="text-sm font-semibold text-gray-700 mb-1">{c.name}</h3>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
						{#each SKILLS.filter((s) => s.parent === c.id) as s}
							{@const pts = skillPoints[s.id] ?? 0}
							<div class="flex items-center justify-between py-1 border-b">
								<span class="text-sm">{s.name}</span>
								<div class="flex items-center gap-1">
									<button
										class="w-11 h-11 rounded border hover:bg-gray-100 disabled:opacity-30"
										disabled={pts <= 0}
										aria-label={`Уменьшить навык ${s.name}`} onclick={() => decrement(s.id)}>−</button>
									<span class="w-6 text-center font-mono">{pts}</span>
									<button
										class="w-11 h-11 rounded border hover:bg-gray-100 disabled:opacity-30"
										disabled={pts >= 2 || spentPoints >= 10}
										aria-label={`Увеличить навык ${s.name}`} onclick={() => increment(s.id)}>+</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Кнопка -->
	{#if error}<p class="notice error" role="alert">{error}</p>{/if}
	<div class="flex gap-3">
		<button id="create-character"
			class="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
			disabled={saving} onclick={save}>
			{saving ? 'Сохраняем…' : 'Сохранить персонажа'}
		</button>
	</div>
</main>
<style>
  .race-layout { display: grid; grid-template-columns: 150px minmax(0, 1fr); align-items: start; gap: 24px; }
  .race-fields { min-width: 0; }
  .race-art { display:grid; gap:12px; justify-items:center; min-width:0; }
  @media (max-width: 520px) { .race-layout { grid-template-columns: 86px minmax(0, 1fr); gap: 14px; } }

  .background-intro.illustrated { display: grid; grid-template-columns: 150px minmax(0, 1fr); align-items: center; gap: 24px; }
  @media (max-width: 520px) { .background-intro.illustrated { grid-template-columns: 100px minmax(0, 1fr); gap: 16px; } }

</style>
