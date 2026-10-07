import { BESTIARY_ADDITIONS } from './bestiary-additions';
import { BESTIARY_CUSTOM } from './bestiary-custom';

export interface MonsterAttack {
	name: string;
	hitBonus: number;      // базовый модификатор характеристики + отдельный бонус
	damageDice: string;    // '1к6', '2к8'
	damageType: string;    // 'колющий', 'рубящий', 'нежива'
	notes?: string;
	save?: string;
	attackStat: 'strength' | 'intelligence' | 'dexterity' | 'eloquence' | 'religion';
	attackBonus?: number;
	hitTarget?: number;
	damageStat?: 'strength' | 'intelligence' | 'dexterity' | 'eloquence' | 'religion';
	damageModifier?: number;
	extraDamageDice?: string[];
	ignoresArmor?: boolean; // заклинание, дыхание или крик с собственным избавлением
}

export interface BaseMonster {
	id: string;
	name: string;
	source?: 'book' | 'custom';
	description: string;
	baseLevel: number;
	dangerLabel: string;
	primaryStat: 'strength' | 'intelligence' | 'dexterity' | 'eloquence' | 'religion';
	hpStat?: 'strength' | 'intelligence' | 'dexterity' | 'eloquence' | 'religion';
	baseMods: Record<string, number>;
	hp: number;
	armor: number;
	speed: number;
	movement?: string;
	attacks: MonsterAttack[];
	traits: string[];
	immune?: string[];
	weakness?: string;
	resistance?: string;
}

export const BESTIARY: BaseMonster[] = [
	{
		id: 'wolf',
		name: 'Волк',
		description: 'Серый хищник, охотящийся стаей.',
		baseLevel: 1,
		dangerLabel: '1',
		primaryStat: 'strength',
		baseMods: { strength: 8, dexterity: 8, intelligence: 5, eloquence: 3, religion: 4 },
		hp: 33,
		armor: 13,
		speed: 8,
		attacks: [
			{ name: 'Укус', hitBonus: 8, attackStat: 'strength', damageStat: 'strength', damageDice: '1к6', damageType: 'колющий' }
		],
		traits: [
			'Стайный охотник: +5 к попаданию, если рядом есть другой волк',
			'Чутьё: +10 к Наблюдательности по запаху'
		]
	},
	{
		id: 'bear',
		name: 'Медведь',
		description: 'Воплощение дикой силы леса.',
		baseLevel: 2,
		dangerLabel: '2-3',
		primaryStat: 'strength',
		baseMods: { strength: 10, dexterity: 7, intelligence: 5, eloquence: 3, religion: 4 },
		hp: 41,
		armor: 15,
		speed: 8,
		attacks: [
			{ name: 'Когти', hitBonus: 10, attackStat: 'strength', damageStat: 'strength', damageDice: '1к8', damageType: 'рубящий' },
			{ name: 'Укус', hitBonus: 10, attackStat: 'strength', damageStat: 'strength', damageDice: '1к6', damageType: 'колющий' }
		],
		traits: [
			'Звериная ярость: при ЖВЧ < 50% — +5 к атаке, +2 урона, −2 Броня',
			'Мощный захват: при двух попаданиях когтями за ход — Избавление Силы или схвачен'
		]
	},
	{
		id: 'druzhinnik',
		name: 'Дружинник',
		description: 'Профессиональный воин на службе князя.',
		baseLevel: 2,
		dangerLabel: '2',
		primaryStat: 'strength',
		baseMods: { strength: 9, dexterity: 7, intelligence: 6, eloquence: 7, religion: 7 },
		hp: 40,
		armor: 19,
		speed: 8,
		attacks: [
			{ name: 'Одноручный меч', hitBonus: 9, attackStat: 'strength', damageStat: 'strength', damageDice: '1к6', damageType: 'режущий' },
			{ name: 'Сильная атака', hitBonus: 19, attackStat: 'strength', attackBonus: 10, damageStat: 'strength', damageDice: '2к6', damageType: 'режущий' }
		],
		traits: [
			'Щитоносец: реакция, 2 бодрости — уменьшить урон от атаки на 1к4',
			'Дисциплинированный строй: +2 к Броне рядом с другим дружинником'
		]
	},
	{
		id: 'starschina',
		name: 'Старшина дружины',
		description: 'Ветеран многих битв, командующий отрядом.',
		baseLevel: 3,
		dangerLabel: '3',
		primaryStat: 'strength',
		baseMods: { strength: 10, dexterity: 7, intelligence: 7, eloquence: 8, religion: 7 },
		hp: 46,
		armor: 21,
		speed: 8,
		attacks: [
			{ name: 'Длинный меч', hitBonus: 10, attackStat: 'strength', damageStat: 'strength', damageDice: '1к8', damageType: 'режущий' },
			{ name: 'Сильная атака', hitBonus: 20, attackStat: 'strength', attackBonus: 10, damageStat: 'strength', damageDice: '2к8', damageType: 'режущий' }
		],
		traits: [
			'Железная воля: преимущество (+10) против Жути',
			'Мастер блокирования: реакция, 2 бодрости — полностью заблокировать атаку',
			'Командный голос: 1/бой, 2 влияния — +5 к попаданию союзникам в 10 саженях'
		]
	},
	{
		id: 'upyr',
		name: 'Упырь',
		description: 'Мерзкое существо, пожирающее падаль.',
		baseLevel: 1,
		dangerLabel: '1',
		primaryStat: 'strength',
		baseMods: { strength: 8, dexterity: 7, intelligence: 5, eloquence: 4, religion: 5 },
		hp: 33,
		armor: 7,
		speed: 7,
		attacks: [
			{ name: 'Когти', hitBonus: 8, attackStat: 'strength', damageStat: 'strength', damageDice: '1к6', damageType: 'рубящий' },
			{
				name: 'Укус', hitBonus: 8, attackStat: 'strength', damageStat: 'strength', damageDice: '1к8', damageType: 'колющий',
				save: 'Стойкость со штрафом −5 — иначе Руда (1к4 ЖВЧ/ход)'
			}
		],
		traits: [
			'Чутьё на слабых: +10 к попаданию, если у цели < 50% ЖВЧ',
			'Стайный хищник: +5 к попаданию при 2+ упырях рядом'
		],
		weakness: 'Серебряное оружие игнорирует Броню упыря'
	},
	{
		id: 'gul',
		name: 'Гуль',
		description: 'Маленькое, но крайне агрессивное и хитрое существо.',
		baseLevel: 1,
		dangerLabel: '1',
		primaryStat: 'dexterity',
		baseMods: { strength: 7, dexterity: 8, intelligence: 7, eloquence: 4, religion: 4 },
		hp: 32,
		armor: 14,
		speed: 8,
		attacks: [
			{ name: 'Когти/Укус', hitBonus: 8, attackStat: 'dexterity', damageStat: 'dexterity', damageDice: '1к6', damageType: 'колющий' },
			{
				name: 'Грязный плевок', hitBonus: 8, attackStat: 'dexterity', damageModifier: 0, damageDice: '0', damageType: '—',
				notes: 'Даль. Избавление Ловкости со штрафом −5 — иначе −5 к попаданию и −2 сажени к скорости на 1 раунд'
			}
		],
		traits: [
			'Подземный воин: +5 Броня и +5 Скрытность в пещере/норе/растительности',
			'Коллективная ярость: +5 к попаданию и +2 урона при 3+ гулях в 5 саженях',
			'Маленький уклон: реакция — +10 к Броне против одной атаки'
		]
	},
	{
		id: 'algul',
		name: 'Альгуль',
		description: 'Крупный упырь с панцирем и шипами.',
		baseLevel: 2,
		dangerLabel: '2',
		primaryStat: 'strength',
		baseMods: { strength: 9, dexterity: 7, intelligence: 5, eloquence: 3, religion: 5 },
		hp: 40,
		armor: 12,
		speed: 8,
		attacks: [
			{ name: 'Когти', hitBonus: 9, attackStat: 'strength', damageStat: 'strength', damageDice: '1к8', damageType: 'рубящий' },
			{
				name: 'Укус', hitBonus: 9, attackStat: 'strength', damageStat: 'strength', damageDice: '1к10', damageType: 'колющий',
				save: 'Стойкость со штрафом −5 — иначе Отрава на 3 раунда'
			}
		],
		traits: [
			'Регенерация: 1к6+мод.Силы в начале хода (блокируется серебром/святым огнём)',
			'Колючая спина: 1к4 рубящего атакующему в ближнем бою'
		],
		weakness: 'Серебро — двойной урон'
	},
	{
		id: 'shadow',
		name: 'Малая тень',
		description: 'Сгусток Нави, принявший очертания человека.',
		baseLevel: 2,
		dangerLabel: '2',
		primaryStat: 'intelligence',
		hpStat: 'intelligence',
		baseMods: { strength: 7, dexterity: 8, intelligence: 8, eloquence: 4, religion: 5 },
		hp: 39,
		armor: 15,
		speed: 8,
		attacks: [
			{
				name: 'Прикосновение холода', hitBonus: 8, attackStat: 'intelligence', damageStat: 'intelligence', damageDice: '1к4', damageType: 'нежива',
				notes: 'Избавление Силы со штрафом −5 — иначе Жуть на 1 раунд'
			}
		],
		traits: [
			'Теневая неосязаемость: +5 к Броне в тумане/сумерках',
			'Иммунитет к Отраве, Хвори и урону холодом'
		],
		weakness: 'Двойной урон от Восстановления, святой воды, Огня Ярило. Свет: −10 к попаданию, −5 Броня'
	},
	{
		id: 'upyr_king',
		name: 'Упырь-Король',
		description: 'Упырь, напитавшийся болью тысячи смертей.',
		baseLevel: 4,
		dangerLabel: '4',
		primaryStat: 'strength',
		baseMods: { strength: 8, dexterity: 2, intelligence: 3, eloquence: 2, religion: 5 },
		hp: 68,
		armor: 16,
		speed: 6,
		attacks: [
			{ name: 'Когти', hitBonus: 8, attackStat: 'strength', damageStat: 'strength', damageDice: '1к10', damageType: 'рубящий' },
			{
				name: 'Трупный смрад', hitBonus: 8, attackStat: 'strength', damageModifier: 0, damageDice: '2к6', damageType: 'кислотный', ignoresArmor: true,
				notes: 'Даль (конус 4 сажени). Избавление Стойкости — иначе Отрава на 2 раунда'
			}
		],
		traits: [
			'Призыв стаи: 1/бой — 1к4 упыря в радиусе 10 саженей',
			'Королевская регенерация: 1к8+4 ЖВЧ в начале хода (блокируется серебром)',
			'Аура страха: все в 5 саженях — −5 к избавлению от Жути и Отравы'
		],
		weakness: 'Серебро — двойной урон'
	},
	{
		id: 'leshy',
		name: 'Лесной Шишига',
		description: 'Могущественный дух леса, хозяин своей земли.',
		baseLevel: 5,
		dangerLabel: '5',
		primaryStat: 'strength',
		baseMods: { strength: 9, dexterity: 2, intelligence: 5, eloquence: 3, religion: 4 },
		hp: 78,
		armor: 18,
		speed: 6,
		attacks: [
			{ name: 'Ветвистый кулак', hitBonus: 9, attackStat: 'strength', damageStat: 'strength', damageDice: '2к8', damageType: 'дробящий' },
			{
				name: 'Призыв корней', hitBonus: 5, attackStat: 'intelligence', damageModifier: 0, damageDice: '0', damageType: '—', ignoresArmor: true,
				notes: 'Даль. Избавление Ловкости — иначе опутан на 2 раунда'
			}
		],
		traits: [
			'Дух леса: +5 Скрытность и +5 Броня в лесу, проходит сквозь деревья',
			'Хозяин зверей: 1/день — 1к4 волка или 1 медведь'
		],
		weakness: 'Огонь — двойной урон, отступает на 1 раунд'
	},
		{
		id: 'skeleton',
		name: 'Костяной Скелет',
		description: 'Останки воина или крестьянина, поднятые некромантией. Бездумны, но бесстрашны.',
		baseLevel: 1,
		dangerLabel: '1',
		primaryStat: 'strength',
		baseMods: { strength: 2, dexterity: 1, intelligence: 3, eloquence: 1, religion: 4 },
		hp: 28,
		armor: 13,
		speed: 5,
		attacks: [
			{ name: 'Ржавый меч', hitBonus: 2, attackStat: 'strength', damageStat: 'strength', damageDice: '1к6', damageType: 'рубящий' }
		],
		traits: [
			'Нежить: иммунитет к Отраве, Хвори, Сну, Жути',
			'Бездушное упорство: игнорирует состояния, кроме урона',
			'Разрушение: при крите дробящим оружием — уничтожен'
		],
		weakness: 'Уязвим к излучению и святому огню (двойной урон)'
	},
	{
		id: 'poltergeist',
		name: 'Полтергейст',
		description: 'Дух, привязанный к предмету или месту. Швыряет вещи, создаёт шум.',
		baseLevel: 2,
		dangerLabel: '2',
		primaryStat: 'intelligence',
		hpStat: 'intelligence',
		baseMods: { strength: 6, dexterity: 2, intelligence: 3, eloquence: 5, religion: 6 },
		hp: 34,
		armor: 14,
		speed: 6,
		attacks: [
			{
				name: 'Телекинез', hitBonus: 3, attackStat: 'intelligence', damageStat: 'intelligence', damageDice: '1к6', damageType: 'дробящий',
				notes: 'Даль. Бросает предметы'
			}
		],
		traits: [
			'Иммунитет к обычному оружию: урон только от магии, серебра и святой воды',
			'Шумовой хаос: все в 10 саженях — −5 к Наблюдательности, нет Скрытности',
			'Одержимость предметом: вселяется в предмет, пока он цел — неуязвим'
		],
		weakness: 'Святые символы и Восстановление изгоняют на 1 раунд'
	},
	{
		id: 'gniyushiy_leshy',
		name: 'Гниющий Леший',
		description: 'Осквернённый дух леса. Тело гниёт, душа полна боли и ярости.',
		baseLevel: 3,
		dangerLabel: '2-3',
		primaryStat: 'strength',
		baseMods: { strength: 9, dexterity: 7, intelligence: 7, eloquence: 6, religion: 7 },
		hp: 40,
		armor: 13,
		speed: 8,
		attacks: [
			{ name: 'Гнилая ветвь', hitBonus: 9, attackStat: 'strength', damageStat: 'strength', damageDice: '1к8', damageType: 'дробящий' },
			{
				name: 'Плевок гнилью', hitBonus: 7, attackStat: 'dexterity', damageModifier: 0, damageDice: '1к6', damageType: 'кислотный',
				notes: 'Даль. Избавление Стойкости со штрафом −10 — иначе Хворь на 1 день'
			}
		],
		traits: [
			'Гнилостная аура: все живые в 5 саженях — −5 к избавлению Стойкости',
			'Дух леса: проходит сквозь деревья, +5 Скрытность в лесу',
			'Призыв гнили: 1/бой — зона радиусом 2, 1к4 урона в начале хода'
		],
		weakness: 'Огонь — двойной урон'
	},
	{
		id: 'koshmar_wolf',
		name: 'Кошмарный Волк',
		description: 'Огромный волк с горящими красными глазами, рождённый на крови.',
		baseLevel: 3,
		dangerLabel: '3-4',
		primaryStat: 'strength',
		baseMods: { strength: 8, dexterity: 4, intelligence: 2, eloquence: 4, religion: 5 },
		hp: 60,
		armor: 16,
		speed: 8,
		attacks: [
			{ name: 'Укус', hitBonus: 8, attackStat: 'strength', damageStat: 'strength', damageDice: '1к12', damageType: 'колющий' }
		],
		traits: [
			'Кровавая Жуть: при попадании — Избавление Стойкости или Жуть 1 раунд',
			'Упорство хищника: +5 к атаке и +5 к Броне против цели с ЖВЧ < 50%',
			'Волк-одиночка: +5 к попаданию, если рядом нет других волков'
		]
	},
	{
		id: 'harpy',
		name: 'Гарпия',
		description: 'Женщина с крыльями птицы. Падальщица, крик которой сбивает с ног.',
		baseLevel: 3,
		dangerLabel: '2-3',
		primaryStat: 'dexterity',
		baseMods: { strength: 4, dexterity: 5, intelligence: 1, eloquence: 5, religion: 4 },
		hp: 44,
		armor: 15,
		speed: 6,
		movement: '6 саженей по земле, 10 в воздухе',
		attacks: [
			{ name: 'Когти', hitBonus: 5, attackStat: 'dexterity', damageStat: 'dexterity', damageDice: '1к8', damageType: 'рубящий' }
		],
		traits: [
			'Пронзительный крик: все в 5 саженях — Избавление Стойкости или Ошеломление 1 раунд',
			'Атака с воздуха: после перемещения по воздуху на 4+ сажени — +5 к атаке и +1к6 урона',
			'Падальщик: +10 к Наблюдательности при поиске раненой добычи'
		]
	},
	{
		id: 'rusalka',
		name: 'Русалка',
		description: 'Прекрасное, но смертоносное существо. Пением заманивает к воде.',
		baseLevel: 3,
		dangerLabel: '3',
		primaryStat: 'dexterity',
		baseMods: { strength: 5, dexterity: 6, intelligence: 2, eloquence: 5, religion: 5 },
		hp: 48,
		armor: 16,
		speed: 6,
		movement: '6 саженей на суше, 10 в воде',
		attacks: [
			{ name: 'Когти', hitBonus: 6, attackStat: 'dexterity', damageStat: 'dexterity', damageDice: '1к8', damageType: 'рубящий' },
			{ name: 'Укус', hitBonus: 5, attackStat: 'strength', damageStat: 'strength', damageDice: '1к6', damageType: 'колющий' }
		],
		traits: [
			'Завораживающее пение: все в 15 саженях — Избавление Интеллекта или Морок',
			'Водная скорость: в воде +2 к атаке и +1к6 урона'
		],
		weakness: 'Уязвима к громким звукам — теряет концентрацию, Ошеломление 1 раунд'
	},
	{
		id: 'bolotny_hodok',
		name: 'Болотный Ходок',
		description: 'Сгорбленное существо из тины и мха. Медлительное, но очень живучее.',
		baseLevel: 2,
		dangerLabel: '2',
		primaryStat: 'strength',
		baseMods: { strength: 9, dexterity: 6, intelligence: 3, eloquence: 2, religion: 3 },
		hp: 40,
		armor: 14,
		speed: 4,
		movement: '4 сажени, 8 в болоте',
		attacks: [
			{
				name: 'Цепкая рука', hitBonus: 9, attackStat: 'strength', damageStat: 'strength', damageDice: '1к6', damageType: 'дробящий',
				notes: 'При успехе — Избавление Силы или утащен в болото'
			}
		],
		traits: [
			'Регенерация в болоте: 1к6+9 ЖВЧ в начале хода (только в болоте)',
			'Скорость в болоте: 8 саженей',
			'Засада в тине: если не двигался — +10 Скрытность, атака из засады +10 к попаданию'
		]
	},
	{
		id: 'utoplets',
		name: 'Утопец',
		description: 'Водяное существо, похожее на человекоподобную лягушку. Тащит под воду.',
		baseLevel: 2,
		dangerLabel: '2',
		primaryStat: 'strength',
		baseMods: { strength: 9, dexterity: 7, intelligence: 5, eloquence: 3, religion: 4 },
		hp: 40,
		armor: 12,
		speed: 8,
		movement: '8 саженей на суше, 10 в воде',
		attacks: [
			{ name: 'Когти', hitBonus: 9, attackStat: 'strength', damageStat: 'strength', damageDice: '1к8', damageType: 'рубящий' },
			{
				name: 'Захват', hitBonus: 9, attackStat: 'strength', damageModifier: 0, damageDice: '0', damageType: '—',
				notes: 'Избавление Силы или схвачен'
			}
		],
		traits: [
			'Водная скорость: в воде +2 к атаке и +1к6 урона',
			'Подводный бой: атаки против них в воде — −5 к попаданию',
			'Затащить в воду: схваченную цель тащит в воду (4 сажени/ход), потом тонет'
		]
	},
	{
		id: 'voronojnik',
		name: 'Вороночник',
		description: 'Крылатый ящер, дальний родич драконов. Быстрый, ядовитое жало.',
		baseLevel: 4,
		dangerLabel: '4',
		primaryStat: 'strength',
		baseMods: { strength: 10, dexterity: 9, intelligence: 7, eloquence: 4, religion: 5 },
		hp: 46,
		armor: 17,
		speed: 8,
		movement: '8 саженей по земле, 12 в воздухе',
		attacks: [
			{ name: 'Укус', hitBonus: 10, attackStat: 'strength', damageStat: 'strength', damageDice: '1к10', damageType: 'колющий' },
			{
				name: 'Жало хвоста', hitBonus: 9, attackStat: 'dexterity', damageStat: 'dexterity', damageDice: '1к8', damageType: 'колющий',
				save: 'Стойкость со штрафом −10 — иначе Отрава на 3 раунда'
			}
		],
		traits: [
			'Воздушный бой: в воздухе +2 к атаке и +1к6 урона; атаки по нему −5',
			'Пикирование: если переместился на 8+ саженей — +10 к атаке и +2к6 урона'
		],
		weakness: 'Электричество — двойной урон'
	},
	{
		id: 'banshee',
		name: 'Баньши',
		description: 'Дух женщины, умершей в муках. Её крик разрывает ткань реальности.',
		baseLevel: 5,
		dangerLabel: '5',
		primaryStat: 'intelligence',
		hpStat: 'intelligence',
		baseMods: { strength: 5, dexterity: 3, intelligence: 6, eloquence: 4, religion: 5 },
		hp: 64,
		armor: 15,
		speed: 6,
		attacks: [
			{
				name: 'Крик баньши', hitBonus: 6, attackStat: 'intelligence', damageModifier: 0, damageDice: '3к8', damageType: 'нежива', ignoresArmor: true,
				notes: 'Сфера 20 саженей. Все цели: Избавление Стойкости — иначе 3к8 урона, Жуть на 2 раунда и потеря концентрации'
			}
		],
		traits: [
			'Иммунитет к обычному оружию: урон только от магии, серебра и святой воды',
			'Крик отчаяния: 1/бой — реакция на урон, кричит снова'
		],
		weakness: 'Музыка может успокоить (проверка Убеждения/Сплетничества)'
	},
	{
		id: 'katanak',
		name: 'Катакан',
		description: 'Коварный вампир-убийца. Невидим на короткое время, бьёт из тени.',
		baseLevel: 5,
		dangerLabel: '5',
		primaryStat: 'dexterity',
		baseMods: { strength: 10, dexterity: 10, intelligence: 8, eloquence: 8, religion: 7 },
		hp: 46,
		armor: 18,
		speed: 8,
		movement: '8 саженей, 12 в прыжке',
		attacks: [
			{ name: 'Когти', hitBonus: 10, attackStat: 'dexterity', damageStat: 'dexterity', damageDice: '1к10', damageType: 'колющий/рубящий' },
			{
				name: 'Укус', hitBonus: 10, attackStat: 'dexterity', damageStat: 'dexterity', damageDice: '1к8', damageType: 'колющий',
				save: 'Сила со штрафом −5 — иначе −1к6 макс. ЖВЧ до излечения'
			}
		],
		traits: [
			'Регенерация: 1к8+10 ЖВЧ в начале хода (блокируется серебром и святой водой)',
			'Смертельный прыжок: прыжок 8 саженей; при атаке с фланга +10 к атаке и +2к6 урона',
			'Сумеречная невидимость: 1/день на 1 раунд становится невидимым до первой атаки'
		],
		weakness: 'Серебро — двойной урон и блокирует регенерацию'
	},
	{
		id: 'ghost',
		name: 'Призрак',
		description: 'Дух, привязанный к месту гибели. Может вселяться в живых.',
		baseLevel: 6,
		dangerLabel: '5-6',
		primaryStat: 'intelligence',
		baseMods: { strength: 8, dexterity: 9, intelligence: 10, eloquence: 9, religion: 8 },
		hp: 44,
		armor: 12,
		speed: 8,
		attacks: [
			{
				name: 'Холодное прикосновение', hitBonus: 10, attackStat: 'intelligence', damageModifier: 0, damageDice: '2к8', damageType: 'нежива',
				save: 'Сила — иначе −1к4 макс. ЖВЧ до отдыха'
			}
		],
		traits: [
			'Иммунитет к обычному оружию: урон только от серебра, магии и святой воды',
			'Зловещая аура: все в 10 саженях — −5 к Стойкости и морали',
			'Одержимость: 1/бой — вселиться в раненого (Избавление Интеллекта)'
		],
		weakness: 'Серебро, Восстановление, святые символы — двойной урон'
	},
	{
		id: 'werewolf',
		name: 'Вервольф',
		description: 'Проклятый человек, обращающийся в зверя под полной луной.',
		baseLevel: 4,
		dangerLabel: '4',
		primaryStat: 'strength',
		baseMods: { strength: 10, dexterity: 10, intelligence: 6, eloquence: 5, religion: 6 },
		hp: 46,
		armor: 16,
		speed: 8,
		attacks: [
			{ name: 'Когти', hitBonus: 10, attackStat: 'strength', damageStat: 'strength', damageDice: '1к10', damageType: 'рубящий' },
			{
				name: 'Укус', hitBonus: 10, attackStat: 'strength', damageStat: 'strength', damageDice: '1к8', damageType: 'колющий',
				save: 'Сила — иначе Руда (1к4/ход)'
			}
		],
		traits: [
			'Сильная регенерация: 1к8+10 ЖВЧ в начале хода (блокируется серебром и святым огнём)',
			'Звериная ярость: при ЖВЧ < 25% — +5 к атаке, +1к6 урона, −5 Броня',
			'Чутьё охотника: +10 Наблюдательность по запаху'
		],
		weakness: 'Серебро — игнорирует регенерацию и наносит двойной урон. Укус может передать ликантропию'
	},
	{
		id: 'giant_spider',
		name: 'Гигантский Лесной Паук',
		description: 'Паук размером с лошадь. Терпеливый засадный охотник.',
		baseLevel: 3,
		dangerLabel: '3',
		primaryStat: 'strength',
		baseMods: { strength: 6, dexterity: 5, intelligence: 4, eloquence: 1, religion: 3 },
		hp: 54,
		armor: 16,
		speed: 6,
		movement: '6 саженей по земле, 8 по вертикали',
		attacks: [
			{
				name: 'Укус', hitBonus: 5, attackStat: 'dexterity', damageStat: 'strength', damageDice: '1к8', damageType: 'колющий',
				save: 'Стойкость — иначе Отрава на 3 раунда (−10 ко всем проверкам)'
			},
			{
				name: 'Паутина', hitBonus: 5, attackStat: 'dexterity', damageModifier: 0, damageDice: '0', damageType: '—',
				notes: 'Даль. Избавление Ловкости или опутан'
			}
		],
		traits: [
			'Движение по паутине: в своей паутине +5 к атаке и +5 к Броне',
			'Засада: если не двигался — +10 Скрытность, атака из засады +10 к попаданию'
		],
		weakness: 'Огонь — двойной урон, отступает на 1 раунд'
	},
	{
		id: 'nochnitsa',
		name: 'Ночница',
		description: 'Воплощение ночных кошмаров. Питается страхом.',
		baseLevel: 5,
		dangerLabel: '4-5',
		primaryStat: 'intelligence',
		hpStat: 'intelligence',
		baseMods: { strength: 6, dexterity: 4, intelligence: 6, eloquence: 6, religion: 4 },
		hp: 56,
		armor: 17,
		speed: 6,
		attacks: [
			{
				name: 'Прикосновение кошмара', hitBonus: 6, attackStat: 'intelligence', damageModifier: 0, damageDice: '2к6', damageType: 'нежива',
				save: 'Интеллект — иначе −1к4 макс. живы до отдыха'
			}
		],
		traits: [
			'Иммунитет к обычному оружию: урон только от серебра, магии и святой воды',
			'Кошмарные видения: 1/бой — все враги проходят Избавление Интеллекта или атакуют союзника',
			'Питание страхом: 1к6 ЖВЧ в начале хода, если рядом есть существо с Жутью'
		],
		weakness: 'Яркий свет — −10 к атаке, −5 Броня'
	},
	{
		id: 'sea_serpent',
		name: 'Морской Змей',
		description: 'Огромный змей из глубин. Топит лодки и утаскивает жертв на дно.',
		baseLevel: 6,
		dangerLabel: '5-6',
		primaryStat: 'strength',
		baseMods: { strength: 10, dexterity: 2, intelligence: 4, eloquence: 2, religion: 3 },
		hp: 76,
		armor: 17,
		speed: 4,
		movement: '4 сажени на суше, 8 в воде',
		attacks: [
			{ name: 'Укус', hitBonus: 10, attackStat: 'strength', damageStat: 'strength', damageDice: '2к10', damageType: 'колющий' },
			{
				name: 'Хвост', hitBonus: 10, attackStat: 'strength', damageStat: 'strength', damageDice: '1к12', damageType: 'дробящий',
				save: 'Сила — иначе сбит с ног'
			}
		],
		traits: [
			'Захват: при попадании укусом — Избавление Силы или схвачен (2к6 урона/ход)',
			'Дыхание водой: под водой +5 к попаданию'
		],
		weakness: 'Холод — двойной урон'
	},
	{
		id: 'black_dog',
		name: 'Чёрный Пёс',
		description: 'Предвестник смерти. Появляется перед трагедией.',
		baseLevel: 6,
		dangerLabel: '6',
		primaryStat: 'strength',
		baseMods: { strength: 8, dexterity: 7, intelligence: 5, eloquence: 5, religion: 3 },
		hp: 84,
		armor: 19,
		speed: 8,
		attacks: [
			{
				name: 'Укус смерти', hitBonus: 8, attackStat: 'strength', damageStat: 'strength', damageDice: '1к12', damageType: 'колющий',
				save: 'Стойкость — иначе Хворь на 1 день (−5 ко всем характеристикам)'
			}
		],
		traits: [
			'Предвестник: в начале боя все — Избавление Религии или Жуть 2 раунда',
			'Потусторонний: половина урона от всего, кроме серебра и Восстановления',
			'Беспощадность: всегда атакует самого слабого или раненого'
		],
		weakness: 'Изгоняется символом Перуна или Огнём Ярило (3 раунда)'
	},
	...BESTIARY_ADDITIONS,
	...BESTIARY_CUSTOM
];

export interface BestiarySection {
	id: string;
	name: string;
	monsters: BaseMonster[];
}

const SECTION_IDS: { id: string; name: string; monsterIds: string[] }[] = [
	{ id: 'forest', name: 'Лесные звери', monsterIds: ['wolf', 'bear', 'boar', 'giant_spider'] },
	{ id: 'spirits', name: 'Духи и хранители', monsterIds: ['leshy', 'gniyushiy_leshy', 'vodyanoy', 'rusalka', 'bolotny_hodok', 'poludennitsa', 'poltergeist', 'ghost', 'nochnitsa', 'banshee'] },
	{ id: 'navi', name: 'Порождения Нави', monsterIds: ['shadow', 'koshmar_wolf', 'black_dog', 'soul_devourer', 'abyss_ghost', 'necrophantom', 'grave_worm', 'navi_dragon_worm'] },
	{ id: 'undead', name: 'Нежить и проклятые', monsterIds: ['upyr', 'algul', 'gul', 'upyr_king', 'skeleton', 'utoplets', 'katanak', 'higher_vampire', 'bone_witch', 'headless_rider'] },
	{ id: 'people', name: 'Люди и оборотни', monsterIds: ['druzhinnik', 'starschina', 'werewolf'] },
	{ id: 'constructs', name: 'Механизмы и големы', monsterIds: ['mechanism_guard', 'rune_spider_golem'] },
	{ id: 'beasts', name: 'Чудовища суши', monsterIds: ['endriaga', 'voronojnik', 'giant_boa', 'giant_burrowing_worm', 'royal_eagle', 'basilisk', 'thunderbird', 'giant_scorpion', 'cave_troll', 'ice_mammoth', 'harpy'] },
	{ id: 'water', name: 'Морские чудовища', monsterIds: ['sea_serpent'] },
	{ id: 'legendary', name: 'Легендарные существа', monsterIds: ['turin_serpent', 'cerberus'] }
];

const monstersById = new Map(BESTIARY.map((monster) => [monster.id, monster]));
export const BESTIARY_SECTIONS: BestiarySection[] = SECTION_IDS.map((section) => ({
	id: section.id,
	name: section.name,
	monsters: section.monsterIds.map((id) => monstersById.get(id)).filter((monster): monster is BaseMonster => !!monster)
}));

export function getMonsterSection(id: string): BestiarySection | undefined {
	return BESTIARY_SECTIONS.find((section) => section.monsters.some((monster) => monster.id === id));
}

export function findMonster(id: string): BaseMonster | undefined {
	return BESTIARY.find((m) => m.id === id);
}
