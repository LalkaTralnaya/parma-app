export interface Character {
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
	abilities: string[];
	spells: string[];
	useGraceForSpells: boolean;
		equipment: {
		weaponId?: string;
		armorId?: string;
		shieldId?: string;
	};
	inventory: InventoryItem[];
	money: Money;
		conditions: Array<{
		id: string;
		roundsLeft: number | null;
		source?: string;
		notes?: string;
	}>;
	decay: { stage: number; points: number };
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