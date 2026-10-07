<script lang="ts">
	import { onMount } from 'svelte';
	import type { EmailOtpType } from '@supabase/supabase-js';
	import { supabase } from '$lib/supabase/client';
	import { clearGuestCharacters, copyGuestCharactersToAccount, countGuestCharacters } from '$lib/db/characters';
	import { syncCharacters } from '$lib/sync/cloudCharacters';

	type Mode = 'login' | 'register' | 'recover';
	let mode = $state<Mode>('login');
	let email = $state('');
	let password = $state('');
	let userId = $state<string | null>(null);
	let userEmail = $state<string | null>(null);
	let guestCount = $state(0);
	let message = $state('');
	let busy = $state(false);
	let realtime: ReturnType<typeof supabase.channel> | null = null;
	let watchedUserId: string | null = null;

	const refreshCharacters = () => window.dispatchEvent(new Event('parma-cloud-sync'));

	function watchUser(id: string | null) {
		if (watchedUserId === id) return;
		if (realtime) void supabase.removeChannel(realtime);
		realtime = null;
		watchedUserId = id;
		if (!id) return;
		realtime = supabase.channel(`characters:${id}`).on('postgres_changes', {
			event: '*', schema: 'public', table: 'user_characters', filter: `user_id=eq.${id}`
		}, () => { void syncCharacters().then(refreshCharacters).catch(console.error); }).subscribe();
	}

	function applyUser(user: { id: string; email?: string } | null) {
		const nextId = user?.id ?? null;
		const changed = nextId !== userId;
		userId = nextId;
		userEmail = user?.email ?? null;
		watchUser(nextId);
		if (changed) {
			void countGuestCharacters().then((count) => guestCount = count);
			refreshCharacters();
			if (nextId) void syncCharacters().then(refreshCharacters).catch((error) => {
				message = `Не удалось загрузить облачные данные: ${(error as Error).message}`;
			});
		}
	}

	async function verifyEmailLink() {
		const params = new URLSearchParams(window.location.search);
		const tokenHash = params.get('token_hash');
		const type = params.get('type');
		if (!tokenHash) return;
		if (type !== 'email' && type !== 'magiclink' && type !== 'recovery') {
			message = 'Ссылка подтверждения недействительна.';
			return;
		}
		busy = true;
		message = 'Подтверждаем адрес почты…';
		try {
			const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
			if (error) throw error;
			window.history.replaceState(window.history.state, '', window.location.pathname);
			if (type === 'recovery') mode = 'recover';
			message = type === 'recovery' ? 'Введите новый пароль.' : 'Почта подтверждена. Вход выполнен.';
		} catch (error) {
			message = `Не удалось подтвердить почту: ${(error as Error).message}`;
		} finally { busy = false; }
	}

	onMount(() => {
		void countGuestCharacters().then((count) => guestCount = count);
		const { data } = supabase.auth.onAuthStateChange((event, session) => {
			if (event === 'PASSWORD_RECOVERY') mode = 'recover';
			setTimeout(() => applyUser(session?.user ?? null), 0);
		});
		void verifyEmailLink();
		return () => { data.subscription.unsubscribe(); if (realtime) void supabase.removeChannel(realtime); };
	});

	async function submitCredentials() {
		busy = true; message = '';
		try {
			if (mode === 'recover') {
				const { error } = await supabase.auth.updateUser({ password });
				if (error) throw error;
				mode = 'login'; message = 'Новый пароль сохранён.';
			} else if (mode === 'register') {
				const { data, error } = await supabase.auth.signUp({
					email: email.trim(), password,
					options: { emailRedirectTo: `${window.location.origin}/account` }
				});
				if (error) throw error;
				message = data.session ? 'Аккаунт создан.' : 'Проверьте почту и подтвердите регистрацию.';
			} else {
				const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
				if (error) throw error;
				message = 'Вход выполнен.';
			}
			password = '';
		} catch (error) { message = `Ошибка: ${(error as Error).message}`; }
		finally { busy = false; }
	}

	async function sendMagicLink() {
		busy = true; message = '';
		try {
			const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/account` } });
			if (error) throw error;
			message = 'Ссылка для входа отправлена на почту.';
		} catch (error) { message = `Ошибка: ${(error as Error).message}`; }
		finally { busy = false; }
	}

	async function sendPasswordReset() {
		busy = true; message = '';
		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/account` });
			if (error) throw error;
			message = 'Если такой адрес зарегистрирован, письмо для сброса пароля придёт на почту.';
		} catch (error) { message = `Ошибка: ${(error as Error).message}`; }
		finally { busy = false; }
	}

	async function signOut() {
		busy = true;
		const { error } = await supabase.auth.signOut();
		message = error ? `Ошибка: ${error.message}` : 'Вы вышли из аккаунта.';
		busy = false;
	}

	async function syncNow() {
		busy = true;
		try { await syncCharacters(); refreshCharacters(); message = 'Персонажи синхронизированы.'; }
		catch (error) { message = `Ошибка синхронизации: ${(error as Error).message}`; }
		finally { busy = false; }
	}

	async function claimGuestCharacters() {
		if (!userId) return;
		busy = true;
		try {
			const copied = await copyGuestCharactersToAccount(userId);
			await syncCharacters();
			await clearGuestCharacters();
			guestCount = 0;
			refreshCharacters();
			message = `Локальные персонажи перенесены в аккаунт: ${copied}.`;
		} catch (error) { message = `Перенос не завершён: ${(error as Error).message}. Локальные оригиналы сохранены.`; }
		finally { busy = false; }
	}
</script>

<section class="cloud-card" aria-label="Аккаунт Пармы">
	{#if userId && mode !== 'recover'}
		<div class="account-details"><strong>Аккаунт Пармы</strong><small>{userEmail} · персонажи сохраняются в облаке и на этом устройстве</small></div>
		<div class="actions">
			<button type="button" disabled={busy} onclick={syncNow}>Синхронизировать</button>
			<button type="button" class="quiet" disabled={busy} onclick={signOut}>Выйти</button>
		</div>
		{#if guestCount > 0}
			<div class="guest-import"><p>В этом браузере есть {guestCount} персонажей без аккаунта. Перенесите их, чтобы они появились на других устройствах.</p><button type="button" disabled={busy} onclick={claimGuestCharacters}>Перенести локальных персонажей</button></div>
		{/if}
	{:else}
		<div class="account-details"><strong>Сохраняйте историю в аккаунте</strong><small>Персонажи и пройденные приключения будут доступны на других устройствах.</small></div>
		<div class="mode-tabs" aria-label="Способ входа">
			<button type="button" class:chosen={mode === 'login'} onclick={() => mode = 'login'}>Войти</button>
			<button type="button" class:chosen={mode === 'register'} onclick={() => mode = 'register'}>Регистрация</button>
		</div>
		<form onsubmit={(event) => { event.preventDefault(); void submitCredentials(); }}>
			{#if mode !== 'recover'}<label for="cloud-email">Email</label><input id="cloud-email" type="email" bind:value={email} required autocomplete="email" />{/if}
			<label for="cloud-password">{mode === 'recover' ? 'Новый пароль' : 'Пароль'}</label>
			<input id="cloud-password" type="password" bind:value={password} required minlength="8" autocomplete={mode === 'login' ? 'current-password' : 'new-password'} />
			<button type="submit" disabled={busy}>{mode === 'recover' ? 'Сохранить пароль' : mode === 'register' ? 'Создать аккаунт' : 'Войти'}</button>
		</form>
		{#if mode !== 'recover'}<div class="extra-actions"><button type="button" class="text-button" disabled={busy || !email.trim()} onclick={sendMagicLink}>Войти по ссылке</button><button type="button" class="text-button" disabled={busy || !email.trim()} onclick={sendPasswordReset}>Забыли пароль?</button></div>{/if}
	{/if}
	{#if message}<p class="message" role="status">{message}</p>{/if}
</section>

<style>
	.cloud-card { display: grid; gap: 14px; padding: 20px; margin: 18px 0; border: 1px solid #c9d6cc; border-radius: 12px; background: #f5f8f4; color: #173d30; }
	.account-details { display: grid; gap: 4px; }
	.account-details strong { font: 24px Georgia, serif; }
	.account-details small, .guest-import p { color: #52665b; font-size: 13px; }
	.actions, .extra-actions, .mode-tabs { display: flex; gap: 9px; flex-wrap: wrap; align-items: center; }
	.mode-tabs { border-bottom: 1px solid #c9d6cc; padding-bottom: 9px; }
	form { display: grid; grid-template-columns: auto minmax(160px, 1fr); gap: 9px 12px; align-items: center; max-width: 520px; }
	form button { grid-column: 2; justify-self: start; }
	input { padding: 9px 11px; border: 1px solid #aab9ac; border-radius: 7px; min-width: 0; }
	button { padding: 9px 13px; border: 0; border-radius: 7px; background: #173d30; color: #fff; cursor: pointer; }
	button:disabled { opacity: .55; cursor: not-allowed; }
	.quiet, .mode-tabs button { background: transparent; color: #173d30; border: 1px solid #aab9ac; }
	.mode-tabs .chosen { background: #173d30; color: #fff; }
	.text-button { padding: 0; background: none; color: #285c46; text-decoration: underline; }
	.guest-import { border-top: 1px solid #c9d6cc; padding-top: 10px; }
	.message { margin: 0; font-size: 13px; overflow-wrap: anywhere; }
	@media (max-width: 530px) { form { grid-template-columns: 1fr; } form button { grid-column: 1; } }
</style>
