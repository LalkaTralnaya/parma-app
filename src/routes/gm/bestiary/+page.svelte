<script lang="ts">
	import { page } from '$app/state';
	import { BESTIARY, BESTIARY_SECTIONS, getMonsterSection } from '../../../lib/rules/bestiary';
	import { scaleMonster, type ScaledMonster } from '../../../lib/engine/bestiary';
	import type { BaseMonster } from '../../../lib/rules/bestiary';

	const initialMonster = BESTIARY.find((monster) => monster.id === page.url.searchParams.get('monster')) ?? BESTIARY[0];
	let selectedId = $state<string>(initialMonster?.id ?? '');
	let targetLevel = $state(initialMonster?.baseLevel ?? 1);
	let scaled = $state<ScaledMonster | null>(initialMonster ? scaleMonster(initialMonster, initialMonster.baseLevel) : null);
	let categoryId = $state('all');
	let searchQuery = $state('');
	const visibleSections = $derived(BESTIARY_SECTIONS
		.filter((section) => categoryId === 'all' || section.id === categoryId)
		.map((section) => ({
			...section,
			monsters: section.monsters.filter((monster) => monster.name.toLocaleLowerCase('ru').includes(searchQuery.trim().toLocaleLowerCase('ru')))
		}))
		.filter((section) => section.monsters.length > 0));

	const selectedMonster: BaseMonster | undefined = $derived(
		BESTIARY.find((m) => m.id === selectedId)
	);

	function generate() {
		const base = BESTIARY.find((m) => m.id === selectedId);
		if (!base) return;
		scaled = scaleMonster(base, targetLevel);
		targetLevel = scaled.level;
	}

	function chooseMonster(id: string) {
		const base = BESTIARY.find((monster) => monster.id === id);
		if (!base) return;
		selectedId = id;
		targetLevel = base.baseLevel;
		scaled = scaleMonster(base, base.baseLevel);
	}

	function filterMonsters(nextCategory: string, nextQuery: string) {
		categoryId = nextCategory;
		searchQuery = nextQuery;
		const query = nextQuery.trim().toLocaleLowerCase('ru');
		const matches = BESTIARY_SECTIONS
			.filter((section) => nextCategory === 'all' || section.id === nextCategory)
			.flatMap((section) => section.monsters)
			.filter((monster) => monster.name.toLocaleLowerCase('ru').includes(query));
		if (matches.length && !matches.some((monster) => monster.id === selectedId)) chooseMonster(matches[0].id);
	}

	function statLabel(stat: string): string {
		return { strength: 'СИЛ', dexterity: 'ЛОВ', intelligence: 'ИНТ', eloquence: 'КРА', religion: 'РЕЛ' }[stat] ?? stat;
	}

	function modSign(v: number): string {
		return v >= 0 ? `+${v}` : `${v}`;
	}

	function rollFormula(dice: string): number {
		const m = dice.match(/^(\d+)[кd](\d+)$/i);
		if (!m) return 0;
		const [, count, sides] = m;
		let sum = 0;
		for (let i = 0; i < Number(count); i++) {
			sum += Math.floor(Math.random() * Number(sides)) + 1;
		}
		return sum;
	}

	async function copyToClipboard() {
		if (!scaled) return;
		const s = scaled;
		const mods = Object.entries(s.scaledMods)
			.map(([k, v]) => `${statLabel(k)}: ${v * 6} (${modS(v as number)})`)
			.join('\n');
		const attacks = s.scaledAttacks
			.map((a) => `${a.name}: ${a.ignoresArmor ? 'проверка' : 'попадание'} ${statLabel(a.attackStat)} ≤ ${a.hitTarget}${a.damageDice !== '0' ? `, урон ${a.damageDice}${a.damageModifier ? ' ' + modS(a.damageModifier) : ''}${(a.extraDamageDice ?? []).map((dice) => ` + ${dice}`).join('')} ${a.damageType}` : ''}${a.notes ? ' (' + a.notes + ')' : ''}${a.save ? `; Избавление: ${a.save}` : ''}`)
			.join('\n');
		const text = `${s.base.name} (уровень ${s.level}, +${s.levelsGained} от базового)\nЖВЧ: ${s.scaledHp}\nБроня: ${s.scaledArmor}\nСкорость: ${s.base.movement ?? `${s.base.speed} саженей`}\n\nХарактеристики:\n${mods}\n\nАтаки:\n${attacks}\n\nУмения:\n${s.base.traits.join('\n')}`;
		try {
			await navigator.clipboard.writeText(text);
			alert('Скопировано в буфер обмена');
		} catch {
			alert(text);
		}
	}

	function modS(v: number): string {
		return v >= 0 ? `+${v}` : `${v}`;
	}
</script>

<main class="max-w-5xl mx-auto p-6">
	<header class="flex justify-between items-center mb-6">
		<h1 class="text-3xl font-bold">Противники</h1>
		<a href="/gm" class="px-3 py-2 border rounded hover:bg-gray-50">← К режиму мастера</a>
	</header>

	<!-- Выбор -->
	<section class="border rounded-lg p-4 bg-white mb-6">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
			<div>
				<label for="bestiary-category" class="block font-semibold mb-1 text-sm">Раздел</label>
				<select id="bestiary-category" value={categoryId} onchange={(event) => filterMonsters(event.currentTarget.value, searchQuery)} class="w-full px-3 py-2 border rounded">
					<option value="all">Все разделы ({BESTIARY.length})</option>
					{#each BESTIARY_SECTIONS as section}
						<option value={section.id}>{section.name} ({section.monsters.length})</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="bestiary-search" class="block font-semibold mb-1 text-sm">Поиск по названию</label>
				<input id="bestiary-search" type="search" value={searchQuery} oninput={(event) => filterMonsters(categoryId, event.currentTarget.value)} placeholder="Например, леший" class="w-full px-3 py-2 border rounded" />
			</div>
		</div>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
			<div>
				<label for="field-1" class="block font-semibold mb-1 text-sm">Монстр</label>
				<select id="field-1"
					value={selectedId}
					onchange={(event) => chooseMonster(event.currentTarget.value)}
					class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
					{#each visibleSections as section}
						<optgroup label={section.name}>
							{#each section.monsters as m}
								<option value={m.id}>{m.name} (базовый уровень: {m.dangerLabel}){m.source === 'custom' ? ' · авторская карточка' : ''}</option>
							{/each}
						</optgroup>
					{/each}
					{#if visibleSections.length === 0}<option disabled>Существа не найдены</option>{/if}
				</select>
			</div>
			<div>
				<label for="field-2" class="block font-semibold mb-1 text-sm">Целевой уровень</label>
				<input id="field-2"
					type="number"
					min={selectedMonster?.baseLevel ?? 1}
					max="20"
					bind:value={targetLevel}
					class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
			</div>
			<button
				class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
				onclick={generate}>
				Создать противника
			</button>
		</div>

		{#if selectedMonster}
			<p class="text-sm text-gray-500 mt-3">{getMonsterSection(selectedMonster.id)?.name}{selectedMonster.source === 'custom' ? ' · авторская карточка' : ''} · {selectedMonster.description}</p>
		{/if}
	</section>

	<!-- Результат -->
	{#if scaled}
		<section class="border-2 border-red-300 rounded-lg p-5 bg-red-50">
			<div class="flex justify-between items-start mb-4 flex-wrap gap-2">
				<div>
					<h2 class="text-2xl font-bold">{scaled.base.name}</h2>
					<div class="text-sm text-gray-600">{getMonsterSection(scaled.base.id)?.name}{scaled.base.source === 'custom' ? ' · авторская карточка' : ''}</div>
					<div class="text-sm text-gray-600">
						Уровень {scaled.level}
						{#if scaled.levelsGained > 0}
							· масштабирован от базового {scaled.base.baseLevel} (+{scaled.levelsGained})
						{:else}
							· базовый уровень
						{/if}
					</div>
				</div>
				<button
					class="px-3 py-1.5 text-sm border rounded bg-white hover:bg-gray-50"
					onclick={copyToClipboard}>📋 Скопировать</button>
			</div>

			<!-- ЖВЧ / Броня / Скорость -->
			<div class="grid grid-cols-3 gap-3 mb-4">
				<div class="border rounded-lg p-3 bg-white text-center">
					<div class="text-xs uppercase text-gray-500">Живучесть</div>
					<div class="text-2xl font-bold">{scaled.scaledHp}</div>
					{#if scaled.levelsGained > 0}
						<div class="text-xs text-gray-500">
							базовая {scaled.base.hp} + [{scaled.hpRolls.join(', ')}] + мод. {statLabel(scaled.base.hpStat ?? 'strength')} {modSign(scaled.base.baseMods[scaled.base.hpStat ?? 'strength'])} × {scaled.levelsGained}
						</div>
					{/if}
				</div>
				<div class="border rounded-lg p-3 bg-white text-center">
					<div class="text-xs uppercase text-gray-500">Броня</div>
					<div class="text-2xl font-bold">{scaled.scaledArmor}</div>
					{#if scaled.levelsGained > 0}
						<div class="text-xs text-gray-500">не растёт от уровня</div>
					{/if}
				</div>
				<div class="border rounded-lg p-3 bg-white text-center">
					<div class="text-xs uppercase text-gray-500">Скорость</div>
					<div class="text-lg font-bold">{scaled.base.movement ?? `${scaled.base.speed} саженей`}</div>
				</div>
			</div>

			<!-- Модификаторы -->
			<div class="border rounded-lg p-4 bg-white mb-4">
				<h3 class="font-semibold mb-2">Характеристики</h3>
				<div class="grid grid-cols-5 gap-2 text-center">
					{#each Object.entries(scaled.scaledMods) as [key, value]}
						<div class="border rounded p-2 {key === scaled.base.primaryStat && scaled.levelsGained > 0 ? 'bg-green-50 border-green-400' : ''}">
							<div class="text-xs uppercase text-gray-500">
								{key === 'strength' ? 'СИЛ' :
								 key === 'intelligence' ? 'ИНТ' :
								 key === 'dexterity' ? 'ЛОВ' :
								 key === 'eloquence' ? 'КРА' : 'РЕЛ'}
							</div>
							<div class="text-xl font-bold">{(value as number) * 6}</div>
							<div class="text-xs text-gray-500">мод. {modSign(value as number)}</div>
							{#if key === scaled.base.primaryStat && scaled.levelsGained > 0}
								<div class="text-xs text-green-700">+{scaled.levelsGained}</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Атаки -->
			<div class="border rounded-lg p-4 bg-white mb-4">
				<h3 class="font-semibold mb-2">Атаки</h3>
				<div class="space-y-2">
					{#each scaled.scaledAttacks as atk}
						<div class="border-b pb-2 last:border-b-0">
							<div class="font-medium">{atk.name}</div>
							<div class="text-sm text-gray-600">
								{atk.ignoresArmor ? 'Проверка' : 'Попадание'} {statLabel(atk.attackStat)}:
								{scaled.scaledMods[atk.attackStat] * 6} + {scaled.scaledMods[atk.attackStat]}
								{#if atk.attackBonus} + {atk.attackBonus}{/if}
								= ≤ <span class="font-bold">{atk.hitTarget}</span>
							</div>
							{#if atk.damageDice !== '0'}
								<div class="text-sm text-gray-600">
									Урон: <span class="font-bold">{atk.damageDice}{atk.damageModifier ? ` ${modSign(atk.damageModifier)}` : ''}{#each atk.extraDamageDice ?? [] as dice} + {dice}{/each}</span>
									{atk.damageType}
								</div>
							{/if}
							{#if atk.notes}
								<div class="text-xs text-gray-500">{atk.notes}</div>
							{/if}
							{#if atk.save}
								<div class="text-xs text-gray-500">Избавление: {atk.save}</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Умения -->
			<div class="border rounded-lg p-4 bg-white">
				<h3 class="font-semibold mb-2">Особенности</h3>
				<ul class="text-sm space-y-1 list-disc list-inside">
					{#each scaled.base.traits as t}
						<li>{t}</li>
					{/each}
				</ul>
				{#if scaled.base.resistance}
					<div class="mt-2 text-sm">
						<span class="text-gray-500">Сопротивление:</span> {scaled.base.resistance}
					</div>
				{/if}
				{#if scaled.base.weakness}
					<div class="mt-1 text-sm text-red-700">
						<span class="text-gray-500">Уязвимость:</span> {scaled.base.weakness}
					</div>
				{/if}
			</div>
		</section>
	{:else}
		<p class="text-gray-500 text-sm">
			Выберите монстра и целевой уровень, нажмите «Создать противника».
		</p>
	{/if}
</main>
