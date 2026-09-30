export interface RaceVariant {
	id: string;
	name: string;
	skillBonus: string;
	note: string;
}

export interface Race {
	id: string;
	name: string;
	description: string;
	bonus?: Record<string, number>;
	bonusChoice?: { count: number; amount: number; from: string[] };
	skillAffinity?: Record<string, number>;
	skillAffinityChoice?: { count: number; amount: number; from: string[] };
	skillFree?: { count: number; amount: number };
	variants?: RaceVariant[];
	features: string[];
}

export const RACES: Race[] = [
	{
		id: 'human',
		name: 'Люди (Сыны Перуна)',
		description: 'Самый приспосабливаемый народ. Их сила — в разнообразии и воле к жизни.',
		bonusChoice: { count: 1, amount: 6, from: ['strength', 'intelligence', 'dexterity', 'eloquence', 'religion'] },
		skillAffinityChoice: { count: 1, amount: 2, from: ['survival', 'perception', 'restoration', 'animal_handling'] },
		skillFree: { count: 2, amount: 1 },
		variants: [
			{ id: 'northerner', name: 'Северянин',     skillBonus: 'athletics',       note: '+5 к проверкам против Обморожения' },
			{ id: 'forest',     name: 'Житель Леса',   skillBonus: 'perception',      note: '+10 к Скрытности в лесу' },
			{ id: 'steppe',     name: 'Степняк',       skillBonus: 'animal_handling', note: '+10 к Обращению с лошадьми' },
			{ id: 'city',       name: 'Горожанин',     skillBonus: 'gossip',          note: '+10 к Наблюдательности в городе' }
		],
		features: ['will_to_life']
	},
	{
		id: 'lesovik',
		name: 'Лесовики (Дети Велеса)',
		description: 'Хранители леса, почти бессмертны и связаны с лесом.',
		bonus: { dexterity: 4, religion: 2 },
		skillAffinity: { stealth: 2, restoration: 1, perception: 1 },
		features: ['child_of_forest', 'nature_sense', 'magic_resist', 'animal_tongue']
	},
	{
		id: 'svarozhich',
		name: 'Сварожичи (Дети Камня)',
		description: 'Горные кузнецы и воины, кровь горяча как расплавленный металл.',
		bonus: { strength: 4, dexterity: 2 },
		skillAffinity: { smithing: 2, heavy_armor: 1, fortitude: 1 },
		features: ['stone_blood', 'svarog_mastery', 'stone_knowledge']
	},
	{
		id: 'polevichka',
		name: 'Полевички (Дети Лады)',
		description: 'Маленький, но удачливый народец.',
		bonus: { eloquence: 4, dexterity: 2 },
		skillAffinityChoice: { count: 1, amount: 2, from: ['trade', 'gossip'] },
		skillAffinity: { persuasion: 1, evasion: 1 },
		features: ['lucky', 'brave', 'field_sense', 'shadow_move']
	},
	{
		id: 'chudinets',
		name: 'Чудинцы (Искатели Правды)',
		description: 'Потомки жителей погибшей планеты Дея. О́держимы знаниями.',
		bonus: { intelligence: 4, dexterity: 2 },
		skillAffinityChoice: { count: 1, amount: 2, from: ['alchemy', 'perception'] },
		skillAffinity: { lockpicking: 1, enchantment: 1 },
		features: ['spark_of_knowledge', 'craftsman_dexterity', 'sharp_mind']
	},
	{
		id: 'teni_roda',
		name: 'Тени Рода (Отмеченные Тьмой)',
		description: 'Изгои, рождённые проклятием или сбежавшие из Нави.',
		bonus: { eloquence: 4, intelligence: 2 },
		skillAffinity: { deception: 2, intimidation: 1, witchcraft: 1 },
		features: ['abyss_mark', 'dark_eloquence', 'shadow_link']
	},
	{
		id: 'dragonkin',
		name: 'Драконы Потомки',
		description: 'Чешуя, рога, дыхание стихией.',
		bonus: { strength: 4, eloquence: 2 },
		skillAffinityChoice: { count: 1, amount: 2, from: ['athletics', 'intimidation'] },
		skillAffinity: { fortitude: 1, destruction: 1 },
		features: ['dragon_blood', 'breath_weapon', 'dragon_will']
	},
	{
		id: 'aasimar',
		name: 'Аасимары (Посланцы Богов)',
		description: 'Дети богов. Мифическая раса (по согласованию с Мастером).',
		bonus: { eloquence: 4, religion: 2 },
		skillAffinityChoice: { count: 1, amount: 2, from: ['persuasion', 'prayer'] },
		skillAffinity: { intimidation: 1, restoration: 1 },
		features: ['heavenly_light', 'dark_resist', 'divine_purpose']
	},
	{
		id: 'mechanism',
		name: 'Разумный Механизм (Пробуждённый)',
		description: 'Создан дженази. Ищет своё место в мире.',
		bonus: { strength: 4, intelligence: 2 },
		skillAffinityChoice: { count: 1, amount: 2, from: ['athletics', 'perception', 'smithing', 'destruction'] },
		skillAffinity: { fortitude: 1 },
		features: ['construct_immunity', 'magic_core', 'echo_of_task']
	}
];