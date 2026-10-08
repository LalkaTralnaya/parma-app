<script lang="ts">
	import { onMount } from 'svelte';
	import { ADVENTURES } from '$lib/rules/adventures';
	import Icon from '$lib/components/Icon.svelte';
	import { supabase } from '$lib/supabase/client';
	import { listAdventureProgress, type AdventureProgress } from '$lib/sync/adventureProgress';
	let progressBySlug = $state<Record<string, AdventureProgress>>({});
	let progressError = $state('');
	let loadVersion = 0;
	async function refreshProgress() {
		const version = ++loadVersion;
		try {
			const entries = await listAdventureProgress();
			if (version === loadVersion) {
				progressBySlug = Object.fromEntries(entries.map((entry) => [entry.adventureSlug, entry]));
				progressError = '';
			}
		} catch (error) {
			if (version === loadVersion) progressError = `Не удалось загрузить прогресс: ${(error as Error).message}`;
		}
	}
	onMount(() => {
		void refreshProgress();
		const { data } = supabase.auth.onAuthStateChange(() => setTimeout(() => { void refreshProgress(); }, 0));
		return () => data.subscription.unsubscribe();
	});
</script>

<svelte:head>
	<title>Приключения — Парма</title>
	<meta name="description" content="Готовые приключения для настольной ролевой игры Парма." />
</svelte:head>

<main class="adventures-page">
	<header class="adventures-hero">
		<div class="hero-copy">
			<span class="eyebrow"><Icon name="book" size={18} /> Истории для игрового стола</span>
			<h1>Приключения</h1>
			<p>Выберите готовую историю, откройте её план и ведите игроков от завязки до развязки.</p>
		</div>
		<img src="/forest.svg" alt="" width="540" height="330" />
	</header>

	<section aria-labelledby="catalog-title" class="catalog">
		{#if progressError}<p class="progress-error" role="alert">{progressError}</p>{/if}
		<div class="section-heading">
			<div>
				<h2 id="catalog-title">Каталог <span class="count">{ADVENTURES.length}</span></h2>
				<p>Сейчас здесь история: расследование в Заречье с готовыми сценами, уликами и картой.</p>
			</div>
		</div>
		<div class="adventure-grid">
			{#each ADVENTURES as adventure (adventure.slug)}
				<article class="adventure-card">
					<div class="card-art" aria-hidden="true"><img src={adventure.map.src} alt="" loading="lazy" width="1672" height="941" /></div>
					<div class="card-body">
						<span class="card-label">{adventure.label}</span>
						<h3>{adventure.title}</h3>
						{#if progressBySlug[adventure.slug]}<span class="progress-badge">{progressBySlug[adventure.slug].completedAt ? 'Пройдено' : `В процессе · ${progressBySlug[adventure.slug].sceneIds.length} сцен`}</span>{/if}
						<p class="region">{adventure.region}</p>
						<p class="summary">{adventure.summary}</p>
						<div class="facts" aria-label="Параметры приключения">
							<span>{adventure.players} игроков</span><span>{adventure.levels} уровни</span><span>{adventure.duration}</span>
						</div>
						<a class="button primary" href={`/adventures/${adventure.slug}`}>Открыть приключение <Icon name="arrow" size={18} /></a>
					</div>
				</article>
			{/each}
		</div>
	</section>
</main>

<style>
	.adventures-page { max-width: 1250px; margin: auto; padding: 32px; }
	.adventures-hero { position: relative; overflow: hidden; min-height: 280px; background: #173d30; color: #f8f5de; border-radius: 12px; }
	.hero-copy { position: relative; z-index: 1; max-width: 620px; padding: 38px 42px; }
	.eyebrow { display: inline-flex; align-items: center; gap: 8px; color: #d2dcc1; font-size: 13px; }
	h1 { font-size: clamp(36px, 5vw, 56px); line-height: 1.1; margin: 18px 0; font-weight: 500; }
	.hero-copy p { color: #d2dcc1; max-width: 480px; font-size: 15px; }
	.adventures-hero img { position: absolute; width: 55%; height: 100%; object-fit: cover; object-position: center; right: 0; bottom: 0; opacity: .8; }
	.catalog { margin-top: 38px; }
	h2 { font-size: 29px; margin: 0; }
	.section-heading p { color: #5f6c60; font-size: 14px; margin: 5px 0 24px; }
	.count { font: 13px 'Segoe UI', sans-serif; background: #e4e8d9; padding: 4px 9px; border-radius: 20px; vertical-align: middle; }
	.adventure-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: 22px; }
	.adventure-card { background: #fffef8; border: 1px solid #d5daca; border-radius: 10px; overflow: hidden; max-width: 650px; box-shadow: 0 8px 24px #173d300c; }
	.card-art { height: 180px; overflow: hidden; background: #302b25; }
	.card-art img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 62% 43%; }
	.card-body { padding: 24px; }
	.card-label { color: #59714f; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; }
	.progress-badge { display: inline-block; margin-top: 8px; padding: 4px 9px; border-radius: 20px; background: #e4e8d9; color: #36543d; font-size: 12px; }
	.progress-error { color: #923737; font-size: 13px; }
	h3 { font: 28px Georgia, serif; color: #173d30; margin: 7px 0 2px; }
	.region { color: #6b6f55; font-size: 13px; margin: 0 0 14px; }
	.summary { font-size: 14px; line-height: 1.65; margin-bottom: 20px; }
	.facts { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 22px; }
	.facts span { border: 1px solid #d5daca; border-radius: 999px; padding: 3px 10px; color: #52614f; font-size: 12px; }
	@media (max-width: 760px) { .adventures-page { padding: 24px 16px; } .hero-copy { padding: 30px 24px; } .adventures-hero img { opacity: .22; width: 100%; } }
</style>
