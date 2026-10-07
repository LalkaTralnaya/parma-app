<script lang="ts">
	import { onMount } from 'svelte';
	import CloudAccount from '$lib/components/CloudAccount.svelte';
	import { ADVENTURES } from '$lib/rules/adventures';
	import { supabase } from '$lib/supabase/client';
	import { listAdventureProgress, type AdventureProgress } from '$lib/sync/adventureProgress';
	let signedIn = $state(false);
	let progress = $state<AdventureProgress[]>([]);
	let progressError = $state('');
	let loadVersion = 0;
	async function refresh() {
		const version = ++loadVersion;
		const { data: { session } } = await supabase.auth.getSession();
		if (version !== loadVersion) return;
		signedIn = Boolean(session);
		if (!session) { progress = []; return; }
		try { const entries = await listAdventureProgress(); if (version === loadVersion) { progress = entries; progressError = ''; } }
		catch (error) { if (version === loadVersion) progressError = `Не удалось загрузить приключения: ${(error as Error).message}`; }
	}
	onMount(() => {
		void refresh();
		const { data } = supabase.auth.onAuthStateChange(() => setTimeout(() => { void refresh(); }, 0));
		return () => data.subscription.unsubscribe();
	});
</script>

<svelte:head>
	<title>Аккаунт — Парма</title>
	<meta name="description" content="Вход в аккаунт Пармы и синхронизация персонажей." />
</svelte:head>

<main class="account-page">
	<a href="/" class="back">← К персонажам</a>
	<h1>Ваш аккаунт</h1>
	<p>Сохраняйте персонажей и отмечайте пройденные сцены приключений. После входа данные будут доступны на ваших устройствах.</p>
	<CloudAccount />
	{#if signedIn}
		<section class="history" aria-labelledby="history-title">
			<h2 id="history-title">Ваши приключения</h2>
			{#if progressError}<p role="alert">{progressError}</p>
			{:else if progress.length === 0}<p>Пока нет сохранённых приключений. Выберите историю в каталоге и начните прохождение.</p>
			{:else}
				<ul>{#each progress as entry (entry.adventureSlug)}
					{@const adventure = ADVENTURES.find((item) => item.slug === entry.adventureSlug)}
					<li><a href={`/adventures/${entry.adventureSlug}`}>{adventure?.title ?? entry.adventureSlug}</a><span>{entry.completedAt ? 'Пройдено' : `В процессе · ${entry.sceneIds.length} сцен`}</span></li>
				{/each}</ul>
			{/if}
		</section>
	{/if}
</main>

<style>
	.account-page { max-width: 740px; margin: auto; padding: 36px 24px 70px; }
	.back { font-size: 14px; color: #3e7657; }
	h1 { font: 44px Georgia, serif; color: #173d30; margin: 22px 0 10px; }
	p { color: #52665b; line-height: 1.6; }
	.history { background: #fffef8; border: 1px solid #d5daca; border-radius: 10px; padding: 22px; }
	.history h2 { font: 26px Georgia, serif; margin: 0 0 12px; }
	.history ul { list-style: none; padding: 0; margin: 0; }
	.history li { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px solid #e5e9dd; }
	.history a { color: #285c46; }
	.history span { color: #60705b; font-size: 13px; }
</style>
