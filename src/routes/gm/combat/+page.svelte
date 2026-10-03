<script lang="ts">
	import { RACES } from '$lib/rules/races';
	import {
	findRoomByCode, getRoomParticipants,
	getRoomCombatState, saveRoomCombatState, subscribeToRoomCombat,
	subscribeToRoom,
	getCurrentRoom,
	type RoomParticipant
} from '../../../lib/engine/rooms';
	import Dialog from '$lib/components/Dialog.svelte';
	import { listCharacters, getCurrentResource } from '../../../lib/db/characters';
	import { createRequest, SESSION_LABELS } from '../../../lib/sync/session';
	import { getCharacter, saveCharacter } from '../../../lib/db/characters';
	import { notifyCharacterUpdate } from '../../../lib/sync/combat';
	import { rollD100 } from '../../../lib/engine/dice';
	import { onMount, onDestroy } from 'svelte';
	import { getCharacteristicValue, getModifier, getResourceMax } from '../../../lib/engine/character';
	import { getArmorValue } from '../../../lib/engine/combat';
	import { BESTIARY } from '../../../lib/rules/bestiary';
	import { scaleMonster } from '../../../lib/engine/bestiary';
	import {
		getCombat, createEmptyCombat, saveCombat, sortedParticipants, getCurrentParticipant,
		updateParticipant, damageParticipant, removeParticipant, nextTurn, startCombat, endCombat, clearCombat,
		subscribeCombat,findParticipantBySource,
		type CombatState, type CombatParticipant, type MonsterAttackData
	} from '../../../lib/sync/combat';
	import type { Character } from '$lib/type';
	let unsubRoomParticipants: (() => void) | null = null;
	let combatState = $state<CombatState>(createEmptyCombat());
	let characters = $state<Character[]>([]);
	let unsubscribe: (() => void) | null = null;
	let showAddEnemy = $state(false);
	let showAddPlayers = $state(false);
	let selectedParticipantIds = $state<Set<string>>(new Set());
	let attackResult = $state<{
		attackerName: string;
		attackName: string;
		targetName: string;
		roll: number;
		target: number;
		outcome: 'hit' | 'miss' | 'critical_hit' | 'critical_miss' | 'double';
		damageRoll?: { rolls: number[]; mod: number; total: number; diceString: string; type: string };
	} | null>(null);
	let roomId = $state<string | null>(null);
	let roomParticipants = $state<RoomParticipant[]>([]);
	let roomCode = $state<string | null>(null);
	let unsubRoomCombat: (() => void) | null = null;
	const isRoomMode = $derived(!!roomId);

	let pendingAttack = $state<{
		attacker: CombatParticipant;
		attack: MonsterAttackData;
	} | null>(null);

	const attackLabel: Record<string, string> = {
		hit: 'Попадание',
		miss: 'Промах',
		critical_hit: 'Правь! Критический успех',
		critical_miss: 'Навь! Критический провал',
		double: 'Явь! Дубль'
	};

	function rollDice(diceString: string): number[] {
		const m = diceString.match(/^(\d+)[кd](\d+)$/i);
		if (!m) return [];
		const count = Number(m[1]);
		const sides = Number(m[2]);
		const out: number[] = [];
		for (let i = 0; i < count; i++) out.push(Math.floor(Math.random() * sides) + 1);
		return out;
	}

	function initiateAttack(attacker: CombatParticipant, attack: MonsterAttackData) {
		pendingAttack = { attacker, attack };
	}

		async function confirmAttack(target: CombatParticipant) {
		if (!pendingAttack) return;
		const { attacker, attack } = pendingAttack;
		const roll = rollD100();
		const targetValue = 30 + attack.hitBonus - target.armor;

		let outcome: 'hit' | 'miss' | 'critical_hit' | 'critical_miss' | 'double';
		if (roll === 1) outcome = 'critical_hit';
		else if (roll === 100) outcome = 'critical_miss';
		else if (roll % 11 === 0 && roll <= 99 && roll <= targetValue) outcome = 'double';
		else outcome = roll <= targetValue ? 'hit' : 'miss';

		let damageRoll;
		let appliedDamage = 0;

		if ((outcome === 'hit' || outcome === 'critical_hit' || outcome === 'double') && attack.damageDice !== '0') {
			const rolls = rollDice(attack.damageDice);
			const baseSum = rolls.reduce((a, b) => a + b, 0);
			const mod = attacker.primaryMod ?? 0;
			appliedDamage = baseSum + mod;

			// Крит — максимум кубиков
			if (outcome === 'critical_hit') {
				const maxRoll = rolls.length * Number(attack.damageDice.match(/[кd](\d+)/i)?.[1] ?? 0);
				appliedDamage = maxRoll + mod;
			}

			damageRoll = {
				rolls,
				mod,
				total: appliedDamage,
				diceString: attack.damageDice,
				type: attack.damageType
			};

			// ⬇ ВОТ ЭТО ГЛАВНОЕ — списываем урон с цели
			damageParticipant(target.id, -appliedDamage);
			await persist(getCombat()!);
		}

		attackResult = {
			attackerName: attacker.name,
			attackName: attack.name,
			targetName: target.name,
			roll,
			target: targetValue,
			outcome,
			damageRoll
		};

		pendingAttack = null;
	}

	function rollJustDamage(attacker: CombatParticipant, attack: MonsterAttackData) {
		if (attack.damageDice === '0') return;
		const rolls = rollDice(attack.damageDice);
		const baseSum = rolls.reduce((a, b) => a + b, 0);
		const mod = attacker.primaryMod ?? 0;
		attackResult = {
			attackerName: attacker.name,
			attackName: attack.name + ' (только урон)',
			targetName: '—',
			roll: 0,
			target: 0,
			outcome: 'hit',
			damageRoll: {
				rolls,
				mod,
				total: baseSum + mod,
				diceString: attack.damageDice,
				type: attack.damageType
			}
		};
	}

	function closeAttackResult() {
		attackResult = null;
	}
	// выбор врага
	let enemyMonsterId = $state<string>(BESTIARY[0]?.id ?? '');
	let enemyLevel = $state(1);
	let enemyName = $state('');

	async function loadCharacters() {
		characters = await listCharacters();
	}

	onMount(async () => {
	await loadCharacters();

	// Проверяем, есть ли активная комната
	const code = getCurrentRoom();
	if (code) {
		try {
			const room = await findRoomByCode(code);
			if (room) {
				roomId = room.id;
				roomCode = room.code;
				roomParticipants = await getRoomParticipants(room.id);
				// Подписка на изменения участников — чтобы видеть, кто зашёл в комнату
				const unsubParticipants = subscribeToRoom(
					room.id,
					async () => {
						roomParticipants = await getRoomParticipants(room.id);
					},
					() => {} // броски в бою нам не нужны
				);
				unsubRoomParticipants = unsubParticipants;
				// Загружаем бой из комнаты (если есть)
				const remote = await getRoomCombatState(room.id);
				if (remote) {
					combatState = remote;
				} else {
					// Пустой бой — инициализируем в БД
					const empty = createEmptyCombat();
					combatState = empty;
					await saveRoomCombatState(room.id, empty);
				}

				// Подписываемся на изменения боя в комнате
				unsubRoomCombat = subscribeToRoomCombat(room.id, (newState) => {
					if (!newState) return;
					combatState = newState;
					// ⬇ КЛЮЧЕВОЕ: держим localStorage в актуальном состоянии,
					// иначе nextTurn() / updateParticipant() и т.д. читают старые данные
					saveCombat(newState);
				});
			}
		} catch (e) {
			console.warn('Не удалось подключиться к комнате:', e);
		}
	}

	// Локальная синхронизация (между вкладками) — только вне комнаты
	if (!isRoomMode) {
		const s = getCombat();
		if (s) combatState = s;
		unsubscribe = subscribeCombat((newState) => {
			combatState = newState ?? createEmptyCombat();
		});
	}
});

	onDestroy(() => {
	unsubscribe?.();
	unsubRoomCombat?.();
	unsubRoomParticipants?.();
});

	async function persist(newState: CombatState) {
	combatState = newState;
	saveCombat(newState); // локально всегда — на случай офлайна

	if (roomId) {
		try {
			await saveRoomCombatState(roomId, newState);
		} catch (e) {
			console.warn('Не удалось синхронизировать бой:', e);
		}
	}
}

	function rollD20(): number {
		return Math.floor(Math.random() * 20) + 1;
	}

	/** Добавить всех персонажей, которых ещё нет в бою */
async function addSelectedPlayers() {
	const s = getCombat() ?? createEmptyCombat();

	if (isRoomMode) {
		for (const p of roomParticipants) {
			if (!selectedParticipantIds.has(p.id)) continue;
			if (!p.character_snapshot) continue;
			const c = p.character_snapshot;

			// Проверка на дубли: и по sourceId, и по имени+уровню
			const alreadyExists = s.participants.some(
				(x) =>
					x.sourceId === c.id ||
					(x.name === (c.name || p.display_name) && x.isPlayer)
			);
			if (alreadyExists) continue;

			const dexMod = getModifier(getCharacteristicValue(c, 'dexterity'));
			const armorInfo = getArmorValue(c);
			const hpMax = getResourceMax(c, 'hp');
			const realHp = getCurrentResource(c, 'hp', hpMax);
			const tempHp = (c as any).tempHp ?? 0;
			const roll = rollD20();

			s.participants.push({
				id: crypto.randomUUID(),
				name: c.name || '(без имени)', 
				playerName: p.display_name || null,
				sourceId: c.id,
				isPlayer: true,
				maxHp: hpMax,
				currentHp: realHp + tempHp,
				armor: armorInfo.total,
				initiative: roll + dexMod,
				initiativeRoll: roll,
				initiativeMod: dexMod
			});
		}
	} else {
		// Одиночный режим — как раньше, добавить всех локальных
		const existingSourceIds = new Set(
			s.participants.map((p) => p.sourceId).filter(Boolean)
		);
		for (const c of characters) {
			if (existingSourceIds.has(c.id)) continue;
			const dexMod = getModifier(getCharacteristicValue(c, 'dexterity'));
			const armorInfo = getArmorValue(c);
			const hpMax = getResourceMax(c, 'hp');
			const realHp = getCurrentResource(c, 'hp', hpMax);
			const tempHp = (c as any).tempHp ?? 0;
			const roll = rollD20();
			s.participants.push({
				id: crypto.randomUUID(),
				name: c.name || '(без имени)',
				sourceId: c.id,
				isPlayer: true,
				maxHp: hpMax,
				currentHp: realHp + tempHp,
				armor: armorInfo.total,
				initiative: roll + dexMod,
				initiativeRoll: roll,
				initiativeMod: dexMod
			});
		}
	}

	await persist(s);
	showAddPlayers = false;
	selectedParticipantIds = new Set();
}

	async function addEnemy() {
		const base = BESTIARY.find((m) => m.id === enemyMonsterId);
		if (!base) return;
		const scaled = scaleMonster(base, enemyLevel);
		const s = getCombat() ?? createEmptyCombat();
		const dexMod = scaled.scaledMods.dexterity ?? 0;
		const roll = rollD20();

		s.participants.push({
			id: crypto.randomUUID(),
			name: enemyName.trim() || `${base.name} (ур. ${enemyLevel})`,
			sourceId: base.id,
			isPlayer: false,
			maxHp: scaled.scaledHp,
			currentHp: scaled.scaledHp,
			armor: scaled.scaledArmor,
			initiative: roll + dexMod,
			initiativeRoll: roll,
			initiativeMod: dexMod,
			traits: base.traits,
			attacks: scaled.scaledAttacks.map((a) => ({
				name: a.name,
				hitBonus: a.hitBonus,
				damageDice: a.damageDice,
				damageType: a.damageType
			})),
			primaryMod: scaled.scaledMods[base.primaryStat]
		});
		await persist(s);
			enemyName = '';
			showAddEnemy = false;
	}
	/** Отправить игрокам запрос на бросок прыти. Их результаты придут
	 *  через broadcast и обновят участников боя автоматически. */
	function requestAllInitiatives() {
		createRequest('initiative', SESSION_LABELS.initiative);
	}
	async function rerollAll() {
	const s = getCombat() ?? createEmptyCombat();
	s.participants = s.participants.map((p) => {
		const roll = rollD20();
		return { ...p, initiativeRoll: roll, initiative: roll + (p.initiativeMod ?? 0) };
	});
	s.currentTurnIndex = 0;
	await persist(s);
}

	async function begin() {
	startCombat();
	await persist(getCombat()!);
}

	/** Завершить бой (участники и прыть сохраняются) */
	async function end() {
	if (!confirm('Завершить бой? Участники и прыть сохранятся.')) return;
	endCombat();
	await persist(getCombat() ?? createEmptyCombat());
}

	/** Полностью очистить (убрать всех участников) */
	async function clearAll() {
	if (!confirm('Убрать всех участников из боя?')) return;
	clearCombat();
	await persist(createEmptyCombat());
}

	async function next() {
	const prevRound = combatState.round;
	nextTurn();
	const s = getCombat()!;
	await persist(s); // ← отправили в комнату
	if (s.round > prevRound) {
		tickConditionsForPlayers(); // это про персонажей — оставляем как есть
	}
}
		/** Уменьшить все активные состояния у всех игроков на 1 раунд.
	 *  Удаляет те, где осталось 0. */
	async function tickConditionsForPlayers() {
		for (const p of combatState.participants) {
			if (!p.isPlayer || !p.sourceId) continue;

			const c = await getCharacter(p.sourceId);
			if (!c) continue;

			let changed = false;

			const nextConditions = (c.conditions ?? [])
				.map((cond) => {
					if (cond.roundsLeft === null) return cond;
					changed = true;
					return { ...cond, roundsLeft: cond.roundsLeft - 1 };
				})
				.filter((cond) => cond.roundsLeft === null || cond.roundsLeft > 0);

			if (changed) {
				c.conditions = nextConditions;
				await saveCharacter(c);
				notifyCharacterUpdate(c.id);
			}
		}
	}

	async function removeParticipant_click(id: string) {
	const prevRound = combatState.round;
	removeParticipant(id);
	const s = getCombat()!;
	await persist(s);
	if (s.round > prevRound) await tickConditionsForPlayers();
}

	async function hp(id: string, delta: number) {
	const p = combatState.participants.find((x) => x.id === id);
	if (!p) return;
	const next = Math.max(0, Math.min(p.maxHp, p.currentHp + delta));

	// В комнатном режиме обновляем напрямую через persist
	if (roomId) {
		const s = getCombat()!;
		const idx = s.participants.findIndex((x) => x.id === id);
		if (idx >= 0) {
			s.participants[idx] = { ...s.participants[idx], currentHp: next };
			await persist(s);
		}
	} else {
		updateParticipant(id, { currentHp: next });
		combatState = getCombat()!;
	}
}

	const sorted = $derived(sortedParticipants(combatState));
	const currentParticipant = $derived(combatState.active ? getCurrentParticipant(combatState) : null);
	const players = $derived(combatState.participants.filter((p) => p.isPlayer));
	const enemies = $derived(combatState.participants.filter((p) => !p.isPlayer));

	function hpColor(p: CombatParticipant): string {
		const ratio = p.currentHp / p.maxHp;
		if (ratio > 0.7) return 'text-green-700';
		if (ratio > 0.3) return 'text-amber-600';
		if (ratio > 0) return 'text-red-600';
		return 'text-gray-400';
	}
</script>

<main class="max-w-6xl mx-auto p-6">
	<header class="flex justify-between items-center mb-6 flex-wrap gap-3">
		<div>
			<h1 class="text-3xl font-bold">Бой</h1>
			<p class="text-sm text-gray-500">
				Участников: {combatState.participants.length}
				{#if combatState.active} · раунд {combatState.round}{/if}
			</p>
		</div>
		<div class="text-xs text-gray-400 mb-2 p-2 bg-gray-50 rounded">
	Отладка: участников в комнате = {roomParticipants.length} ·
	с персонажем = {roomParticipants.filter((p) => p.character_snapshot && p.role !== 'master').length}
	{#each roomParticipants as p}
		<div>{p.display_name} (role={p.role}, есть персонаж={!!p.character_snapshot})</div>
	{/each}
</div>
		<div class="flex gap-2 flex-wrap">
			<button
				class="px-4 py-2 border rounded hover:bg-gray-50"
				onclick={() => (showAddPlayers = true)}>+ Игроки</button>
			<button
				class="px-4 py-2 border rounded hover:bg-gray-50"
				onclick={() => (showAddEnemy = true)}>+ Враг</button>
							<button
				class="px-4 py-2 text-red-600 border border-red-300 rounded hover:bg-red-50"
				onclick={clearAll}>✕ Очистить</button>
			<button
				class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
				onclick={requestAllInitiatives}>Прыть всем</button>
			{#if combatState.active}
				<button
					class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
					onclick={end}>■ Закончить бой</button>
			{:else}
				<button
					class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
					disabled={combatState.participants.length === 0}
					onclick={begin}>▶ Начать бой</button>
			{/if}
			<a href="/gm" class="px-4 py-2 border rounded hover:bg-gray-50">← К мастеру</a>
		</div>
	</header>

	{#if combatState.participants.length === 0}
		<div class="border-2 border-dashed rounded-lg p-10 text-center text-gray-500">
			<p>В бою пока никого. Добавьте игроков или врага.</p>
		</div>
	{:else}
		<!-- Порядок хода -->
		<section class="border-2 border-purple-300 rounded-lg p-4 bg-purple-50 mb-6">
			<div class="flex justify-between items-center mb-3">
				<h2 class="text-lg font-semibold">
					Порядок хода {#if combatState.active}· раунд {combatState.round}{/if}
				</h2>
				{#if combatState.active}
					<button
						class="px-5 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-semibold"
						onclick={next}>
						✓ Закончить ход
					</button>
				{/if}
			</div>
			<ol class="space-y-1">
				{#each sorted as p, i}
					{@const isCurrent = combatState.active && combatState.currentTurnIndex % sorted.length === i}
					<li
						class="flex justify-between items-center px-3 py-2 rounded
							{isCurrent ? 'bg-purple-600 text-white font-bold' : 'bg-white'}
							{p.currentHp <= 0 ? 'opacity-40 line-through' : ''}">
						<div class="flex items-center gap-3">
							<span class="text-xs w-6 text-center {isCurrent ? 'text-purple-100' : 'text-gray-500'}">
								{i + 1}
							</span>
							<span class="font-medium">
								{#if p.playerName}
									<span class="text-blue-700">{p.playerName}</span>
									<span class="text-gray-400"> — </span>
								{/if}
								{p.name}
							</span>
							<span class="text-xs {isCurrent ? 'text-purple-100' : 'text-gray-500'}">
								{p.isPlayer ? 'игрок' : 'враг'} · ЖВЧ {p.currentHp}/{p.maxHp} · Броня {p.armor}
							</span>
						</div>
						<span class="font-mono text-lg {isCurrent ? 'text-white' : 'text-purple-700'}">
							{p.initiative}
							{#if p.initiativeRoll !== undefined}
								<span class="text-xs {isCurrent ? 'text-purple-100' : 'text-gray-500'}">
									({p.initiativeRoll}{p.initiativeMod !== undefined && p.initiativeMod >= 0 ? '+' : ''}{p.initiativeMod})
								</span>
							{/if}
						</span>
					</li>
				{/each}
			</ol>
		</section>

		<!-- Игроки -->
		{#if players.length > 0}
			<section class="mb-6">
				<h2 class="text-lg font-semibold mb-2 text-blue-700">Игроки</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
					{#each players as p (p.id)}
						<div class="border rounded-lg bg-white p-3 {p.currentHp <= 0 ? 'opacity-50' : ''}">
							<div class="flex justify-between items-start mb-2">
								<div>
									<div class="font-semibold">
										{#if p.playerName}
											<span class="text-blue-700">{p.playerName}</span>
											<span class="text-gray-400"> — </span>
										{/if}
										{p.name}
									</div>
									<div class="text-xs text-gray-500">Броня {p.armor} · прыть {p.initiative}</div>
								</div>
								<button
									class="text-red-500 hover:text-red-700 px-2"
									onclick={() => removeParticipant_click(p.id)}
									title="Убрать">✕</button>
							</div>
							<div class="flex items-center gap-2 mb-2">
								<div class="flex-1">
									<div class="text-xs text-gray-500">ЖВЧ</div>
									<div class="text-2xl font-bold {hpColor(p)}">
										{p.currentHp}<span class="text-sm text-gray-400">/{p.maxHp}</span>
									</div>
								</div>
								<div class="flex gap-1 flex-wrap justify-end">
									<button class="px-2 py-1 text-xs border rounded hover:bg-gray-100" onclick={() => hp(p.id, -1)}>−1</button>
									<button class="px-2 py-1 text-xs border rounded hover:bg-gray-100" onclick={() => hp(p.id, -5)}>−5</button>
									<button class="px-2 py-1 text-xs border rounded hover:bg-gray-100" onclick={() => hp(p.id, -10)}>−10</button>
									<button class="px-2 py-1 text-xs border rounded hover:bg-gray-100" onclick={() => hp(p.id, +1)}>+1</button>
									<button class="px-2 py-1 text-xs border rounded hover:bg-gray-100" onclick={() => hp(p.id, +5)}>+5</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Враги -->
		{#if enemies.length > 0}
			<section>
				<h2 class="text-lg font-semibold mb-2 text-red-700">Враги</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
					{#each enemies as p (p.id)}
						<div class="border rounded-lg bg-white p-3 {p.currentHp <= 0 ? 'opacity-50' : ''}">
							<div class="flex justify-between items-start mb-2">
								<div>
									<div class="font-semibold">
										{#if p.playerName}
											<span class="text-blue-700">{p.playerName}</span>
											<span class="text-gray-400"> — </span>
										{/if}
										{p.name}
									</div>
									<div class="text-xs text-gray-500">Броня {p.armor} · прыть {p.initiative}</div>
								</div>
								<button
									class="text-red-500 hover:text-red-700 px-2"
									onclick={() => removeParticipant_click(p.id)}
									title="Убрать">✕</button>
							</div>
							<div class="flex items-center gap-2 mb-2">
								<div class="flex-1">
									<div class="text-xs text-gray-500">ЖВЧ</div>
									<div class="text-2xl font-bold {hpColor(p)}">
										{p.currentHp}<span class="text-sm text-gray-400">/{p.maxHp}</span>
									</div>
								</div>
								<div class="flex gap-1 flex-wrap justify-end">
									<button class="px-2 py-1 text-xs border rounded hover:bg-gray-100" onclick={() => hp(p.id, -1)}>−1</button>
									<button class="px-2 py-1 text-xs border rounded hover:bg-gray-100" onclick={() => hp(p.id, -5)}>−5</button>
									<button class="px-2 py-1 text-xs border rounded hover:bg-gray-100" onclick={() => hp(p.id, -10)}>−10</button>
									<button class="px-2 py-1 text-xs border rounded hover:bg-gray-100" onclick={() => hp(p.id, +1)}>+1</button>
									<button class="px-2 py-1 text-xs border rounded hover:bg-gray-100" onclick={() => hp(p.id, +5)}>+5</button>
								</div>
							</div>

							{#if p.attacks && p.attacks.length > 0}
								<div class="border-t pt-2 mt-2">
									<div class="text-xs text-gray-500 mb-1">Атаки</div>
									<div class="space-y-1.5">
										{#each p.attacks as attack}
											<div class="flex items-center justify-between gap-2 text-xs">
												<div class="flex-1 min-w-0">
													<div class="font-medium truncate">{attack.name}</div>
													<div class="text-gray-500">
														≤ {30 + attack.hitBonus}
														{#if attack.damageDice !== '0'}
															· {attack.damageDice}{#if (p.primaryMod ?? 0) !== 0} {(p.primaryMod ?? 0) >= 0 ? '+' : ''}{p.primaryMod}{/if} {attack.damageType}
														{/if}
													</div>
												</div>
												<div class="flex gap-1 shrink-0">
													{#if attack.damageDice !== '0'}
														<button
															class="px-1.5 py-0.5 border rounded hover:bg-gray-100"
															onclick={() => rollJustDamage(p, attack)}
															title="Только урон">🎲</button>
													{/if}
													<button
														class="px-1.5 py-0.5 bg-red-600 text-white rounded hover:bg-red-700"
														onclick={() => initiateAttack(p, attack)}
														title="Атаковать цель">⚔</button>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							{#if p.traits && p.traits.length > 0}
								<div class="text-xs text-gray-600 mt-2 pt-2 border-t">
									{p.traits.join(' · ')}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}
	{/if}

	<!-- Модалка: добавить игроков -->
	{#if showAddPlayers}
	<Dialog label="Добавить игроков" onclose={() => { showAddPlayers = false; selectedParticipantIds = new Set(); }}>
		<h3 class="text-lg font-semibold mb-3">Выберите, кого добавить в бой</h3>

		{#if isRoomMode}
			{#if roomParticipants.filter((p) => p.character_snapshot && p.role !== 'master').length === 0}
				<p class="text-sm text-gray-500 mb-4">В комнате нет игроков с выбранным персонажем.</p>
			{:else}
				<div class="space-y-2 mb-4 max-h-64 overflow-y-auto">
					{#each roomParticipants as p (p.id)}
						{#if p.character_snapshot && p.role !== 'master'}
							<label class="flex items-center gap-3 px-3 py-2 border rounded hover:bg-gray-50 cursor-pointer">
								<input
									type="checkbox"
									checked={selectedParticipantIds.has(p.id)}
									onchange={(e) => {
										const next = new Set(selectedParticipantIds);
										if (e.currentTarget.checked) next.add(p.id);
										else next.delete(p.id);
										selectedParticipantIds = next;
									}}
								/>
								<div>
									<div class="font-medium">
										{p.character_snapshot.name || p.display_name || 'Игрок'}
									</div>
									<div class="text-xs text-gray-500">
										{p.character_snapshot.level} ур. · {RACES.find((r) => r.id === p.character_snapshot?.raceId)?.name ?? '—'}
									</div>
								</div>
							</label>
						{/if}
					{/each}
				</div>
			{/if}
		{:else}
			<p class="text-sm text-gray-500 mb-4">Будут добавлены все ваши локальные персонажи.</p>
		{/if}

		<div class="flex gap-2 justify-end">
			<button
				class="px-4 py-2 border rounded hover:bg-gray-50"
				onclick={() => {
					showAddPlayers = false;
					selectedParticipantIds = new Set();
				}}>Отмена</button>
			<button
				class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
				onclick={isRoomMode ? addSelectedPlayers : addSelectedPlayers}>
				Добавить выбранных
			</button>
		</div>
	</Dialog>
{/if}

	<!-- Модалка: добавить врага -->
	{#if showAddEnemy}
		<Dialog label="Добавить противника" onclose={() => showAddEnemy = false}>
				<h3 class="text-lg font-semibold mb-3">Добавить врага</h3>
				<div class="space-y-3">
					<div>
						<label for="field-1" class="block text-sm text-gray-500 mb-1">Монстр</label>
						<select id="field-1"
							bind:value={enemyMonsterId}
							class="w-full px-3 py-2 border rounded">
							{#each BESTIARY as m}
								<option value={m.id}>{m.name} (база: {m.dangerLabel})</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="field-2" class="block text-sm text-gray-500 mb-1">Уровень</label>
						<input id="field-2" type="number" min="1" max="20" bind:value={enemyLevel}
							class="w-full px-3 py-2 border rounded" />
					</div>
					<div>
						<label for="field-3" class="block text-sm text-gray-500 mb-1">Имя (необязательно)</label>
						<input id="field-3" type="text" bind:value={enemyName} placeholder="например, Серый Клык"
							class="w-full px-3 py-2 border rounded" />
					</div>
				</div>
				<div class="flex gap-2 justify-end mt-4">
					<button
						class="px-4 py-2 border rounded hover:bg-gray-50"
						onclick={() => (showAddEnemy = false)}>Отмена</button>
					<button
						class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
						onclick={addEnemy}>Добавить</button>
				</div>
		</Dialog>
	{/if}
		<!-- Модалка выбора цели -->
	{#if pendingAttack}
		<Dialog label="Выбрать цель атаки" onclose={() => pendingAttack = null}>
				<h3 class="text-lg font-semibold mb-1">
					{pendingAttack.attacker.name} атакует: {pendingAttack.attack.name}
				</h3>
				<p class="text-sm text-gray-500 mb-4">
					Попадание ≤ {30 + pendingAttack.attack.hitBonus}. Выбери цель:
				</p>
				<div class="space-y-2 mb-4 max-h-64 overflow-y-auto">
					{#each players as target (target.id)}
						<button
							class="w-full text-left px-3 py-2 border rounded hover:bg-gray-50"
							onclick={() => confirmAttack(target)}>
							<div class="font-medium">
								{#if target.playerName}
									<span class="text-blue-700">{target.playerName}</span>
									<span class="text-gray-400"> — </span>
								{/if}
								{target.name}
							</div>
							<div class="text-xs text-gray-500">
								Броня {target.armor} · ЖВЧ {target.currentHp}/{target.maxHp}
								→ цель атаки {30 + pendingAttack!.attack.hitBonus - target.armor}
							</div>
						</button>
					{/each}
				</div>
				<div class="flex justify-end">
					<button
						class="px-4 py-2 border rounded hover:bg-gray-50"
						onclick={() => (pendingAttack = null)}>Отмена</button>
				</div>
		</Dialog>
	{/if}

	<!-- Модалка результата атаки -->
	{#if attackResult}
		<Dialog label="Результат атаки" onclose={closeAttackResult}>
				<h3 class="text-lg font-semibold mb-2">
					{attackResult.attackerName}: {attackResult.attackName}
				</h3>

				{#if attackResult.roll > 0}
					<div class="mb-3">
						<div class="text-sm text-gray-500">Цель: {attackResult.targetName}</div>
						<div class="text-2xl mt-1">
							Выпало <span class="font-bold">{attackResult.roll}</span>,
							попадание ≤ {attackResult.target} —
							<span class="font-bold
								{attackResult.outcome === 'hit' || attackResult.outcome === 'critical_hit' || attackResult.outcome === 'double' ? 'text-green-700' : 'text-red-700'}">
								{attackLabel[attackResult.outcome]}
							</span>
						</div>
					</div>
				{/if}

				{#if attackResult.damageRoll}
					<div class="border-t pt-3">
						<div class="text-sm text-gray-500">Урон ({attackResult.damageRoll.type})</div>
						<div class="text-3xl font-bold text-red-700">
							{attackResult.damageRoll.total}
						</div>
						<div class="text-xs text-gray-500">
							{attackResult.damageRoll.diceString} = [{attackResult.damageRoll.rolls.join(', ')}]
							{#if attackResult.damageRoll.mod !== 0}
								+ {attackResult.damageRoll.mod} мод.
							{/if}
						</div>
					</div>
				{/if}

				<div class="flex justify-end mt-4">
					<button
						class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
						onclick={closeAttackResult}>ОК</button>
				</div>
		</Dialog>
	{/if}
</main>