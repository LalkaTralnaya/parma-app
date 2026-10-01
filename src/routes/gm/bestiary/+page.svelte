<script lang="ts">
	import { BESTIARY } from '../../../lib/rules/bestiary';
	import { scaleMonster, type ScaledMonster } from '../../../lib/engine/bestiary';
	import type { BaseMonster } from '../../../lib/rules/bestiary';

	let selectedId = $state<string>(BESTIARY[0]?.id ?? '');
	let targetLevel = $state(3);
	let scaled = $state<ScaledMonster | null>(null);

	const selectedMonster: BaseMonster | undefined = $derived(
		BESTIARY.find((m) => m.id === selectedId)
	);

	function generate() {
		const base = BESTIARY.find((m) => m.id === selectedId);
		if (!base) return;
		scaled = scaleMonster(base, targetLevel);
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
			.map(([k, v]) => `${k}: ${modS(v as number)}`)
			.join('\n');
		const attacks = s.scaledAttacks
			.map((a) => `${a.name}: попадание ≤ ${30 + a.hitBonus}, урон ${a.damageDice} + ${modS(s.scaledMods[s.base.primaryStat])} ${a.damageType}${a.notes ? ' (' + a.notes + ')' : ''}`)
			.join('\n');
		const text = `${s.base.name} (уровень ${s.level}, +${s.levelsGained} от базового)\nЖВЧ: ${s.scaledHp}\nБроня: ${s.scaledArmor}\nСкорость: ${s.base.speed} саженей\n\nМодификаторы:\n${mods}\n\nАтаки:\n${attacks}\n\nУмения:\n${s.base.traits.join('\n')}`;
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
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
			<div>
				<label for="field-1" class="block font-semibold mb-1 text-sm">Монстр</label>
				<select id="field-1"
					bind:value={selectedId}
					class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
					{#each BESTIARY as m}
						<option value={m.id}>{m.name} (базовый уровень: {m.dangerLabel})</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="field-2" class="block font-semibold mb-1 text-sm">Целевой уровень</label>
				<input id="field-2"
					type="number"
					min="1"
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
			<p class="text-sm text-gray-500 mt-3">{selectedMonster.description}</p>
		{/if}
	</section>

	<!-- Результат -->
	{#if scaled}
		<section class="border-2 border-red-300 rounded-lg p-5 bg-red-50">
			<div class="flex justify-between items-start mb-4 flex-wrap gap-2">
				<div>
					<h2 class="text-2xl font-bold">{scaled.base.name}</h2>
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
							базовая {scaled.base.hp} + [{scaled.hpRolls.join(', ')}] + мод × {scaled.levelsGained}
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
					<div class="text-2xl font-bold">{scaled.base.speed}</div>
					<div class="text-xs text-gray-500">саженей</div>
				</div>
			</div>

			<!-- Модификаторы -->
			<div class="border rounded-lg p-4 bg-white mb-4">
				<h3 class="font-semibold mb-2">Модификаторы характеристик</h3>
				<div class="grid grid-cols-5 gap-2 text-center">
					{#each Object.entries(scaled.scaledMods) as [key, value]}
						<div class="border rounded p-2 {key === scaled.base.primaryStat && scaled.levelsGained > 0 ? 'bg-green-50 border-green-400' : ''}">
							<div class="text-xs uppercase text-gray-500">
								{key === 'strength' ? 'СИЛ' :
								 key === 'intelligence' ? 'ИНТ' :
								 key === 'dexterity' ? 'ЛОВ' :
								 key === 'eloquence' ? 'КРА' : 'РЕЛ'}
							</div>
							<div class="text-xl font-bold">{modSign(value as number)}</div>
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
						{@const primaryMod = scaled.scaledMods[scaled.base.primaryStat]}
						<div class="border-b pb-2 last:border-b-0">
							<div class="font-medium">{atk.name}</div>
							<div class="text-sm text-gray-600">
								Попадание: ≤ <span class="font-bold">{30 + atk.hitBonus}</span>
								(30 {modSign(atk.hitBonus)})
							</div>
							{#if atk.damageDice !== '0'}
								<div class="text-sm text-gray-600">
									Урон: <span class="font-bold">{atk.damageDice} {modSign(primaryMod)}</span>
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