<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { listCharacters, getCharacter, saveCharacter } from '$lib/db/characters';
	import { canAfford } from '$lib/engine/inventory';
	import { purchaseItem } from '$lib/engine/shop';
	import { findRoomByCode, getCurrentRoom, getRoomCombatState, subscribeToRoomCombat } from '$lib/engine/rooms';
	import { DEFAULT_TAVERN_SETTINGS, normalizeTavernSettings, readLocalTavernSettings, TAVERN_SETTINGS_KEY } from '$lib/engine/tavern-settings';
	import { isAvailableInSeason, PARMA_SEASONS, TAVERN_MENU, TAVERN_REGIONS, type ParmaSeason, type TavernKind } from '$lib/rules/tavern-menu';
	import type { Character } from '$lib/type';

	const LOCATION_KEY = 'parma_tavern_location';
	let characters = $state<Character[]>([]);
	let selectedId = $state('');
	let loading = $state(true);
	let busy = $state(false);
	let error = $state('');
	let notice = $state('');
	let query = $state('');
	let category = $state<TavernKind | 'all'>('all');
	let quantity = $state(1);
	let selectedRegion = $state('');
	let locationName = $state('');
	let season = $state<ParmaSeason>(DEFAULT_TAVERN_SETTINGS.season);
	let unsubRoomSettings: (() => void) | null = null;
	const selected = $derived(characters.find((character) => character.id === selectedId));
	const filtered = $derived(TAVERN_MENU.filter((product) =>
		isAvailableInSeason(product, season) &&
		(category === 'all' || product.kind === category) &&
		`${product.name} ${product.description}`.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru'))
	));
	const activeSeasonLabel = $derived(PARMA_SEASONS.find((option) => option.id === season)?.label ?? 'не задан');
	const selectedRegionLabel = $derived(TAVERN_REGIONS.find((region) => region.id === selectedRegion)?.label ?? '');
	const locationReady = $derived(Boolean(selectedRegion && locationName.trim()));

	function saveLocation() {
		try { localStorage.setItem(LOCATION_KEY, JSON.stringify({ region: selectedRegion, name: locationName })); } catch { /* Покупка всё равно доступна после выбора. */ }
	}

	function applySeason(value: unknown) {
		const settings = normalizeTavernSettings(value);
		if (settings) season = settings.season;
	}

	function formatPrice(copper: number) {
		if (copper === 0) return 'Бесплатно';
		const silver = Math.floor(copper / 100);
		const remainder = copper % 100;
		return [silver ? `${silver} с.` : '', remainder ? `${remainder} м.` : ''].filter(Boolean).join(' ');
	}

	function kindLabel(kind: TavernKind) {
		return kind === 'dish' ? 'Блюдо' : kind === 'drink' ? 'Напиток' : kind === 'meal' ? 'Готовый обед' : 'Провизия';
	}

	async function loadCharacters() {
		try {
			characters = await listCharacters();
			const fromLink = page.url.searchParams.get('character');
			if (!characters.some((character) => character.id === selectedId)) {
				selectedId = characters.some((character) => character.id === fromLink) ? fromLink! : characters[0]?.id ?? '';
			}
		} catch {
			error = 'Не удалось загрузить персонажей.';
		} finally { loading = false; }
	}

	async function buy(productId: string) {
		if (busy || !selectedId || !locationReady) return;
		if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
			error = 'Выберите количество от 1 до 99.';
			return;
		}
		const product = TAVERN_MENU.find((entry) => entry.id === productId);
		if (!product || !isAvailableInSeason(product, season)) return;
		busy = true;
		error = '';
		notice = '';
		const id = selectedId;
		try {
			const current = await getCharacter(id);
			if (!current) throw new Error('Персонаж не найден. Выберите другого.');
			const updated = purchaseItem(current, productId, quantity);
			await saveCharacter(updated);
			characters = characters.map((character) => character.id === id ? updated : character);
			notice = `${updated.name || 'Безымянный'} купил: ${product.name} × ${quantity} за ${formatPrice(product.priceCopper * quantity)}. Добавлено в инвентарь.`;
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Не удалось завершить покупку.';
		} finally { busy = false; }
	}

	onMount(() => {
		void loadCharacters();
		applySeason(readLocalTavernSettings());
		try {
			const savedLocation = JSON.parse(localStorage.getItem(LOCATION_KEY) ?? 'null') as { region?: string; name?: string } | null;
			if (savedLocation) {
				selectedRegion = TAVERN_REGIONS.some((region) => region.id === savedLocation.region) ? savedLocation.region! : '';
				locationName = typeof savedLocation.name === 'string' ? savedLocation.name : '';
			}
		} catch { /* Покупатель выберет место вручную. */ }

		const onLocalSettings = (event: Event) => applySeason((event as CustomEvent).detail);
		const onStorage = (event: StorageEvent) => { if (event.key === TAVERN_SETTINGS_KEY) applySeason(readLocalTavernSettings()); };
		window.addEventListener('parma-tavern-settings', onLocalSettings);
		window.addEventListener('storage', onStorage);
		const connectRoomSettings = async () => {
			const code = getCurrentRoom();
			if (!code) return;
			try {
				const room = await findRoomByCode(code);
				if (!room) return;
				const state = await getRoomCombatState(room.id);
				applySeason(state?.tavernSettings);
				unsubRoomSettings = subscribeToRoomCombat(room.id, (next) => applySeason(next?.tavernSettings));
			} catch { /* Оставляем сезон, сохранённый локально. */ }
		};
		void connectRoomSettings();
		return () => {
			window.removeEventListener('parma-tavern-settings', onLocalSettings);
			window.removeEventListener('storage', onStorage);
			unsubRoomSettings?.();
		};
	});

	onDestroy(() => unsubRoomSettings?.());
</script>

<svelte:head><title>Таверна — Парма</title><meta name="description" content="Меню корчмы Пармы: блюда, напитки и дорожная провизия." /></svelte:head>

<main class="tavern">
	<header class="heading">
		<span class="eyebrow">Трапеза и припасы</span>
		<h1>Таверна</h1>
		<p>Выберите место и персонажа, затем заказывайте еду и напитки или берите припасы в дорогу. Покупки списывают деньги и попадают в инвентарь.</p>
	</header>

	<section class="panel location-panel" aria-label="Место и покупатель">
		<div class="location-fields">
			<label>Местность
				<select bind:value={selectedRegion} disabled={busy} onchange={saveLocation}>
					<option value="">— выберите местность —</option>
					{#each TAVERN_REGIONS as region}<option value={region.id}>{region.label}</option>{/each}
				</select>
			</label>
			<label>Локация или название корчмы
				<input bind:value={locationName} disabled={busy} oninput={saveLocation} placeholder="Например, корчма у речной переправы" />
			</label>
		</div>
		<div class="location-summary">
			<span>Время года</span>
			<strong>{activeSeasonLabel}</strong>
			<small>Сезон устанавливает Сказитель</small>
		</div>
		{#if loading}<p>Загружаем персонажей…</p>
		{:else if characters.length}
			<label>Покупатель
				<select bind:value={selectedId} disabled={busy} onchange={() => { notice = ''; error = ''; }}>
					{#each characters as character}<option value={character.id}>{character.name || 'Безымянный'}</option>{/each}
				</select>
			</label>
			{#if selected}<div class="purse"><span>Кошель</span><strong>{selected.money?.gold ?? 0} златников · {selected.money?.silver ?? 0} серебряников · {selected.money?.copper ?? 0} медяков</strong><a href={`/char/${selected.id}#inventory`}>Открыть инвентарь →</a></div>{/if}
		{:else}<p>Для покупки нужен персонаж. <a href="/new">Создать персонажа →</a></p>{/if}
	</section>

	{#if error}<p class="feedback error" role="alert">{error}</p>{/if}
	{#if notice}<p class="feedback" role="status">{notice}</p>{/if}
	{#if !locationReady}<p class="feedback hint" role="status">Сначала выберите местность и укажите локацию, чтобы открыть меню.</p>{/if}

	<div class="filters">
		<label>Поиск по меню<input type="search" bind:value={query} placeholder="Блюдо, напиток или припас" /></label>
		<label>Раздел<select bind:value={category}><option value="all">Всё меню</option><option value="dish">Блюда</option><option value="drink">Напитки</option><option value="meal">Готовые обеды</option><option value="provision">Провизия</option></select></label>
		<label>Количество<input type="number" min="1" max="99" step="1" bind:value={quantity} disabled={busy} /></label>
	</div>
	<p class="catalog-count">Местность: {selectedRegionLabel || 'не выбрана'} · Вода бесплатна · 100 медяков = 1 серебряник</p>

	<div class="catalog">
		{#each filtered as product (product.id)}
			{@const preferredHere = Boolean(product.favoredRegions?.includes(selectedRegion))}
			{@const quantityValid = Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 99}
			{@const total = product.priceCopper * (quantityValid ? quantity : 1)}
			{@const affordable = selected && quantityValid && canAfford(selected, total / 100)}
			<article class="item-card">
				<div class="tags"><span class="tag">{kindLabel(product.kind)}</span>{#if preferredHere}<span class="tag local">Местная особенность</span>{/if}</div>
				<h2>{product.name}</h2>
				<p class="description">{product.description}</p>
				{#if product.kind === 'dish' || product.kind === 'drink' || product.kind === 'meal'}<p class="fine-print">Обычная еда не даёт эффект особого рецепта автоматически.</p>{/if}
				<div class="purchase"><strong>{formatPrice(total)}</strong><button onclick={() => buy(product.id)} disabled={busy || !locationReady || !affordable} aria-label={`Купить: ${product.name}`}>{busy ? 'Сохраняем…' : product.priceCopper === 0 ? 'Взять' : 'Купить'}</button></div>
				{#if selected && quantityValid && !affordable}<small>Недостаточно денег</small>{/if}
			</article>
		{:else}<p>В этом разделе меню ничего не найдено.</p>{/each}
	</div>
</main>

<style>
	.tavern{max-width:1200px;margin:auto;padding:2rem 1.25rem 4rem}.heading{max-width:720px;margin-bottom:1.5rem}.eyebrow{font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:#875a32}h1{font-size:2.8rem;margin:.25rem 0 .5rem}h2{font-size:1.25rem;margin:.5rem 0}.panel{border:1px solid var(--border,#8c987e);border-radius:14px;padding:1.25rem;background:var(--surface,#f6f4ec);display:flex;align-items:end;gap:1rem;flex-wrap:wrap;margin-bottom:1rem}.location-fields{display:grid;grid-template-columns:minmax(180px,1fr) minmax(240px,1.5fr);gap:1rem;flex:1 1 520px}.location-summary,.purse{display:flex;flex-direction:column;gap:.25rem}.location-summary span,.purse span,.location-summary small{font-size:.8rem;opacity:.7}.location-summary strong{font-size:1.1rem}.purse a,a{text-decoration:underline}.panel label,.filters label{display:flex;flex-direction:column;gap:.4rem;font-size:.9rem}input,select{border:1px solid var(--border,#8c987e);border-radius:8px;padding:.65rem;background:var(--surface,#f6f4ec);color:inherit;min-width:0}.panel select{min-width:190px}.feedback{padding:.85rem 1rem;border:1px solid #648567;border-radius:8px;margin:.75rem 0}.error{border-color:#b87756;color:#713d2d}.hint{background:#f6f4ec}.filters{display:grid;grid-template-columns:2fr 1fr 1fr;gap:1rem;margin-top:1.5rem}.catalog-count{font-size:.8rem;opacity:.7;margin:1rem 0}.catalog{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.item-card{border:1px solid var(--border,#8c987e);border-radius:14px;padding:1.15rem;display:flex;flex-direction:column;background:var(--surface,#f6f4ec);min-height:220px}.tags{display:flex;gap:.4rem;flex-wrap:wrap}.tag{font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;opacity:.7}.tag.local{color:#286044;font-weight:700}.description{font-size:.9rem;margin:.2rem 0 .75rem}.fine-print{font-size:.75rem;color:#68695d;margin-top:auto;padding-top:.5rem}.purchase{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:.75rem}.purchase strong{font-size:.95rem}button{padding:.55rem .9rem;border-radius:8px;background:#254d3a;color:#fff;border:1px solid #254d3a;cursor:pointer}button:disabled{opacity:.45;cursor:not-allowed}small{margin-top:.5rem;opacity:.7}@media(max-width:900px){.catalog{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.catalog,.filters,.location-fields{grid-template-columns:1fr}.panel{align-items:stretch}.panel label{width:100%}.panel select{width:100%}.tavern{padding:1.25rem .8rem 3rem}h1{font-size:2.2rem}}
</style>
