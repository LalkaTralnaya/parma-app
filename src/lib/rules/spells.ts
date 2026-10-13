import { SPELL_DRAFT_OVERRIDES } from './draft-spells';
export type SpellApplication = 'instant' | 'hold' | 'ritual';
export type SpellRange = 'touch' | 'close' | 'far' | 'deep' | 'self' | 'specified';
export type SpellTarget = 'creature' | 'object' | 'point' | 'area' | 'self' | 'ally';

export interface Spell {
	id: string;
	decayCost?: number;
	damageSave?: {charA:string;skillA?:string};
	draftText?: string;
	draftSection?: number;
	enhanced?: boolean;
	requiresTwoHands?: boolean;
	maintenanceOnly?: boolean;
	costResource?: 'hp';
	holdInterval?: 'hour';
	requiredAbility?: string;
	alternativeSchools?: string[];
	additionalDamage?: string;
	action?: 'reaction';
	name: string;
	school: string;              // skillId школы
	skillLevel: 0 | 1 | 2 | 3 | 4;
	costOneHand?: number;        // живы за одну руку
	costTwoHands?: number;       // живы за две руки
	costGrace?: number;          // для жреческих (благодать)
	application: SpellApplication;
	holdDamage?: string;
	holdEffect?: string;
	holdRounds?: number;       // полная длительность, включая раунд сотворения
	holdCost?: number;           // живы за раунд удержания
	ritualTime?: string;         // длительность ритуала
	range: SpellRange;
	rangeText?: string;
	target: SpellTarget;
	duration: string;
	damage?: string;
	/** Casting this spell uses Nezhiva and adds 1 Decay point per cast. */
	usesNezhiva?: boolean;
	effect?: string;
	save?: string;
	description: string;
}

const BOOK_SPELLS: Spell[] = [
{
  "id": "judicial_compulsion",
  "name": "Судебное понуждение (Узы воли)",
  "school": "illusion",
  "skillLevel": 3,
  "costOneHand": 8,
  "costTwoHands": 8,
  "application": "ritual",
  "ritualTime": "1 минута",
  "range": "close",
  "rangeText": "До 1 сажени",
  "target": "creature",
  "duration": "До 1 минуты, с концентрацией; до исполнения приказа",
  "save": "Интеллект с Колдовством либо Сплетничеством",
  "effect": "Один конкретный приказ при провале Избавления. Цель использует собственные навыки и Живу.",
  "description": "при успешном сотворении и провале Избавления цель выполняет один конкретный приказ. В судебном эксперименте её понуждают повторить соответствующую магию, чтобы волхв сравнил след Живы с обнаруженным. Цель использует собственные навыки и Живу; неизвестных способностей заклинание ей не даёт. Эффект прекращается при потере концентрации, исполнении приказа или завершении срока. Применение для судебной проверки разрешает суд с советом волхвов. «Волю свяжу, действие велю»."
},
	// ══════════════════════ РАЗРУШЕНИЕ ══════════════════════
	{
		id: 'fire_chaos',
		name: 'Огненные чары',
		school: 'destruction',
		skillLevel: 0,
		costOneHand: 2,
		costTwoHands: 5,
		application: 'instant',
		holdDamage: '1к6 (огонь)',
		holdCost: 1,
		range: 'far',
		target: 'creature',
		duration: 'Мгновенно / Удержание до прекращения',
		damage: '1к4 / 2к4 (огонь)',
		save: 'Стойкость — против Горения',
		description: 'Из ладони вырывается струя пламени. При удержании цель получает 1к6 огня каждый твой ход и состояние «Горение».'
	},
	{
		id: 'ice_chaos',
		name: 'Ледяные чары',
		school: 'destruction',
		skillLevel: 1,
		costOneHand: 2,
		costTwoHands: 5,
		application: 'instant',
		holdCost: 1,
		range: 'far',
		target: 'creature',
		duration: 'Мгновенно / Удержание до прекращения',
		damage: '1к4 / 2к4 (холод)',
		save: 'Стойкость — против Замедления',
		description: 'Поток ледяного воздуха. При удержании цель теряет 1 бодрость в начале хода и получает «Обморожение».'
	},
	{
		id: 'sparks',
		name: 'Искры',
		school: 'destruction',
		skillLevel: 1,
		costOneHand: 2,
		costTwoHands: 5,
		application: 'instant',
		holdCost: 1,
		range: 'far',
		target: 'creature',
		duration: 'Мгновенно',
		damage: '1к4 / 2к4 (электричество)',
		save: 'Стойкость — против Оцепенения',
		description: 'Из пальцев вырываются голубые разряды. При удержании 2 раунда подряд — Избавление Стойкости или «Оцепенение» на 1 раунд.'
	},
	{
		id: 'fire_arrow',
		name: 'Огненная стрела',
		school: 'destruction',
		skillLevel: 1,
		costOneHand: 3,
		costTwoHands: 7,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: 'Мгновенно',
		damage: '1к6 / 2к6 (огонь)',
		save: 'Стойкость — против Горения (при двух руках)',
		description: 'Сгусток огня в виде стрелы. При двух руках цель дополнительно получает «Горение» (1к6/ход, 2 раунда).'
	},
	{
		id: 'ice_spike',
		name: 'Ледяной шип',
		school: 'destruction',
		skillLevel: 1,
		costOneHand: 3,
		costTwoHands: 7,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: 'Мгновенно',
		damage: '1к6 / 2к6 (холод)',
		save: 'Стойкость — против Замедления (при двух руках)',
		description: 'Осколок магического льда. При двух руках — Избавление Стойкости или «Обморожение» на 3 раунда (−10 к скорости, −5 к атакам).'
	},
	{
		id: 'lightning',
		name: 'Молния',
		school: 'destruction',
		skillLevel: 1,
		costOneHand: 3,
		costTwoHands: 7,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: 'Мгновенно',
		damage: '1к6 / 2к6 (электричество)',
		save: 'Стойкость — против Оцепенения (при двух руках)',
		description: 'Электрическая дуга. При двух руках — Избавление Стойкости или «Оцепенение» на 1 раунд.'
	},
	{
		id: 'rune',
		name: 'Руна (Огненная, Морозная, Грозовая)',
		school: 'destruction',
		skillLevel: 2,
		costTwoHands: 8,
		application: 'ritual',
		ritualTime: '2 раунда',
		range: 'touch',
		target: 'point',
		duration: '10 минут или до срабатывания',
		damage: '4к6 (огонь / холод / электричество)',
		save: 'Ловкость — половина урона',
		description: 'Руна на полу или стене. При касании живым существом взрывается, поражая всех в радиусе 1 сажени. Накладывает соответствующее состояние (Горение / Обморожение / Оцепенение).'
	},
	{
		id: 'fireball',
		name: 'Огненный шар',
		school: 'destruction',
		skillLevel: 3,
		costTwoHands: 12,
		application: 'instant',
		range: 'far',
		target: 'area',
		duration: 'Мгновенно',
		damage: '8к8 (огонь)',
		save: 'Ловкость — половина урона; Стойкость — Горение',
		description: 'Взрыв в радиусе 4 саженей. Не прошедшие Избавление Ловкости получают полный урон и «Горение» на 2 раунда.'
	},
	{
		id: 'ice_storm',
		name: 'Ледяная буря',
		school: 'destruction',
		skillLevel: 3,
		costTwoHands: 12,
		application: 'hold',
		holdDamage: '2к8 (холод)',
		holdRounds: 4,
		holdCost: 10,
		ritualTime: '2 раунда',
		range: 'far',
		target: 'area',
		duration: '4 раунда (концентрация)',
		damage: '8к8 при сотворении, затем 2к8/ход',
		save: 'Ловкость — половина урона; Стойкость — Обморожение',
		description: 'Метель в радиусе 4 саженей. Область труднопроходима (скорость вдвое, видимость 2 сажени). В начале каждого хода удержания — 2к8 урона всем в области.'
	},
	{
		id: 'chain_lightning',
		name: 'Цепная молния',
		school: 'destruction',
		skillLevel: 3,
		costTwoHands: 12,
		application: 'ritual',
		ritualTime: '2 раунда',
		range: 'far',
		target: 'creature',
		duration: '1 раунд',
		damage: '8к8 / 4к8 / 2к8 (электричество)',
		save: 'Ловкость — первичная (половина); Стойкость — Оцепенение (первичная)',
		description: 'Разряд бьёт в главную цель и перескакивает на двух ближайших в радиусе 2 саженей. Первичная цель — Избавление Стойкости или «Оцепенение» на 1 раунд.'
	},
	{
		id: 'corpse_burst',
		usesNezhiva: true,
		name: 'Трупный взрыв',
		school: 'destruction',
		skillLevel: 4,
		costTwoHands: 8,
		application: 'instant',
		range: 'far',
		target: 'object',
		duration: 'Мгновенно',
		damage: '4к6 нежива + 2к6 физического',
		save: 'Ловкость — половина урона',
		description: 'Тело взрывается изнутри, поражая всех в радиусе 4 саженей. Область становится труднопроходимой на 1 раунд. Тело уничтожается — его нельзя поднять или использовать для ритуалов.'
	},

	// ══════════════════════ ИЗМЕНЕНИЕ ══════════════════════
	{
		id: 'tricks',
		name: 'Фокусы',
		school: 'transmutation',
		skillLevel: 0,
		costOneHand: 1,
		application: 'instant',
		range: 'touch',
		target: 'object',
		duration: 'Мгновенно / 1 минута',
		effect: 'Бытовые трюки — зажечь свечу, поднять предмет, светящийся шарик',
		description: 'Малые магические трюки: зажечь/погасить огонь, переместить монету на сажень, создать светящийся шарик (2 сажени тусклого света), высушить вещь.'
	},
	{
		id: 'oak_flesh',
		name: 'Дубовая плоть',
		school: 'transmutation',
		skillLevel: 1,
		costOneHand: 4,
		application: 'instant',
		range: 'self',
		target: 'self',
		duration: '1 минута',
		effect: '+5 Броня',
		description: 'Кожа покрывается древесной корой. +5 к Броне на 1 минуту.'
	},
	{
		id: 'candle_light',
		name: 'Свет свечи',
		school: 'transmutation',
		skillLevel: 1,
		costOneHand: 2,
		application: 'instant',
		range: 'touch',
		target: 'object',
		duration: '1 час',
		effect: 'Свет 4+4 сажени',
		description: 'Предмет излучает свет: 4 сажени яркого, 4 сажени тусклого. Не греет.'
	},
	{
		id: 'balance',
		name: 'Равновесие',
		school: 'transmutation',
		skillLevel: 1,
		costOneHand: 0,
		application: 'instant',
		range: 'self',
		target: 'self',
		duration: 'Мгновенно',
		effect: 'Обмен 10 здравия на 10 живы',
		description: 'Вы теряете 10 здравия и восстанавливаете 10 живы. Может убить, если здравия меньше 10.'
	},
	{
		id: 'light_sphere',
		name: 'Шар света',
		school: 'transmutation',
		skillLevel: 1,
		costOneHand: 3,
		application: 'instant',
		range: 'close',
		target: 'point',
		duration: '10 минут',
		effect: 'Свет 5+5 сажени, движется за тобой',
		description: 'Парящий шар света движется за тобой на расстоянии до 5 саженей. Освещает 5 саженей яркого и 5 тусклого.'
	},
	{
		id: 'stone_flesh',
		name: 'Каменная плоть',
		school: 'transmutation',
		skillLevel: 2,
		costOneHand: 6,
		application: 'instant',
		range: 'close',
		target: 'creature',
		duration: '1 минута',
		effect: '+10 Броня',
		description: 'Цель покрывается каменной крошкой. +10 к Броне, но −5 к Скрытности из-за шуршания.'
	},

	// ══════════════════════ ВОССТАНОВЛЕНИЕ ══════════════════════
	{
		id: 'heal',
		name: 'Лечение',
		school: 'restoration',
		skillLevel: 0,
		costOneHand: 2,
		costTwoHands: 5,
		application: 'hold',
		holdEffect: '1к6 + мод. Инт / 2к6 + мод. Инт здравия',
		holdCost: 2,
		range: 'touch',
		target: 'creature',
		duration: 'Мгновенно / Удержание пока касаешься',
		effect: '1к6 + мод. Инт (1 рука) / 2к6 + мод. Инт (2 руки) здравия',
		description: 'Ладони светятся тёплым светом. Не действует на нежить и механизмы.'
	},
	{
		id: 'small_ward',
		name: 'Малый оберег',
		school: 'restoration',
		skillLevel: 1,
		costOneHand: 2,
		application: 'hold',
		holdCost: 2,
		range: 'touch',
		target: 'creature',
		duration: 'Пока удерживаешь',
		effect: '+5 Броня (магический щит)',
		description: 'Мерцающий купол вокруг союзника. Не мешает атаковать.'
	},
	{
		id: 'fast_heal',
		name: 'Быстрое восстановление',
		school: 'restoration',
		skillLevel: 1,
		costOneHand: 2,
		application: 'instant',
		range: 'touch',
		target: 'creature',
		duration: 'Мгновенно',
		effect: '1к6 + мод. Инт здравия',
		description: 'Экстренное лечение в бою (действие).'
	},
	{
		id: 'steady_ward',
		name: 'Устойчивый оберег',
		school: 'restoration',
		skillLevel: 2,
		costOneHand: 4,
		application: 'hold',
		holdCost: 4,
		range: 'touch',
		target: 'creature',
		duration: 'Пока удерживаешь',
		effect: '+5 Броня, снижение физического урона на 1к6',
		description: 'Улучшенный оберег: щит становится плотнее и гасит удары.'
	},
	{
		id: 'yarilo_fire',
		name: 'Огонь Ярило',
		school: 'restoration',
		skillLevel: 3,
		costOneHand: 4,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: 'Мгновенно',
		damage: '1к6 + мод. Инт (излучение)',
		description: 'Луч солнечного света. Против обычных живых не действует, но нежить, тени и существа Чернобога получают урон. Малые тени при уроне < 10 — рассыпаются (Избавление Религии).'

	},

	// ══════════════════════ КОЛДОВСТВО ══════════════════════
	{
		id: 'cold_touch',
		usesNezhiva: true,
		name: 'Прикосновение холода',
		school: 'witchcraft',
		skillLevel: 0,
		costOneHand: 2,
		costTwoHands: 4,
		application: 'instant',
		range: 'touch',
		target: 'creature',
		duration: 'Мгновенно',
		damage: '1к4 / 2к4 (нежива)',
		save: 'Стойкость — половина урона и отмена Жути',
		description: 'Ладонь покрывается инеем из Нави. При провале Избавления цель получает Жуть на 1 раунд.'
	},
	{
		id: 'pain_word',
		usesNezhiva: true,
		name: 'Слово боли',
		school: 'witchcraft',
		skillLevel: 1,
		costOneHand: 3,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: 'Мгновенно',
		damage: '2к6 (нежива, игнорирует доспехи)',
		save: 'Стойкость — половина урона',
		description: 'Слово на языке Нави. Цель слышит его — и её тело пронзает острая боль, не оставляющая следов.'
	},
	{
		id: 'summon_pet',
		name: 'Призыв питомца (волк/собака)',
		school: 'witchcraft',
		skillLevel: 1,
		costOneHand: 2,
		application: 'instant',
		range: 'close',
		target: 'point',
		duration: '1 минута',
		effect: 'Волк: ЗДР 32, Броня 12, атака 1к6 + мод. Инт',
		description: 'Появляется дух леса в облике пса. Подчиняется простым командам. Действует в твою инициативу.'
	},
	{
		id: 'summon_sword',
		name: 'Призванный меч',
		school: 'witchcraft',
		skillLevel: 1,
		costOneHand: 6,
		application: 'instant',
		range: 'self',
		target: 'self',
		duration: '30 минут',
		damage: '1к6 + мод. Инт (режущий)',
		description: 'Одноручный меч из чистой Живы. Считается магическим оружием.'
	},
	{
		id: 'summon_dagger',
		name: 'Призванный кинжал',
		school: 'witchcraft',
		skillLevel: 1,
		costOneHand: 4,
		application: 'instant',
		range: 'self',
		target: 'self',
		duration: '30 минут',
		damage: '1к4 + мод. Инт (колющий)',
		description: 'Кинжал из Живы. Можно метать — после броска исчезает. За 8 живы можно призвать два кинжала.'
	},
	{
		id: 'summon_elemental',
		name: 'Призыв малого элементаля земли',
		school: 'witchcraft',
		skillLevel: 1,
		costOneHand: 14,
		application: 'instant',
		range: 'close',
		target: 'point',
		duration: '3 минуты или пока ЗДР не кончатся',
		effect: 'ЗДР 26, Броня 20, две атаки 1к6 + мод. Инт',
		description: 'Коренастый голем из камня. Не может отходить от места призыва дальше 10 саженей.'
	},
	{
		id: 'trip',
		name: 'Спотыкание (Заклятие ног)',
		school: 'witchcraft',
		skillLevel: 1,
		costOneHand: 3,
		costTwoHands: 6,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: 'Мгновенно',
		save: 'Ловкость + Уклонение — избежать падения',
		description: 'Земля под ногами становится скользкой. Цель падает. При двух руках — Сл −5 и 1к4 дробящего урона.'
	},
	{
		id: 'confusion',
		name: 'Смута (Помутнение сознания)',
		school: 'witchcraft',
		skillLevel: 1,
		costOneHand: 4,
		costTwoHands: 7,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: '2 раунда',
		save: 'Интеллект + Колдовство — сбросить в начале хода',
		description: 'Туман в голове. Цель атакует случайного союзника (или никого). При двух руках — 3 раунда и Сл −5.'
	},
	{
		id: 'bird_mark',
		name: 'Птичья метка (Помеха от воронов)',
		school: 'witchcraft',
		skillLevel: 1,
		costOneHand: 3,
		costTwoHands: 5,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: '1 минута',
		effect: '−5 к Наблюдательности и дальним атакам цели',
		description: 'Стая воронов слетается к цели. При двух руках — штраф −10 и −1 бодрость в начале хода.'
	},
	{
		id: 'fear_whisper',
		name: 'Шёпот страха',
		school: 'witchcraft',
		skillLevel: 1,
		costOneHand: 3,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: '1 раунд',
		save: 'Интеллект + Религия',
		description: 'Шёпот о самом сильном страхе. При провале — состояние Жуть на 1 раунд.'
	},
	{
		id: 'raise_dead',
		name: 'Поднять мертвеца',
		school: 'witchcraft',
		skillLevel: 1,
		costOneHand: 4,
		application: 'ritual',
		ritualTime: '1 минута + 1 жива/час поддержания',
		range: 'touch',
		target: 'object',
		duration: '1 час (можно продлевать)',
		effect: 'Скелет (ЗДР 18, КБ 13, 1к6+2) или зомби (ЗДР 24, КБ 10, 1к4+3)',
		description: 'Поднимаете из трупа скелета или зомби. Поддерживать 1 живу/час. Максимум поднятых = мод. Инт / 2 (минимум 1).'
	},
	{
		id: 'bone_armor',
		name: 'Костяной доспех',
		school: 'witchcraft',
		skillLevel: 1,
		costOneHand: 3,
		application: 'instant',
		range: 'self',
		target: 'self',
		duration: '1 минута',
		effect: '+5 Броня, сопротивление рубящему урону (половина)',
		description: 'Кости облегают тело. Жуткий вид — все, кто видит, получают −5 к Убеждению. Животные избегают тебя.'
	},
	{
		id: 'freeze',
		name: 'Замри (Паралич воли)',
		school: 'witchcraft',
		skillLevel: 2,
		costOneHand: 5,
		application: 'instant',
		range: 'close',
		target: 'creature',
		duration: '1 раунд',
		save: 'Сила + Стойкость',
		description: 'Жест или касание. При провале — цель застывает, не может действовать, Броня −10.'
	},
	{
		id: 'darkness',
		name: 'Тьма (Ослепление)',
		school: 'witchcraft',
		skillLevel: 2,
		costOneHand: 6,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: '2 раунда',
		save: 'Интеллект + Восстановление — в начале хода',
		description: 'Пелена застилает взгляд. Цель получает состояние Тьма: −30 к атакам и зрительным проверкам.'
	},
	{
		id: 'crossroad',
		name: 'Перекрёсток (Сбивание с пути)',
		school: 'witchcraft',
		skillLevel: 2,
		costOneHand: 4,
		application: 'instant',
		range: 'touch',
		target: 'object',
		duration: '1 час',
		save: 'Наблюдательность — чтобы заметить подмену',
		description: 'Знак на пороге или следе. Все проверки Наблюдательности и Выживания для поиска пути −10. При двух руках — −25 на 3 часа.'
	},
	{
		id: 'mirage',
		name: 'Морок (Сбивание с толку)',
		school: 'witchcraft',
		skillLevel: 2,
		costOneHand: 5,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: '3 раунда',
		save: 'Интеллект + Колдовство — в начале хода',
		description: 'Цель видит вас союзником, а своих союзников — врагами. Снимается при получении урона от вас.'
	},
	{
		id: 'deafness',
		name: 'Глухота (Заклятие тишины)',
		school: 'witchcraft',
		skillLevel: 2,
		costOneHand: 4,
		costTwoHands: 7,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: '3 раунда',
		save: 'Сила + Стойкость — в начале хода',
		description: 'Цель перестаёт слышать. −10 к инициативе, авто-провал проверок Наблюдательности по слуху.'
	},
	{
		id: 'muteness',
		name: 'Немота (Заклятие молчания)',
		school: 'witchcraft',
		skillLevel: 2,
		costOneHand: 4,
		costTwoHands: 7,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: '3 раунда',
		save: 'Интеллект + Красноречие — в начале хода',
		description: 'Цель не может говорить. Невозможно произносить заклинания с вербальным компонентом, −40 к Убеждению и Обману.'
	},
	{
		id: 'lameness',
		name: 'Хромота (Заклятие ног)',
		school: 'witchcraft',
		skillLevel: 2,
		costOneHand: 4,
		costTwoHands: 7,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: '3 раунда',
		save: 'Сила + Стойкость — в начале хода',
		description: 'Скорость цели снижается вдвое, −10 к Атлетике и Уклонению.'
	},
	{
		id: 'evil_hand',
		name: 'Злая длань (Порча оружия)',
		school: 'witchcraft',
		skillLevel: 2,
		costOneHand: 3,
		application: 'instant',
		range: 'touch',
		target: 'object',
		duration: '1 минута',
		effect: 'Штраф −10 к попаданию следующей атакой; при крите «100» оружие ломается',
		description: 'Металл становится хрупким. При применении двумя руками — длится 5 минут, при крите оружие рассыпается в прах.'
	},
	{
		id: 'void_curse',
		name: 'Пустота (Проклятие разорения)',
		school: 'witchcraft',
		skillLevel: 2,
		costOneHand: 8,
		application: 'ritual',
		ritualTime: '1 минута',
		range: 'touch',
		target: 'creature',
		duration: '1 день',
		effect: '−15 к Торговле, продавец завышает цену на 20%, покупатель занижает на 20%',
		description: 'Проклятие на разорение. Требуется личный предмет цели.'
	},
	{
		id: 'wither',
		name: 'Отсохни (Проклятие немощи)',
		school: 'witchcraft',
		skillLevel: 2,
		costOneHand: 6,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: '3 раунда',
		save: 'Сила + Стойкость — в начале хода',
		description: '−10 ко всем проверкам, требующим рук. Если цель держит оружие — Избавление Силы или выронит.'
	},
	{
		id: 'banshee_cry',
		usesNezhiva: true,
		name: 'Крик баньши',
		school: 'witchcraft',
		skillLevel: 2,
		costOneHand: 5,
		application: 'instant',
		range: 'close',
		target: 'area',
		duration: 'Мгновенно',
		damage: '2к8 (нежива)',
		save: 'Стойкость — половина урона и отмена Жути',
		description: 'Крик звучит не в ушах, а в душе. Сфера радиусом 4 сажени. При провале — урон и Жуть на 1 раунд.'
	},
	{
		id: 'life_drain',
		usesNezhiva: true,
		name: 'Пожирание жизни',
		school: 'witchcraft',
		skillLevel: 2,
		costOneHand: 4,
		application: 'instant',
		range: 'touch',
		target: 'creature',
		duration: 'Мгновенно',
		damage: '2к6 (нежива)',
		save: 'Стойкость — половина урона, и ты не восстанавливаешь живу',
		description: 'Ты протягиваешь руку, и жизнь покидает врага, вливаясь в тебя. Восстанавливаешь столько же здравия, сколько нанёс урона.'
	},
	{
		id: 'dreadful_look',
		name: 'Ужасный вид',
		school: 'witchcraft',
		skillLevel: 2,
		costOneHand: 3,
		application: 'instant',
		range: 'close',
		target: 'creature',
		duration: '1 раунд',
		save: 'Интеллект — предотвратить',
		description: 'Касание или взгляд. При провале — состояние Морок на 1 раунд.'
	},
	{
		id: 'beggar_curse',
		name: 'Проклятие нищих',
		school: 'witchcraft',
		skillLevel: 1,
		costOneHand: 4,
		application: 'instant',
		range: 'close',
		target: 'creature',
		duration: '1 день',
		effect: '−5 ко всем проверкам Торговли и Убеждения',
		description: 'Применяется в ответ на отказ в помощи. Цель получает проклятие на день.'
	},
	{
		id: 'black_hour',
		name: 'Чёрный час (Проклятие времени)',
		school: 'witchcraft',
		skillLevel: 3,
		costOneHand: 8,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: '1 минута',
		save: 'Интеллект / Религия — в начале хода',
		description: 'Все проверки цели −10. При критическом провале — Ошеломление на 1 раунд.'
	},
	{
		id: 'summon_shadows',
		name: 'Призыв теней',
		school: 'witchcraft',
		skillLevel: 3,
		costOneHand: 8,
		application: 'ritual',
		ritualTime: '10 минут',
		range: 'close',
		target: 'point',
		duration: '1 час',
		effect: 'Призываются 1к4 Малых Теней',
		description: 'Из тени поднимаются слуги Нави. Служат вам 1 час.'
	},

	// ══════════════════════ ИЛЛЮЗИЯ ══════════════════════
	{
		id: 'minor_illusion',
		name: 'Малая иллюзия',
		school: 'illusion',
		skillLevel: 0,
		costOneHand: 2,
		costTwoHands: 4,
		application: 'instant',
		range: 'far',
		target: 'point',
		duration: '1 минута (концентрация)',
		save: 'Наблюдательность — развеять при подозрении',
		description: 'Простой зрительный образ (до 2 саженей в диаметре). Без звука, запаха, не взаимодействует с предметами. Используется для отвлечения или маскировки.'
	},
	{
		id: 'courage',
		name: 'Мужество',
		school: 'illusion',
		skillLevel: 1,
		costOneHand: 2,
		application: 'instant',
		range: 'touch',
		target: 'ally',
		duration: '1 минута',
		effect: '+20 временного здравия, мод. Силы ×2 (не более +12), иммунитет к Жути',
		description: 'Внушаете цели искажённую уверенность в неуязвимости. Эффект работает, даже если цель знает, что это иллюзия.'
	},
	{
		id: 'clairvoyance',
		name: 'Ясновидение (Поиск предмета)',
		school: 'illusion',
		skillLevel: 1,
		costOneHand: 4,
		application: 'instant',
		range: 'deep',
		target: 'object',
		duration: 'Мгновенно',
		effect: 'Примерное направление и расстояние до предмета',
		description: 'Закрываете глаза и получаете примерное направление (сторона света) до известного предмета в радиусе 1000 м.'
	},
	{
		id: 'rage',
		name: 'Ярость',
		school: 'illusion',
		skillLevel: 1,
		costOneHand: 4,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: '5 раундов',
		save: 'Интеллект — предотвратить',
		description: 'Пробуждаете в цели звериную ярость. Цель атакует ближайшее существо (дружественное или враждебное — без разбора).'
	},
	{
		id: 'night_vision',
		name: 'Зрение десятого глаза (Ночное зрение)',
		school: 'illusion',
		skillLevel: 1,
		costOneHand: 2,
		application: 'instant',
		range: 'self',
		target: 'self',
		duration: '30 минут',
		effect: 'Видите в полной темноте как в сумерках (дальность 10 саженей)',
		description: 'Глаза наливаются серебристым светом. Магическая тьма блокирует эффект.'
	},
	{
		id: 'calm',
		name: 'Успокоение',
		school: 'illusion',
		skillLevel: 1,
		costOneHand: 3,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: '1 минута',
		save: 'Интеллект — предотвратить',
		description: 'Цель не атакует и не применяет враждебные способности. Снимается при получении урона. На нежить и демонов не действует.'
	},
	{
		id: 'zhut',
		name: 'Жуть',
		school: 'illusion',
		skillLevel: 1,
		costOneHand: 3,
		application: 'instant',
		range: 'far',
		target: 'creature',
		duration: '1 минута',
		save: 'Интеллект — предотвратить',
		description: 'Цель видит в вас воплощение своего самого сильного страха. Тратит перемещение на бегство, −15 к Броне.'
	},
	{
		id: 'silent_steps',
		name: 'Приглушение шагов',
		school: 'illusion',
		skillLevel: 1,
		costOneHand: 2,
		application: 'hold',
		holdCost: 1,
		range: 'close',
		target: 'area',
		duration: '5 минут (концентрация)',
		effect: 'Сфера радиусом 5 м. Все проверки Скрытности внутри +10',
		description: 'Звуки шагов, шуршания одежды и скрип снаряжения приглушаются. Снаружи сферу услышать почти невозможно (−15 к Наблюдательности).'
	},
	{
		id: 'encouragement',
		name: 'Ободрение (Сопротивление очарованию)',
		school: 'illusion',
		skillLevel: 1,
		costOneHand: 2,
		costTwoHands: 5,
		application: 'instant',
		range: 'touch',
		target: 'ally',
		duration: '1 минута',
		effect: '+10 к избавлению Интеллекта против Очарования',
		description: 'Наполняете разум союзников ясностью. При двух руках — сфера 15 метров вокруг вас.'
	},
	{
		id: 'invisibility',
		name: 'Сокрытие (Невидимость)',
		school: 'illusion',
		skillLevel: 2,
		costOneHand: 5,
		application: 'instant',
		range: 'self',
		target: 'self',
		duration: '5 минут',
		effect: 'Невидимость. Атака или боевое заклинание отменяет эффект',
		description: 'Свет огибает вас, делая прозрачным. Обнаружение — по звуку или следам (−20 к Наблюдательности).'
	},
	{
		id: 'call_to_arms',
		name: 'Призыв к оружию (Боевой клич)',
		school: 'illusion',
		skillLevel: 2,
		costOneHand: 5,
		application: 'instant',
		range: 'close',
		target: 'area',
		duration: '10 минут',
		effect: '+10 к проверкам атаки всем союзникам в радиусе 30 м',
		description: 'Мысленный клич, который вселяет уверенность. Действует даже на глухих.'
	}
];

const EXTRA_DRAFT_SPELLS: Spell[] = [
  {
    "id": "vanish",
    "name": "Пропади",
    "school": "witchcraft",
    "skillLevel": 3,
    "costOneHand": 10,
    "application": "ritual",
    "range": "specified",
    "target": "creature",
    "duration": "По условиям карточки",
    "description": "Рабочая редакция магии; условия ритуала ниже.",
    "draftText": "Колдовство, 3-я ступень; ритуал 10 минут, 10 Живы до скидки, личный предмет цели на перекрёстке. Действует до снятия. Предложенное начальное Избавление Религии предотвращает наложение.\n\nОдин раз за день при «100» на проверке проклятого он переносится в случайное место в радиусе около **0,94 версты**: это пересчёт книжного 1 км по принятой версте 1,0668 км, без изменения дальности. Проклятие не превращает обычный провал в «100». Место выбирает Сказитель в пределах существующего мира; неизвестные иные миры этим заклинанием не открываются.\n\nПредлагается безопасное для самого переноса размещение: свободная опора вне сплошного вещества. Сюжетная опасность вокруг сохраняется, но прямой урон от появления внутри скалы или в воздухе не добавляется — в книге перенос сам урона не наносит. Новое проклятие того же имени не увеличивает число переносов за день.\n\nСнятие: книжные 8 часов очищения, 8 Благодати, редкие ингредиенты и проверка Религии.",
    "draftSection": 44,
    "enhanced": false,
    "usesNezhiva": false
  },
  {
    "id": "zalom",
    "name": "Залом",
    "school": "witchcraft",
    "skillLevel": 2,
    "costOneHand": 5,
    "application": "ritual",
    "range": "specified",
    "target": "creature",
    "duration": "По условиям карточки",
    "description": "Рабочая редакция магии; условия ритуала ниже.",
    "draftText": "Колдовство, 2-я ступень; ритуал 10 минут, 5 Живы до скидки. Материальный узел из колосьев, травы или нитей оставляют в определённом доме, на пороге или поле. Срок — до уничтожения залома.\n\nВ рабочей редакции воздействие ограничено указанным домохозяйством или владельцами конкретного поля, а не всеми посетителями деревни. Книжный эффект −5 ко всем характеристикам сохраняется как особая немощь этого залома; не подменяется автоматически иной общей карточкой Хвори. Поле приносит половину обычного урожая; это сюжетный итог сезона, а не мгновенное уничтожение уже собранного зерна.\n\nОдна уместная проверка Наблюдательности позволяет обнаружить спрятанный неестественный узел. Очевидный узел может быть найден без броска. Уничтожение, сжигание или развязывание снимает именно эту порчу без отдельного заклинания. Оно не исцеляет все независимые болезни жертвы. Несколько заломов не суммируют штраф характеристик.",
    "draftSection": 44,
    "enhanced": false,
    "usesNezhiva": false
  },
  {
    "id": "mother_curse",
    "name": "Материнское проклятие",
    "school": "witchcraft",
    "skillLevel": 4,
    "costOneHand": 14,
    "application": "ritual",
    "range": "specified",
    "target": "creature",
    "duration": "По условиям карточки",
    "description": "Рабочая редакция магии; условия ритуала ниже.",
    "draftText": "Колдовство, 4-я ступень; ритуал 1 час, 14 Живы до скидки и специальные 2 ОТ. Нужна кровная связь либо личный предмет цели по книжному условию. После сотворения предложенное начальное Избавление Религии даёт шанс предотвратить наложение.\n\nСохраняются −10 ко всем Избавлениям, уменьшение максимального Здравия на 10 и −2 к Избавлениям потомков против проклятий до седьмого колена. Повторные проклятия рода эти числа не складывают. Снижение максимума ограничивает текущее Здравие новым максимумом, но не создаёт отдельного удара на 10 сверх этого ограничения.\n\nДля последовательно игровой карточки предлагается: уменьшение максимума действует пока проклятие не снято; после снятия максимум восстанавливается, текущее Здравие бесплатно не восполняется. Родовой след также снимается с затронутой линии этим обрядом. Это уточнение книжного слова «постоянно», требующее авторского решения.\n\nСнятие — божественное вмешательство либо тяжёлый ритуал в капище: проверка Религии, 12 Благодати, редкие ингредиенты стоимостью от 500 серебряников. Название не выдаёт право любой матери проклинать без знания магии и её условий. Подлинная родовая трагедия раскрывается сюжетом, а не таблицей дополнительных процедур.",
    "draftSection": 44,
    "enhanced": false,
    "usesNezhiva": false
  },
  {
    "id": "astral_projection",
    "name": "Астральная проекция",
    "school": "witchcraft",
    "skillLevel": 3,
    "costOneHand": 10,
    "application": "ritual",
    "range": "specified",
    "target": "creature",
    "duration": "По условиям карточки",
    "description": "Рабочая редакция магии; условия ритуала ниже.",
    "draftText": "Колдовство либо Иллюзия, 3-я ступень, признак Неживы. Ритуал 1 час, 10 Живы до скидки и 1 ОТ; цель — сам заклинатель, срок 1 час. Тело остаётся беззащитным, проекция не взаимодействует с материальными предметами. Это доступ к описанным в книге Нави и приграничным местам, не знание всех иных миров.\n\nСпособные воспринять проекцию духи могут отвечать, скрывать сведения или отказывать; контакт не является автоматической истиной. Заклинания без телесных условий допустимы только при прямо подходящей карточке, не как весь список любой школы.\n\nПредлагается заменить смерть от любого повреждения оставленного тела на экстренное возвращение: урон телу прекращает проекцию, заклинатель получает книжный уровень Изнеможения, а само ранение разрешается обычными правилами. Если тело действительно погибло, безопасного возврата нет. Это существенное смягчение книжной цены. Продление за неуказанную бесплатную оплату не допускается; пока срок ограничен 1 часом.",
    "draftSection": 47,
    "enhanced": false,
    "usesNezhiva": true
  },
  {
    "id": "seven_gates_dust",
    "name": "Семивратная пыль",
    "school": "witchcraft",
    "skillLevel": 4,
    "costOneHand": 12,
    "application": "ritual",
    "range": "specified",
    "target": "creature",
    "duration": "По условиям карточки",
    "description": "Рабочая редакция магии; условия ритуала ниже.",
    "draftText": "Колдовство, 4-я ступень; ритуал 10 минут, 12 Живы до скидки и специальные 2 ОТ, необходимый прах. Касание подходящей поверхности создаёт проход размером до 2 саженей в Навь либо из неё. Срок — **1 минута**, как в основном эффекте, вместо противоречивого поля «до закрытия».\n\nОткрывается один проход, а не маршрут в любой неизвестный мир. Направление и доступное место перехода задаются природой ритуала и местности; выбрать любую точку по всему миру одним названием нельзя. Книжный риск нежеланного гостя 25% сохраняется и проверяется один раз за открытие, не за каждого проходящего. Скидка Живы не заменяет прах и не уменьшает Тлен.",
    "draftSection": 47,
    "enhanced": false,
    "usesNezhiva": true
  },
  {
    "id": "soul_domination",
    "name": "Подчинение души",
    "school": "witchcraft",
    "skillLevel": 4,
    "costOneHand": 10,
    "application": "ritual",
    "range": "specified",
    "target": "creature",
    "duration": "По условиям карточки",
    "description": "Рабочая редакция магии; условия ритуала ниже.",
    "draftText": "Колдовство, 4-я ступень, признак Неживы. Ритуал 1 минуту, 10 Живы до скидки и общая цена Неживы. Видимая нежить или дух до 10 саженей. Книжная встречная проверка Колдовства против Религии цели определяет подчинение на 1 день.\n\nСохраняется отказ от приказа, прямо угрожающего существованию цели. Приказ не выдаёт неизвестных способностей, не отменяет иммунитет карточки и не создаёт безусловное послушание любого высшего духа. Тлен самой цели начисляется по книжной строке только если её природа вообще допускает такую механику; число ОТ не превращается в отдельный счётчик рабства.\n\nПредлагаемый предел — одно существо под этим личным подчинением. Успешное новое подчинение освобождает прежнее; неудачная попытка не снимает старого. Это отдельное ограничение, не перенос Парных душ на всякое сознание. Повторный ритуал по той же цели требует новой цены и нового сопротивления.",
    "draftSection": 47,
    "enhanced": false,
    "usesNezhiva": true
  },
  {
    "id": "soul_eater",
    "name": "Пожиратель душ",
    "school": "witchcraft",
    "skillLevel": 4,
    "costOneHand": 16,
    "application": "ritual",
    "range": "specified",
    "target": "creature",
    "duration": "По условиям карточки",
    "description": "Рабочая редакция магии; условия ритуала ниже.",
    "draftText": "Колдовство либо Разрушение, 5-я ступень. Для доступа недостаточно покупки Мастера школы: нужны особое сюжетное обучение, источник ритуала и допуск Сказителя по текущему лору. Отдельный шестой ранг школы и свободная покупка этого ритуала здесь не вводятся.\n\nКнижная основа: ритуал 1 минуту, 14 Живы до допустимой школьной скидки, специальные 3 ОТ; касание обездвиженной или не сопротивляющейся цели, 6к8 урона Неживы. Условие неподвижности или согласия должно сохраняться до завершения. Это не мгновенный боевой луч по любой цели.\n\nВ книге одновременно написаны «урон нельзя уменьшить» и Избавление, уменьшающее потерю Здравия. Для рабочей редакции предлагается: **Религия уменьшает бросок 6к8 вдвое и предотвращает повреждение максимального Здравия**. Без успешного Избавления выжившая цель теряет 1к4 максимального Здравия; при успехе этого последствия нет. Иные специальные сопротивления и иммунитеты сохраняются вместо универсального их игнорирования. Это явная перебалансировка абсолютной формулировки.\n\nЕсли цель действительно погибла от ритуала, книжное уничтожение её души сохраняется; 0 Здравия без установленной смерти само по себе не объявляется уничтожением. Восстановление заклинателю — книжные 2к8 Здравия, но предлагается ограничить его реально отнятым у живой цели Здравием; собственного призыва и добровольного повторяемого источника для лечения нет. Механизм без установленной природы души не становится допустимой добычей только из-за сознания.\n\nПоследствия высшего ритуала раскрываются сюжетом; отдельная таблица для каждого исключения не требуется. Возможность снятия повреждения максимума и восстановления уничтоженной души рассматривается по действующему лору, а не обычным Лечением.",
    "draftSection": 48,
    "enhanced": false,
    "usesNezhiva": true
  }
];
const SPELL_SUMMARIES: Record<string, string> = {
 heal: 'Восстанавливает Здравие живого существа при касании. Можно продолжать лечение, удерживая заклинание.',
 fast_heal: 'Позволяет реакцией помочь живому существу после получения урона.',
 vanish: 'Проклятие переносит цель в случайное место при выпадении «100» на её проверке.',
 zalom: 'Спрятанный залом ослабляет домохозяйство или владельцев поля и уменьшает урожай.',
 mother_curse: 'Родовое проклятие ослабляет Избавления и уменьшает максимальное Здравие цели.',
 astral_projection: 'Отделяет проекцию заклинателя от тела для путешествия в Навь и приграничные места.',
 seven_gates_dust: 'Открывает кратковременный проход в Навь или из неё на подходящей поверхности.',
 soul_domination: 'Ритуал подчиняет одну душу воле заклинателя.',
 soul_eater: 'Ритуал отнимает Здравие жертвы и угрожает её душе.'
};
export const SPELLS: Spell[] = [...BOOK_SPELLS, ...EXTRA_DRAFT_SPELLS].map(spell => {
 const patch=SPELL_DRAFT_OVERRIDES[spell.id];
 if(!patch)return spell;
 const updated={...spell,...patch,description: SPELL_SUMMARIES[spell.id] ?? spell.description.split(/(?<=[.!?])\s+/)[0]};
 // A missing enhanced version never inherits an old universal double-casting effect.
 if(!updated.enhanced && !updated.requiresTwoHands) delete updated.costTwoHands;
 if(['fireball','ice_storm','corpse_burst','rune','chain_lightning'].includes(spell.id)) updated.damageSave={charA:'dexterity'};
 if(['life_drain','banshee_cry'].includes(spell.id))updated.damageSave={charA:'strength',skillA:'fortitude'};
 const decay=updated.draftText?.match(/(?:специальные?\s+)?([123]) ОТ/);if(decay)updated.decayCost=Number(decay[1]);
 return updated;
});

export const SPELLS_BY_SCHOOL: Record<string, Spell[]> = SPELLS.reduce(
	(acc, s) => {
		if (!acc[s.school]) acc[s.school] = [];
		acc[s.school].push(s);
		return acc;
	},
	{} as Record<string, Spell[]>
);
/** Порог стабильности школы: минимальное значение характеристики,
 *  при котором заклинания 0-го уровня сотворяются без штрафов. */
export const SCHOOL_STABILITY_THRESHOLDS: Record<string, number> = {
	destruction: 36,
	transmutation: 36,
	witchcraft: 42,
	illusion: 36,
	restoration: 36,
	enchantment: 42,
	prayer: 36,
	higher_power: 36
};

/** Порог характеристики для открытия уровня заклинаний (1–4).
 *  Уровень 0 — зависит от школы, смотри SCHOOL_STABILITY_THRESHOLDS. */
export const SPELL_LEVEL_THRESHOLDS: Record<number, number> = {
	1: 42,
	2: 54,
	3: 72,
	4: 84
};

/** Итоговый порог характеристики для конкретного уровня в конкретной школе */
export function getSpellLevelThreshold(school: string, level: number): number {
	if (level === 0) return SCHOOL_STABILITY_THRESHOLDS[school] ?? 36;
	return SPELL_LEVEL_THRESHOLDS[level] ?? 999;
}
