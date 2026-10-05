<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase/client';
	import { syncCharacters } from '$lib/sync/cloudCharacters';
	let email = $state('');
	let userEmail = $state<string | null>(null);
	let message = $state('');
	let busy = $state(false);
	let realtime: ReturnType<typeof supabase.channel> | null = null;
	function watchUser(userId: string | undefined) {
		if (realtime) { void supabase.removeChannel(realtime); realtime = null; }
		if (!userId) return;
		realtime = supabase.channel(`characters:${userId}`).on('postgres_changes', {
			event: '*', schema: 'public', table: 'user_characters', filter: `user_id=eq.${userId}`
		}, async () => { await syncCharacters(); window.dispatchEvent(new Event('parma-cloud-sync')); }).subscribe();
	}
	onMount(() => {
		void supabase.auth.getUser().then(async ({ data }) => { userEmail = data.user?.email ?? null; watchUser(data.user?.id); if (userEmail) { await syncCharacters(); window.dispatchEvent(new Event('parma-cloud-sync')); } });
		const { data } = supabase.auth.onAuthStateChange((_event, session) => {
			userEmail = session?.user.email ?? null;
			watchUser(session?.user.id);
			if (session?.user) setTimeout(async () => { await syncCharacters(); window.dispatchEvent(new Event('parma-cloud-sync')); }, 0);
		});
		return () => { data.subscription.unsubscribe(); if (realtime) void supabase.removeChannel(realtime); };
	});
	async function signIn() {
		busy = true; message = '';
		const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
		message = error ? `Ошибка: ${error.message}` : 'Проверьте почту: ссылка для входа отправлена.';
		busy = false;
	}
	async function signOut() { await supabase.auth.signOut(); userEmail = null; message = 'Вы вышли из аккаунта.'; }
	async function syncNow() { await syncCharacters(); window.dispatchEvent(new Event('parma-cloud-sync')); message = 'Синхронизация завершена.'; }
</script>

<section class="cloud-card" aria-label="Облачная синхронизация персонажей">
	{#if userEmail}
		<div><strong>Облако включено</strong><small>{userEmail} · персонажи синхронизируются</small></div>
		<button type="button" onclick={syncNow}>Синхронизировать</button>
		<button type="button" class="quiet" onclick={signOut}>Выйти</button>
	{:else}
		<div><strong>Синхронизация персонажей</strong><small>Вход по email сохраняет копии персонажей в вашем аккаунте.</small></div>
		<form onsubmit={(event) => { event.preventDefault(); void signIn(); }}>
			<label for="cloud-email">Email</label><input id="cloud-email" type="email" bind:value={email} required autocomplete="email" />
			<button type="submit" disabled={busy}>{busy ? 'Отправка…' : 'Войти по ссылке'}</button>
		</form>
	{/if}
	{#if message}<small role="status">{message}</small>{/if}
</section>

<style>
	.cloud-card{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;padding:1rem;margin:1rem 0;border:1px solid #c9d6cc;border-radius:1rem;background:#f5f8f4;color:#173d30}
	.cloud-card div{display:grid;gap:.2rem;flex:1 1 15rem}.cloud-card small{font-size:.82rem;color:#52665b}
	form{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}input{padding:.55rem;border:1px solid #aab9ac;border-radius:.5rem;min-width:12rem}
	button{padding:.55rem .8rem;border:0;border-radius:.5rem;background:#173d30;color:white;cursor:pointer}.quiet{background:transparent;color:#173d30;border:1px solid #aab9ac}
</style>
