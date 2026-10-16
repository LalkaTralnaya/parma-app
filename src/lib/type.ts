export interface Character {
	appearance?: { background: 'birch' | 'parchment' | 'chronicle'; frame: 'carved' | 'simple' | 'none' };
	id: string;
	name: string;
	raceId: string;
	raceVariantId?: string;
	raceChoice?: string;
	backgroundId?: string;
	level: number;
	characteristics: Record<string, { levelUpBonus: number }>;
	skillPoints: Record<string, number>;
	resourceRolls: Record<string, number[]>;
	currentResources: Record<string, number>;
	shortRestUsed?: boolean;
	/** Модификатор к100, заданный сказителем. Не меняет характеристики и прыть. */
	checkDifficulty?: number;
	abilities: string[];
	/** Нераспределённые очки умений, полученные при повышении уровня. */
	abilityPoints?: number;
	/** Особые формы подтверждаются по сюжету, а не покупкой корня дерева. */
	storyForms?: Array<'werewolf' | 'vampire'>;
	/** Заряды механического самострела; отсутствие записи означает заряженный. */
	crossbowCharges?: Record<string, number>;
	spells: string[];
	spellUsesSinceLongRest?: string[];
	useGraceForSpells: boolean;
	heldSpell?: HeldSpell | null;
		equipment: {
		weaponId?: string;
		armorId?: string;
		shieldId?: string;
	};
	inventory: InventoryItem[];
	money: Money;
		/** IDs of applied item treatments prevent repeated room messages from curing a new wound. */
	appliedItemTreatments?: string[];
	conditions: Array<{
		id: string;
		roundsLeft: number | null;
		stacks?: number;
		source?: string;
		notes?: string;
	}>;
	decay: { stage: number; points: number; usedPowers?: string[] };
		death: {
		usedVoiceOfBlood: boolean;
		usedCallOfZhiva: boolean;
		debtMark: number;
		metkaNavi: boolean;
		deathCount: number;
	};
	tempHp: number;
	inspiration: number;
		bio: {
		appearance: string;
		personalityKey: string;
		personalityText: string;
		idealKey: string;
		idealText: string;
		bondKey: string;
		bondText: string;
		flawKey: string;
		flawText: string;
		backstory: string;
		goals: string;
	};
	createdAt: number;
	updatedAt: number;
}
export interface InventoryItem {
	instanceId: string;   // уникальный ID конкретного экземпляра
	itemId: string;       // ссылка на справочник items.ts
	quantity: number;     // количество (для стакающихся)
	notes?: string;       // заметки игрока
}

export interface Money {
	copper: number;       // медяки
	silver: number;       // серебряники
	gold: number;         // златники
}

/** Одно активное удержание; параметры и цель фиксируются при сотворении. */
export interface HeldSpell {
	spellId: string;
	round: number;
	useTwoHands: boolean;
	useGrace: boolean;
	targetId: string | null;
	targetName: string;
}
