<script lang="ts">
 import RoomImage from './RoomImage.svelte';
 import { onMount, tick } from 'svelte';
 import { getCurrentRoom, findRoomByCode, getRecentRolls, subscribeToRoom, type RoomRoll } from '$lib/engine/rooms';
 import { createRoomRollFeed, type RoomRollFeedState } from '$lib/engine/room-roll-feed';

 const chatId = $props.id();
 let open = $state(false);
 let feed = $state<RoomRollFeedState>({ code: null, room: null, rolls: [], loading: false, error: '' });
 let hasUnread = $state(false);
 let launcher = $state<HTMLButtonElement>();
 let closeButton = $state<HTMLButtonElement>();
 const controller = createRoomRollFeed({
  findRoom: findRoomByCode,
  getRolls: getRecentRolls,
  subscribe: (id, onRoll) => subscribeToRoom(id, () => {}, onRoll),
  onChange: (next) => {
   if (next.code !== feed.code) hasUnread = false;
   feed = next;
  },
  onRoll: () => { if (!open) hasUnread = true; }
 });

 onMount(() => {
  function syncRoom() {
   try { void controller.setCode(getCurrentRoom()); }
   catch { feed = { ...feed, loading: false, error: 'Не удалось прочитать активную комнату. Разрешите хранение данных сайта и повторите попытку.' }; }
  }
  function reconnect() {
   syncRoom();
   if (feed.error && document.visibilityState === 'visible') retryLoad();
  }
  syncRoom();
  const timer = setInterval(syncRoom, 1500);
  window.addEventListener('storage', syncRoom);
  window.addEventListener('online', reconnect);
  document.addEventListener('visibilitychange', reconnect);
  return () => {
   clearInterval(timer);
   window.removeEventListener('storage', syncRoom);
   window.removeEventListener('online', reconnect);
   document.removeEventListener('visibilitychange', reconnect);
   controller.dispose();
  };
 });

 function retryLoad() {
  try {
   const code = getCurrentRoom();
   if (code !== feed.code) void controller.setCode(code);
   else if (code) void controller.retry();
   else feed = { ...feed, error: '' };
  } catch {
   feed = { ...feed, loading: false, error: 'Не удалось прочитать активную комнату. Разрешите хранение данных сайта и повторите попытку.' };
  }
 }

 function trapFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab' || document.querySelector('dialog[open]')) return;
  const elements = Array.from((event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]'));
  const first = elements[0];
  const last = elements.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
 }

 async function toggle() {
  open = !open;
  if (open) {
   hasUnread = false;
   if (feed.error) retryLoad();
   await tick();
   closeButton?.focus();
  } else launcher?.focus();
 }
	function timeAgo(iso: string): string {
		const diff = Date.now() - new Date(iso).getTime();
		const sec = Math.floor(diff / 1000);
		if (sec < 10) return 'только что';
		if (sec < 60) return `${sec} сек назад`;
		const min = Math.floor(sec / 60);
		if (min < 60) return `${min} мин назад`;
		const hours = Math.floor(min / 60);
		return `${hours} ч назад`;
	}

	function translateResult(result: string): string {
		const map: Record<string, string> = {
			crit_success: 'Правь! Критический успех',
			success: 'Успех',
			fail: 'Провал',
			crit_fail: 'Навь! Критический провал',
			double: 'Явь! Дубль'
		};
		return map[result] ?? result;
	}

	function resultColorClass(result: string): string {
		if (result === 'crit_success') return 'text-green-700 font-bold';
		if (result === 'success') return 'text-green-700';
		if (result === 'double') return 'text-blue-700 font-bold';
		if (result === 'crit_fail') return 'text-red-700 font-bold';
		if (result === 'fail') return 'text-red-600';
		return 'text-gray-700';
	}

	function rollSummary(roll: RoomRoll): { text: string; resultClass: string } {
		const d = roll.roll_data as Record<string, unknown>;
		const r = (d.result as string) ?? '';

		if (roll.roll_type === 'skill') {
			return {
				text: `${d.skillName}: к100 = ${d.roll} ≤ ${d.target} — ${translateResult(r)}`,
				resultClass: resultColorClass(r)
			};
		}
		if (roll.roll_type === 'characteristic') {
			return {
				text: `${d.charName}: к100 = ${d.roll} ≤ ${d.target} — ${translateResult(r)}`,
				resultClass: resultColorClass(r)
			};
		}
		if (roll.roll_type === 'initiative') {
			return {
				text: `Прыть: к20 = ${d.roll} + ${d.modifier} = ${d.total}`,
				resultClass: 'text-purple-700 font-bold'
			};
		}
		if (roll.roll_type === 'attack') {
			return {
				text: `Атака ${d.weaponName ?? ''}: к100 = ${d.roll} ≤ ${d.target} — ${translateResult(r)}${d.damage ? `, урон ${d.damage}` : ''}`,
				resultClass: resultColorClass(r)
			};
		}
		if (roll.roll_type === 'spell') {
			return {
				text: `Магическая атака ${d.spellName ?? ''}: к100 = ${d.roll} ≤ ${d.target} — ${translateResult(r)}${d.damage ? `, эффект ${d.damage}` : ''}`,
				resultClass: resultColorClass(r)
			};
		}
		return { text: JSON.stringify(d), resultClass: 'text-gray-700' };
	}
</script>

<svelte:window onkeydown={(event) => { if (open && event.key === 'Escape' && !document.querySelector('dialog[open]')) { event.preventDefault(); void toggle(); } }} />
<button type="button" bind:this={launcher} class="roll-chat-launcher" onclick={toggle} title="Броски комнаты" aria-label="Броски комнаты" aria-expanded={open} aria-controls={chatId}>
 <span aria-hidden="true">🎲</span>
 {#if hasUnread}<span class="roll-chat-unread"><span class="sr-only">Есть новые броски</span></span>{/if}
</button>

{#if open}
 <div class="roll-chat-backdrop" onclick={toggle} role="presentation"></div>
 <div id={chatId} role="dialog" tabindex="-1" aria-modal="true" aria-labelledby={chatId + '-title'} onkeydown={trapFocus} class="roll-chat-panel bg-white shadow-2xl flex flex-col">
  <header class="px-4 py-3 border-b flex justify-between items-center">
   <div>
    <div id={chatId + '-title'} class="font-semibold">Броски комнаты</div>
    {#if feed.room}<div class="text-xs text-gray-500">{feed.room.name || 'Активная комната'}</div>{/if}
   </div>
   <button type="button" bind:this={closeButton} class="w-8 h-8 rounded hover:bg-gray-100 text-xl" onclick={toggle} aria-label="Закрыть панель бросков">✕</button>
  </header>
  <div class="flex-1 overflow-y-auto p-3 space-y-2">
   {#if !feed.code && !feed.error}
    <p class="text-sm text-gray-600 py-4">Вы ещё не подключены к комнате на этом сайте. Войдите по приглашению или создайте комнату, чтобы видеть общие броски.</p>
    <a href="/room" onclick={() => open = false} class="inline-block rounded bg-green-800 text-white px-4 py-3">Войти или создать комнату</a>
   {:else}
    {#if feed.loading}<p role="status" class="text-sm text-gray-600 py-4">Загружаем броски комнаты…</p>{/if}
    {#if feed.error}
     <div role="alert" class="text-sm text-red-700 py-4"><p>{feed.error}</p></div>
     <button type="button" class="rounded border px-4 py-2" disabled={feed.loading} onclick={retryLoad}>Повторить загрузку</button>
    {/if}
    {#if !feed.loading && !feed.error && feed.rolls.length === 0}<p class="text-sm text-gray-500 text-center py-8">Пока никто не бросал кубик.</p>{/if}
    {#each feed.rolls as roll (roll.id)}
     {@const summary = rollSummary(roll)}
     <div class="border rounded-lg p-2 bg-white text-sm">
      <div class="flex justify-between items-baseline">
       <div class="font-semibold">{roll.character_name || 'Кто-то'}</div>
       <div class="text-xs text-gray-500">{timeAgo(roll.created_at)}</div>
      </div>
      {#if roll.roll_type === 'image'}<RoomImage data={roll.roll_data} />{:else}<div class="{summary.resultClass} mt-1">{summary.text}</div>{/if}
     </div>
    {/each}
   {/if}
  </div>
  <footer class="px-4 py-2 border-t text-xs text-gray-500 text-center">
   <a href={feed.code ? '/room/' + encodeURIComponent(feed.code) : '/room'} onclick={() => open = false} class="text-blue-600 hover:underline">{feed.code ? 'Открыть полную комнату →' : 'Выбрать комнату →'}</a>
  </footer>
 </div>
{/if}

<style>
 .roll-chat-launcher { position:fixed; bottom:24px; right:24px; z-index:50; width:56px; height:56px; border:0; border-radius:50%; background:#2563eb; color:white; font-size:24px; box-shadow:0 10px 15px #0003; display:flex; align-items:center; justify-content:center; cursor:pointer; }
 .roll-chat-unread { position:absolute; top:-4px; right:-4px; width:16px; height:16px; background:#ef4444; border-radius:50%; border:2px solid white; }
 .roll-chat-backdrop { position:fixed; inset:0; z-index:70; background:#0005; }
 .roll-chat-panel { position:fixed; inset:0 0 0 auto; width:100%; max-width:28rem; z-index:71; color:#263e32; }
 .roll-chat-launcher:focus-visible, .roll-chat-panel button:focus-visible, .roll-chat-panel a:focus-visible { outline:3px solid #b89142; outline-offset:2px; }
 @media print { .roll-chat-launcher, .roll-chat-backdrop, .roll-chat-panel { display:none; } }
</style>
