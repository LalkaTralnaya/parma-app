<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { getCheckDifficulty, normalizeCheckDifficulty } from '$lib/engine/checkDifficulty';
	import { notifyCharacterUpdate, subscribeCharacterUpdates } from '$lib/sync/combat';
	import { getArmorValue } from '../../lib/engine/combat';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { listCharacters, getCurrentResource, getCharacter, saveCharacter } from '../../lib/db/characters';
	import { RACES } from '../../lib/rules/races';
	import { RESOURCES } from '../../lib/rules/resources';
	import { getCharacteristicValue, getModifier, getResourceMax, getSkillCheckTarget } from '../../lib/engine/character';
	import { PERSONALITY_TRAITS, IDEALS, BONDS, FLAWS, findOption } from '../../lib/rules/personality';
	import { rollD100, classifyRoll, type RollResult } from '../../lib/engine/dice';
	import {
		clearSession, getSession, submitResult, subscribe,
		SESSION_LABELS, SESSION_SKILLS,
		type SessionRequest, type SessionRequestType
	} from '../../lib/sync/session';
	import {
		getCurrentRoom,
		findRoomByCode,
		createRoomRequest,
		getActiveRoomRequest,
		subscribeToRoomRequests,
		getRoomCombatState,
		updateRoomTavernSettings,
		subscribeToRoomCombat,
		closeRoomRequest,
		type RoomRequest,
	} from '../../lib/engine/rooms';
	import type { Character } from '$lib/type';
	import { PARMA_SEASONS, type ParmaSeason } from '$lib/rules/tavern-menu';
	import { DEFAULT_TAVERN_SETTINGS, normalizeTavernSettings, readLocalTavernSettings, writeLocalTavernSettings } from '$lib/engine/tavern-settings';

	const NOTES_KEY = 'parma_storyteller_notes';
	let storytellerNotes = $state('');
	let notesStatus = $state('');
	let notesStorageReady = $state(false);

	function saveNotes(event: Event) {
		storytellerNotes = (event.currentTarget as HTMLTextAreaElement).value;
		try {
			localStorage.setItem(NOTES_KEY, storytellerNotes);
			notesStatus = 'Сохранено в этом браузере.';
		} catch {
			notesStatus = 'Не удалось сохранить в браузере. Выгрузите заметки в файл.';
		}
	}

	function exportNotes() {
		const blob = new Blob(['\uFEFF', storytellerNotes], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'parma-storyteller-notes.txt';
		document.body.appendChild(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	let characters = $state<Character[]>([]);
	let loading = $state(true);
	let savingDifficulty = $state<Record<string,boolean>>({});
	let difficultyError = $state('');
	let unsubscribeCharacters: (() => void) | null = null;
	let session = $state<SessionRequest | null>(null);
	let unsubscribe: (() => void) | null = null;

	// ─── Запросы через Supabase ───
	let activeRoomId = $state<string | null>(null);
	let activeRequest = $state<RoomRequest | null>(null);
	let unsubRequests: (() => void) | null = null;
	let unsubRoomTavern: (() => void) | null = null;
	let tavernSeason = $state<ParmaSeason>(DEFAULT_TAVERN_SETTINGS.season);
	let tavernSettingsStatus = $state('');
	let savingTavernSeason = $state(false);

	async function setTavernSeason(season: ParmaSeason) {
		if (savingTavernSeason) return;
		savingTavernSeason = true;
		tavernSettingsStatus = '';
		const settings = { season };
		try {
			if (activeRoomId) {
				await updateRoomTavernSettings(activeRoomId, settings);
			}
			tavernSeason = season;
			writeLocalTavernSettings(settings);
			tavernSettingsStatus = activeRoomId ? 'Сезон сохранён и передан участникам комнаты.' : 'Сезон сохранён в этом браузере. Для передачи игрокам подключите Сказителя к комнате.';
		} catch (error) {
			tavernSettingsStatus = error instanceof Error ? `Не удалось сохранить сезон: ${error.message}` : 'Не удалось сохранить сезон.';
		}
		finally { savingTavernSeason = false; }
	}

	// Производные — какой тип запроса и какие результаты показываем
	const activeType = $derived<SessionRequestType | null>(
		activeRequest ? (activeRequest.request_type as SessionRequestType) : (session?.type ?? null)
	);
	const activeResults = $derived<Record<string, any>>(
		activeRequest ? activeRequest.results : (session?.results ?? {})
	);

	async function load() {
		characters = await listCharacters();
		loading = false;
	}

	async function changeDifficulty(id: string, delta: number | null) {
		if (savingDifficulty[id]) return;
		savingDifficulty = { ...savingDifficulty, [id]: true }; difficultyError = '';
		try {
			const current = await getCharacter(id);
			if (!current) throw new Error('Персонаж не найден.');
			const next = { ...current, checkDifficulty: delta === null ? 0 : normalizeCheckDifficulty(getCheckDifficulty(current) + delta) };
			await saveCharacter(next);
			characters = characters.map(c => c.id === id ? next : c);
			notifyCharacterUpdate(id);
		} catch (error) { difficultyError = (error as Error).message; }
		finally { savingDifficulty = { ...savingDifficulty, [id]: false }; }
	}

	function rollD20(): number {
		return Math.floor(Math.random() * 20) + 1;
	}

	/** Отправить запрос игрокам — через Supabase, если в комнате; иначе BroadcastChannel */
	async function startRequest(type: SessionRequestType) {
		if (activeRoomId) {
			try {
				if (activeRequest) await closeRoomRequest(activeRequest.id);
				await createRoomRequest(activeRoomId, type, SESSION_LABELS[type]);
			} catch (e) {
				alert((e as Error).message);
			}
		} else {
			// fallback: старая система
			alert('Вы не в комнате. Создайте комнату, чтобы запросы долетали до игроков.');
		}
	}

	async function endSession() {
		clearSession();
		session = null;
		if (activeRequest) {
			await closeRoomRequest(activeRequest.id);
			activeRequest = null;
		}
	}

	/** ГМ бросает за игрока */
	async function gmRoll(characterId: string) {
		const c = characters.find((x) => x.id === characterId);
		if (!c) return;

		const type = activeType;
		if (!type) return;

		const skillId = SESSION_SKILLS[type];
		let roll: number, target: number, modifier: number;
		let result: RollResult;

		if (type === 'initiative') {
			roll = rollD20();
			modifier = getModifier(getCharacteristicValue(c, 'dexterity'));
			target = 0;
			result = 'success';
		} else if (skillId) {
			target = getSkillCheckTarget(c, skillId);
			roll = rollD100();
			modifier = 0;
			result = classifyRoll(roll, target);
		} else return;

		// Пишем результат в тот же источник, что активен
		if (activeRequest) {
			try {
				const { submitRoomRequestResult } = await import('../../lib/engine/rooms');
				await submitRoomRequestResult(activeRequest.id, characterId, {
					characterId,
					characterName: c.name,
					roll, target, modifier, result,
					timestamp: Date.now()
				});
			} catch (e) {
				alert((e as Error).message);
			}
		} else if (session) {
			submitResult({
				characterId,
				characterName: c.name,
				roll, target, modifier, result,
				timestamp: Date.now()
			});
			session = getSession();
		}
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

	function getTargetFor(char: Character, type: SessionRequestType): number | null {
		const skillId = SESSION_SKILLS[type];
		if (!skillId) return null;
		return getSkillCheckTarget(char, skillId);
	}

	function getGroupAverage(): { average: number; count: number } | null {
		if (!activeType || activeType === 'initiative') return null;
		const values = Object.values(activeResults);
		if (values.length === 0) return null;
		const sum = values.reduce((acc: number, r: any) => acc + (r.roll ?? 0), 0);
		return { average: Math.round(sum / values.length), count: values.length };
	}

	onMount(() => {
		tavernSeason = readLocalTavernSettings().season;
		try {
			storytellerNotes = localStorage.getItem(NOTES_KEY) ?? '';
			notesStatus = 'Заметки сохраняются автоматически в этом браузере.';
		} catch { notesStatus = 'Хранилище браузера недоступно. Заметки можно выгрузить в файл.'; }
		notesStorageReady = true;
	});

	onMount(async () => {
		await load();
		unsubscribeCharacters = subscribeCharacterUpdates(() => { void load(); });
		session = getSession();
		unsubscribe = subscribe((s) => {
			session = s;
		});

		// Supabase-запросы
		const code = getCurrentRoom();
		if (code) {
			const room = await findRoomByCode(code);
			if (room) {
				activeRoomId = room.id;
				const combatState = await getRoomCombatState(room.id);
				const sharedTavernSettings = normalizeTavernSettings(combatState?.tavernSettings);
				if (sharedTavernSettings) {
					tavernSeason = sharedTavernSettings.season;
					writeLocalTavernSettings(sharedTavernSettings);
				}
				unsubRoomTavern = subscribeToRoomCombat(room.id, (state) => {
					const settings = normalizeTavernSettings(state?.tavernSettings);
					if (settings) {
						tavernSeason = settings.season;
						writeLocalTavernSettings(settings);
					}
				});
				activeRequest = await getActiveRoomRequest(room.id);
				unsubRequests = subscribeToRoomRequests(room.id, (req) => {
					activeRequest = req;
				});
			}
		}
	});

	onDestroy(() => {
		unsubscribe?.();
		unsubscribeCharacters?.();
		unsubRequests?.();
		unsubRoomTavern?.();
	});
</script>

<main class="max-w-6xl mx-auto p-6">
<nav class="flex flex-wrap gap-3 mb-4" aria-label="Руководство Сказителя"><a href="/mechanics#personal-story">Личная история и награды</a><a href="/lore#koschei-rules-1">Тринадцать масок Кощея</a></nav>
	<header class="flex justify-between items-center mb-6 flex-wrap gap-3">
		<div>
			<h1 class="text-3xl font-bold">Режим сказителя</h1>
			<p class="text-sm text-gray-500">
				Всего персонажей: {characters.length}
			</p>
		</div>
		<div class="flex gap-2 flex-wrap">
			<a href="/lavka" class="px-4 py-2 border rounded hover:bg-gray-50 inline-flex items-center gap-2"><Icon name="bag" size={18} />Лавка</a>
			<a href="/tavern" class="px-4 py-2 border rounded hover:bg-gray-50 inline-flex items-center gap-2"><Icon name="mug" size={18} />Таверна</a>
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
			{#if activeRequest || session}
				<div class="mt-4 p-3 bg-amber-50 border border-amber-300 rounded">
					<div class="flex justify-between items-center mb-2 flex-wrap gap-2">
						<div>
							<span class="font-semibold">Активный запрос:</span>
							{activeRequest ? activeRequest.label : session?.label}
						</div>
						<div class="text-sm text-gray-600">
							Собрано: {activeRequest
								? Object.keys(activeRequest.results).length
								: Object.keys(activeResults ?? {}).length} / {characters.length}
						</div>
					</div>

					{#if (activeRequest && activeRequest.request_type !== 'initiative') || (session && activeType !== 'initiative')}
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
						Игроки видят запрос в своих листах и могут бросить сами. Если лист игрока не открыт,
						нажмите 🎲 на его карточке ниже — бросите за него.
					</div>

					<button
						class="mt-3 px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
						onclick={endSession}>
						■ Отменить запрос
					</button>
				</div>
			{/if}
			<a href="/" class="px-4 py-2 border rounded hover:bg-gray-50">← К игрокам</a>
		</div>
	</header>

	<section class="border rounded-lg bg-white p-4 mb-6" aria-labelledby="storyteller-notes-title">
		<div class="flex justify-between items-center gap-3 flex-wrap mb-3">
			<h2 id="storyteller-notes-title" class="font-semibold">Заметки сказителя</h2>
			<button class="px-3 py-2 border rounded hover:bg-gray-50 disabled:opacity-50" disabled={!notesStorageReady || !storytellerNotes.trim()} onclick={exportNotes}>Скачать .txt</button>
		</div>
		<label for="storyteller-notes" class="sr-only">Заметки сказителя</label>
		<textarea id="storyteller-notes" class="w-full min-h-48 resize-y border rounded p-3 text-sm" rows="8" placeholder="Сюжетные планы, события сессии, персонажи и другие записи…" bind:value={storytellerNotes} oninput={saveNotes} disabled={!notesStorageReady} aria-describedby="storyteller-notes-status"></textarea>
		<p id="storyteller-notes-status" class="text-xs text-gray-500 mt-2" role="status">{notesStatus}</p>
	</section>

	<section class="border rounded-lg bg-white p-4 mb-6" aria-labelledby="tavern-season-title">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h2 id="tavern-season-title" class="font-semibold">Время года в Таверне</h2>
				<p class="text-sm text-gray-600">Сезон меняет доступность блюд из свежих сезонных продуктов.</p>
			</div>
			<div class="flex flex-wrap gap-2" role="group" aria-label="Выбрать время года">
				{#each PARMA_SEASONS as season}
					<button type="button" class="px-3 py-2 border rounded {tavernSeason === season.id ? 'bg-green-800 text-white' : 'hover:bg-gray-50'}" disabled={savingTavernSeason} aria-pressed={tavernSeason === season.id} onclick={() => setTavernSeason(season.id)}>{season.label}</button>
				{/each}
			</div>
		</div>
		{#if tavernSettingsStatus}<p class="text-sm mt-3" role="status">{tavernSettingsStatus}</p>{/if}
	</section>

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
		{#if activeRequest || session}
			<div class="mt-4 p-3 bg-amber-50 border border-amber-300 rounded">
				<div class="flex justify-between items-center mb-2 flex-wrap gap-2">
					<div>
						<span class="font-semibold">Активный запрос:</span>
						{activeRequest ? activeRequest.label : session?.label}
					</div>
					<div class="text-sm text-gray-600">
						Собрано: {Object.keys(activeResults).length} / {characters.length}
					</div>
				</div>

				{#if activeType !== 'initiative'}
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
					Игроки видят запрос в своих листах и могут бросить сами. Если лист игрока не открыт,
					нажмите 🎲 на его карточке ниже — бросите за него.
				</div>

				<button
					class="mt-3 px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
					onclick={endSession}>
					■ Отменить запрос
				</button>
			</div>
		{/if}
	</section>

	{#if difficultyError}<p role="alert" class="text-red-700 mb-3">{difficultyError}</p>{/if}
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
				{@const result = activeResults[c.id]}
				<div class="border rounded-lg bg-white p-4 flex flex-col {result ? 'border-green-400' : ''}">
					<div class="flex justify-between items-start mb-3">
						<div>
							<div class="font-bold text-lg">{c.name || '(без имени)'}</div>
							<div class="text-sm text-gray-500">{raceName(c.raceId)} · {c.level} ур.</div>
						</div>
						{#if activeRequest || session}
							<button
								class="text-2xl leading-none hover:text-purple-600 transition-colors"
								title="Бросить за игрока"
								onclick={() => gmRoll(c.id)}>🎲</button>
						{/if}
					</div>

					<div class="mb-3 rounded border p-2" role="group" aria-label={`Сложность проверки: ${c.name}`}>
						<div class="flex justify-between text-sm mb-2"><span>Сложность проверки</span><strong>{getCheckDifficulty(c) > 0 ? '+' : ''}{getCheckDifficulty(c)}</strong></div>
						<div class="flex flex-wrap gap-1">
							{#each [-1,-5,-10,1,5,10] as amount}<button class="px-2 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50" disabled={savingDifficulty[c.id]} aria-label={`Сложность ${amount > 0 ? '+' : ''}${amount}: ${c.name}`} onclick={() => changeDifficulty(c.id,amount)}>{amount > 0 ? '+' : '−'}{Math.abs(amount)}</button>{/each}
							<button class="px-2 py-1 border rounded text-sm" disabled={savingDifficulty[c.id]} onclick={() => changeDifficulty(c.id,null)}>Сброс</button>
						</div>
						<p class="text-xs text-gray-500 mt-1">Минус усложняет к100, плюс облегчает. Прыть не меняется.</p>
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
								{activeType ? SESSION_TITLES[activeType] : 'Прыть'}
							</div>
							{#if result && activeType === 'initiative'}
								<div class="text-xl font-bold text-purple-700">
									{result.roll + result.modifier}
								</div>
								<div class="text-xs text-gray-500">{result.roll}+{result.modifier}</div>
							{:else if result && activeType !== 'initiative'}
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
							{:else if activeType}
								{#if activeType === 'initiative'}
									<div class="text-sm text-gray-500 mt-1">к20+{dexMod}</div>
									<div class="text-xs text-amber-700 mt-0.5">ожидается</div>
								{:else}
									{@const t = getTargetFor(c, activeType)}
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
