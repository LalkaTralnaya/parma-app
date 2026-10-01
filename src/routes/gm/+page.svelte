<script lang="ts">
	import { getArmorValue } from '../../lib/engine/combat';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { listCharacters, getCurrentResource } from '../../lib/db/characters';
	import { RACES } from '../../lib/rules/races';
	import { RESOURCES } from '../../lib/rules/resources';
	import { getCharacteristicValue, getModifier, getResourceMax, getSkillCheckTarget } from '../../lib/engine/character';
	import { PERSONALITY_TRAITS, IDEALS, BONDS, FLAWS, findOption } from '../../lib/rules/personality';
	import { rollD100, classifyRoll, type RollResult } from '../../lib/engine/dice';
	import {
		createRequest, clearSession, getSession, submitResult, subscribe,
		SESSION_LABELS, SESSION_SKILLS,
		type SessionRequest, type SessionRequestType
	} from '../../lib/sync/session';
	import type { Character } from '$lib/type';

	let characters = $state<Character[]>([]);
	let loading = $state(true);
	let session = $state<SessionRequest | null>(null);
	let unsubscribe: (() => void) | null = null;

	async function load() {
		characters = await listCharacters();
		loading = false;
	}

	function rollD20(): number {
		return Math.floor(Math.random() * 20) + 1;
	}

	function startRequest(type: SessionRequestType) {
		createRequest(type, SESSION_LABELS[type]);
		// обновим локально, чтобы не ждать broadcast
		session = getSession();
	}

	function endSession() {
		clearSession();
		session = null;
	}

	/** ГМ может бросать сам за игрока (если игрок не в сети) */
	function gmRoll(characterId: string) {
		const c = characters.find((x) => x.id === characterId);
		if (!c || !session) return;

		const skillId = SESSION_SKILLS[session.type];
		let roll: number;
		let target: number;
		let modifier: number;
		let result: RollResult;

		if (session.type === 'initiative') {
			roll = rollD20();
			modifier = getModifier(getCharacteristicValue(c, 'dexterity'));
			target = 0; // для инициативы нет целевого числа
			result = 'success'; // условно
		} else if (skillId) {
			target = getSkillCheckTarget(c, skillId);
			roll = rollD100();
			modifier = 0;
			result = classifyRoll(roll, target);
		} else {
			return;
		}

		submitResult({
			characterId,
			characterName: c.name,
			roll,
			target,
			modifier,
			result,
			timestamp: Date.now()
		});
		session = getSession();
	}

	function traitName(key: string, list: typeof PERSONALITY_TRAITS): string {
		if (!key) return '—';
		return findOption(list, key)?.name ?? '—';
	}

	function raceName(id: string): string {
		return RACES.find((r) => r.id === id)?.name ?? id;
	}
	const SESSION_TITLES: Record<SessionRequestType, string> = {
		initiative: 'Прыть',
		stealth: 'Скрытность',
		perception: 'Наблюдательность',
		survival: 'Выживание'
	};

	/** Целевое число проверки навыка для конкретного персонажа (для отображения в квадрате) */
	function getTargetFor(char: Character, type: SessionRequestType): number | null {
		const skillId = SESSION_SKILLS[type];
		if (!skillId) return null;
		return getSkillCheckTarget(char, skillId);
	}

	/** Среднее по группе для проверок (не для инициативы) */
	function getGroupAverage(): { average: number; count: number } | null {
		if (!session || session.type === 'initiative') return null;
		const values = Object.values(session.results);
		if (values.length === 0) return null;
		const sum = values.reduce((acc, r) => acc + r.roll, 0);
		return {
			average: Math.round(sum / values.length),
			count: values.length
		};
	}
	onMount(async () => {
		await load();
		session = getSession();
		unsubscribe = subscribe((s) => {
			session = s;
		});
	});

	onDestroy(() => {
		unsubscribe?.();
	});
</script>

<main class="max-w-6xl mx-auto p-6">
	<header class="flex justify-between items-center mb-6 flex-wrap gap-3">
		<div>
			<h1 class="text-3xl font-bold">Режим мастера</h1>
			<p class="text-sm text-gray-500">
				Всего персонажей: {characters.length}
			</p>
		</div>
		<div class="flex gap-2 flex-wrap">
			<a
				href="/gm/cheatsheet"
				class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
				Шпаргалка
			</a>
			<a
				href="/gm/combat"
				class="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
				Боевой трекер
			</a>
			<a
				href="/gm/bestiary"
				class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
				Бестиарий
			</a>
			<button
				class="px-4 py-2 border rounded hover:bg-gray-50"
				onclick={load}>↻ Обновить список</button>
			{#if session}
				<button
					class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
					onclick={endSession}>■ Конец боя</button>
			{/if}
			<a href="/" class="px-4 py-2 border rounded hover:bg-gray-50">← К игрокам</a>
		</div>
	</header>

	<p class="notice mb-6">Пульт видит персонажей этого браузера. Для общих проверок откройте их листы в соседних вкладках. Между разными устройствами данные не передаются.</p>
	<!-- Панель запросов -->
	<section class="border rounded-lg bg-white p-4 mb-6">
		<h2 class="font-semibold mb-3">Запросы к игрокам</h2>
		<div class="flex gap-2 flex-wrap">
			<button
				class="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
				onclick={() => startRequest('initiative')}>Прыть всем</button>
			<button
				class="px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
				onclick={() => startRequest('stealth')}>Скрытность</button>
			<button
				class="px-3 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
				onclick={() => startRequest('perception')}>Наблюдательность</button>
			<button
				class="px-3 py-2 bg-green-700 text-white rounded hover:bg-green-800"
				onclick={() => startRequest('survival')}>Выживание</button>
		</div>

		{#if session}
			<div class="mt-4 p-3 bg-amber-50 border border-amber-300 rounded">
				<div class="flex justify-between items-center mb-2 flex-wrap gap-2">
					<div>
						<span class="font-semibold">Активный запрос:</span>
						{session.label}
					</div>
					<div class="text-sm text-gray-600">
						Собрано: {Object.keys(session.results).length} / {characters.length}
					</div>
				</div>

				{#if session.type !== 'initiative'}
					{@const avg = getGroupAverage()}
					{#if avg}
						<div class="mt-2 p-2 bg-white rounded border border-amber-300 flex justify-between items-center">
							<span class="text-sm text-gray-700">Средний результат по группе:</span>
							<span class="text-xl font-bold text-purple-700">
								{avg.average}
								<span class="text-xs text-gray-500 font-normal">
									(по {avg.count} {avg.count === 1 ? 'броску' : 'броскам'})
								</span>
							</span>
						</div>
					{/if}
				{/if}

				<div class="text-xs text-gray-600 mt-2">
					Откройте листы игроков в других вкладках этого браузера и нажать «Бросить». Если лист игрока не открыт,
					нажмите 🎲 на его карточке ниже — бросите за него.
				</div>
			</div>
		{/if}
	</section>

	{#if loading}
		<p class="text-gray-500">Загрузка…</p>
	{:else if characters.length === 0}
		<div class="border-2 border-dashed rounded-lg p-10 text-center text-gray-500">
			<p>Пока нет ни одного персонажа</p>
			<a href="/new" class="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
				Создать первого
			</a>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each characters as c (c.id)}
				{@const armorInfo = getArmorValue(c)}
				{@const dexMod = armorInfo.dexMod}
				{@const armor = armorInfo.total}
				{@const result = session?.results[c.id]}
				<div class="border rounded-lg bg-white p-4 flex flex-col {result ? 'border-green-400' : ''}">
					<div class="flex justify-between items-start mb-3">
						<div>
							<div class="font-bold text-lg">{c.name || '(без имени)'}</div>
							<div class="text-sm text-gray-500">{raceName(c.raceId)} · {c.level} ур.</div>
						</div>
						{#if session}
							<button
								class="text-2xl leading-none hover:text-purple-600 transition-colors"
								title="Бросить за игрока"
								onclick={() => gmRoll(c.id)}>🎲</button>
						{/if}
					</div>

										<div class="grid grid-cols-2 gap-2 mb-3 text-sm">
						<div class="border rounded p-2 text-center bg-gray-50">
							<div class="text-xs text-gray-500 uppercase">Броня</div>
							<div class="text-lg font-bold">{armor}</div>
						</div>
						<div class="border-2 rounded p-2 text-center
							{result
								? (result.result === 'crit_success' ? 'bg-green-50 border-green-500' :
								   result.result === 'success' ? 'bg-green-50 border-green-300' :
								   result.result === 'crit_fail' ? 'bg-red-50 border-red-500' :
								   result.result === 'double' ? 'bg-blue-50 border-blue-400' :
								   'bg-gray-50 border-gray-300')
								: (session ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-transparent')}">
							<div class="text-xs text-gray-500 uppercase">
								{session ? SESSION_TITLES[session.type] : 'Прыть'}
							</div>
							{#if result && session?.type === 'initiative'}
								<div class="text-xl font-bold text-purple-700">
									{result.roll + result.modifier}
								</div>
								<div class="text-xs text-gray-500">{result.roll}+{result.modifier}</div>
							{:else if result && session?.type !== 'initiative'}
								<div class="text-xl font-bold text-purple-700">{result.roll}</div>
								<div class="text-xs text-gray-500">≤ {result.target}</div>
								<div class="text-xs font-semibold mt-0.5
									{result.result === 'crit_success' || result.result === 'success' ? 'text-green-700' :
									 result.result === 'double' ? 'text-blue-700' : 'text-red-700'}">
									{result.result === 'crit_success' ? 'Правь!' :
									 result.result === 'success' ? 'Успех' :
									 result.result === 'double' ? 'Явь' :
									 result.result === 'crit_fail' ? 'Навь!' : 'Провал'}
								</div>
							{:else if session}
								{#if session.type === 'initiative'}
									<div class="text-sm text-gray-500 mt-1">к20+{dexMod}</div>
									<div class="text-xs text-amber-700 mt-0.5">ожидается</div>
								{:else}
									{@const t = getTargetFor(c, session.type)}
									{#if t !== null}
										<div class="text-sm text-gray-500 mt-1">≤ {t}</div>
									{/if}
									<div class="text-xs text-amber-700 mt-0.5">ожидается</div>
								{/if}
							{:else}
								<div class="text-sm font-semibold text-gray-600">к20+{dexMod}</div>
							{/if}
						</div>
					</div>

					<div class="grid grid-cols-5 gap-1 mb-3 text-xs">
						{#each RESOURCES as r}
							{@const max = getResourceMax(c, r.id)}
							{@const current = getCurrentResource(c, r.id, max)}
							<div class="text-center">
								<div class="text-gray-500">{r.short}</div>
								<div class="font-semibold {current < max * 0.3 ? 'text-red-600' : current < max * 0.7 ? 'text-amber-600' : 'text-green-700'}">{current}</div>
							</div>
						{/each}
					</div>

					<div class="text-xs space-y-0.5 mb-3">
						<div><span class="text-gray-500">Характер:</span> {traitName(c.bio.personalityKey, PERSONALITY_TRAITS)}</div>
						<div><span class="text-gray-500">Идеал:</span> {traitName(c.bio.idealKey, IDEALS)}</div>
						<div><span class="text-gray-500">Привязанность:</span> {traitName(c.bio.bondKey, BONDS)}</div>
						<div><span class="text-gray-500">Слабость:</span> {traitName(c.bio.flawKey, FLAWS)}</div>
					</div>

					{#if c.bio.backstory}
						<div class="text-xs text-gray-600 mb-3">
							<span class="text-gray-500">Предыстория:</span>
							<span class="line-clamp-3">{c.bio.backstory}</span>
						</div>
					{/if}

					<button
						class="mt-auto px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
						onclick={() => goto(`/char/${c.id}`)}>
						Открыть лист →
					</button>
				</div>
			{/each}
		</div>
	{/if}
</main>