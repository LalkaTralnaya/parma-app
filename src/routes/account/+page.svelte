<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import CloudAccount from '$lib/components/CloudAccount.svelte';
	import { ADVENTURES } from '$lib/rules/adventures';
	import { supabase } from '$lib/supabase/client';
	import { listAdventureProgress, type AdventureProgress } from '$lib/sync/adventureProgress';
	let { data, form }: { data: { feedbackEnabled: boolean }; form: { values?: Record<string, string>; feedbackError?: string; feedbackSent?: boolean } | null } = $props();
	let feedbackBusy = $state(false);
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
 <section class="feedback" aria-labelledby="feedback-title">
  <h2 id="feedback-title">Обратная связь</h2>
  <p>Нашли ошибку или хотите предложить улучшение? Напишите автору Пармы.</p>
  {#if !data.feedbackEnabled}<p class="mail-status">Отправка через форму пока не подключена. Можно написать на <a href="mailto:vlad.malcev.2013@gmail.com">vlad.malcev.2013@gmail.com</a>.</p>{/if}
  <form method="POST" action="?/feedback" use:enhance={() => {
   feedbackBusy = true;
   return async ({ update }) => { try { await update({ reset: false, invalidateAll: false }); } finally { feedbackBusy = false; } };
  }}>
   <fieldset disabled={feedbackBusy}>
    <div class="feedback-row"><label>Имя или логин <span>(необязательно)</span><input name="name" maxlength="80" autocomplete="nickname" value={form?.values?.name ?? ''}/></label><label>Почта для ответа <span>(необязательно)</span><input name="replyEmail" type="email" maxlength="254" autocomplete="email" value={form?.values?.replyEmail ?? ''}/></label></div>
    <label>Тема обращения<select name="topic" value={form?.values?.topic ?? 'bug'}><option value="bug">Ошибка в приложении</option><option value="idea">Предложение</option><option value="question">Вопрос</option><option value="other">Другое</option></select></label>
    <label>Заголовок<input name="subject" required maxlength="120" placeholder="Кратко опишите обращение" value={form?.values?.subject ?? ''}/></label>
    <label>Сообщение<textarea name="message" required minlength="10" maxlength="5000" rows="6" placeholder="Для ошибки: что сделали, что ожидали и что произошло." value={form?.values?.message ?? ''}></textarea></label>
    <div class="website-field" aria-hidden="true"><label>Ваш сайт<input name="website" tabindex="-1" autocomplete="off"/></label></div>
    <p class="privacy-note">Сообщение будет отправлено автору приложения. Пароль и данные входа не указывайте. Почта нужна только если хотите получить ответ.</p>
    <button type="submit" disabled={!data.feedbackEnabled || feedbackBusy}>{feedbackBusy ? 'Отправляем…' : 'Отправить сообщение'}</button>
   </fieldset>
   {#if form?.feedbackError}<p role="alert" class="feedback-error">{form.feedbackError}</p>{/if}
   {#if form?.feedbackSent}<p role="status" class="feedback-success">Сообщение отправлено. Спасибо за обратную связь!</p>{/if}
  </form>
 </section>
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
 .feedback{margin-top:28px;border:1px solid #d5daca;border-radius:12px;padding:22px;background:#fffef8}.feedback h2{font:26px Georgia,serif;margin:0 0 10px}.feedback fieldset{border:0;padding:0;margin:0;min-width:0}.feedback label{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;font-size:14px}.feedback label span{color:#60705b;font-size:12px}.feedback input,.feedback select,.feedback textarea{padding:10px 12px;border:1px solid #aab9ac;border-radius:8px;background:#fffef8;color:#24392d;width:100%;min-width:0;box-sizing:border-box}.feedback textarea{resize:vertical}.feedback-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}.feedback button{border:1px solid #173d30;border-radius:8px;padding:11px 18px;background:#173d30;color:#fff;cursor:pointer}.feedback button:disabled{opacity:.5;cursor:not-allowed}.website-field{display:none}.feedback .privacy-note{font-size:12px}.mail-status{font-size:14px;border-left:3px solid #bf955b;padding-left:12px}.feedback-error{color:#9a3d2e}.feedback-success{color:#285c46}@media(max-width:560px){.feedback-row{grid-template-columns:1fr;gap:0}.feedback{padding:18px}.account-page{padding:28px 16px 50px}}
</style>
