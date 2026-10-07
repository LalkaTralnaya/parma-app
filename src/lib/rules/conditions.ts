export interface ConditionSave {
	charA: string;         // основная характеристика
	skillA?: string;       // навык-бонус (опционально)
	charB?: string;        // альтернативная характеристика
	skillB?: string;       // альтернативный навык
}

export interface ConditionModifiers {
	characteristics?: number;  // к самим характеристикам (Хворь)
	attacks?: number;          // к атакам (к100)
	skills?: number;           // ко всем проверкам навыков
	saves?: number;            // к избавлениям
	armor?: number;            // к Броне
	speed?: number;            // сажени
	skipTurn?: boolean;
	canAct?: boolean;
	maxStamina?: number;       // к максимуму Бодрости (Изнеможение)
}

export interface ConditionDef {
	id: string;
	name: string;
	description: string;
	effects: string;                // краткое описание для отображения
	modifiers: ConditionModifiers;
	dotDamage?: string;             // "1к4" — урон в конце хода
	save?: ConditionSave;
	defaultRounds: number | null;   // null — до отдыха/лечения
	isPositive: boolean;            // благословение = true
}

export const CONDITIONS: ConditionDef[] = [
	{
		id: 'bleeding',
		name: 'Руда',
		description: 'Глубокая рана, кровь не останавливается.',
		effects: '−1к4 ЗДР в конце каждого хода',
		modifiers: {},
		dotDamage: '1к4',
		save: { charA: 'strength', skillA: 'fortitude' },
		defaultRounds: 3,
		isPositive: false
	},
	{
		id: 'poisoned',
		name: 'Отрава',
		description: 'Яд или токсин в организме.',
		effects: '−10 ко всем проверкам характеристик и навыков',
		modifiers: { attacks: -10, skills: -10, saves: -10 },
		save: { charA: 'strength', skillA: 'fortitude' },
		defaultRounds: 5,
		isPositive: false
	},
	{
		id: 'stunned',
		name: 'Ошеломление',
		description: 'Удар по голове или магический шок.',
		effects: 'Пропуск хода, −20 к Броне',
		modifiers: { armor: -20, skipTurn: true, canAct: false },
		save: { charA: 'strength', skillA: 'blocking' },
		defaultRounds: 1,
		isPositive: false
	},
	{
		id: 'darkness',
		name: 'Тьма / Ослепление',
		description: 'Пелена застилает взгляд.',
		effects: '−30 к атакам и зрительным проверкам, провал Скрытности',
		modifiers: { attacks: -30, skills: -30 },
		save: { charA: 'intelligence', skillA: 'restoration' },
		defaultRounds: 3,
		isPositive: false
	},
	{
		id: 'frightened',
		name: 'Жуть',
		description: 'Ужас, невозможность приблизиться к источнику.',
		effects: 'Бегство от источника, −15 к Броне',
		modifiers: { armor: -15, skills: -5 },
		save: { charA: 'intelligence', skillA: 'eloquence', charB: 'intelligence', skillB: 'witchcraft' },
		defaultRounds: 2,
		isPositive: false
	},
	{
		id: 'charmed',
		name: 'Морок',
		description: 'Видит источник как союзника.',
		effects: 'Считает источник очарования другом, не может его атаковать',
		modifiers: {},
		save: { charA: 'intelligence', skillA: 'eloquence', charB: 'intelligence', skillB: 'enchantment' },
		defaultRounds: null,
		isPositive: false
	},
	{
		id: 'paralyzed',
		name: 'Оцепенение',
		description: 'Тело сковано магией или ядом.',
		effects: 'Не может двигаться, автоматические критические удары по нему',
		modifiers: { skipTurn: true, canAct: false, armor: -10 },
		save: { charA: 'strength', skillA: 'fortitude', charB: 'intelligence' },
		defaultRounds: 2,
		isPositive: false
	},
	{
		id: 'burning',
		name: 'Горение',
		description: 'Охвачен огнём.',
		effects: '−1к6 ЗДР в конце каждого хода',
		modifiers: {},
		dotDamage: '1к6',
		save: { charA: 'dexterity', skillA: 'light_armor' },
		defaultRounds: 2,
		isPositive: false
	},
	{
		id: 'frozen',
		name: 'Обморожение',
		description: 'Кровь и мышцы замедляются от холода.',
		effects: '−10 к скорости, −5 к атакам и проверкам Ловкости',
		modifiers: { attacks: -5, skills: -5, speed: -10 },
		save: { charA: 'strength', skillA: 'heavy_armor' },
		defaultRounds: 3,
		isPositive: false
	},
	{
		id: 'exhausted',
		name: 'Изнеможение',
		description: 'Крайняя усталость, нехватка сил.',
		effects: '−20 к максимальному запасу Бодрости',
		modifiers: { maxStamina: -20 },
		save: { charA: 'strength', skillA: 'fortitude', charB: 'intelligence', skillB: 'restoration' },
		defaultRounds: null,
		isPositive: false
	},
	{
		id: 'diseased',
		name: 'Хворь',
		description: 'Инфекция или магическая болезнь.',
		effects: '−5 ко всем характеристикам',
		modifiers: { characteristics: -5 },
		save: { charA: 'strength', skillA: 'fortitude', charB: 'intelligence', skillB: 'restoration' },
		defaultRounds: null,
		isPositive: false
	},
	{
		id: 'invisible',
		name: 'Сокрытие',
		description: 'Невидим для обычного зрения.',
		effects: '+30 к Скрытности, −20 к атакам по тебе',
		modifiers: {},
		defaultRounds: null,
		isPositive: true
	},
	{
		id: 'blessed',
		name: 'Благословение',
		description: 'Магическое усиление.',
		effects: '+10 к характеристике или броскам',
		modifiers: { attacks: 10, skills: 10, saves: 10 },
		defaultRounds: null,
		isPositive: true
	},
	{
		id: 'cursed',
		name: 'Проклятие',
		description: 'Магическое ослабление.',
		effects: '−10 к характеристике или броскам',
		modifiers: { attacks: -10, skills: -10, saves: -10 },
		save: { charA: 'intelligence', skillA: 'witchcraft', charB: 'religion', skillB: 'prayer' },
		defaultRounds: null,
		isPositive: false
	},
	{
		id: 'asleep',
		name: 'Сон',
		description: 'Естественный сон.',
		effects: 'Не может действовать, авто-провал Наблюдательности',
		modifiers: { skipTurn: true, canAct: false },
		defaultRounds: null,
		isPositive: false
	},
	{
		id: 'magic_sleep',
		name: 'Магический сон',
		description: 'Насильственное погружение в сон.',
		effects: 'Не может действовать, сложнее разбудить',
		modifiers: { skipTurn: true, canAct: false },
		save: { charA: 'intelligence', skillA: 'restoration', charB: 'religion', skillB: 'prayer' },
		defaultRounds: null,
		isPositive: false
	}
];

export function findCondition(id: string): ConditionDef | undefined {
	return CONDITIONS.find((c) => c.id === id);
}