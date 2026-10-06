<script lang="ts">
	// ────────────────────────────────────────────
	// ИМПОРТЫ
	// ────────────────────────────────────────────
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	// Комнаты и синхронизация боя через Supabase
	import {
		getCurrentRoom,
		clearCurrentRoom,
		publishToActiveRoom,
		findRoomByCode,
		getRoomCombatState,
		saveRoomCombatState,
		subscribeToRoomCombat,
		getActiveRoomRequest,
		subscribeToRoomRequests,
		submitRoomRequestResult,
		type RoomRequest,
} from '../../../lib/engine/rooms';

	// Сессия (запросы мастера)
	import {
		getSession,
		submitResult,
		subscribe as subscribeSession,
		SESSION_SKILLS,
		type SessionRequest,
		type SessionRequestType,
	} from '../../../lib/sync/session';

	// Локальная синхронизация боя
	import {
		getCombat,
		saveCombat,
		findParticipantBySource,
		setParticipantInitiative,
		subscribeCharacterUpdates,
		type CombatState,
	} from '../../../lib/sync/combat';

	// Правила
	import { CONDITIONS, findCondition } from '../../../lib/rules/conditions';
import { getConditionModifiers, getConditionSaveTarget as calculateConditionSaveTarget, rollConditionsDotDamage } from '../../../lib/engine/conditions';
	import { adjustDecayPoints, canUseGraceWithDecay, getDecayStage } from '../../../lib/engine/decay';
	import { PERSONALITY_TRAITS, IDEALS, BONDS, FLAWS, findOption } from '../../../lib/rules/personality';
	import { ITEMS, CATEGORY_LABEL, type ItemCategory } from '../../../lib/rules/items';
	import { BACKGROUNDS } from '../../../lib/rules/backgrounds';
	import { CHARACTERISTICS } from '../../../lib/rules/characteristics';
	import { SKILLS } from '../../../lib/rules/skills';
	import { RESOURCES } from '../../../lib/rules/resources';
	import { RACES } from '../../../lib/rules/races';
	import { ABILITY_THRESHOLDS } from '../../../lib/rules/abilities';
	import {
		SPELLS_BY_SCHOOL,
		SCHOOL_STABILITY_THRESHOLDS,
		getSpellLevelThreshold,
	} from '../../../lib/rules/spells';
	import {
		WEAPONS,
		ARMORS,
		SHIELDS,
		ATTACK_TYPE_LABEL,
		type AttackType,
	} from '../../../lib/rules/weapons';

	// Инвентарь
	import {
		listInventory,
		addItemToInventory,
		removeItemFromInventory,
		adjustItemQuantity,
		getTotalWeight,
		normalizeMoney,
		canAfford,
		spendSilver,
	} from '../../../lib/engine/inventory';

	// Персонаж
	import {
		getCharacter,
		deleteCharacter,
		saveCharacter,
		spendResource,
		restoreResource,
		getCurrentResource,
		toggleGraceMode,
	} from '../../../lib/db/characters';

	import {
		getCharacteristicValue,
		getModifier,
		getSkillTotal,
		getSkillCheckTarget,
		getResourceMax,
		getSkillBonusDetails,
		getUnlockedAbilities,
		isAbilityLearned,
		getAbilityBlockReason,
		learnAbility,
	} from '../../../lib/engine/character';

	import { classifyRoll, type RollResult } from '../../../lib/engine/dice';

	import {
		getSpellCastTarget,
		getSpellAttackTarget,
		getSpellCost,
		getSpellSkillLevel,
		getSpellsWithAccess,
		getMaxSpellLevel,
		isSpellKnown,
		classifySpellRoll,
		rollSpellEffect,
		isSchoolStable,
		type SpellOutcome,
		type SpellEffectRoll,
	} from '../../../lib/engine/spells';

	import {
		rollInitiative,
		getArmorValue,
		getEquippedWeapon,
		getAttackTarget,
		getAttackCount,
		rollAttack,
		classifyAttack,
		type AttackOutcome,
		type SingleAttackRoll,
		type BonusDice,
	} from '../../../lib/engine/combat';

	import type { Character } from '$lib/type';

	// ────────────────────────────────────────────
	// STATE
	// ────────────────────────────────────────────
	let char = $state<Character | null>(null);
	type RollMode = 'online' | 'offline';
	let rollMode = $state<RollMode>('online');
	let pendingDie = $state<{ sides: number; label: string; target?: number } | null>(null);
	let manualDieValue = $state('');
	let manualDieError = $state('');
	let resolvePendingDie: ((value: number | null) => void) | null = null;
	let rollBusy = false;
	let loading = $state(true);
	let session = $state<SessionRequest | null>(null);
	let activeRoomCode = $state<string | null>(null);
	let activeRequest = $state<RoomRequest | null>(null);
	let unsubRequests: (() => void) | null = null;
	let combat = $state<CombatState | null>(null);
	let targetEnemyId = $state<string | null>(null);
	let decayDelta = $state(1);
	let decayLevel = $derived(char ? getDecayStage(char.decay?.points ?? 0).level : 0);
	let hideReligion = $derived(decayLevel >= 4);
	let visibleCharacteristics = $derived(CHARACTERISTICS.filter((entry) => !hideReligion || entry.id !== 'religion'));
	let visibleResources = $derived(RESOURCES.filter((entry) => !hideReligion || entry.id !== 'grace'));
	let visibleSkills = $derived(SKILLS.filter((entry) => !hideReligion || entry.parent !== 'religion'));
	let visibleSpellSchools = $derived(Object.entries(SPELLS_BY_SCHOOL).filter(([schoolId]) =>
		!hideReligion || SKILLS.find((entry) => entry.id === schoolId)?.parent !== 'religion'
	));
	let lastCombatHp: number | null = null;
	let lastRoll = $state<{ skill: string; roll: number; target: number; result: RollResult } | null>(null);
	let lastCharCheck = $state<{ charId: string; charName: string; roll: number; target: number; result: RollResult } | null>(null);
	let lastEdgeResult = $state<{ action: string; description: string; roll?: number; target?: number; success?: boolean } | null>(null);
	let lastRest = $state<{
		type: 'short' | 'long';
		results: Array<{
			resource: string; short: string; charShort: string; charValue: number;
			roll: number; resultLabel: string; restored: number;
			before: number; after: number; max: number;
		}>;
	} | null>(null);
	
	// Отписки
	let unsubSession: (() => void) | null = null;
	let unsubRoomCombat: (() => void) | null = null;
	let unsubCharUpdates: (() => void) | null = null;

	// Бой
	let attackType = $state<AttackType>('normal');
	let targetArmor = $state(15);
	let useTwoHandsWeapon = $state(false);
	let lastInitiative = $state<{ roll: number; mod: number; total: number } | null>(null);
	let lastAttack = $state<{
		weapon: string; attackType: AttackType; target: number;
		parts: { label: string; value: number }[];
		attacks: SingleAttackRoll[];
	} | null>(null);

	// Магия
	type TwoHandsChoice = Record<string, boolean>;
	let twoHands = $state<TwoHandsChoice>({});
	let lastCast = $state<{
		spell: string; roll: number; target: number; outcome: SpellOutcome;
		cost?: number; resource?: 'mana' | 'grace';
		effect?: SpellEffectRoll | null; damageApplied?: number; decayGained?: number;
	} | null>(null);

	// Инвентарь
	let showItemPicker = $state(false);
	let itemFilter = $state<ItemCategory | 'all'>('all');

	// Состояния
	let showConditionPicker = $state(false);
	let newConditionId = $state<string>('');
	let newConditionRounds = $state<number | null>(null);
	let lastSave = $state<{ condition: string; roll: number; target: number; label: string; success: boolean } | null>(null);

	// ────────────────────────────────────────────
	// ON MOUNT / ON DESTROY
	// ────────────────────────────────────────────
	onMount(async () => {
		rollMode = localStorage.getItem('parma_roll_mode') === 'offline' ? 'offline' : 'online';
		const found = await getCharacter(page.params.id ?? '');
		if (!found) {
			goto('/');
			return;
		}
		char = found;
		loading = false;
		activeRoomCode = getCurrentRoom();

		// Подписка на запросы мастера (BroadcastChannel — между вкладками одного браузера)
		session = getSession();
		unsubSession = subscribeSession((s) => {
			session = s;
		});

		// Начальное состояние боя из localStorage
		combat = getCombat();

		// Если мы в комнате — синхронизация боя через Supabase
		if (activeRoomCode) {
			try {
				const room = await findRoomByCode(activeRoomCode);
				if (room) {
					// Первичная загрузка состояния
					const remote = await getRoomCombatState(room.id);
					if (remote) combat = remote;
					activeRequest = await getActiveRoomRequest(room.id);
					unsubRequests = subscribeToRoomRequests(room.id, (req) => {
						activeRequest = req;
					});				
					// Подписка на обновления
					unsubRoomCombat = subscribeToRoomCombat(room.id, handleRoomCombatUpdate);
				}
			} catch (e) {
				console.warn('Не удалось подключиться к комнате:', e);
			}
		}

		// Обновления персонажа из других вкладок
		unsubCharUpdates = subscribeCharacterUpdates(async (characterId) => {
			if (!char || char.id !== characterId) return;
			const refreshed = await getCharacter(characterId);
			if (refreshed) char = refreshed;
		});
	});

	onDestroy(() => {
		cancelManualDie();
		unsubSession?.();
		unsubRoomCombat?.();
		unsubCharUpdates?.();
		unsubRequests?.();
	});

	// ────────────────────────────────────────────
	// СИНХРОНИЗАЦИЯ БОЯ
	// ────────────────────────────────────────────
	async function handleRoomCombatUpdate(newState: CombatState | null) {
		if (!newState) return;
		combat = newState;
		saveCombat(newState);

		const s = newState;
		if (!s.active || !char) return;

		const myP = findParticipantBySource(s, char.id);
		if (!myP) return;

		// Первая синхронизация — запоминаем, что видим
		if (lastCombatHp === null) {
			lastCombatHp = myP.currentHp;
			return;
		}

		const prevHp = lastCombatHp;
		lastCombatHp = myP.currentHp;
		if (prevHp === myP.currentHp) return;

		const max = getResourceMax(char, 'hp');
		const currentReal = getCurrentResource(char, 'hp', max);
		const currentTemp = char.tempHp ?? 0;

		if (myP.currentHp < prevHp) {
			// ГМ нанёс урон: сначала tempHp, потом реальный
			const damage = prevHp - myP.currentHp;
			const tempSpent = Math.min(currentTemp, damage);
			char.tempHp = currentTemp - tempSpent;
			const remaining = damage - tempSpent;

			if (remaining > 0) {
				char.currentResources = {
					...(char.currentResources ?? {}),
					hp: Math.max(0, currentReal - remaining),
				};
			}

			char = { ...char };
			await saveCharacter($state.snapshot(char) as Character);

			// Возвращаем итог обратно в трекер, чтобы tempHp тоже учёлся
			const newTotal = (char.currentResources!.hp ?? 0) + (char.tempHp ?? 0);
			if (newTotal !== myP.currentHp) {
				lastCombatHp = newTotal;
				await writeCombatState({
					...s,
					participants: s.participants.map((p) =>
						p.id === myP.id ? { ...p, currentHp: newTotal } : p
					),
				});
			}
		} else {
			// ГМ восстановил HP
			const heal = myP.currentHp - prevHp;
			char.currentResources = {
				...(char.currentResources ?? {}),
				hp: Math.min(max, currentReal + heal),
			};
			char = { ...char };
			await saveCharacter($state.snapshot(char) as Character);
		}
	}

	/** Единая запись боя: локально + в комнату, если мы в ней */
	async function writeCombatState(next: CombatState) {
	console.log('[char/combat] writeCombatState', next);
	combat = next;

	try {
		saveCombat(next);
		console.log('[char/combat] localStorage ОК');
	} catch (e) {
		console.error('[char/combat] localStorage упал:', e);
	}

	if (!activeRoomCode) {
		console.warn('[char/combat] нет activeRoomCode — пропускаем Supabase');
		return;
	}

	try {
		const room = await findRoomByCode(activeRoomCode);
		if (!room) {
			console.error('[char/combat] комната не найдена:', activeRoomCode);
			return;
		}
		await saveRoomCombatState(room.id, next);
		console.log('[char/combat] Supabase ОК', room.id);
	} catch (e) {
		console.error('[char/combat] Supabase упал:', e);
	}
}


	// ────────────────────────────────────────────
	// DERIVED
	// ────────────────────────────────────────────
	let condMods = $derived(
		char
			? getConditionModifiers(char)
			: { characteristics: 0, attacks: 0, skills: 0, saves: 0, armor: 0, speed: 0, maxStamina: 0, skipTurn: false, canAct: true }
	);

	let currentWeapon = $derived(char ? getEquippedWeapon(char) : undefined);

	let armorInfo = $derived.by(() => {
		if (!char) return { total: 0, dexMod: 0, armor: 0, shield: 0 };
		const base = getArmorValue(char);
		const condArmor = condMods.armor ?? 0;
		return { ...base, total: Math.max(0, base.total + condArmor) };
	});

	let enemiesInCombat = $derived(
		combat?.active ? combat.participants.filter((p) => !p.isPlayer) : []
	);

	let myCombatParticipant = $derived(
		combat && char ? findParticipantBySource(combat, char.id) : null
	);

	let isMyTurnInCombat = $derived(
		combat && myCombatParticipant && combat.active
			? (() => {
					const sorted = [...combat.participants].sort((a, b) => b.initiative - a.initiative);
					const idx = combat.currentTurnIndex % sorted.length;
					return sorted[idx]?.id === myCombatParticipant.id;
				})()
			: false
	);

	let attackInfo = $derived(
		char && currentWeapon
			? getAttackTarget(char, currentWeapon, attackType, targetArmor, useTwoHandsWeapon)
			: null
	);

	let atDeathsDoor = $derived.by(() => {
		if (!char) return false;
		const max = getResourceMax(char, 'hp');
		const realHp = getCurrentResource(char, 'hp', max);
		const temp = char.tempHp ?? 0;
		return realHp === 0 && temp === 0;
	});

	let inventoryEntries = $derived(char ? listInventory(char) : []);
	let totalWeight = $derived(char ? getTotalWeight(char) : 0);
	let arrowsCount = $derived(char?.inventory?.find((i) => i.itemId === 'arrows')?.quantity ?? 0);

	// ────────────────────────────────────────────
	// ЯРЛЫКИ / УТИЛИТЫ
	// ────────────────────────────────────────────
	function setRollMode(mode: RollMode) {
		if (pendingDie) return;
		rollMode = mode;
		localStorage.setItem('parma_roll_mode', mode);
	}
	function finishManualDie(value: number | null) {
		const resolve = resolvePendingDie;
		resolvePendingDie = null;
		pendingDie = null;
		manualDieValue = '';
		manualDieError = '';
		resolve?.(value);
	}
	function cancelManualDie() { finishManualDie(null); }
	function submitManualDie() {
		if (!pendingDie) return;
		const raw = String(manualDieValue).trim();
		const value = Number(raw);
		if (!/^\d+$/.test(raw) || !Number.isInteger(value) || value < 1 || value > pendingDie.sides) {
			manualDieError = `Введите целое число от 1 до ${pendingDie.sides}`;
			return;
		}
		finishManualDie(value);
	}
	async function requestDie(sides: number, label: string, target?: number): Promise<number | null> {
		if (rollMode === 'online') return Math.floor(Math.random() * sides) + 1;
		if (pendingDie) return null;
		manualDieValue = '';
		manualDieError = '';
		pendingDie = { sides, label, target };
		return new Promise((resolve) => { resolvePendingDie = resolve; });
	}
	function printCharacter() {
		window.print();
	}

	const resultLabel: Record<RollResult, string> = {
		crit_success: 'Правь! Критический успех',
		success: 'Успех',
		fail: 'Провал',
		crit_fail: 'Навь! Критический провал',
		double: 'Явь! Дубль',
	};

	const resultColor: Record<RollResult, string> = {
		crit_success: 'text-green-700',
		success: 'text-green-600',
		fail: 'text-gray-500',
		crit_fail: 'text-red-700',
		double: 'text-blue-700',
	};

	const attackOutcomeLabel: Record<AttackOutcome, string> = {
		hit: 'Попадание',
		miss: 'Промах',
		critical_hit: 'Правь! Максимальный урон + эффект',
		critical_miss: 'Навь! Оружие может застрять/сломаться',
		double: 'Явь! Дубль — особый эффект',
	};

	const attackOutcomeColor: Record<AttackOutcome, string> = {
		hit: 'text-green-700',
		miss: 'text-gray-500',
		critical_hit: 'text-green-700 font-bold',
		critical_miss: 'text-red-700 font-bold',
		double: 'text-blue-700 font-bold',
	};

	const spellOutcomeLabel: Record<SpellOutcome, string> = {
		critical_success: 'Правь! Ресурсы не тратятся, эффект максимален',
		success: 'Заклинание сработало',
		failure: 'Провал — ресурсы потрачены',
		critical_failure: 'Навь! 1к4 урона, школа недоступна 1 раунд',
	};

	const typeLabel: Record<SessionRequestType, string> = {
		initiative: 'прыть',
		stealth: 'Скрытность',
		perception: 'Наблюдательность',
		survival: 'Выживание',
	};

	async function respondToActiveRequest() {
	if (!char || !activeRequest) return;
	if (activeRequest.results[char.id]) return;

	const type = activeRequest.request_type as SessionRequestType;
	const skillId = SESSION_SKILLS[type];
	let roll: number, target: number, modifier: number;
	let result: 'crit_success' | 'success' | 'fail' | 'crit_fail' | 'double';

	if (type === 'initiative') {
		const entered = await requestDie(20, 'Запрос мастера: прыть');
		if (entered === null) return;
		roll = entered;
		modifier = getModifier(getCharacteristicValue(char, 'dexterity'));
		target = 0;
		result = 'success';
		setParticipantInitiative(char.id, roll, modifier);
	} else if (skillId) {
		target = getSkillCheckTarget(char, skillId);
		const entered = await requestDie(100, 'Запрос мастера: проверка', target);
		if (entered === null) return;
		roll = entered;
		modifier = 0;
		result = classifyRoll(roll, target);
	} else return;

	try {
		await submitRoomRequestResult(activeRequest.id, char.id, {
			characterId: char.id,
			characterName: char.name,
			roll, target, modifier, result,
			timestamp: Date.now()
		});
	} catch (e) {
		alert((e as Error).message);
	}
}

	// ────────────────────────────────────────────
	// РЕСУРСЫ
	// ────────────────────────────────────────────
	async function applyHpDelta(delta: number) {
		if (!char) return;
		const max = getResourceMax(char, 'hp');
		const current = getCurrentResource(char, 'hp', max);

		if (delta < 0) {
			const damage = -delta;
			const temp = char.tempHp ?? 0;
			const tempSpent = Math.min(temp, damage);
			char.tempHp = temp - tempSpent;
			const remaining = damage - tempSpent;
			if (remaining > 0) {
				char.currentResources = {
					...(char.currentResources ?? {}),
					hp: Math.max(0, current - remaining),
				};
			}
		} else {
			char.currentResources = {
				...(char.currentResources ?? {}),
				hp: Math.min(max, current + delta),
			};
		}

		char = { ...char };
		await saveCharacter($state.snapshot(char) as Character);
		await syncHpToCombat();
	}

	async function syncHpToCombat() {
		if (!char || !combat?.active) return;
		const myP = myCombatParticipant;
		if (!myP) return;
		const max = getResourceMax(char, 'hp');
		const real = getCurrentResource(char, 'hp', max);
		const temp = char.tempHp ?? 0;
		const total = real + temp;
		if (myP.currentHp === total) return;

		lastCombatHp = total;
		await writeCombatState({
			...combat,
			participants: combat.participants.map((p) =>
				p.id === myP.id ? { ...p, currentHp: total } : p
			),
		});
	}

	// ────────────────────────────────────────────
	// ГРАНЬ
	// ────────────────────────────────────────────
	async function voiceOfBlood() {
		if (!char) return;
		if (char.death?.usedVoiceOfBlood) {
			alert('Голос Крови уже был использован в этом бою.');
			return;
		}
		const mod = getModifier(getCharacteristicValue(char, 'strength', condMods));
		const temp = 10 + mod;
		char.tempHp = temp;
		char.death = { ...char.death, usedVoiceOfBlood: true };
		char = { ...char };
		await saveCharacter($state.snapshot(char) as Character);

		lastEdgeResult = {
			action: 'Голос Крови (Предки)',
			description: `Временные Жвч: ${temp}. Приходишь в сознание. Когда они кончатся — снова «при смерти». После — 1 уровень Истощения.`,
		};
		await syncHpToCombat();
	}

	async function callOfZhiva() {
		if (!char) return;
		if (char.death?.usedCallOfZhiva) {
			alert('Зов Живы уже был использован в этом бою.');
			return;
		}
		const mod = getModifier(getCharacteristicValue(char, 'intelligence', condMods));
		const restore = 10 + mod;
		const max = getResourceMax(char, 'hp');
		const next = Math.min(max, restore);

		char.currentResources = { ...(char.currentResources ?? {}), hp: next };
		char.death = {
			...char.death,
			usedCallOfZhiva: true,
			debtMark: (char.death?.debtMark ?? 0) + 1,
		};
		char = { ...char };
		await saveCharacter($state.snapshot(char) as Character);

		lastEdgeResult = {
			action: 'Зов Живы (Долг)',
			description: `Восстановлено ${restore} Жвч. Получена метка «Долг Живе» (всего: ${char.death.debtMark}). Каждая метка — −5 к максимуму Жвч навсегда.`,
		};
		await syncHpToCombat();
	}

	async function holdOn() {
		if (!char) return;
		const str = getCharacteristicValue(char, 'strength', condMods);
		const fortitude = getSkillTotal(char, 'fortitude', condMods);
		const target = Math.min(95, str + fortitude);
		const roll = await requestDie(100, 'Удержаться', target);
		if (roll === null) return;

		let success = false;
		let description = '';

		if (roll === 1) {
			success = true;
			description = 'Правь! Приходишь в сознание с 1 Жвч + 1 Истощение.';
		} else if (roll === 100) {
			success = false;
			description = 'Навь! Смерть. Персонаж уходит в Навь.';
		} else if (roll <= target) {
			success = true;
			description = 'Успех. Стабилизация: 1 Жвч, без сознания. Через 1 час придёшь в себя + 1 Истощение.';
		} else {
			success = false;
			description = 'Провал. Теряешь 1 Жвч (уходишь в минус). В начале следующего хода повторишь бросок.';
		}

		if (success) {
			char.currentResources = { ...(char.currentResources ?? {}), hp: 1 };
			char = { ...char };
			await saveCharacter($state.snapshot(char) as Character);
		}

		lastEdgeResult = { action: 'Удержаться (Своя воля)', description, roll, target, success };
		publishToActiveRoom(char.name || 'Безымянный', 'skill', { skillName: 'Удержаться', roll, target, result: classifyRoll(roll, target) });
		await syncHpToCombat();
	}

	async function helpAlly() {
		if (!char) return;
		const restoration = getSkillTotal(char, 'restoration', condMods);
		const int = getCharacteristicValue(char, 'intelligence', condMods);
		const target = Math.min(95, int + restoration);
		const roll = await requestDie(100, 'Помочь союзнику', target);
		if (roll === null) return;
		const success = roll <= target;
		publishToActiveRoom(char.name || 'Безымянный', 'skill', { skillName: 'Помочь союзнику', roll, target, result: classifyRoll(roll, target) });
		alert(
			success
				? `Проверка Восстановления: к100 = ${roll} ≤ ${target} — успех! Союзник стабилизирован.`
				: `Проверка Восстановления: к100 = ${roll} > ${target} — провал.`
		);
	}

	async function resetEdge() {
		if (!char) return;
		if (!confirm('Сбросить состояние Грани? Использованные шаги снова доступны. Используй после боя.')) return;
		char.death = { ...char.death, usedVoiceOfBlood: false, usedCallOfZhiva: false };
		char.tempHp = 0;
		char = { ...char };
		await saveCharacter($state.snapshot(char) as Character);
		lastEdgeResult = null;
	}

	async function toggleMetkaNavi() {
		if (!char) return;
		char.death = { ...char.death, metkaNavi: !char.death.metkaNavi };
		char = { ...char };
		await saveCharacter($state.snapshot(char) as Character);
	}

	async function clearTempHp() {
		if (!char) return;
		char.tempHp = 0;
		char = { ...char };
		await saveCharacter($state.snapshot(char) as Character);
		await syncHpToCombat();
	}

	// ────────────────────────────────────────────
	// БОЙ
	// ────────────────────────────────────────────
	async function rollInit() {
		if (!char) return;
		const roll = await requestDie(20, 'Прыть (инициатива)');
		if (roll === null) return;
		lastInitiative = rollInitiative(char, roll);
		if (lastInitiative) {
			publishToActiveRoom(char.name || 'Безымянный', 'initiative', {
				roll: lastInitiative.roll,
				modifier: lastInitiative.mod,
				total: lastInitiative.total,
			});
		}
	}

	async function updateEquipment(field: 'weaponId' | 'armorId' | 'shieldId', value: string) {
		if (!char) return;
		char.equipment = { ...(char.equipment ?? {}), [field]: value };
		char = { ...char, equipment: { ...char.equipment } };
		await saveCharacter($state.snapshot(char) as Character);
	}

	async function attack() {
		if (!char || rollBusy) return;
		const weapon = getEquippedWeapon(char);
		if (!weapon) {
			alert('Сначала выберите оружие');
			return;
		}

		let arrowBonus: BonusDice[] = [];
		let arrowsEntryId: string | null = null;

		if (weapon.category === 'ranged') {
			const arrowsEntry = char.inventory?.find((i) => i.itemId === 'arrows');
			const arrowsCount = arrowsEntry?.quantity ?? 0;
			const needed = getAttackCount(char, weapon, attackType);
			if (arrowsCount < needed) {
				alert(`Нет стрел! Нужно ${needed}, есть ${arrowsCount}.`);
				return;
			}
			arrowBonus = [{ label: 'Стрелы', count: 1, sides: 6 }];
			arrowsEntryId = arrowsEntry!.instanceId;
		}

		const adjustedTargetArmor = targetArmor - (condMods.attacks ?? 0);
		const { target, parts } = getAttackTarget(char, weapon, attackType, adjustedTargetArmor, useTwoHandsWeapon);
		let attacks: SingleAttackRoll[];
		if (rollMode === 'offline') {
			rollBusy = true;
			try {
				const dice: number[] = [];
				const count = getAttackCount(char, weapon, attackType);
				const formula = useTwoHandsWeapon && weapon.damageTwoHands ? weapon.damageTwoHands : weapon.damageOneHand;
				const damageMatch = formula.match(/^(\d+)[dк](\d+)$/i);
				const damageCount = (damageMatch ? Number(damageMatch[1]) : 1) + (attackType === 'strong' ? 1 : 0);
				const damageSides = damageMatch ? Number(damageMatch[2]) : 4;
				for (let i = 0; i < count; i++) {
					const hit = await requestDie(100, `${weapon.name}: атака ${i + 1} из ${count}`, target);
					if (hit === null) return;
					dice.push(hit);
					const outcome = classifyAttack(hit, target);
					if (outcome === 'critical_hit' || outcome === 'critical_miss' || outcome === 'double') {
						const tableSides = outcome === 'double' ? 10 : 12;
						const effect = await requestDie(tableSides, `${weapon.name}: эффект ${outcome === 'critical_hit' ? 'Прави' : outcome === 'double' ? 'Яви' : 'Нави'}`);
						if (effect === null) return;
						dice.push(effect);
						if (effect <= 2 && outcome !== 'critical_miss') {
							const sides = outcome === 'critical_hit'
								? weapon.category === 'two_handed' ? 8 : 6
								: weapon.category === 'two_handed' ? 6 : 4;
							const extra = await requestDie(sides, `${weapon.name}: дополнительный урон`);
							if (extra === null) return;
							dice.push(extra);
						}
					}
					if (outcome === 'hit' || outcome === 'double') {
						for (let j = 0; j < damageCount; j++) {
							const damage = await requestDie(damageSides, `${weapon.name}: урон ${j + 1} из ${damageCount}`);
							if (damage === null) return;
							dice.push(damage);
						}
						for (const bonus of arrowBonus) for (let j = 0; j < bonus.count; j++) {
							const damage = await requestDie(bonus.sides, `${bonus.label}: урон ${j + 1} из ${bonus.count}`);
							if (damage === null) return;
							dice.push(damage);
						}
					}
				}
				let cursor = 0;
				attacks = rollAttack(char, weapon, attackType, adjustedTargetArmor, useTwoHandsWeapon, arrowBonus, () => dice[cursor++]);
			} finally { rollBusy = false; }
		} else {
			attacks = rollAttack(char, weapon, attackType, adjustedTargetArmor, useTwoHandsWeapon, arrowBonus);
		}

		lastAttack = { weapon: weapon.name, attackType, target, parts, attacks };

		for (const atk of attacks) {
			publishToActiveRoom(char.name || 'Безымянный', 'attack', {
				weaponName: weapon.name,
				attackType,
				roll: atk.roll,
				target: atk.target,
				result:
					atk.outcome === 'hit' ? 'success'
					: atk.outcome === 'critical_hit' ? 'crit_success'
					: atk.outcome === 'critical_miss' ? 'crit_fail'
					: atk.outcome === 'double' ? 'double'
					: 'fail',
				damage: atk.damage?.total,
			});
		}

		// Если бой активен и цель выбрана — списываем урон
		if (combat?.active && targetEnemyId) {
			let totalDamage = 0;
			for (const atk of attacks) {
				if (atk.damage && (atk.outcome === 'hit' || atk.outcome === 'critical_hit' || atk.outcome === 'double')) {
					totalDamage += atk.damage.total;
				}
			}
			if (totalDamage > 0) {
				await writeCombatState({
					...combat,
					participants: combat.participants.map((p) =>
						p.id === targetEnemyId
							? { ...p, currentHp: Math.max(0, p.currentHp - totalDamage) }
							: p
					),
				});
			}
		}

		if (weapon.category === 'ranged' && arrowsEntryId) {
			const spent = getAttackCount(char, weapon, attackType);
			char = adjustItemQuantity(char, arrowsEntryId, -spent);
			await persistInventory();
		}
	}

	// ────────────────────────────────────────────
	// МАГИЯ
	// ────────────────────────────────────────────
	async function toggleSpell(spellId: string) {
		if (!char) return;
		const isKnown = char.spells.includes(spellId);
		const newSpells = isKnown
			? char.spells.filter((id) => id !== spellId)
			: [...char.spells, spellId];
		char = { ...char, spells: newSpells };
		await saveCharacter($state.snapshot(char) as Character);
	}

	async function studyAbility(abilityId: string) {
		if (!char) return;
		const updated = learnAbility(char, abilityId);
		if (!updated) return;
		char = updated;
		await saveCharacter($state.snapshot(char) as Character);
	}

	async function changeDecayPoints(delta: number) {
		if (!char || !Number.isFinite(delta)) return;
		char = adjustDecayPoints(char, delta);
		await saveCharacter($state.snapshot(char) as Character);
	}

	async function castSpell(spellId: string, school: string, useTwoHands: boolean) {
		if (!char) return;
		const spell = SPELLS_BY_SCHOOL[school].find((s) => s.id === spellId);
		if (!spell) return;
		const graceAllowed = canUseGraceWithDecay(char.decay?.points ?? 0);
		if (!graceAllowed && spell.costGrace !== undefined) return;
		const useGrace = graceAllowed && char.useGraceForSpells;

		const selectedTarget = combat?.active && targetEnemyId
			? combat.participants.find((participant) => participant.id === targetEnemyId && !participant.isPlayer)
			: undefined;
		const targetArmor = selectedTarget?.armor ?? 0;
		const target = getSpellAttackTarget(char, school, targetArmor, condMods.attacks ?? 0, spell);
		const roll = await requestDie(100, `${spell.name}: сотворение`, target);
		if (roll === null) return;
		const outcome = classifySpellRoll(roll, target);
		const costInfo = getSpellCost(char, spell, useTwoHands);
		const criticalCostDie = outcome === 'critical_failure' ? await requestDie(4, `${spell.name}: цена критического провала`) : 0;
		if (criticalCostDie === null) return;
		let effectResult: SpellEffectRoll | null = null;
		if (outcome === 'success' || outcome === 'critical_success') {
			if (rollMode === 'offline') {
				const plan = rollSpellEffect(char, spell, useTwoHands, useGrace, () => 1);
				if (plan) {
					const dice: number[] = [];
					for (let i = 0; i < plan.diceCount; i++) {
						const value = await requestDie(plan.diceSides, `${spell.name}: ${spell.damage ? 'урон' : 'эффект'} ${i + 1} из ${plan.diceCount}`);
						if (value === null) return;
						dice.push(value);
					}
					let cursor = 0;
					effectResult = rollSpellEffect(char, spell, useTwoHands, useGrace, () => dice[cursor++]);
				}
			} else effectResult = rollSpellEffect(char, spell, useTwoHands, useGrace);
		}
		const decayGained = spell.usesNezhiva ? 1 : 0;
		if (decayGained) char = adjustDecayPoints(char, decayGained);

		const resourceId = useGrace ? 'grace' : costInfo.resource === 'grace' ? 'grace' : 'mana';
		const resourceMax = getResourceMax(char, resourceId);
		const current = getCurrentResource(char, resourceId, resourceMax);

		let actuallySpent = 0;
		if (outcome === 'success' || outcome === 'failure' || outcome === 'critical_failure') {
			const total =
				outcome === 'critical_failure'
					? costInfo.reduced + criticalCostDie
					: costInfo.reduced;
			actuallySpent = Math.min(current, total);
			spendResource(char, resourceId, total, resourceMax);
		}

		let damageApplied = 0;
		if (combat?.active && targetEnemyId && effectResult && spell.damage) {
			damageApplied = effectResult.total;
			await writeCombatState({
				...combat,
				participants: combat.participants.map((p) =>
					p.id === targetEnemyId
						? { ...p, currentHp: Math.max(0, p.currentHp - damageApplied) }
						: p
				),
			});
		}

		lastCast = {
			spell: spell.name,
			roll,
			target,
			outcome,
			cost: actuallySpent,
			resource: useGrace ? 'grace' : costInfo.resource,
			effect: effectResult,
			damageApplied,
			decayGained,
		};

		publishToActiveRoom(char.name || 'Безымянный', 'spell', {
			spellName: spell.name,
			school,
			roll,
			target,
			result:
				outcome === 'success' ? 'success'
				: outcome === 'critical_success' ? 'crit_success'
				: outcome === 'critical_failure' ? 'crit_fail'
				: 'fail',
			damage: effectResult?.total,
		});

		char = { ...char, currentResources: { ...(char.currentResources ?? {}) } };
		await saveCharacter($state.snapshot(char) as Character);
	}

	// ────────────────────────────────────────────
	// ЛИЧНОСТЬ
	// ────────────────────────────────────────────
	async function updateBio(patch: Partial<Character['bio']>) {
		if (!char) return;
		char = { ...char, bio: { ...char.bio, ...patch } };
		await saveCharacter($state.snapshot(char) as Character);
	}

	function selectPersonality(
		field: 'personality' | 'ideal' | 'bond' | 'flaw',
		key: string,
		list: typeof PERSONALITY_TRAITS
	) {
		if (!char) return;
		const option = findOption(list, key);
		const text = option ? option.description : char.bio[`${field}Text` as const];
		updateBio({ [`${field}Key`]: key, [`${field}Text`]: text } as Partial<Character['bio']>);
	}

	async function setInspiration(value: number) {
		if (!char) return;
		const clamped = Math.max(0, Math.min(3, value));
		char = { ...char, inspiration: clamped };
		await saveCharacter($state.snapshot(char) as Character);
	}

	// ────────────────────────────────────────────
	// СОСТОЯНИЯ
	// ────────────────────────────────────────────
	function getCharValueForCondition(charId: string): number {
		if (!char) return 0;
		return getCharacteristicValue(char, charId);
	}
	function getSkillForCondition(skillId: string): number {
		if (!char) return 0;
		return getSkillTotal(char, skillId);
	}
	function getConditionSaveTarget(def: any, useAlternative: boolean): { target: number; label: string } | null {
		if (!char) return null;
		return calculateConditionSaveTarget(char, def, useAlternative);
	}

	async function addCondition(conditionId: string, roundsLeft: number | null) {
		if (!char) return;
		const existing = char.conditions ?? [];
		if (existing.some((c) => c.id === conditionId)) {
			alert('Это состояние уже активно');
			return;
		}
		char.conditions = [...existing, { id: conditionId, roundsLeft }];
		char = { ...char };
		await saveCharacter($state.snapshot(char) as Character);
	}

	async function removeCondition(conditionId: string) {
		if (!char) return;
		char.conditions = (char.conditions ?? []).filter((c) => c.id !== conditionId);
		char = { ...char };
		await saveCharacter($state.snapshot(char) as Character);
	}

	async function adjustConditionRounds(conditionId: string, delta: number) {
		if (!char) return;
		const next = (char.conditions ?? [])
			.map((c) => {
				if (c.id !== conditionId) return c;
				if (c.roundsLeft === null) return c;
				return { ...c, roundsLeft: Math.max(0, c.roundsLeft + delta) };
			})
			.filter((c) => c.roundsLeft === null || c.roundsLeft > 0);
		char.conditions = next;
		char = { ...char };
		await saveCharacter($state.snapshot(char) as Character);
	}

	async function attemptSave(conditionId: string, useAlternative: boolean) {
		if (!char) return;
		const def = findCondition(conditionId);
		if (!def) return;
		const targetInfo = getConditionSaveTarget(def, useAlternative);
		if (!targetInfo) {
			alert('Для этого состояния нет проверки избавления');
			return;
		}
		const roll = await requestDie(100, `${def.name}: избавление`, targetInfo.target);
		if (roll === null) return;
		const success = roll <= targetInfo.target;
		lastSave = { condition: def.name, roll, target: targetInfo.target, label: targetInfo.label, success };
		publishToActiveRoom(char.name || 'Безымянный', 'characteristic', { charName: `Избавление: ${def.name}`, roll, target: targetInfo.target, result: classifyRoll(roll, targetInfo.target) });
		if (success) await removeCondition(conditionId);
	}

	async function applyDotDamage() {
		if (!char) return;
		const dice: number[] = [];
		if (rollMode === 'offline') {
			for (const condition of char.conditions ?? []) {
				const def = findCondition(condition.id);
				const match = def?.dotDamage?.match(/^(\d+)[кd](\d+)$/i);
				if (!match) continue;
				for (let i = 0; i < Number(match[1]); i++) {
					const value = await requestDie(Number(match[2]), `${def?.name ?? 'Состояние'}: урон ${i + 1} из ${match[1]}`);
					if (value === null) return;
					dice.push(value);
				}
			}
		}
		let cursor = 0;
		const { total, details } = rollMode === 'offline'
			? rollConditionsDotDamage(char, () => dice[cursor++])
			: rollConditionsDotDamage(char);
		if (total === 0) {
			alert('Нет состояний, наносящих урон в конце хода');
			return;
		}
		if (!confirm(`Урон в конце хода:\n\n${details.join('\n')}\n\nИтого: ${total} Жвч`)) return;
		publishToActiveRoom(char.name || 'Безымянный', 'effect', { label: 'Урон от состояний', details: `${details.join('; ')}; итого ${total}` });
		const max = getResourceMax(char, 'hp');
		const current = getCurrentResource(char, 'hp', max);
		char.currentResources = { ...(char.currentResources ?? {}), hp: Math.max(0, current - total) };
		char = { ...char };
		await saveCharacter($state.snapshot(char) as Character);
	}

	// ────────────────────────────────────────────
	// ОТДЫХ
	// ────────────────────────────────────────────
	async function shortRest() {
		if (!char) return;
		if (char.shortRestUsed) {
			alert('Короткий отдых уже был использован. Нужен продолжительный отдых (8 часов).');
			return;
		}
		if (!confirm('Короткий отдых (1 час)? Будет проверка характеристики для каждого ресурса.')) return;

		const updates: Record<string, number> = {};
		const results: NonNullable<typeof lastRest>['results'] = [];

		for (const r of RESOURCES) {
			const charId = r.parent;
			const charValue = getCharacteristicValue(char, charId, condMods);
			const roll = await requestDie(100, `Короткий отдых: ${r.name}`, charValue);
			if (roll === null) return;

			let ratio = 0;
			let resultLabel = '';
			if (roll === 1) {
				ratio = 2 / 3;
				resultLabel = 'Правь! ⅔ максимума';
			} else if (roll % 11 === 0 && roll <= 99 && roll <= charValue) {
				ratio = 2 / 3;
				resultLabel = 'Явь (дубль) — ⅔';
			} else if (roll <= charValue) {
				ratio = 0.5;
				resultLabel = 'Успех — ½';
			} else {
				ratio = 0;
				resultLabel = 'Провал';
			}

			const max = getResourceMax(char, r.id);
			const restored = Math.floor(max * ratio);
			const current = getCurrentResource(char, r.id, max);
			const next = Math.min(max, current + restored);
			updates[r.id] = next;

			results.push({
				resource: r.name,
				short: r.short,
				charShort: CHARACTERISTICS.find((c) => c.id === charId)?.short ?? '',
				charValue,
				roll,
				resultLabel,
				restored,
				before: current,
				after: next,
				max,
			});
		}

		char.currentResources = { ...(char.currentResources ?? {}), ...updates };
		char.shortRestUsed = true;
		char = { ...char };
		await saveCharacter($state.snapshot(char) as Character);
		lastRest = { type: 'short', results };
		for (const entry of results) publishToActiveRoom(char.name || 'Безымянный', 'characteristic', {
			charName: `Короткий отдых: ${entry.resource}`, roll: entry.roll, target: entry.charValue,
			result: classifyRoll(entry.roll, entry.charValue), restored: entry.restored
		});
	}

	async function longRest() {
		if (!char) return;
		if (!confirm('Продолжительный отдых (8 часов)? Все ресурсы восстановятся полностью.')) return;

		const updates: Record<string, number> = {};
		for (const r of RESOURCES) {
			updates[r.id] = getResourceMax(char, r.id);
		}
		char.currentResources = { ...(char.currentResources ?? {}), ...updates };
		char.shortRestUsed = false;
		char = { ...char };
		await saveCharacter($state.snapshot(char) as Character);
		lastRest = { type: 'long', results: [] };
	}

	// ────────────────────────────────────────────
	// ИНВЕНТАРЬ
	// ────────────────────────────────────────────
	async function persistInventory() {
		if (!char) return;
		char = { ...char };
		await saveCharacter($state.snapshot(char) as Character);
	}

	async function addItem(itemId: string) {
		if (!char) return;
		const item = ITEMS.find((i) => i.id === itemId);
		const qty = item?.bundleQuantity ?? 1;
		char = addItemToInventory(char, itemId, qty);
		await persistInventory();
	}

	async function removeItem(instanceId: string) {
		if (!char) return;
		char = removeItemFromInventory(char, instanceId);
		await persistInventory();
	}

	async function adjustQty(instanceId: string, delta: number) {
		if (!char) return;
		char = adjustItemQuantity(char, instanceId, delta);
		await persistInventory();
	}

	async function useItem(instanceId: string) {
		if (!char) return;
		const entry = inventoryEntries.find((e) => e.instance.instanceId === instanceId);
		if (!entry) return;
		const item = entry.item;

		if (item.restoresHp && item.useDice) {
			const m = item.useDice.match(/^(\d+)[кd](\d+)([+-]\d+)?$/i);
			if (m) {
				const count = parseInt(m[1], 10);
				const sides = parseInt(m[2], 10);
				const bonus = m[3] ? parseInt(m[3], 10) : 0;
				let sum = 0;
				for (let i = 0; i < count; i++) {
					const value = await requestDie(sides, `${item.name}: лечение ${i + 1} из ${count}`);
					if (value === null) return;
					sum += value;
				}
				const healed = sum + bonus;
				const max = getResourceMax(char, 'hp');
				const current = getCurrentResource(char, 'hp', max);
				char.currentResources = { ...(char.currentResources ?? {}), hp: Math.min(max, current + healed) };
				publishToActiveRoom(char.name || 'Безымянный', 'effect', { label: item.name, details: `${item.useDice} = ${sum}${bonus ? ` + ${bonus}` : ''} = ${healed} живучести` });
				alert(`Восстановлено ${healed} живучести.`);
			}
		}

		if (item.restoresResource === 'mana' && item.useDice) {
			const m = item.useDice.match(/^(\d+)[кd](\d+)/i);
			if (m) {
				const count = parseInt(m[1], 10);
				const sides = parseInt(m[2], 10);
				let sum = 0;
				for (let i = 0; i < count; i++) {
					const value = await requestDie(sides, `${item.name}: восстановление живы ${i + 1} из ${count}`);
					if (value === null) return;
					sum += value;
				}
				const max = getResourceMax(char, 'mana');
				const current = getCurrentResource(char, 'mana', max);
				char.currentResources = { ...(char.currentResources ?? {}), mana: Math.min(max, current + sum) };
				publishToActiveRoom(char.name || 'Безымянный', 'effect', { label: item.name, details: `${item.useDice} = ${sum} живы` });
				alert(`Восстановлено ${sum} живы.`);
			}
		}

		if (item.consumable) char = adjustItemQuantity(char, instanceId, -1);
		await persistInventory();
	}

	async function adjustMoney(type: 'copper' | 'silver' | 'gold', delta: number) {
		if (!char) return;
		if (!char.money) char.money = { copper: 0, silver: 0, gold: 0 };
		const next = { ...char.money, [type]: Math.max(0, char.money[type] + delta) };
		char.money = normalizeMoney(next);
		await persistInventory();
	}

	async function normalizeMoneyNow() {
		if (!char) return;
		char.money = normalizeMoney(char.money ?? { copper: 0, silver: 0, gold: 0 });
		await persistInventory();
	}

	async function buyItem(itemId: string, priceSilver: number) {
		if (!char) return;
		if (!canAfford(char, priceSilver)) {
			alert(`Недостаточно денег. Нужно ${priceSilver} серебряников.`);
			return;
		}
		const item = ITEMS.find((i) => i.id === itemId);
		const qty = item?.bundleQuantity ?? 1;
		char.money = spendSilver(char, priceSilver);
		char = addItemToInventory(char, itemId, qty);
		await persistInventory();
	}

	// ────────────────────────────────────────────
	// ПРОЧЕЕ
	// ────────────────────────────────────────────
	async function removeChar() {
		if (!char) return;
		if (!confirm('Удалить персонажа?')) return;
		await deleteCharacter(char.id);
		goto('/');
	}

	async function respondToRequest() {
		if (!char) return;

	// Приоритет — Supabase-запрос, если мы в комнате
	if (activeRequest && !activeRequest.results[char.id]) {
		const type = activeRequest.request_type as SessionRequestType;
		const skillId = SESSION_SKILLS[type];
		let roll: number, target: number, modifier: number;
		let result: 'crit_success' | 'success' | 'fail' | 'crit_fail' | 'double';

		if (type === 'initiative') {
			const entered = await requestDie(20, 'Запрос мастера: прыть');
			if (entered === null) return;
			roll = entered;
			modifier = getModifier(getCharacteristicValue(char, 'dexterity'));
			target = 0;
			result = 'success';
			setParticipantInitiative(char.id, roll, modifier);
		} else if (skillId) {
			target = getSkillCheckTarget(char, skillId);
			const entered = await requestDie(100, 'Запрос мастера: проверка', target);
			if (entered === null) return;
			roll = entered;
			modifier = 0;
			result = classifyRoll(roll, target);
		} else return;

		try {
			await submitRoomRequestResult(activeRequest.id, char.id, {
				characterId: char.id,
				characterName: char.name,
				roll,
				target,
				modifier,
				result,
				timestamp: Date.now(),
			});
			// Локально обновим отображение
			activeRequest = {
				...activeRequest,
				results: {
					...activeRequest.results,
					[char.id]: {
						characterId: char.id,
						characterName: char.name,
						roll, target, modifier, result,
						timestamp: Date.now(),
					},
				},
			};
		} catch (e) {
			alert((e as Error).message);
		}
		return;
	}

		// Fallback: старая система через BroadcastChannel
		if (!session || session.results[char.id]) return;
		const skillId = SESSION_SKILLS[session.type];
		let roll: number;
		let target: number;
		let modifier: number;
		let result: 'crit_success' | 'success' | 'fail' | 'crit_fail' | 'double';

		if (session.type === 'initiative') {
			const entered = await requestDie(20, 'Запрос мастера: прыть');
			if (entered === null) return;
			roll = entered;
			modifier = getModifier(getCharacteristicValue(char, 'dexterity'));
			target = 0;
			result = 'success';
			setParticipantInitiative(char.id, roll, modifier);
		} else if (skillId) {
			target = getSkillCheckTarget(char, skillId);
			const entered = await requestDie(100, 'Запрос мастера: проверка', target);
			if (entered === null) return;
			roll = entered;
			modifier = 0;
			result = classifyRoll(roll, target);
		} else return;

		submitResult({
			characterId: char.id,
			characterName: char.name,
			roll,
			target,
			modifier,
			result,
			timestamp: Date.now()
		});
		session = getSession();
	}

	async function rollSkill(skillId: string, skillName: string, checkContext?: string) {
		if (!char) return;
		const target = getSkillCheckTarget(char, skillId, condMods, checkContext);
		const roll = await requestDie(100, skillName, target);
		if (roll === null) return;
		const result = classifyRoll(roll, target);
		lastRoll = { skill: skillName, roll, target, result };
		publishToActiveRoom(char.name || 'Безымянный', 'skill', { skillName, roll, target, result });
	}

	async function rollCharacteristicCheck(charId: string, charName: string) {
		if (!char) return;
		const value = getCharacteristicValue(char, charId, condMods) + (condMods.saves ?? 0);
		const target = Math.min(95, Math.max(0, value));
		const roll = await requestDie(100, charName, target);
		if (roll === null) return;
		const result = classifyRoll(roll, target);
		lastCharCheck = { charId, charName, roll, target, result };
		publishToActiveRoom(char.name || 'Безымянный', 'characteristic', { charName, roll, target, result });
	}

	// ────────────────────────────────────────────
	// ПРОКРУТКА (функции для HTML, объявленные ниже — на случай если Svelte ругается)
	// ────────────────────────────────────────────
	function openItemPicker() { showItemPicker = true; }
	function closeItemPicker() { showItemPicker = false; }
</script>
<style>
	@media print {
		button:not(.print-characteristic),
		nav,
		.sheet-nav,
		header .flex.gap-2,
		.no-print {
			display: none !important;
		}

		:global(body), :global(main) {
			background: #fff !important;
			color: #000 !important;
			padding: 0 !important;
			margin: 0 !important;
		}

		@page {
			size: A4;
			margin: 12mm;
		}

		button.print-characteristic {
			display: block !important;
			width: 100% !important;
			color: #000 !important;
			cursor: default !important;
		}

		section {
			break-inside: avoid;
			page-break-inside: avoid;
		}

		h1, h2, h3 {
			break-after: avoid;
			page-break-after: avoid;
		}

		.border, .border-2 {
			border-color: #999 !important;
		}
		.bg-gray-50, .bg-blue-50, .bg-red-50, .bg-green-50,
		.bg-amber-50, .bg-purple-50 {
			background: #fff !important;
		}

		.print-hide {
			display: none !important;
		}
	}
</style>
<main class="character-sheet max-w-4xl mx-auto p-6 space-y-6" data-decay-stage={decayLevel}>
	{#if pendingDie}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print-hide" role="presentation">
			<div class="w-full max-w-sm rounded-xl border border-gray-500 bg-white p-6 shadow-2xl text-gray-900" role="dialog" aria-modal="true" aria-label="Ввод физического броска">
			<form onsubmit={(event) => { event.preventDefault(); submitManualDie(); }}>
				<h2 class="text-xl font-bold mb-2">Физический бросок к{pendingDie.sides}</h2>
				<p class="mb-2">{pendingDie.label}</p>
				{#if pendingDie.target !== undefined}<p class="mb-3 text-sm">Цель с бонусами и сложностью: ≤ {pendingDie.target}</p>{/if}
				<label class="block text-sm font-semibold" for="manual-die-value">Что выпало на кубике?</label>
				<input id="manual-die-value" class="mt-1 w-full rounded border border-gray-400 p-3 text-lg" type="number" min="1" max={pendingDie.sides} step="1" required bind:value={manualDieValue} />
				{#if manualDieError}<p class="mt-2 text-red-700" role="alert">{manualDieError}</p>{/if}
				<div class="mt-4 flex gap-2">
					<button type="submit" class="rounded bg-green-700 px-4 py-2 text-white font-semibold">Ввод</button>
					<button type="button" class="rounded border border-gray-400 px-4 py-2" onclick={cancelManualDie}>Отмена</button>
				</div>
			</form>
			</div>
		</div>
	{/if}
	{#if loading}
		<p class="text-gray-500">Загрузка…</p>
			{:else if char}
				{#if activeRoomCode}
			<div class="print-hide border-2 border-amber-400 bg-amber-50 rounded-lg p-3 mb-4 flex justify-between items-center flex-wrap gap-2">
				<div class="text-sm">
					<span class="text-amber-900">🎲 Вы в комнате мастера:</span>
					<span class="font-mono font-bold text-amber-800 ml-2">{activeRoomCode}</span>
					<span class="text-amber-700 ml-2 text-xs">Все броски отправляются в общий стол</span>
				</div>
				<div class="flex gap-2">
					<a
						href={`/room/${activeRoomCode}`}
						class="px-3 py-1 text-xs border border-amber-500 rounded hover:bg-amber-100">
						Перейти в комнату
					</a>
					<button
						class="px-3 py-1 text-xs text-red-700 border border-red-300 rounded hover:bg-red-50"
						onclick={() => { clearCurrentRoom(); activeRoomCode = null; }}>
						Выйти
					</button>
				</div>
			</div>
	{/if}
	{#if combat && combat.active && myCombatParticipant}
				{#if isMyTurnInCombat}
					<div class="print-hide border-2 border-purple-500 bg-purple-100 rounded-lg p-4 mb-4 text-center">
						<div class="text-2xl font-bold text-purple-800">🎲 Твой ход!</div>
						<div class="text-sm text-purple-700 mt-1">
							Раунд {combat.round}. Действуй.
						</div>
					</div>
				{:else}
					<div class="border border-purple-200 bg-purple-50 rounded-lg p-3 mb-4 text-center text-sm text-purple-700">
						Идёт бой. Раунд {combat.round}. Ждём своего хода…
					</div>
				{/if}
			{/if}
		
			{#if activeRequest && char && !activeRequest.results[char.id]}
				<div class="print-hide border-2 border-amber-400 bg-amber-50 rounded-lg p-4 mb-4">
					<div class="flex justify-between items-center gap-3 flex-wrap">
						<div>
							<div class="font-semibold text-amber-900">
								Мастер запросил: {activeRequest.label}
							</div>
							<div class="text-sm text-amber-800">
								{activeRequest.request_type === 'initiative'
									? 'Бросок к20 + модификатор Ловкости'
									: 'Проверка к100 против значения навыка'}
							</div>
						</div>
						<button
							class="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 font-semibold"
							onclick={respondToActiveRequest}>
							🎲 Бросить
						</button>
					</div>
				</div>
			{/if}
		{#if session && char && session.results[char.id]}
			<div class="border border-green-400 bg-green-50 rounded-lg p-3 mb-4 text-sm">
				<span class="text-green-800">✓ Бросок отправлен мастеру:</span>
				<span class="font-semibold">
					{#if session.type === 'initiative'}
						{session.results[char.id].roll + session.results[char.id].modifier}
					{:else}
						{session.results[char.id].roll} / ≤ {session.results[char.id].target}
					{/if}
				</span>
			</div>
		{/if}
		<header class="flex justify-between items-center">
			<div>
				<h1 class="text-3xl font-bold">{char.name || '(без имени)'}</h1>
				<p class="text-gray-600">
					{RACES.find((r) => r.id === char?.raceId)?.name} · {char.level} уровень
					{#if char.backgroundId}
						· {BACKGROUNDS.find((b) => b.id === char?.backgroundId)?.name}
					{/if}
				</p>
					{#if decayLevel > 0}
						<p class="decay-stage-label" aria-live="polite">Тлен · {getDecayStage(char.decay?.points ?? 0).name} · {char.decay?.points ?? 0} ОТ</p>
					{/if}
			</div>
			<div class="flex gap-2">
				<a href="/" class="px-3 py-2 border rounded hover:bg-gray-50">← К списку</a>
				<a
					href="/char/{char.id}/levelup"
					class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold">
					+1 уровень
				</a>
				<button
					class="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 print-hide"
					onclick={printCharacter}
					title="Сохранить в PDF / распечатать">
					🖨 Печать / PDF
				</button>
				<button
					class="px-3 py-2 text-red-600 border border-red-300 rounded hover:bg-red-50"
					onclick={removeChar}>
					Удалить
				</button>
			</div>
		
		</header>
		<div class="print-hide flex items-center gap-3 rounded-lg border border-gray-400 p-3" role="group" aria-label="Режим бросков">
			<span class="font-semibold">Броски:</span>
			<button type="button" aria-pressed={rollMode === 'online'} class:font-bold={rollMode === 'online'} class="rounded border px-3 py-1" onclick={() => setRollMode('online')}>Онлайн · в приложении</button>
			<button type="button" aria-pressed={rollMode === 'offline'} class:font-bold={rollMode === 'offline'} class="rounded border px-3 py-1" onclick={() => setRollMode('offline')}>Офлайн · физические кубики</button>
		</div>
        <nav class="sheet-nav" aria-label="Разделы листа персонажа">
          <a href="#characteristics">Характеристики</a><a href="#resources">Ресурсы</a><a href="#battle">Бой</a><a href="#skills">Навыки</a><a href="#abilities">Умения</a><a href="#spells">Магия</a><a href="#inventory">Инвентарь</a><a href="#personality">Личность</a><a href="#conditions">Состояния</a><a href="#decay">Тлен</a><a href="#rest">Отдых</a>
        </nav>


		<section>
			<h2 id="characteristics" class="text-xl font-semibold mb-3">Характеристики</h2>
			<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
				{#each visibleCharacteristics as c}
					{@const baseVal = getCharacteristicValue(char, c.id)}
					{@const effVal = getCharacteristicValue(char, c.id, condMods)}
					{@const mod = getModifier(effVal)}
					<button
						type="button"
						class="print-characteristic border rounded-lg p-3 text-center bg-white hover:bg-blue-50 hover:border-blue-400 active:scale-95 transition-all cursor-pointer w-full
							{effVal < baseVal ? 'border-red-300 bg-red-50' : effVal > baseVal ? 'border-green-300 bg-green-50' : ''}"
						onclick={() => rollCharacteristicCheck(c.id, c.name)}
						title="Бросить проверку характеристики: к100 ≤ {effVal + (condMods.saves ?? 0)}">
						<div class="text-xs uppercase text-gray-500">{c.short}</div>
						<div class="text-2xl font-bold">
							{effVal}
							{#if effVal !== baseVal}
								<span class="text-xs text-gray-400 line-through ml-1">{baseVal}</span>
							{/if}
						</div>
						<div class="text-sm {effVal < baseVal ? 'text-red-700' : 'text-green-700'}">
							{mod >= 0 ? '+' : ''}{mod}
						</div>
						<div class="text-[10px] text-gray-400 mt-0.5">🎲 к100</div>
					</button>
				{/each}
			</div>
		</section>

		<section>
			<h2 id="resources" class="text-xl font-semibold mb-3">Ресурсы</h2>
			<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
				{#each visibleResources as r}
					{@const max = getResourceMax(char, r.id, condMods)}
					{@const current = getCurrentResource(char, r.id, max)}
						<div class="border rounded-lg p-3 text-center bg-white">
							<div class="text-sm text-gray-500" title={r.short}>{r.name}</div>
							<div class="text-xl font-bold">
								<span class={current < max * 0.3 ? 'text-red-600' : current < max * 0.7 ? 'text-amber-600' : 'text-green-700'}>
									{current}
								</span>
								<span class="text-gray-400 text-sm">/ {max}</span>
							</div>
						<progress class="resource-meter" class:low={current < max * 0.3} max={Math.max(1, max)} value={Math.max(0, Math.min(current, max))} aria-label={r.name}>{current} / {max}</progress>
                        {#if r.id === 'hp' && (char.tempHp ?? 0) > 0}
							<div class="text-xs text-red-700 font-semibold">
								+{char.tempHp} временных
							</div>
						{/if}
													<div class="flex flex-wrap gap-1 mt-1 justify-center">
							{#if r.id === 'hp'}
								<button
									class="px-1.5 text-xs border rounded hover:bg-gray-100"
									onclick={() => applyHpDelta(1)}>+1</button>
								<button
									class="px-1.5 text-xs border rounded hover:bg-gray-100"
									onclick={() => applyHpDelta(-1)}>−1</button>
								<button
									class="px-1.5 text-xs border rounded hover:bg-gray-100"
									onclick={() => applyHpDelta(-5)}>−5</button>
								<button
									class="px-1.5 text-xs border rounded hover:bg-gray-100"
									onclick={() => applyHpDelta(-10)}>−10</button>
								<button
									class="px-1.5 text-xs border rounded hover:bg-gray-100"
									onclick={async () => { if (!char) return; char.currentResources = { ...(char.currentResources ?? {}), hp: max }; char = { ...char }; await saveCharacter($state.snapshot(char) as Character); }}>макс</button>
							{:else}
								<button
									class="px-1.5 text-xs border rounded hover:bg-gray-100"
									onclick={async () => { restoreResource(char!, r.id, 1, max); char = { ...char! }; await saveCharacter($state.snapshot(char!) as Character); }}>+1</button>
								<button
									class="px-1.5 text-xs border rounded hover:bg-gray-100"
									onclick={async () => { spendResource(char!, r.id, 1, max); char = { ...char! }; await saveCharacter($state.snapshot(char!) as Character); }}>−1</button>
								<button
									class="px-1.5 text-xs border rounded hover:bg-gray-100"
									onclick={async () => { restoreResource(char!, r.id, max, max); char = { ...char! }; await saveCharacter($state.snapshot(char!) as Character); }}>макс</button>
							{/if}
						</div>
						</div>
				{/each}
			</div>
		</section>
					<section>
			<h2 id="decay" class="text-xl font-semibold mb-3">Тлен</h2>
			<div class="border rounded-lg bg-white p-4 space-y-2">
				<div class="flex items-baseline justify-between gap-3 flex-wrap">
					<div class="font-semibold">{getDecayStage(char.decay?.points ?? 0).name}</div>
					<div><strong>{char.decay?.points ?? 0}</strong> ОТ</div>
				</div>
				<ul class="list-disc pl-5 text-sm text-gray-700 space-y-1">
					{#each getDecayStage(char.decay?.points ?? 0).effects as effect}<li>{effect}</li>{/each}
				</ul>
				<div class="print-hide border-t pt-3 space-y-2">
					<div class="text-xs text-gray-500">Нежива автоматически добавляет 1 ОТ за каждое сотворение. Другие источники ОТ отмечает Сказитель. Дневной счётчик не ведётся автоматически.</div>
					<div class="flex items-center gap-2 flex-wrap">
						<label class="text-sm" for="decay-change">Изменить ОТ на</label>
						<input id="decay-change" type="number" min="1" step="1" bind:value={decayDelta} class="w-20 border rounded px-2 py-1 text-sm" />
						<button class="px-2 py-1 border rounded" onclick={() => changeDecayPoints(Math.max(1, Math.floor(decayDelta || 1)))}>+ добавить</button>
						<button class="px-2 py-1 border rounded" onclick={() => changeDecayPoints(-Math.max(1, Math.floor(decayDelta || 1)))}>− снять</button>
					</div>
				</div>
			</div>
		</section>

		<section>
			<h2 id="rest" class="text-xl font-semibold mb-3">Отдых</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div class="print-hide border rounded-lg bg-white p-4 flex flex-col">
					<div class="flex justify-between items-start mb-2">
						<div class="font-semibold">Короткий (1 час)</div>
						{#if char.shortRestUsed}
							<span class="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600">использован</span>
						{:else}
							<span class="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">доступен</span>
						{/if}
					</div>
					<p class="text-xs text-gray-500 mb-3">
						Проверка каждой характеристики (к100 ≤ значение). Успех → ½ макс., дубль или крит «1» → ⅔.
						Один раз между продолжительными.
					</p>
					<button
						class="mt-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
						disabled={char.shortRestUsed}
						onclick={shortRest}>
						💤 Короткий отдых
					</button>
				</div>

				<div class="print-hide border rounded-lg bg-white p-4 flex flex-col">
					<div class="font-semibold mb-2">Продолжительный (8 часов)</div>
					<p class="text-xs text-gray-500 mb-3">
						Все ресурсы восстанавливаются полностью. Состояния (Отрава, Хворь, Руда и т.д.)
						<strong>не снимаются</strong>.
					</p>
					<button
						class="mt-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
						onclick={longRest}>
						🌙 Продолжительный отдых
					</button>
				</div>
			</div>
		</section>
		<section>
			<h2 id="conditions" class="text-xl font-semibold mb-3">Состояния</h2>

			<!-- Активные состояния -->
			{#if (char.conditions ?? []).length === 0}
				<p class="text-sm text-gray-500 mb-3">Нет активных состояний.</p>
			{:else}
				<div class="space-y-2 mb-3">
					{#each char.conditions ?? [] as c (c.id)}
						{@const def = findCondition(c.id)}
						{#if def}
							<div class="border-2 rounded-lg p-3 {def.isPositive ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}">
								<div class="flex justify-between items-start mb-2 flex-wrap gap-2">
									<div>
										<div class="font-semibold {def.isPositive ? 'text-green-800' : 'text-red-800'}">
											{def.name}
										</div>
										<div class="text-xs text-gray-600 mt-0.5">{def.effects}</div>
									</div>
									<div class="flex items-center gap-1">
										{#if c.roundsLeft !== null}
											<button
												class="w-6 h-6 border rounded hover:bg-white text-sm"
												onclick={() => adjustConditionRounds(c.id, -1)}
												title="−1 раунд">−</button>
											<span class="text-sm font-mono w-12 text-center">
												{c.roundsLeft} р.
											</span>
											<button
												class="w-6 h-6 border rounded hover:bg-white text-sm"
												onclick={() => adjustConditionRounds(c.id, 1)}
												title="+1 раунд">+</button>
										{:else}
											<span class="text-xs text-gray-500 px-2">∞</span>
										{/if}
										<button
											class="ml-2 text-red-500 hover:text-red-700 px-2 text-xl leading-none"
											onclick={() => removeCondition(c.id)}
											title="Убрать">✕</button>
									</div>
								</div>

								{#if def.save}
									{@const targetA = getConditionSaveTarget(def, false)}
									{@const targetB = def.save.charB ? getConditionSaveTarget(def, true) : null}
									<div class="flex gap-2 flex-wrap mt-2">
										{#if targetA}
											<button
												class="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
												onclick={() => attemptSave(c.id, false)}>
												Избавление: {targetA.label} (≤ {targetA.target})
											</button>
										{/if}
										{#if targetB && targetB.label !== targetA?.label}
											<button
												class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
												onclick={() => attemptSave(c.id, true)}>
												Альт.: {targetB.label} (≤ {targetB.target})
											</button>
										{/if}
									</div>
								{/if}
							</div>
						{/if}
					{/each}
				</div>

				<button
					class="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 mb-3"
					onclick={applyDotDamage}>
					⚡ Применить урон в конце хода (Руда, Горение)
				</button>
			{/if}

			<!-- Результат последнего избавления -->
			{#if lastSave}
				<div class="border rounded-lg p-3 mb-3 {lastSave.success ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}">
					<div class="flex justify-between items-start">
						<div class="text-sm">
							<strong>{lastSave.condition}</strong>:
							к100 = <span class="font-mono">{lastSave.roll}</span> ≤ {lastSave.target} —
							<span class="font-semibold {lastSave.success ? 'text-green-700' : 'text-red-700'}">
								{lastSave.success ? 'Избавление успешно — состояние снято' : 'Провал'}
							</span>
						</div>
						<button
							class="text-gray-500 hover:text-gray-700 px-1"
							onclick={() => (lastSave = null)}>✕</button>
					</div>
				</div>
			{/if}

			<!-- Добавить состояние -->
			{#if !showConditionPicker}
				<button
					class="px-3 py-1.5 text-sm border-2 border-dashed rounded hover:bg-gray-50"
					onclick={() => (showConditionPicker = true)}>
					+ Добавить состояние
				</button>
			{:else}
				<div class="border rounded-lg p-3 bg-blue-50">
					<div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
						<div class="md:col-span-2">
							<label for="field-1" class="block text-xs text-gray-500 mb-1">Состояние</label>
							<select id="field-1" bind:value={newConditionId}
								class="w-full px-2 py-1 border rounded text-sm">
								<option value="">— выберите —</option>
								{#each CONDITIONS as def}
									<option value={def.id}>
										{def.isPositive ? '🟢' : '🔴'} {def.name} — {def.effects}
									</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="field-2" class="block text-xs text-gray-500 mb-1">Раундов</label>
							<input id="field-2"
								type="number"
								bind:value={newConditionRounds}
								placeholder="авто"
								class="w-full px-2 py-1 border rounded text-sm" />
						</div>
					</div>
					<div class="flex gap-2">
						<button
							class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300"
							disabled={!newConditionId}
							onclick={async () => {
								const def = findCondition(newConditionId);
								if (!def) return;
								const rounds = newConditionRounds !== null && newConditionRounds !== 0
									? newConditionRounds
									: def.defaultRounds;
								await addCondition(newConditionId, rounds);
								newConditionId = '';
								newConditionRounds = null;
								showConditionPicker = false;
							}}>
							Добавить
						</button>
						<button
							class="px-3 py-1.5 border rounded text-sm hover:bg-white"
							onclick={() => { showConditionPicker = false; newConditionId = ''; newConditionRounds = null; }}>
							Отмена
						</button>
					</div>
				</div>
			{/if}
		</section>
		{#if lastRest}
			<section class="border-2 border-blue-400 rounded-lg bg-blue-50 p-4">
				<div class="flex justify-between items-start mb-2">
					<div class="font-semibold">
						{lastRest.type === 'short' ? '💤 Результат короткого отдыха' : '🌙 Продолжительный отдых'}
					</div>
					<button
						class="text-gray-500 hover:text-gray-700 px-2"
						onclick={() => (lastRest = null)}>✕</button>
				</div>

				{#if lastRest.type === 'short' && lastRest.results.length > 0}
					<table class="w-full text-xs">
						<thead class="bg-white/60">
							<tr>
								<th class="text-left px-2 py-1">Ресурс</th>
								<th class="text-left px-2 py-1">Проверка</th>
								<th class="text-right px-2 py-1">Восстановлено</th>
								<th class="text-right px-2 py-1">Итог</th>
							</tr>
						</thead>
						<tbody>
							{#each lastRest.results.filter((entry) => !hideReligion || entry.resource !== 'grace') as r}
								<tr class="border-b border-blue-200">
									<td class="px-2 py-1 font-semibold">{r.short}</td>
									<td class="px-2 py-1 text-gray-600">
										к100 = <span class="font-mono">{r.roll}</span> ≤ {r.charValue} ({r.charShort}) —
										<span class="font-semibold
											{r.resultLabel.includes('Успех') ? 'text-green-700' :
											 r.resultLabel.includes('Правь') || r.resultLabel.includes('Явь') ? 'text-blue-700' :
											 'text-red-600'}">
											{r.resultLabel}
										</span>
									</td>
									<td class="px-2 py-1 text-right font-mono">+{r.restored}</td>
									<td class="px-2 py-1 text-right font-mono">
										{r.before} → <span class="font-bold">{r.after}</span>
										<span class="text-gray-400">/ {r.max}</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else if lastRest.type === 'long'}
					<p class="text-sm text-blue-900">
						Все ресурсы восстановлены полностью. Короткий отдых снова доступен.
					</p>
				{/if}
			</section>
		{/if}
				{#if char.resourceRolls && Object.values(char.resourceRolls).some((arr) => arr.length > 0)}
			<section>
				<details class="border rounded-lg bg-white">
					<summary class="px-4 py-2 cursor-pointer font-semibold hover:bg-gray-50">
						История прокачки (по уровням)
					</summary>
					<div class="p-4 space-y-2">
						{#each visibleResources as r}
							{@const history = char.resourceRolls?.[r.id] ?? []}
							{#if history.length > 0}
								<div class="flex items-center gap-3 text-sm">
									<span class="font-mono w-12 text-gray-500">{r.short}</span>
									<span class="text-gray-600">
										{history.length} {history.length === 1 ? 'бросок' : 'бросков'}:
									</span>
									<span class="font-mono">
										{history.map((v, i) => i === history.length - 1 ? `+${v}` : `+${v}, `).join('')}
									</span>
									<span class="text-gray-400">
										= +{history.reduce((a, b) => a + b, 0)}
									</span>
								</div>
							{/if}
						{/each}
					</div>
				</details>
			</section>
		{/if}
		<section>
			<h2 id="battle" class="text-xl font-semibold mb-3">Бой</h2>

			<!-- Прыть -->
			<div class="border rounded-lg p-4 bg-white mb-3">
				<div class="flex items-center gap-3 flex-wrap">
					<span class="font-semibold">Прыть:</span>
					<span class="text-sm text-gray-600">d20 + мод ЛОВ</span>

					{#if session && session.type === 'initiative'}
						{@const myResult = session.results[char.id]}
						{#if myResult}
							<span class="text-2xl font-bold text-purple-700">
								{myResult.roll + myResult.modifier}
							</span>
							<span class="text-xs text-gray-500">
								({myResult.roll}+{myResult.modifier})
							</span>
						{:else}
							<button
								class="px-4 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 font-semibold"
								onclick={respondToRequest}>
								🎲 Бросить (по запросу мастера)
							</button>
						{/if}
					{:else}
						<button
							class="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
							onclick={rollInit}>
							Бросить d20
						</button>
						{#if lastInitiative}
							<span class="text-lg">
								<span class="font-mono">{lastInitiative.roll}</span>
								<span class="text-gray-400"> + </span>
								<span class="text-green-700">{lastInitiative.mod}</span>
								<span class="text-gray-400"> = </span>
								<span class="text-2xl font-bold">{lastInitiative.total}</span>
							</span>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Экипировка -->
			<div class="border rounded-lg p-4 bg-white mb-3">
				<h3 class="font-semibold mb-3">Экипировка</h3>
				<div class="grid grid-cols-3 gap-3">
					<div>
						<label for="field-3" class="block text-xs text-gray-500 mb-1">Оружие</label>
						<select id="field-3"
							value={char.equipment?.weaponId ?? ''}
							onchange={(e) => updateEquipment('weaponId', (e.currentTarget as HTMLSelectElement).value)}
							class="w-full px-2 py-1 border rounded text-sm">
							<option value="">— выберите —</option>
							{#each WEAPONS as w}
								<option value={w.id}>{w.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="field-4" class="block text-xs text-gray-500 mb-1">Доспех</label>
						<select id="field-4"
							value={char.equipment?.armorId ?? 'none'}
							onchange={(e) => updateEquipment('armorId', (e.currentTarget as HTMLSelectElement).value)}
							class="w-full px-2 py-1 border rounded text-sm">
							{#each ARMORS as a}
								<option value={a.id}>{a.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="field-5" class="block text-xs text-gray-500 mb-1">Щит</label>
						<select id="field-5"
							value={char.equipment?.shieldId ?? 'none'}
							onchange={(e) => updateEquipment('shieldId', (e.currentTarget as HTMLSelectElement).value)}
							class="w-full px-2 py-1 border rounded text-sm">
							{#each SHIELDS as s}
								<option value={s.id}>{s.name}</option>
							{/each}
						</select>
					</div>
				</div>

				
				<div class="mt-3 text-sm text-gray-600">
					Своя Броня:
					<span class="font-semibold">{armorInfo.total}</span>
					<span class="text-gray-400">
						(мод ЛОВ {armorInfo.dexMod}
						{#if armorInfo.armor > 0}+ доспех {armorInfo.armor}{/if}
						{#if armorInfo.shield > 0}+ щит {armorInfo.shield}{/if})
					</span>
									{#if arrowsCount > 0}
					<div class="mt-1 text-sm text-gray-600">
						Стрелы в инвентаре: <strong>{arrowsCount}</strong> шт.
					</div>
				{/if}
				</div>
			</div>

			<!-- Атака -->
						{#if currentWeapon}
				<div class="print-hide border rounded-lg p-4 bg-white">
					<h3 class="font-semibold mb-3">Атака: {currentWeapon.name}</h3>
					{#if combat?.active && enemiesInCombat.length > 0}
						<div class="mb-3 p-3 border-2 border-red-300 rounded bg-red-50">
							<label for="field-6" class="block text-xs text-red-700 font-semibold mb-1">
								🎯 Цель (активен бой)
							</label>
							<select id="field-6"
								bind:value={targetEnemyId}
								class="w-full px-3 py-2 border rounded text-sm">
								<option value={null}>— выберите врага —</option>
								{#each enemiesInCombat as e}
									<option value={e.id}>
										{e.name} · Броня {e.armor} · ЖВЧ {e.currentHp}/{e.maxHp}
									</option>
								{/each}
							</select>
							{#if targetEnemyId}
								<div class="text-xs text-red-700 mt-1">
									Урон уйдёт автоматически при попадании.
								</div>
							{:else}
								<div class="text-xs text-gray-500 mt-1">
									Без выбора цели урон не будет списан.
								</div>
							{/if}
						</div>
					{/if}
					<div class="grid grid-cols-3 gap-3 mb-3">
						<div>
							<label for="field-7" class="block text-xs text-gray-500 mb-1">Тип атаки</label>
							<select id="field-7" bind:value={attackType} class="w-full px-2 py-1 border rounded text-sm">
								<option value="normal">{ATTACK_TYPE_LABEL.normal}</option>
								<option value="strong">{ATTACK_TYPE_LABEL.strong}</option>
								<option value="fast">{ATTACK_TYPE_LABEL.fast}</option>
							</select>
						</div>
						<div>
							<label for="field-8" class="block text-xs text-gray-500 mb-1">Броня цели</label>
							<input id="field-8"
								type="number"
								bind:value={targetArmor}
								class="w-full px-2 py-1 border rounded text-sm" />
						</div>
						<div>
							{#if currentWeapon.damageTwoHands}
								<span class="block text-xs text-gray-500 mb-1">Две руки</span>
								<label class="flex items-center gap-1 text-sm mt-1">
									<input type="checkbox" bind:checked={useTwoHandsWeapon} />
									<span>да</span>
								</label>
							{/if}
						</div>
					</div>

					{#if attackInfo}
						<div class="text-sm text-gray-600 mb-3">
							Цель атаки:
							<span class="text-2xl font-bold text-blue-700">{attackInfo.target}</span>
							<span class="text-xs text-gray-500">
								({attackInfo.parts.map((p) => `${p.value >= 0 ? '+' : ''}${p.value} ${p.label}`).join(' ')})
							</span>
						</div>
					{/if}

					<button
						class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
						onclick={attack}>
						Атаковать (к100)
					</button>

										{#if lastAttack}
						<div class="mt-4 p-3 border-2 rounded bg-gray-50">
							<div class="text-sm text-gray-500">Последняя атака</div>
							<div class="text-lg font-semibold">
								{lastAttack.weapon}
								{#if lastAttack.attacks.length > 1}<span class="text-xs text-gray-500">({lastAttack.attacks.length} удара)</span>{/if}
							</div>

							{#each lastAttack.attacks as atk, idx}
								<div class="mt-3 pt-3 {idx > 0 ? 'border-t' : ''}">
									<div class="text-sm font-semibold text-gray-700">Удар {idx + 1}</div>
									<div class="text-lg mt-1">
										Выпало <span class="font-bold">{atk.roll}</span>, цель ≤ {atk.target} —
										<span class={attackOutcomeColor[atk.outcome]}>{attackOutcomeLabel[atk.outcome]}</span>
					</div>
					{#if atk.effect}
						<div class="mt-1 rounded bg-amber-50 border border-amber-200 p-2 text-sm text-amber-900">
							{atk.effect.table} · к{atk.effect.table === 'Явь' ? 10 : 12}: {atk.effect.roll} — {atk.effect.label}
						</div>
					{/if}
									{#if atk.damage}
										<div class="mt-1">
											<span class="text-sm text-gray-500">Урон: </span>
											<span class="text-2xl font-bold text-red-700">{atk.damage.total}</span>
											<div class="text-xs text-gray-500">
												{atk.damage.diceCount}d{atk.damage.diceSides}
												{#if atk.damage.extraDice > 0}
													<span class="text-green-700">(+{atk.damage.extraDice} от силовой)</span>
												{/if}
												= [{atk.damage.rolls.join(', ')}]
												{#if atk.damage.extraRolls}
													{#each atk.damage.extraRolls as er}
														+ {er.diceCount}d{er.diceSides} ({er.label}) = [{er.rolls.join(', ')}]
													{/each}
												{/if}
												+ {atk.damage.modValue} мод.
												{#if atk.damage.abilityBonus > 0}+ {atk.damage.abilityBonus} от умений{/if}
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else}
				<p class="text-gray-500 text-sm">Выберите оружие в экипировке, чтобы начать бой.</p>
			{/if}
		</section>
				<!-- ГРАНЬ -->
		{#if atDeathsDoor || lastEdgeResult || (char.death?.debtMark ?? 0) > 0 || char.death?.metkaNavi || char.tempHp > 0}
			<section>
				<h2 class="text-xl font-semibold mb-3">Грань</h2>

				<!-- Красный баннер при смерти -->
				{#if atDeathsDoor}
					<div class="border-2 border-red-500 bg-red-100 rounded-lg p-4 mb-3">
						<div class="font-bold text-red-800 text-lg mb-1">⚠ При смерти</div>
						<p class="text-sm text-red-700 mb-3">
							Жвч = 0. В начале каждого хода выбери одно из действий. Каждое доступно один раз за бой.
						</p>
						<div class="grid grid-cols-1 md:grid-cols-3 gap-2">
							<button
								class="px-3 py-2 bg-red-700 text-white rounded hover:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-semibold"
								disabled={char.death?.usedVoiceOfBlood}
								onclick={voiceOfBlood}>
								🩸 Голос Крови<br />
								<span class="text-xs font-normal">временные Жвч</span>
								{#if char.death?.usedVoiceOfBlood}<br /><span class="text-xs">использован</span>{/if}
							</button>
							<button
								class="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-semibold"
								disabled={char.death?.usedCallOfZhiva}
								onclick={callOfZhiva}>
								💚 Зов Живы<br />
								<span class="text-xs font-normal">долг перед Живой</span>
								{#if char.death?.usedCallOfZhiva}<br /><span class="text-xs">использован</span>{/if}
							</button>
							<button
								class="px-3 py-2 bg-purple-700 text-white rounded hover:bg-purple-800 text-sm font-semibold"
								onclick={holdOn}>
								🎲 Удержаться<br />
								<span class="text-xs font-normal">Сила + Стойкость</span>
							</button>
						</div>
					</div>
				{/if}

				<!-- Временные Жвч -->
				{#if (char.tempHp ?? 0) > 0}
					<div class="border-2 border-red-400 bg-red-50 rounded-lg p-3 mb-3 flex justify-between items-center">
						<div>
							<span class="font-semibold text-red-800">Временные Жвч: {char.tempHp}</span>
							<div class="text-xs text-red-700">
								Кончатся при получении урона — снова «при смерти».
							</div>
						</div>
						<button
							class="text-xs px-2 py-1 border rounded hover:bg-white"
							onclick={clearTempHp}>Убрать</button>
					</div>
				{/if}

				<!-- Метка Долга Живе -->
				{#if (char.death?.debtMark ?? 0) > 0}
					<div class="border border-orange-300 bg-orange-50 rounded-lg p-3 mb-3 text-sm">
						<strong class="text-orange-800">Долг Живе:</strong>
						<span class="ml-1">{char.death.debtMark} метк{char.death.debtMark === 1 ? 'а' : 'и'}</span>
						<span class="text-xs text-orange-700 ml-1">(−{char.death.debtMark * 5} к максимуму Жвч)</span>
					</div>
				{/if}

				<!-- Метка Нави -->
				<div class="border rounded-lg p-3 mb-3 bg-white">
					<label class="flex items-center gap-2 text-sm cursor-pointer">
						<input
							type="checkbox"
							checked={char.death?.metkaNavi ?? false}
							onchange={toggleMetkaNavi} />
						<span>
							<strong>Метка Нави</strong>
							<span class="text-xs text-gray-500 block">
								−10% к восстановлению живы, социальные штрафы,
								нежить не атакует первой, +5 к проверке «Удержаться».
							</span>
						</span>
					</label>
				</div>

				<!-- Результат последнего действия -->
				{#if lastEdgeResult}
					<div class="border rounded-lg p-3 {lastEdgeResult.success === false ? 'bg-red-50 border-red-300' : lastEdgeResult.success === true ? 'bg-green-50 border-green-300' : 'bg-blue-50 border-blue-300'}">
						<div class="flex justify-between items-start">
							<div>
								<div class="font-semibold">{lastEdgeResult.action}</div>
								{#if lastEdgeResult.roll !== undefined}
									<div class="text-sm mt-1">
										к100 = <span class="font-mono">{lastEdgeResult.roll}</span> ≤ {lastEdgeResult.target} —
										<span class="font-semibold">
											{lastEdgeResult.success ? 'Успех' : 'Провал'}
										</span>
									</div>
								{/if}
								<div class="text-sm mt-1 text-gray-700">{lastEdgeResult.description}</div>
							</div>
							<button
								class="text-gray-500 hover:text-gray-700 px-1"
								onclick={() => (lastEdgeResult = null)}>✕</button>
						</div>
					</div>
				{/if}

				<!-- Кнопки управления -->
				<div class="mt-3 flex gap-2 flex-wrap">
					<button
						class="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
						onclick={resetEdge}>
						↻ Сбросить состояние Грани (после боя)
					</button>
					<button
						class="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
						onclick={helpAlly}>
						🩹 Проверка Восстановления (помощь союзнику)
					</button>
				</div>
			</section>
		{/if}
				{#if lastCharCheck}
			<section class="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
				<div class="flex justify-between items-start">
					<div>
						<div class="text-sm text-gray-500">Проверка характеристики (Избавление)</div>
						<div class="text-lg font-semibold">{lastCharCheck.charName}</div>
						<div class="text-2xl mt-1">
							Выпало <span class="font-bold">{lastCharCheck.roll}</span>,
							цель ≤ {lastCharCheck.target} —
							<span class="font-bold {resultColor[lastCharCheck.result]}">{resultLabel[lastCharCheck.result]}</span>
						</div>
						{#if (condMods.saves ?? 0) !== 0}
							<div class="text-xs text-red-700 mt-1">
								Учтён модификатор от состояний: {condMods.saves}
							</div>
						{/if}
					</div>
					<button
						class="text-gray-500 hover:text-gray-700 px-2 text-xl leading-none"
						onclick={() => (lastCharCheck = null)}>✕</button>
				</div>
			</section>
		{/if}
		{#if lastRoll}
			<section class="border-2 rounded-lg p-4 bg-white">
				<div class="text-sm text-gray-500">Последний бросок навыка</div>
				<div class="text-lg font-semibold">{lastRoll.skill}</div>
				<div class="text-2xl mt-1">
					Выпало <span class="font-bold">{lastRoll.roll}</span>, цель ≤ {lastRoll.target} —
					<span class="font-bold {resultColor[lastRoll.result]}">{resultLabel[lastRoll.result]}</span>
				</div>
			</section>
		{/if}

		{#if lastCast && (!hideReligion || lastCast.resource !== 'grace')}
			<section class="border-2 rounded-lg p-4 bg-white space-y-2">
				<div>
					<div class="text-sm text-gray-500">Последняя магическая атака</div>
					<div class="text-lg font-semibold">{lastCast.spell}</div>
				</div>
				<div class="text-lg">
					<div class="text-sm text-gray-500">Бросок атаки = попадание</div>
					Выпало <span class="font-bold">{lastCast.roll}</span>, цель ≤ {lastCast.target} —
					<span class="font-bold {lastCast.outcome === 'success' || lastCast.outcome === 'critical_success' ? 'text-green-700' : 'text-red-700'}">
						{spellOutcomeLabel[lastCast.outcome]}
					</span>
				</div>
				{#if lastCast.effect}
					<div class="border-t pt-2">
						<div class="text-sm text-gray-500">
							Бросок эффекта
							{#if lastCast.effect.typeLabel}— {lastCast.effect.typeLabel}{/if}
						</div>
						<div class="text-2xl font-bold text-blue-700">
							{lastCast.effect.total}
						</div>
						<div class="text-xs text-gray-500">
							{lastCast.effect.diceCount}к{lastCast.effect.diceSides}
							{#if lastCast.effect.extraDice > 0}
								<span class="text-green-700">(+{lastCast.effect.extraDice} от умений)</span>
							{/if}
							= [{lastCast.effect.rolls.join(', ')}]
							{#if lastCast.effect.modValue !== 0}
								+ {lastCast.effect.modValue}
								мод. {lastCast.effect.modId === 'religion' ? 'Религии' : 'Интеллекта'}
							{/if}
							{#if lastCast.effect.abilityBonus > 0}+ {lastCast.effect.abilityBonus} от умений{/if}
						</div>
					</div>
				{/if}
				{#if lastCast.decayGained}
					<div class="text-sm text-purple-800 border-t pt-2">Получено: +{lastCast.decayGained} ОТ за использование Неживы.</div>
				{/if}
				{#if lastCast.cost}
					<div class="text-sm text-gray-600 border-t pt-2">
						Потрачено: <span class="font-semibold">{lastCast.cost}</span>
						{lastCast.resource === 'grace' ? 'благодати' : 'живы'}
					</div>
				{/if}
				{#if (lastCast as any).damageApplied > 0}
					<div class="text-sm text-red-700 border-t pt-2">
						Урон цели: <span class="font-bold">{(lastCast as any).damageApplied}</span>
					</div>
				{/if}
			</section>
		{/if}

		<section>
			<h2 id="skills" class="text-xl font-semibold mb-3">Навыки</h2>
			{#if (condMods.skills ?? 0) !== 0 || (condMods.attacks ?? 0) !== 0 || (condMods.armor ?? 0) !== 0}
				<div class="mb-3 p-2 rounded bg-red-50 border border-red-300 text-sm">
					<strong class="text-red-800">Штрафы от состояний:</strong>
					{#if condMods.attacks}<span class="ml-2 text-red-700">Атаки {condMods.attacks}</span>{/if}
					{#if condMods.skills}<span class="ml-2 text-red-700">Проверки {condMods.skills}</span>{/if}
					{#if condMods.saves}<span class="ml-2 text-red-700">Избавления {condMods.saves}</span>{/if}
					{#if condMods.armor}<span class="ml-2 text-red-700">Броня {condMods.armor}</span>{/if}
					{#if condMods.speed}<span class="ml-2 text-red-700">Скорость {condMods.speed}</span>{/if}
					{#if condMods.skipTurn}<span class="ml-2 text-red-700 font-bold">Пропуск хода</span>{/if}
				</div>
			{/if}
			<table class="w-full text-sm bg-white border rounded-lg overflow-hidden">
				<thead class="bg-gray-100">
					<tr>
						<th class="text-left px-3 py-2">Навык</th>
						<th class="text-right px-3 py-2">Значение</th>
						<th class="text-right px-3 py-2">Цель к100</th>
						<th class="px-3 py-2"></th>
					</tr>
				</thead>
				<tbody>
					{#each visibleSkills as s}
						{@const total = getSkillTotal(char, s.id, condMods)}
						{@const target = getSkillCheckTarget(char, s.id, condMods)}
						{@const bonusDetails = getSkillBonusDetails(char, s.id)}
						{@const bonusSum = bonusDetails.reduce((a, b) => a + b.value, 0)}
						{@const trackingBonus = s.id === 'perception' ? getSkillBonusDetails(char, s.id, 'tracking').reduce((a, b) => a + b.value, 0) - bonusSum : 0}
						{@const trackingTarget = s.id === 'perception' ? getSkillCheckTarget(char, s.id, condMods, 'tracking') : target}
						<tr class="border-t hover:bg-gray-50">
							<td class="px-3 py-1">
								{s.name}
								{#if bonusSum !== 0}
									<span class="ml-2 text-xs text-green-700">
										+{bonusSum}
										{#each bonusDetails as d, i}
											{#if i === 0} (от умений: {:else}, {/if}
											{d.name} +{d.value}
										{/each})
									</span>
								{/if}
							</td>
							<td class="px-3 py-1 text-right">{total >= 0 ? '+' : ''}{total}</td>
							<td class="px-3 py-1 text-right text-gray-500">≤ {target}</td>
							<td class="px-3 py-1 text-right">
								<button
									class="px-2 py-0.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
									onclick={() => rollSkill(s.id, s.name)}>
									к100
								</button>
								{#if trackingBonus > 0}
									<button
										class="px-2 py-0.5 bg-green-700 text-white text-xs rounded hover:bg-green-800"
										title="Проверка Наблюдательности при поиске следов: ≤ {trackingTarget}"
										onclick={() => rollSkill(s.id, `${s.name} (поиск следов)`, 'tracking')}>
										Следы +{trackingBonus}
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>

		<section>
			<h2 id="personality" class="text-xl font-semibold mb-3">Личность</h2>

			<!-- Вдохновение -->
			<div class="border rounded-lg bg-white p-4 mb-4">
				<div class="flex justify-between items-center mb-2">
					<div class="font-semibold">Вдохновение</div>
					<div class="text-sm text-gray-500">{char.inspiration} из 3</div>
				</div>
				<div class="flex gap-2">
					{#each [0, 1, 2] as i}
						<button
							class="w-8 h-8 rounded-full border-2 transition-colors
								{i < char.inspiration ? 'bg-amber-400 border-amber-500' : 'bg-white border-gray-300 hover:border-amber-300'}"
							onclick={() => setInspiration(i + 1)}
							title="Установить {i + 1}">
						</button>
					{/each}
					<button
						class="ml-2 text-xs px-2 py-1 border rounded hover:bg-gray-50"
						onclick={() => setInspiration(0)}>Сброс</button>
				</div>
				<p class="text-xs text-gray-500 mt-2">
					Траты: перебросить проверку (Характер), +10 к проверке (Идеал),
					автоуспех при Сл ≤ 42 (Привязанность). Сопротивление Слабости восстанавливает 1.
				</p>
			</div>

			<!-- Четыре аспекта -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each [
					{ field: 'personality', title: 'Характер',   list: PERSONALITY_TRAITS },
					{ field: 'ideal',       title: 'Идеал',      list: IDEALS },
					{ field: 'bond',        title: 'Привязанность', list: BONDS },
					{ field: 'flaw',        title: 'Слабость',   list: FLAWS }
				] as const as entry}
					{@const religiousBond = hideReligion && entry.field === 'bond' && char.bio.bondKey === 'deity'}
					<div class="border rounded-lg bg-white p-4">
						<label for={"personality-" + entry.field} class="block font-semibold mb-2">{entry.title}</label>
						<select id={"personality-" + entry.field}
							class="w-full px-3 py-2 border rounded mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							value={religiousBond ? '' : char.bio[`${entry.field}Key` as const]}
							onchange={(e) => selectPersonality(
								entry.field as 'personality' | 'ideal' | 'bond' | 'flaw',
								e.currentTarget.value,
								entry.list
							)}>
							<option value="">— не выбрано —</option>
							{#each entry.list.filter((opt) => !hideReligion || opt.id !== 'deity') as opt}
								<option value={opt.id}>{opt.name}</option>
							{/each}
						</select>
						<textarea
							class="w-full px-3 py-2 border rounded text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
							aria-label={`Описание: ${entry.title}`} placeholder="Описание или своя формулировка"
							value={religiousBond ? '' : char.bio[`${entry.field}Text` as const]}
							onblur={(e) => updateBio({
								[`${entry.field}Text`]: e.currentTarget.value
							} as Partial<Character['bio']>)}></textarea>
					</div>
				{/each}
			</div>

			<!-- Цели и предыстория -->
			<div class="border rounded-lg bg-white p-4 mt-4 space-y-4">
				<div>
					<label for="field-10" class="block font-semibold mb-2">Цели</label>
					<textarea id="field-10"
						class="w-full px-3 py-2 border rounded text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Например: найти способ снять Тлен, вернуть право умереть, отомстить за деревню…"
						value={char.bio.goals}
						onblur={(e) => updateBio({ goals: e.currentTarget.value })}></textarea>
				</div>
				<div>
					<label for="field-11" class="block font-semibold mb-2">Предыстория</label>
					<textarea id="field-11"
						class="w-full px-3 py-2 border rounded text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Кем был персонаж до приключений, что привело его в путь…"
						value={char.bio.backstory}
						onblur={(e) => updateBio({ backstory: e.currentTarget.value })}></textarea>
				</div>
				<div>
					<label for="field-12" class="block font-semibold mb-2">Внешность</label>
					<textarea id="field-12"
						class="w-full px-3 py-2 border rounded text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Как выглядит персонаж, во что одет, какие приметы…"
						value={char.bio.appearance}
						onblur={(e) => updateBio({ appearance: e.currentTarget.value })}></textarea>
				</div>
			</div>
		</section>
		<section>
			<div class="flex justify-between items-center mb-3 flex-wrap gap-2">
				<h2 id="spells" class="text-xl font-semibold">Заклинания</h2>
				{#if !hideReligion}
				<label class="flex items-center gap-2 text-sm px-3 py-1.5 border rounded hover:bg-gray-50 cursor-pointer">
					<input
						type="checkbox"
						checked={canUseGraceWithDecay(char.decay?.points ?? 0) && char.useGraceForSpells}
						disabled={!canUseGraceWithDecay(char.decay?.points ?? 0)}
						onchange={async (e) => {
							if (!canUseGraceWithDecay(char!.decay?.points ?? 0)) return;
							char!.useGraceForSpells = (e.currentTarget as HTMLInputElement).checked;
							await toggleGraceMode(char!);
							char = { ...char! };
						}} />
					<span>
						Творить <span class="font-semibold {char.useGraceForSpells && canUseGraceWithDecay(char.decay?.points ?? 0) ? 'text-purple-700' : 'text-blue-700'}">
							{char.useGraceForSpells && canUseGraceWithDecay(char.decay?.points ?? 0) ? 'Благодатью' : 'Живой'}
						</span>
					</span>
				</label>
				{/if}
			</div>
			{#if decayLevel === 3}
				<p class="text-sm mb-3">Тлен не позволяет использовать Благодать. Заклинания за Живу остаются доступны.</p>
			{/if}
						{#if combat?.active && enemiesInCombat.length > 0}
				<div class="mb-3 p-3 print-hide border-2 border-red-300 rounded bg-red-50">
					<label for="field-13" class="block text-xs text-red-700 font-semibold mb-1">
						🎯 Цель заклинания (активен бой)
					</label>
					<select id="field-13"
						bind:value={targetEnemyId}
						class="w-full px-3 py-2 border rounded text-sm">
						<option value={null}>— выберите врага —</option>
						{#each enemiesInCombat as e}
							<option value={e.id}>
								{e.name} · Броня {e.armor} · ЖВЧ {e.currentHp}/{e.maxHp}
							</option>
						{/each}
					</select>
					<div class="text-xs text-gray-500 mt-1">
						{#if targetEnemyId}
							Магическая атака учитывает Броню цели; урон спишется только при попадании.
						{:else}
							Без выбранной цели бросок не вычитает Броню и урон не будет списан.
						{/if}
					</div>
				</div>
			{/if}
						<div class="space-y-3">
				{#each visibleSpellSchools as [schoolId, _spells]}
					{@const schoolLevel = getSpellSkillLevel(char, schoolId)}
					{@const maxSpellLevel = getMaxSpellLevel(char, schoolId)}
					{@const schoolSkill = SKILLS.find((s) => s.id === schoolId)}
					{@const castTarget = getSpellCastTarget(char, schoolId)}
					{@const spellList = getSpellsWithAccess(char, schoolId)}
					{@const stability = SCHOOL_STABILITY_THRESHOLDS[schoolId] ?? 36}
					{@const stable = isSchoolStable(char, schoolId)}
					{@const learnedCount = char.spells.filter((id) => _spells.some((s) => s.id === id)).length}

					<details class="border rounded-lg bg-white" open={false}>
						<summary class="px-4 py-3 cursor-pointer hover:bg-gray-50 flex justify-between items-center flex-wrap gap-2">
							<div class="flex items-center gap-2 flex-wrap">
								<span class="font-semibold">{schoolSkill?.name}</span>
								
								
							</div>
							<div class="text-xs text-gray-500">
								изучено {learnedCount} / {_spells.length}
							</div>
						</summary>
						<div class="border-t">
							{#if !stable}
									<div class="px-4 py-2 bg-red-50 text-xs text-red-700 border-b">
										Характеристика ниже порога стабильности. Пока не достигнешь {stability}+,
										заклинания 0-го уровня требуют <strong>двойной стоимости</strong> и дают <strong>половинный эффект</strong>.
										При провале проверки — магическая осечка: 1к4 урона в живу.
									</div>
								{/if}
								<ul class="divide-y">
									{#each spellList.filter(({ spell }) => !hideReligion || spell.costGrace === undefined) as { spell, available }}
										{@const known = isSpellKnown(char, spell.id)}
										{@const useTwo = twoHands[spell.id] ?? false}
										{@const costOneHand = getSpellCost(char, spell, false)}
										{@const costTwoHands = getSpellCost(char, spell, true)}
										{@const threshold = getSpellLevelThreshold(spell.school, spell.skillLevel)}
										<li class="px-4 py-3 {available ? '' : 'bg-gray-50 opacity-60'}">
											<div class="flex items-center gap-2 mb-1 flex-wrap">
												<span class="text-xs uppercase px-2 py-0.5 rounded
													{available ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-500'}">
													ур. {spell.skillLevel}
													{#if !available && threshold > 0}
														· нужен {threshold}+
													{/if}
												</span>
												<span class="font-medium {available ? '' : 'text-gray-500'}">{spell.name}</span>
												{#if known}
													<span class="text-xs text-green-700">✓ изучено</span>
												{/if}
												{#if !available}
													<span class="text-xs text-red-600 font-semibold">закрыто</span>
												{/if}
												{#if spell.application === 'instant'}<span class="text-xs text-gray-500">мгновенно</span>{/if}
												{#if spell.application === 'hold'}<span class="text-xs text-gray-500">удержание</span>{/if}
												{#if spell.application === 'ritual'}<span class="text-xs text-gray-500">ритуал</span>{/if}
											</div>
											<p class="text-sm text-gray-600 mb-2">{spell.description}</p>
											<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
												{#if spell.costOneHand !== undefined}
																<span>1 рука: <span class="text-blue-700 font-semibold">{costOneHand.reduced}</span> живы
																	{#if costOneHand.reduction > 0}<span class="text-green-700">(−{costOneHand.reduction} от умений)</span>{/if}
													</span>
												{/if}
												{#if spell.costTwoHands !== undefined}
																<span>2 руки: <span class="text-blue-700 font-semibold">{costTwoHands.reduced}</span> живы
																	{#if costTwoHands.reduction > 0}<span class="text-green-700">(−{costTwoHands.reduction} от умений)</span>{/if}
																</span>
												{/if}
												{#if spell.costGrace !== undefined}
													<span>{spell.costGrace} благодати</span>
												{/if}
												{#if spell.damage}<span>Урон: {spell.damage}</span>{/if}
												{#if spell.effect}<span>Эффект: {spell.effect}</span>{/if}
												{#if spell.save}<span>Избавление: {spell.save}</span>{/if}
											</div>
											{#if available}
												<div class="flex gap-2 items-center">
													<button
														class="px-2 py-1 text-xs border rounded hover:bg-gray-50"
														onclick={() => toggleSpell(spell.id)}>
														{known ? 'Забыть' : 'Изучить'}
													</button>
													{#if spell.costOneHand !== undefined && spell.costTwoHands !== undefined}
														<label class="text-xs flex items-center gap-1">
															<input type="checkbox" bind:checked={twoHands[spell.id]} />
															две руки
														</label>
													{/if}
													<button
														class="px-2 py-0.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
												disabled={spell.costGrace !== undefined && !canUseGraceWithDecay(char.decay?.points ?? 0)}
												title={spell.costGrace !== undefined && !canUseGraceWithDecay(char.decay?.points ?? 0) ? 'Благодать недоступна из-за Тлена' : undefined}
														onclick={() => castSpell(spell.id, schoolId, useTwo)}>
														Магическая атака (к100)
													</button>
												</div>
											{:else}
												<p class="text-xs text-gray-500">
													Откроется, когда характеристика достигнет {threshold}.
												</p>
											{/if}
										</li>
									{/each}
								</ul>
						</div>
					</details>
				{/each}
			</div>
		</section>
		{#if char.backgroundId}
			{@const bg = BACKGROUNDS.find((b) => b.id === char?.backgroundId)}
			{#if bg}
				<section>
					<h2 class="text-xl font-semibold mb-3">Предыстория</h2>
					<div class="border rounded-lg bg-white p-4 space-y-3">
						<div>
							<div class="font-semibold text-lg">{bg.name} {bg.subtitle}</div>
							<p class="text-sm text-gray-600 mt-1">{bg.description}</p>
						</div>
						<div class="border-t pt-3">
							<div class="font-semibold">Особенность «{bg.feature.name}»</div>
							<p class="text-sm text-gray-600 mt-1">{bg.feature.description}</p>
						</div>
						<div class="border-t pt-3 text-sm text-gray-600">
							<strong>Снаряжение:</strong> {bg.equipment}
							<br />
							<strong>Оружие:</strong> {bg.weapon}
						</div>
					</div>
				</section>
				<section>
			<h2 id="inventory" class="text-xl font-semibold mb-3">Инвентарь</h2>

			<!-- Деньги -->
			<div class="border rounded-lg p-4 bg-white mb-3">
				<div class="flex justify-between items-center mb-3">
					<h3 class="font-semibold">Деньги</h3>
					<button
						class="text-xs text-blue-600 hover:underline"
						onclick={normalizeMoneyNow}>
						Конвертировать 100 в 1
					</button>
				</div>
				<div class="grid grid-cols-3 gap-3">
					<div class="text-center border rounded p-2">
						<div class="text-xs uppercase text-gray-500">Медяки</div>
						<div class="text-xl font-bold">{(char.money?.copper ?? 0)}</div>
						<div class="flex gap-1 mt-1 justify-center flex-wrap">
							<button class="px-1.5 text-xs border rounded hover:bg-gray-100" onclick={() => adjustMoney('copper', -100)}>−100</button>
							<button class="px-1.5 text-xs border rounded hover:bg-gray-100" onclick={() => adjustMoney('copper', -10)}>−10</button>
							<button class="px-1.5 text-xs border rounded hover:bg-gray-100" onclick={() => adjustMoney('copper', -1)}>−1</button>
							<button class="px-1.5 text-xs border rounded hover:bg-gray-100" onclick={() => adjustMoney('copper', 1)}>+1</button>
							<button class="px-1.5 text-xs border rounded hover:bg-gray-100" onclick={() => adjustMoney('copper', 10)}>+10</button>
							<button class="px-1.5 text-xs border rounded hover:bg-gray-100" onclick={() => adjustMoney('copper', 100)}>+100</button>
						</div>
					</div>
					<div class="text-center border rounded p-2">
						<div class="text-xs uppercase text-gray-500">Серебряники</div>
						<div class="text-xl font-bold">{(char.money?.silver ?? 0)}</div>
						<div class="flex gap-1 mt-1 justify-center flex-wrap">
							<button class="px-1.5 text-xs border rounded hover:bg-gray-100" onclick={() => adjustMoney('silver', -100)}>−100</button>
							<button class="px-1.5 text-xs border rounded hover:bg-gray-100" onclick={() => adjustMoney('silver', -10)}>−10</button>
							<button class="px-1.5 text-xs border rounded hover:bg-gray-100" onclick={() => adjustMoney('silver', -1)}>−1</button>
							<button class="px-1.5 text-xs border rounded hover:bg-gray-100" onclick={() => adjustMoney('silver', 1)}>+1</button>
							<button class="px-1.5 text-xs border rounded hover:bg-gray-100" onclick={() => adjustMoney('silver', 10)}>+10</button>
							<button class="px-1.5 text-xs border rounded hover:bg-gray-100" onclick={() => adjustMoney('silver', 100)}>+100</button>
						</div>
					</div>
					<div class="text-center border rounded p-2">
						<div class="text-xs uppercase text-gray-500">Златники</div>
						<div class="text-xl font-bold">{(char.money?.gold ?? 0)}</div>
						<div class="flex gap-1 mt-1 justify-center flex-wrap">
							<button class="px-1.5 text-xs border rounded hover:bg-gray-100" onclick={() => adjustMoney('gold', -100)}>−100</button>
							<button class="px-1.5 text-xs border rounded hover:bg-gray-100" onclick={() => adjustMoney('gold', -10)}>−10</button>
							<button class="px-1.5 text-xs border rounded hover:bg-gray-100" onclick={() => adjustMoney('gold', -1)}>−1</button>
							<button class="px-1.5 text-xs border rounded hover:bg-gray-100" onclick={() => adjustMoney('gold', 1)}>+1</button>
							<button class="px-1.5 text-xs border rounded hover:bg-gray-100" onclick={() => adjustMoney('gold', 10)}>+10</button>
							<button class="px-1.5 text-xs border rounded hover:bg-gray-100" onclick={() => adjustMoney('gold', 100)}>+100</button>
						</div>
					</div>
				</div>
				<div class="text-xs text-gray-400 mt-2 text-center">
					100 медяков = 1 серебряник · 100 серебряников = 1 златник
				</div>
			</div>

			<!-- Вес и стоимость -->
			<div class="flex justify-between items-center text-sm text-gray-600 mb-3 px-1">
				<span>Общий вес: <strong>{totalWeight.toFixed(1)} пуд.</strong></span>
				<span>Предметов: <strong>{inventoryEntries.length}</strong></span>
			</div>

			<!-- Кнопка добавления -->
			<button
				class="w-full px-4 py-2 border-2 border-dashed rounded hover:bg-gray-50 text-sm mb-3"
				onclick={() => (showItemPicker = !showItemPicker)}>
				{showItemPicker ? '✕ Закрыть выбор' : '+ Добавить предмет'}
			</button>

			<!-- Выбор предмета -->
			{#if showItemPicker}
				<div class="border rounded-lg p-4 bg-blue-50 mb-3">
					<div class="flex gap-2 mb-3 flex-wrap">
						<button
							class="px-2 py-1 text-xs rounded border {itemFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white'}"
							onclick={() => (itemFilter = 'all')}>Все</button>
						{#each Object.entries(CATEGORY_LABEL) as [cat, label]}
							<button
								class="px-2 py-1 text-xs rounded border {itemFilter === cat ? 'bg-blue-600 text-white' : 'bg-white'}"
								onclick={() => (itemFilter = cat as ItemCategory)}>{label}</button>
						{/each}
					</div>
					<div class="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
						{#each ITEMS.filter((i) => itemFilter === 'all' || i.category === itemFilter) as item}
							{@const price = item.price ?? 0}
							{@const affordable = char && canAfford(char, price)}
							<div class="text-left border rounded p-2 bg-white/50 text-sm">
								<div class="font-medium">{item.name}</div>
								{#if item.description}
									<div class="text-xs text-gray-500">{item.description}</div>
								{/if}
								{#if price > 0}
									<div class="text-xs text-gray-500 mt-1">
										Цена: <strong>{price} с.</strong>
										{#if item.bundleQuantity && item.bundleQuantity > 1}
											<span class="text-blue-600">за упаковку {item.bundleQuantity} шт.</span>
										{/if}
										{#if !affordable}
											<span class="text-red-600 ml-1">не хватает</span>
										{/if}
									</div>
								{/if}
								<div class="flex gap-1 mt-2">
									<button
										class="px-2 py-1 text-xs border rounded hover:bg-gray-100"
										onclick={() => { addItem(item.id); showItemPicker = false; }}>
										Взять
									</button>
									{#if price > 0}
										<button
											class="px-2 py-1 text-xs rounded {affordable ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}"
											disabled={!affordable}
											onclick={async () => { await buyItem(item.id, price); showItemPicker = false; }}>
											Купить
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Список инвентаря -->
			{#if inventoryEntries.length === 0}
				<p class="text-sm text-gray-500 text-center py-4 border-2 border-dashed rounded">
					Пусто. Нажмите «+ Добавить предмет».
				</p>
			{:else}
				<div class="border rounded-lg bg-white divide-y">
					{#each inventoryEntries as entry}
						<div class="px-4 py-2 flex items-center gap-3">
							<div class="flex-1">
								<div class="font-medium">{entry.item.name}</div>
								{#if entry.item.description}
									<div class="text-xs text-gray-500">{entry.item.description}</div>
								{/if}
								{#if entry.item.useEffect}
									<div class="text-xs text-blue-700 mt-0.5">⚡ {entry.item.useEffect}</div>
								{/if}
							</div>
							<div class="flex items-center gap-1">
								<button
									class="px-1.5 text-xs border rounded hover:bg-gray-100"
									onclick={() => adjustQty(entry.instance.instanceId, -1)}>−</button>
								<span class="font-mono text-sm w-8 text-center">{entry.instance.quantity}</span>
								<button
									class="px-1.5 text-xs border rounded hover:bg-gray-100"
									onclick={() => adjustQty(entry.instance.instanceId, 1)}>+</button>
							</div>
							{#if entry.item.consumable}
								<button
									class="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
									onclick={() => useItem(entry.instance.instanceId)}>
									Использовать
								</button>
							{/if}
							<button
								class="px-1.5 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50"
								onclick={() => removeItem(entry.instance.instanceId)}
								title="Удалить всё">
								✕
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</section>
			{/if}
		{/if}
		<section>
			<h2 id="abilities" class="text-xl font-semibold mb-3">Умения и таланты</h2>
			<p class="text-sm text-gray-600 mb-3">Очков умений: <strong>{char.abilityPoints ?? 0}</strong>. На каждом новом уровне вы получаете 5 очков. Каждое умение стоит 1 очко; для следующей ступени сначала изучите предыдущую в этом навыке.</p>
			<div class="space-y-4">
					{#each visibleSkills as s}
					{@const unlocked = getUnlockedAbilities(char, s.id)}
					{#if unlocked.length > 0}
						<div class="border rounded-lg bg-white">
							<div class="px-4 py-2 border-b bg-gray-50 font-semibold">{s.name}</div>
							<ul class="divide-y">
								{#each unlocked as ability}
									{@const learned = isAbilityLearned(char, ability.id)}
									{@const blockReason = getAbilityBlockReason(char, ability.id)}
									<li class="px-4 py-2">
										<div class="flex items-center gap-2">
											<span class="text-xs uppercase px-2 py-0.5 rounded
												{ability.tier === 0 ? 'bg-gray-200 text-gray-700' : ''}
												{ability.tier === 1 ? 'bg-blue-100 text-blue-800' : ''}
												{ability.tier === 2 ? 'bg-purple-100 text-purple-800' : ''}
												{ability.tier === 3 ? 'bg-amber-100 text-amber-800' : ''}">
												{ability.tier === 0 ? 'базовое' : `${ABILITY_THRESHOLDS[ability.tier]}+`}
											</span>
											<span class="font-medium">{ability.name}</span>
											<span class="text-xs {learned ? 'text-green-700' : 'text-gray-500'}">{learned ? '✓ изучено' : blockReason ?? 'доступно'}</span>
											<span class="text-xs text-gray-500">
												{ability.type === 'passive' ? 'пассивное' :
												 ability.type === 'active' ? 'активное' : 'реакция'}
											</span>
										</div>
										<p class="text-sm text-gray-600 mt-1">{ability.description}</p>
										<button class="mt-2 px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-50"
											disabled={blockReason !== null}
											onclick={() => studyAbility(ability.id)}>{learned ? 'Изучено' : 'Изучить · 1 очко'}</button>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				{/each}
			</div>
		</section>
	{/if}
</main>
