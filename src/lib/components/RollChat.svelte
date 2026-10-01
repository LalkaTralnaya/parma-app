<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		getCurrentRoom,
		findRoomByCode,
		getRecentRolls,
		subscribeToRoom,
		type Room,
		type RoomRoll
	} from '$lib/engine/rooms';

	let open = $state(false);
	let roomCode = $state<string | null>(null);
	let room = $state<Room | null>(null);
	let rolls = $state<RoomRoll[]>([]);
	let unsubscribe: (() => void) | null = null;
	let pollTimer: ReturnType<typeof setInterval> | null = null;
	let hasUnread = $state(false);

	async function loadRoom(code: string) {
		const r = await findRoomByCode(code);
		if (!r) return;
		room = r;
		rolls = await getRecentRolls(r.id);
		unsubscribe?.();
		unsubscribe = subscribeToRoom(
			r.id,
			() => {}, // участниками здесь не интересуемся
			(roll) => {
				rolls = [roll, ...rolls].slice(0, 50);
				if (!open) hasUnread = true;
			}
		);
	}

	function resetRoom() {
		unsubscribe?.();
		unsubscribe = null;
		room = null;
		rolls = [];
		hasUnread = false;
	}

	onMount(() => {
		const initial = getCurrentRoom();
		if (initial) {
			roomCode = initial;
			loadRoom(initial);
		}

		// Раз в 1.5 сек проверяем, не сменилась ли комната (вошли/вышли)
		pollTimer = setInterval(() => {
			const current = getCurrentRoom();
			if (current !== roomCode) {
				roomCode = current;
				resetRoom();
				if (current) loadRoom(current);
			}
		}, 1500);
	});

	onDestroy(() => {
		unsubscribe?.();
		if (pollTimer) clearInterval(pollTimer);
	});

	function toggle() {
		open = !open;
		if (open) hasUnread = false;
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
				text: `Заклинание ${d.spellName ?? ''}: к100 = ${d.roll} ≤ ${d.target} — ${translateResult(r)}${d.damage ? `, урон ${d.damage}` : ''}`,
				resultClass: resultColorClass(r)
			};
		}
		return { text: JSON.stringify(d), resultClass: 'text-gray-700' };
	}
</script>

{#if roomCode && room}
	<!-- Плавающая кнопка в правом нижнем углу -->
		<button
		type="button"
		style="position: fixed; bottom: 24px; right: 24px; z-index: 9999; width: 56px; height: 56px; border-radius: 9999px; background: #2563eb; color: white; font-size: 24px; box-shadow: 0 10px 15px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; cursor: pointer;"
		onclick={toggle}
		title="Броски комнаты">
		🎲
		{#if hasUnread}
			<span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
		{/if}
	</button>

	<!-- Затемнение + панель -->
	{#if open}
		<div
			style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9998; background: rgba(0,0,0,0.3);"
			onclick={toggle}
			role="presentation"></div>

		<aside
			class="bg-white shadow-2xl flex flex-col"
			style="position: fixed; top: 0; right: 0; bottom: 0; width: 100%; max-width: 28rem; z-index: 9999;">
			<header class="px-4 py-3 border-b flex justify-between items-center">
				<div>
					<div class="font-semibold">Броски комнаты</div>
					<div class="text-xs text-gray-500 font-mono">{room.code}</div>
				</div>
				<button
					type="button"
					class="w-8 h-8 rounded hover:bg-gray-100 text-xl"
					onclick={toggle}
					title="Закрыть">✕</button>
			</header>

			<div class="flex-1 overflow-y-auto p-3 space-y-2">
				{#if rolls.length === 0}
					<p class="text-sm text-gray-500 text-center py-8">Пока никто не бросал кубик.</p>
				{:else}
					{#each rolls as roll (roll.id)}
						{@const summary = rollSummary(roll)}
						<div class="border rounded-lg p-2 bg-white text-sm">
							<div class="flex justify-between items-baseline">
								<div class="font-semibold">{roll.character_name || 'Кто-то'}</div>
								<div class="text-xs text-gray-500">{timeAgo(roll.created_at)}</div>
							</div>
							<div class="{summary.resultClass} mt-1">{summary.text}</div>
						</div>
					{/each}
				{/if}
			</div>

			<footer class="px-4 py-2 border-t text-xs text-gray-500 text-center">
				<a href={`/room/${room.code}`} class="text-blue-600 hover:underline">Открыть полную комнату →</a>
			</footer>
		</aside>
	{/if}
{/if}