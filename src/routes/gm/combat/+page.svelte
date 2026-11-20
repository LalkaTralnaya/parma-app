<script lang="ts">
	import { RACES } from '$lib/rules/races';
	import {
	findRoomByCode, getRoomParticipants,
	getRoomCombatState, saveRoomCombatState, subscribeToRoomCombat,
	loadPendingRoomCombatActions, reviewRoomCombatAction, subscribeRoomCombatActions, rollRoomDice, type RoomCombatAction,
	subscribeToRoom,
	getCurrentRoom,
	type RoomParticipant
} from '../../../lib/engine/rooms';
	import Dialog from '$lib/components/Dialog.svelte';
	import { ensureRoomSession } from '$lib/supabase/client';
	import CombatEffects from '$lib/components/CombatEffects.svelte';
	import { combatModifiers, participantCharacter, tickCombatEffects } from '$lib/engine/combatEffects';
	import { page } from '$app/state';
	import { listCharacters, getCurrentResource } from '../../../lib/db/characters';
	import { createRequest, SESSION_LABELS } from '../../../lib/sync/session';
	import { getCharacter, saveCharacter } from '../../../lib/db/characters';
	import { notifyCharacterUpdate } from '../../../lib/sync/combat';

	import { onMount, onDestroy } from 'svelte';
	import { getCharacteristicValue, getModifier, getResourceMax } from '../../../lib/engine/character';
	import { getArmorValue } from '../../../lib/engine/combat';
	import { rollCombatAttackEffect } from '../../../lib/engine/combat';
	import { BESTIARY, BESTIARY_SECTIONS } from '../../../lib/rules/bestiary';
	import { scaleMonster } from '../../../lib/engine/bestiary';
	import {
		getCombat, createEmptyCombat, saveCombat, sortedParticipants, getCurrentParticipant,
		updateParticipant, damageParticipant, removeParticipant, nextTurn, startCombat, endCombat, clearCombat,
		subscribeCombat,findParticipantBySource,
		type CombatState, type CombatParticipant, type MonsterAttackData
	} from '../../../lib/sync/combat';
	import type { Character } from '$lib/type';
	const roomLifetime = new AbortController();
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
		ignoresArmor?: boolean;
		notes?: string;
		save?: string;
		effect?: { table: string; roll: number; label: string; extraDamageRolls?: number[]; extraDamageFormula?: string };
		damageRoll?: { rolls: number[]; extraRolls?: { dice: string; rolls: number[] }[]; mod: number; total: number; diceString: string; type: string };
	} | null>(null);
	let roomId = $state<string | null>(null);
	let roomParticipants = $state<RoomParticipant[]>([]);
	let roomCode = $state<string | null>(null);
	let unsubRoomCombat: (() => void) | null = null;
	const isRoomMode = $derived(!!roomId);
	let pendingCombatActions = $state<RoomCombatAction[]>([]);
	let combatActionMessage = $state('');
	let reviewingCombatAction = $state<string | null>(null);
	let combatRoomMaster = $state(false);
	let unsubCombatActions: (() => void) | undefined;

	async function refreshCombatActions() {
		if (!roomId) return;
		try { pendingCombatActions = await loadPendingRoomCombatActions(roomId); }
		catch (error) { combatActionMessage = error instanceof Error ? error.message : 'Не удалось загрузить действия.'; }
	}

	async function decideCombatAction(action: RoomCombatAction, apply: boolean) {
		if (!roomId || reviewingCombatAction) return;
		reviewingCombatAction = action.id;
		try {
			const result = await reviewRoomCombatAction(roomId, action.id, apply);
			pendingCombatActions = pendingCombatActions.filter((pending) => pending.id !== action.id);
			if (result.status === 'applied') {
				const state = await getRoomCombatState(roomId);
				if (state) { combatState = state; saveCombat(state); }
			}
			combatActionMessage = result.status === 'stale'
				? 'Цель или ход изменились. Игроку потребуется повторить действие.'
				: result.status === 'applied' ? 'Действие применено.' : 'Действие отклонено.';
		} catch (error) {
			combatActionMessage = error instanceof Error ? error.message : 'Не удалось обработать действие.';
		} finally {
			reviewingCombatAction = null;
		}
	}

	const combatFieldLabels: Record<string, string> = {
		currentHp: 'Здравие', effects: 'Эффекты', itemTreatments: 'Лечение', prone: 'Повален', grapple: 'Захват'
	};

	function describeCombatValue(value: unknown): string {
		if (value == null) return '—';
		if (typeof value === 'boolean') return value ? 'да' : 'нет';
		if (typeof value === 'number') return String(value);
		if (Array.isArray(value)) {
			return value.map((entry) => entry?.name ?? entry?.conditionId ?? 'Эффект').join(', ') || '—';
		}
		if (typeof value === 'object' && 'kind' in value) {
			return ({ grab: 'Захват', clinch: 'Клинч', hold: 'Удержание' } as Record<string, string>)[String(value.kind)] ?? 'Захват';
		}
		return '—';
	}

	let attackRolling = $state(false);
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

	async function requestCombatDice(sides: number, count: number, label: string): Promise<number[] | null> {
		if (!roomId) return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
		try {
			const values: number[] = [];
			for (let remaining = count; remaining > 0; remaining -= 50) {
				values.push(...await rollRoomDice(roomId, Array<number>(Math.min(remaining, 50)).fill(sides), label));
			}
			return values;
		} catch (error) {
			combatActionMessage = error instanceof Error ? error.message : 'Серверный бросок не удался.';
			return null;
		}
	}

	async function requestCombatDie(sides: number, label: string): Promise<number | null> {
		return (await requestCombatDice(sides, 1, label))?.[0] ?? null;
	}

	function rollDice(diceString: string, label: string): Promise<number[] | null> {
		const match = diceString.match(/^(\d+)[кd](\d+)$/i);
		return match ? requestCombatDice(Number(match[2]), Number(match[1]), label) : Promise.resolve([]);
	}

	async function rollDamageDice(attack: MonsterAttackData) {
		const rolls = await rollDice(attack.damageDice, attack.name + ': урон');
		if (!rolls) return null;
		const extraRolls: Array<{ dice: string; rolls: number[] }> = [];
		for (const dice of attack.extraDamageDice ?? []) {
			const extra = await rollDice(dice, attack.name + ': дополнительный урон');
			if (!extra) return null;
			extraRolls.push({ dice, rolls: extra });
		}
		return { rolls, extraRolls };
	}

	function initiateAttack(attacker: CombatParticipant, attack: MonsterAttackData) {
		pendingAttack = { attacker, attack };
	}

		async function confirmAttack(target: CombatParticipant) {
		if (!pendingAttack || attackRolling) return;
		attackRolling = true;
		try {
		const { attacker, attack } = pendingAttack;
		const mods = combatModifiers(participantCharacter(attacker), attacker);
		if (mods.canAct === false) { alert('Участник не может действовать из-за состояния.'); return; }
		const targetValue = (attack.hitTarget ?? 30 + attack.hitBonus) + (mods.characteristics ?? 0) + (mods.attacks ?? 0) - (attack.ignoresArmor ? 0 : effectiveArmor(target));

		const roll = await requestCombatDie(100, attacker.name + ': ' + attack.name);
		if (roll === null) return;

		let outcome: 'hit' | 'miss' | 'critical_hit' | 'critical_miss' | 'double';
		if (roll === 1) outcome = 'critical_hit';
		else if (roll === 100) outcome = 'critical_miss';
		else if (roll % 11 === 0 && roll <= 99 && roll <= targetValue) outcome = 'double';
		else outcome = roll <= targetValue ? 'hit' : 'miss';
		const weaponCategory = /двуруч/i.test(attack.name) ? 'two_handed' : undefined;
		let effect: ReturnType<typeof rollCombatAttackEffect>;
		if (outcome === 'critical_hit' || outcome === 'critical_miss' || outcome === 'double') {
			const effectRoll = await requestCombatDie(outcome === 'double' ? 10 : 12, attack.name + ': особый эффект');
			if (effectRoll === null) return;
			const plan = rollCombatAttackEffect(outcome, weaponCategory, () => effectRoll);
			const extra = plan?.extraDamageFormula ? await rollDice(plan.extraDamageFormula, attack.name + ': урон эффекта') : [];
			if (!extra) return;
			if (plan) effect = { ...plan, extraDamageRolls: plan.extraDamageFormula ? extra : undefined };
		}

		let damageRoll;
		let appliedDamage = 0;

		if ((outcome === 'hit' || outcome === 'critical_hit' || outcome === 'double') && attack.damageDice !== '0') {
			const damage = await rollDamageDice(attack);
			if (!damage) return;
			const { rolls, extraRolls } = damage;
			const baseSum = rolls.reduce((a, b) => a + b, 0);
			const extraSum = extraRolls.reduce((sum, part) => sum + part.rolls.reduce((a, b) => a + b, 0), 0);
			const mod = attack.damageModifier ?? attacker.primaryMod ?? 0;
			appliedDamage = baseSum + extraSum + mod;

			// Крит — максимум кубиков
			if (outcome === 'critical_hit') {
				const maxRoll = rolls.length * Number(attack.damageDice.match(/[кd](\d+)/i)?.[1] ?? 0);
				const extraMax = extraRolls.reduce((sum, part) => sum + part.rolls.length * Number(part.dice.match(/[кd](\d+)/i)?.[1] ?? 0), 0);
				appliedDamage = maxRoll + extraMax + mod;
			}
			appliedDamage += effect?.extraDamageRolls?.reduce((a, b) => a + b, 0) ?? 0;

			damageRoll = {
				rolls,
				extraRolls,
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
			ignoresArmor: attack.ignoresArmor,
			notes: attack.notes,
			save: attack.save,
			effect,
			damageRoll
		};

		pendingAttack = null;
		} finally { attackRolling = false; }
	}

	async function rollJustDamage(attacker: CombatParticipant, attack: MonsterAttackData) {
		if (attack.damageDice === '0') return;
		const damage = await rollDamageDice(attack);
		if (!damage) return;
		const { rolls, extraRolls } = damage;
		const baseSum = rolls.reduce((a, b) => a + b, 0);
		const extraSum = extraRolls.reduce((sum, part) => sum + part.rolls.reduce((a, b) => a + b, 0), 0);
		const mod = attack.damageModifier ?? attacker.primaryMod ?? 0;
		attackResult = {
			attackerName: attacker.name,
			attackName: attack.name + ' (только урон)',
			targetName: '—',
			roll: 0,
			target: 0,
			outcome: 'hit',
			damageRoll: {
				rolls,
				extraRolls,
				mod,
				total: baseSum + extraSum + mod,
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
	if (roomLifetime.signal.aborted) return;
	const requestedMonster = page.url.searchParams.get('monster');
	if (requestedMonster && BESTIARY.some(m => m.id === requestedMonster)) {
		enemyMonsterId = requestedMonster;
		enemyLevel = Number(page.url.searchParams.get('level')) || BESTIARY.find(m => m.id === requestedMonster)!.baseLevel;
	}


	// Проверяем, есть ли активная комната
	const code = getCurrentRoom();
	if (code) {
		try {
			const room = await findRoomByCode(code, roomLifetime.signal);
			if (roomLifetime.signal.aborted) return;
			if (room) {
				roomId = room.id;
				roomCode = room.code;
				combatRoomMaster = room.master_auth_id === await ensureRoomSession();
				if (roomLifetime.signal.aborted) return;
				if (combatRoomMaster) {
					unsubCombatActions = subscribeRoomCombatActions(room.id, () => { void refreshCombatActions(); });
					void refreshCombatActions();
				}
				roomParticipants = await getRoomParticipants(room.id, roomLifetime.signal);
				if (roomLifetime.signal.aborted) return;
				// Подписка на изменения участников — чтобы видеть, кто зашёл в комнату
				const unsubParticipants = subscribeToRoom(
					room.id,
					async () => {
						roomParticipants = await getRoomParticipants(room.id, roomLifetime.signal);
					},
					() => {} // броски в бою нам не нужны
				);
				unsubRoomParticipants = unsubParticipants;
				// Загружаем бой из комнаты (если есть)
				const remote = await getRoomCombatState(room.id, roomLifetime.signal);
				if (roomLifetime.signal.aborted) return;
				if (remote) {
					combatState = remote;
				} else {
					// Пустой бой — инициализируем в БД
					const empty = createEmptyCombat();
					combatState = empty;
					await saveRoomCombatState(room.id, empty);
				}

				if (roomLifetime.signal.aborted) return;
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
			if (roomLifetime.signal.aborted) return;
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
	roomLifetime.abort();
	unsubscribe?.();
	unsubRoomCombat?.();
	unsubRoomParticipants?.();
	unsubCombatActions?.();
});

	async function persist(newState: CombatState) {
	newState = { ...newState, participants: newState.participants.map(p => p.isPlayer ? { ...p, characterSnapshot: playerSnapshot(p) ?? p.characterSnapshot } : p) };
	combatState = newState;
	saveCombat(newState); // локально всегда — на случай офлайна

	if (roomId) {
		try {
			await saveRoomCombatState(roomId, newState);
		} catch (e) {
			combatActionMessage = e instanceof Error ? e.message : 'Не удалось сохранить бой в комнате.';
		}
	}
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
			const roll = await requestCombatDie(20, (c.name || 'Персонаж') + ': прыть');
			if (roll === null) return;

			s.participants.push({
				id: crypto.randomUUID(),
				name: c.name || '(без имени)', 
				playerName: p.display_name || undefined,
				sourceId: c.id,
				isPlayer: true,
				characterSnapshot: c,
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
			const roll = await requestCombatDie(20, (c.name || 'Персонаж') + ': прыть');
			if (roll === null) return;
			s.participants.push({
				id: crypto.randomUUID(),
				name: c.name || '(без имени)',
				sourceId: c.id,
				isPlayer: true,
				characterSnapshot: c,
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
		enemyLevel = scaled.level;
		const s = getCombat() ?? createEmptyCombat();
		const dexMod = scaled.scaledMods.dexterity ?? 0;
		const roll = await requestCombatDie(20, base.name + ': прыть');
		if (roll === null) return;

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
				hitTarget: a.hitTarget,
				attackStat: a.attackStat,
				ignoresArmor: a.ignoresArmor,
				notes: a.notes,
				save: a.save,
				damageModifier: a.damageModifier ?? 0,
				damageDice: a.damageDice,
				extraDamageDice: a.extraDamageDice,
				damageType: a.damageType
			})),
			statMods: scaled.scaledMods,
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
	const rolls = await requestCombatDice(20, s.participants.length, 'Прыть: перебросить всем');
	if (!rolls) return;
	s.participants = s.participants.map((p, i) => ({ ...p, initiativeRoll: rolls[i], initiative: rolls[i] + (p.initiativeMod ?? 0) }));
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
	const tavernSettings = combatState.tavernSettings;
	clearCombat();
	await persist({ ...createEmptyCombat(), tavernSettings });
}

	async function next() {
	const prevRound = combatState.round;
	nextTurn();
	let s = getCombat()!;
	if (s.round > prevRound) s = tickCombatEffects(s);
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
	let s = getCombat()!;
	if (s.round > prevRound) s = tickCombatEffects(s);
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

	function playerSnapshot(p: CombatParticipant): Character | null {
		return characters.find(c => c.id === p.sourceId) ?? roomParticipants.find(r => r.character_snapshot?.id === p.sourceId)?.character_snapshot ?? p.characterSnapshot ?? null;
	}

	function effectiveArmor(p: CombatParticipant): number {
		if (p.isPlayer && !playerSnapshot(p)) return p.armor;
		return Math.max(0, p.armor + (combatModifiers(participantCharacter(p, playerSnapshot(p)), p).armor ?? 0));
	}

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
 <p class="text-sm my-2"><a href="/learn?topic=storyteller#help-encounter-setup">Гайд Сказителя</a></p>
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
			<a href="/gm" class="px-4 py-2 border rounded hover:bg-gray-50">← К сказителю</a>
		</div>
	</header>
	{#if combatRoomMaster}
		<section class="mb-4 space-y-2 rounded border p-3" aria-labelledby="combat-actions-title">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h2 id="combat-actions-title" class="font-semibold">Действия игроков · {pendingCombatActions.length}</h2>
				<button type="button" class="rounded border px-2 py-1" onclick={refreshCombatActions}>Обновить</button>
			</div>
			{#each pendingCombatActions as action (action.id)}
				<div class="space-y-2 border-t pt-2">
					<p class="font-semibold">{action.actor_name}</p>
					{#each action.changes as change (change.id)}
						<p class="text-sm"><strong>{combatState.participants.find((p) => p.id === change.id)?.name ?? 'Участник выбыл'}</strong>
							{#each Object.entries(change.after) as [field, value] (field)}
								· {combatFieldLabels[field]} {describeCombatValue(change.before[field as keyof typeof change.before])} → {describeCombatValue(value)}
							{/each}
						</p>
					{/each}
					<details><summary class="text-sm">Детали изменения</summary><pre class="max-h-48 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(action.changes, null, 2)}</pre></details>
					<button type="button" class="rounded border px-2 py-1" disabled={!!reviewingCombatAction} onclick={() => decideCombatAction(action, true)}>Применить</button>
					<button type="button" class="rounded border px-2 py-1" disabled={!!reviewingCombatAction} onclick={() => decideCombatAction(action, false)}>Отклонить</button>
				</div>
			{/each}
			{#if combatActionMessage}<p role="status">{combatActionMessage}</p>{/if}
		</section>
	{/if}

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
								{p.isPlayer ? 'игрок' : 'враг'} · ЗДР {p.currentHp}/{p.maxHp} · Броня {effectiveArmor(p)}
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
									<div class="text-xs text-gray-500">Броня {effectiveArmor(p)} · прыть {p.initiative}</div>
								</div>
								<button
									class="text-red-500 hover:text-red-700 px-2"
									onclick={() => removeParticipant_click(p.id)}
									title="Убрать">✕</button>
							</div>
							<div class="flex items-center gap-2 mb-2">
								<div class="flex-1">
									<div class="text-xs text-gray-500">ЗДР</div>
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
							<CombatEffects participant={p} encounter={combatState} onchange={persist} requestOnlineDie={requestCombatDie} character={p.isPlayer ? playerSnapshot(p) : null} initialText={p.id === enemies.find(e => e.sourceId === page.url.searchParams.get('monster'))?.id ? page.url.searchParams.get('special') ?? '' : ''} />
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if page.url.searchParams.get('monster') && !enemies.some(p => p.sourceId === page.url.searchParams.get('monster'))}
			<button class="px-3 py-2 border rounded" onclick={addEnemy}>Добавить выбранного из бестиария противника и применить спецнавык</button>
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
									<div class="text-xs text-gray-500">Броня {effectiveArmor(p)} · прыть {p.initiative}</div>
								</div>
								<button
									class="text-red-500 hover:text-red-700 px-2"
									onclick={() => removeParticipant_click(p.id)}
									title="Убрать">✕</button>
							</div>
							<div class="flex items-center gap-2 mb-2">
								<div class="flex-1">
									<div class="text-xs text-gray-500">ЗДР</div>
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
														≤ {attack.hitTarget ?? (30 + attack.hitBonus)}
														{#if attack.damageDice !== '0'}
											· {attack.damageDice}{#if (attack.damageModifier ?? p.primaryMod ?? 0) !== 0} {(attack.damageModifier ?? p.primaryMod ?? 0) >= 0 ? '+' : ''}{attack.damageModifier ?? p.primaryMod}{/if}{#each attack.extraDamageDice ?? [] as dice} + {dice}{/each} {attack.damageType}
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
							<CombatEffects participant={p} encounter={combatState} onchange={persist} requestOnlineDie={requestCombatDie} character={p.isPlayer ? playerSnapshot(p) : null} initialText={p.id === enemies.find(e => e.sourceId === page.url.searchParams.get('monster'))?.id ? page.url.searchParams.get('special') ?? '' : ''} />
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
							onchange={() => { enemyLevel = BESTIARY.find((monster) => monster.id === enemyMonsterId)?.baseLevel ?? 1; }}
							class="w-full px-3 py-2 border rounded">
							{#each BESTIARY_SECTIONS as section}
								<optgroup label={section.name}>
									{#each section.monsters as m}
										<option value={m.id}>{m.name} (база: {m.dangerLabel})</option>
									{/each}
								</optgroup>
							{/each}
						</select>
					</div>
					<div>
						<label for="field-2" class="block text-sm text-gray-500 mb-1">Уровень</label>
						<input id="field-2" type="number" min={BESTIARY.find((monster) => monster.id === enemyMonsterId)?.baseLevel ?? 1} max="20" bind:value={enemyLevel}
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
					{pendingAttack.attack.ignoresArmor ? 'Проверка' : 'Попадание'} ≤ {pendingAttack.attack.hitTarget ?? (30 + pendingAttack.attack.hitBonus)}. Выбери цель:
				</p>
				{#if pendingAttack.attack.notes}<p class="text-sm text-gray-600 mb-2">{pendingAttack.attack.notes}</p>{/if}
				{#if pendingAttack.attack.save}<p class="text-sm text-gray-600 mb-2">Избавление: {pendingAttack.attack.save}</p>{/if}
				<div class="space-y-2 mb-4 max-h-64 overflow-y-auto">
					{#each combatState.participants.filter(p => p.id !== pendingAttack?.attacker.id) as target (target.id)}
						<button
							class="w-full text-left px-3 py-2 border rounded hover:bg-gray-50"
							disabled={attackRolling} onclick={() => confirmAttack(target)}>
							<div class="font-medium">
								{#if target.playerName}
									<span class="text-blue-700">{target.playerName}</span>
									<span class="text-gray-400"> — </span>
								{/if}
								{target.name}
							</div>
							<div class="text-xs text-gray-500">
								Броня {effectiveArmor(target)} · ЗДР {target.currentHp}/{target.maxHp}
								→ цель проверки {(pendingAttack!.attack.hitTarget ?? (30 + pendingAttack!.attack.hitBonus)) - (pendingAttack!.attack.ignoresArmor ? 0 : effectiveArmor(target))}
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
							{attackResult.ignoresArmor ? 'проверка' : 'попадание'} ≤ {attackResult.target} —
							<span class="font-bold
								{attackResult.outcome === 'hit' || attackResult.outcome === 'critical_hit' || attackResult.outcome === 'double' ? 'text-green-700' : 'text-red-700'}">
								{attackLabel[attackResult.outcome]}
							</span>
						</div>
					</div>
				{/if}
				{#if attackResult.notes}<p class="text-sm text-gray-600 mb-2">{attackResult.notes}</p>{/if}
				{#if attackResult.save}<p class="text-sm text-gray-600 mb-2">Избавление: {attackResult.save}</p>{/if}
				{#if attackResult.effect}
					<div class="mb-3 rounded bg-amber-50 border border-amber-200 p-3 text-amber-900">
						<strong>{attackResult.effect.table} · к{attackResult.effect.table === 'Явь' ? 10 : 12}: {attackResult.effect.roll}</strong>
						<div>{attackResult.effect.label}</div>
						{#if attackResult.effect.extraDamageRolls?.length}
							<small>Дополнительный урон {attackResult.effect.extraDamageFormula}: [{attackResult.effect.extraDamageRolls.join(', ')}]</small>
						{/if}
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
							{#each attackResult.damageRoll.extraRolls ?? [] as part} + {part.dice} = [{part.rolls.join(', ')}]{/each}
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
