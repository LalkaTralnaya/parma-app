<script lang="ts">
	import { onMount } from 'svelte';
	import type { User } from '@supabase/supabase-js';
	import { env } from '$env/dynamic/public';
	import { accountLabel, LOGIN_HINT, registerWithLogin, signInIdentifier, type AuthSettings } from '$lib/supabase/login';
	import { supabase } from '$lib/supabase/client';
	import { clearGuestCharacters, copyGuestCharactersToAccount, countGuestCharacters } from '$lib/db/characters';
	import { syncCharacters } from '$lib/sync/cloudCharacters';
	let { compact = false }: { compact?: boolean } = $props();

	type Mode = 'login' | 'register';
	let mode = $state<Mode>('login');
	let login = $state('');
	let password = $state('');
	let userId = $state<string | null>(null);
	let userLabel = $state<string | null>(null);
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

	function applyUser(user: User | null) {
		const nextId = user?.id ?? null;
		const changed = nextId !== userId;
		userId = nextId;
		userLabel = user ? accountLabel(user) : null;
		watchUser(nextId);
		if (changed) {
			void countGuestCharacters().then((count) => guestCount = count);
			refreshCharacters();
			if (nextId) void syncCharacters().then(refreshCharacters).catch((error) => {
				message = `Не удалось загрузить облачные данные: ${(error as Error).message}`;
			});
		}
	}


	onMount(() => {
		void countGuestCharacters().then((count) => guestCount = count);
		const { data } = supabase.auth.onAuthStateChange((_event, session) => {
			setTimeout(() => applyUser(session?.user ?? null), 0);
		});
		return () => { data.subscription.unsubscribe(); if (realtime) void supabase.removeChannel(realtime); };
	});

	async function getAuthSettings(): Promise<AuthSettings> {
		const response = await fetch('/api/supabase/auth/v1/settings', {
			headers: { apikey: env.PUBLIC_SUPABASE_ANON_KEY ?? '' }
		});
		if (!response.ok) throw new Error('Не удалось проверить доступность регистрации. Попробуйте позже.');
		return response.json();
	}

	async function submitCredentials() {
		if (busy) return;
		busy = true; message = '';
		try {
			if (mode === 'register') {
				await registerWithLogin(supabase.auth, login, password, getAuthSettings);
				message = 'Аккаунт создан. Вход выполнен.';
			} else {
				const { error } = await supabase.auth.signInWithPassword({ email: signInIdentifier(login), password });
				if (error) throw error;
				message = 'Вход выполнен.';
			}
			password = '';
		} catch (error) {
			const authError = error as { code?: string; message?: string };
			message = authError.code === 'invalid_credentials' ? 'Неверный логин или пароль.'
				: authError.code === 'user_already_exists' || authError.code === 'email_exists' ? 'Этот логин уже занят.'
				: `Ошибка: ${authError.message ?? 'Не удалось войти.'}`;
		} finally { busy = false; }
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

{#if compact}
	<div class="cloud-compact" aria-label="Аккаунт Пармы">
		{#if userId}
			<p>Персонажи сохраняются в облаке и на этом устройстве.<br /><a href="/account">Управлять аккаунтом</a>{#if guestCount > 0} · Есть герои для переноса{/if}</p>
		{:else}
			<p>Герои сохраняются в этом браузере.<br /><a href="/account">Войти в аккаунт</a>, чтобы продолжить на другом устройстве.</p>
		{/if}
		{#if message}<p class="message" role="status">{message} <a href="/account">Открыть аккаунт</a></p>{/if}
	</div>
{:else}
<section class="cloud-card" aria-label="Аккаунт Пармы">
	{#if userId}
		<div class="account-details"><strong>Аккаунт Пармы</strong><small>{userLabel} · персонажи сохраняются в облаке и на этом устройстве</small></div>
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
			<button type="button" class:chosen={mode === 'login'} disabled={busy} onclick={() => { mode = 'login'; message = ''; }}>Войти</button>
			<button type="button" class:chosen={mode === 'register'} disabled={busy} onclick={() => { mode = 'register'; message = ''; }}>Регистрация</button>
		</div>
		<form onsubmit={(event) => { event.preventDefault(); void submitCredentials(); }}>
			<label for="cloud-login">{mode === 'register' ? 'Логин' : 'Логин или прежний email'}</label>
			<input id="cloud-login" type="text" bind:value={login} required autocomplete="username" autocapitalize="none" spellcheck="false" aria-describedby="login-hint" disabled={busy} />
			<label for="cloud-password">Пароль</label>
			<input id="cloud-password" type="password" bind:value={password} required minlength={mode === 'register' ? 8 : undefined} autocomplete={mode === 'login' ? 'current-password' : 'new-password'} disabled={busy} />
			<button type="submit" disabled={busy}>{busy ? 'Подождите…' : mode === 'register' ? 'Создать аккаунт' : 'Войти'}</button>
		</form>
		<p class="hint" id="login-hint">{mode === 'register' ? LOGIN_HINT : 'Для старого аккаунта используйте email, с которым регистрировались.'}</p>
		<p class="hint">Почта не нужна. Сохраните логин и пароль: автоматического восстановления пароля нет.</p>
	{/if}
	{#if message}<p class="message" role="status">{message}</p>{/if}
</section>
{/if}

<style>
	.cloud-compact { margin-top: 18px; padding-top: 14px; border-top: 1px solid #d5daca; color: #5f6c60; font-size: 12px; }
	.cloud-compact p { margin: 0; }
	.cloud-compact a { color: #315440; text-decoration: underline; text-underline-offset: 3px; }
	.cloud-card { display: grid; gap: 14px; padding: 20px; margin: 18px 0; border: 1px solid #c9d6cc; border-radius: 12px; background: #f5f8f4; color: #173d30; }
	.account-details { display: grid; gap: 4px; }
	.account-details strong { font: 24px Georgia, serif; }
	.account-details small, .guest-import p { color: #52665b; font-size: 13px; }
	.actions, .mode-tabs { display: flex; gap: 9px; flex-wrap: wrap; align-items: center; }
	.mode-tabs { border-bottom: 1px solid #c9d6cc; padding-bottom: 9px; }
	form { display: grid; grid-template-columns: auto minmax(160px, 1fr); gap: 9px 12px; align-items: center; max-width: 520px; }
	form button { grid-column: 2; justify-self: start; }
	input { padding: 9px 11px; border: 1px solid #aab9ac; border-radius: 7px; min-width: 0; }
	button { padding: 9px 13px; border: 0; border-radius: 7px; background: #173d30; color: #fff; cursor: pointer; }
	button:disabled { opacity: .55; cursor: not-allowed; }
	.quiet, .mode-tabs button { background: transparent; color: #173d30; border: 1px solid #aab9ac; }
	.mode-tabs .chosen { background: #173d30; color: #fff; }
	.hint { margin: 0; color: #52665b; font-size: 13px; }
	.guest-import { border-top: 1px solid #c9d6cc; padding-top: 10px; }
	.message { margin: 0; font-size: 13px; overflow-wrap: anywhere; }
	@media (max-width: 530px) { form { grid-template-columns: 1fr; } form button { grid-column: 1; } }
</style>
