export type ItemCategory = 'weapon' | 'armor' | 'consumable' | 'tool' | 'treasure' | 'misc';

export interface Item {
	id: string;
	name: string;
	category: ItemCategory;
	description?: string;
	/** Вес в пудах (1 пуд ≈ 16 кг) */
	weight?: number;
	/** Цена в серебряниках */
	price?: number;
	/** Стакается ли — можно объединять в стопку (стрелы, зелья, монеты) */
	stackable?: boolean;
	/** Сколько штук в одной упаковке (по умолчанию 1) */
	bundleQuantity?: number;
	/** Расходуется ли при использовании (уменьшается количество) */
	consumable?: boolean;
	/** Эффект при использовании */
	useEffect?: string;
	/** Кубик эффекта (для зелий, например "1к6+2") */
	useDice?: string;
	/** Восстанавливает ли HP при использовании */
	restoresHp?: boolean;
	/** Восстанавливает ли ману/благодать */
	restoresResource?: 'mana' | 'grace' | 'stamina';
	/** Снимает ли состояние */
	curesCondition?: string;
}

export const ITEMS: Item[] = [
	// ═══════════════ ОРУЖИЕ ═══════════════
	{ id: 'dagger', name: 'Кинжал', category: 'weapon', weight: 0.2, price: 5, description: '1к4 колющий, лёгкое' },
	{ id: 'short_sword', name: 'Короткий меч', category: 'weapon', weight: 0.6, price: 20, description: '1к6 режущий' },
	{ id: 'bastard_sword', name: 'Полуторный меч', category: 'weapon', weight: 0.9, price: 30, description: '1к6 (1 рука) / 1к8 (2 руки) режущий' },
	{ id: 'battle_axe', name: 'Боевой топор', category: 'weapon', weight: 0.8, price: 25, description: '1к6 (1 рука) / 1к8 (2 руки) рубящий' },
	{ id: 'war_hammer', name: 'Боевой молот', category: 'weapon', weight: 0.9, price: 25, description: '1к6 (1 рука) / 1к8 (2 руки) дробящий' },
	{ id: 'greatsword', name: 'Двуручный меч', category: 'weapon', weight: 1.5, price: 50, description: '1к10 режущий' },
	{ id: 'halberd', name: 'Алебарда', category: 'weapon', weight: 1.8, price: 60, description: '1к12 рубящий' },
	{ id: 'short_bow', name: 'Короткий лук', category: 'weapon', weight: 0.6, price: 30, description: '1к6 колющий' },
	{ id: 'long_bow', name: 'Длинный лук', category: 'weapon', weight: 0.8, price: 50, description: '1к8 колющий, требуется Сила 42+' },
	{ id: 'arrows', name: 'Стрелы (упаковка 20 шт.)', category: 'weapon', weight: 0.2, price: 2, stackable: true, bundleQuantity: 20, description: 'Боевые стрелы, 1к6 урона.' },
	{ id: 'arrows', name: 'Стрелы (упаковка 20 шт.)', category: 'weapon', weight: 0.2, price: 2, stackable: true, bundleQuantity: 20, description: 'Деревянные стрелы, 1к3 урона.' },
		{ id: 'arrows', name: 'Стрелы (упаковка 20 шт.)', category: 'weapon', weight: 0.2, price: 2, stackable: true, bundleQuantity: 20, description: 'Наёмников, 1к6+1 урона.' },
	{ id: 'throwing_knives', name: 'Метательные ножи', category: 'weapon', weight: 0.3, price: 8, stackable: true, description: '1к4 колющий' },
	{ id: 'hunting_knife', name: 'Охотничий нож', category: 'weapon', weight: 0.3, price: 6, description: '1к4 колющий' },
	{ id: 'smith_hammer', name: 'Кузнечный молот', category: 'weapon', weight: 0.8, price: 12, description: '1к6 дробящий' },
	{ id: 'staff', name: 'Крепкий посох', category: 'weapon', weight: 1.0, price: 8, description: '1к8 дробящий (двуручное)' },
	{ id: 'ritual_dagger', name: 'Ритуальный нож', category: 'weapon', weight: 0.3, price: 15, description: '1к4 колющий, для ритуалов' },
	{ id: 'cane_dagger', name: 'Трость-кинжал', category: 'weapon', weight: 0.5, price: 25, description: 'Скрытое оружие 1к4 колющий' },

	// ═══════════════ ДОСПЕХИ ═══════════════
	{ id: 'light_armor_item', name: 'Лёгкий доспех (кожаный)', category: 'armor', weight: 2, price: 30, description: '+5 к Броне' },
	{ id: 'heavy_armor_item', name: 'Тяжёлый доспех (кольчуга)', category: 'armor', weight: 6, price: 200, description: '+10 к Броне' },
	{ id: 'wooden_shield', name: 'Деревянный щит', category: 'armor', weight: 1.5, price: 15, description: '+5 к Броне, требует навыка Блокирование' },

	// ═══════════════ РАСХОДНИКИ ═══════════════
	{ id: 'potion_health', name: 'Зелье здоровья', category: 'consumable', weight: 0.1, price: 5, stackable: true, consumable: true, restoresHp: true, useDice: '1к6+2', useEffect: 'Восстанавливает 1к6+2 живучести. Действие.' },
	{ id: 'potion_heal', name: 'Зелье лечения (мастерское)', category: 'consumable', weight: 0.1, price: 30, stackable: true, consumable: true, restoresHp: true, useDice: '2к6+4', useEffect: 'Восстанавливает 2к6+4 живучести. Действие.' },
	{ id: 'holy_water', name: 'Святая вода', category: 'consumable', weight: 0.2, price: 5, stackable: true, consumable: true, useEffect: '1к6 урона излучением нежити. Метательное, даль 4 сажени.' },
	{ id: 'antidote', name: 'Противоядие', category: 'consumable', weight: 0.1, price: 10, stackable: true, consumable: true, curesCondition: 'poison', useEffect: 'Снимает состояние Отрава.' },
	{ id: 'torch', name: 'Факел', category: 'consumable', weight: 0.3, price: 1, stackable: true, description: 'Свет 4 сажени, горит 1 час' },
	{ id: 'oil_flask', name: 'Фляга масла', category: 'consumable', weight: 0.5, price: 3, stackable: true, consumable: true, description: 'Для ламп, разжигания или метания (1к4 огня)' },
	{ id: 'rations', name: 'Сухой паёк', category: 'consumable', weight: 0.3, price: 1, stackable: true, consumable: true, description: 'Еда на 1 день' },
	{ id: 'waterskin', name: 'Бурдюк с водой', category: 'consumable', weight: 0.5, price: 2, description: 'Вода на 2 дня' },
	{ id: 'wine', name: 'Вино (бутыль)', category: 'consumable', weight: 0.5, price: 1, stackable: true, consumable: true, description: 'Для пиров, подношений или дезинфекции' },
	{ id: 'bandage', name: 'Бинт (перевязка)', category: 'consumable', weight: 0.1, price: 1, stackable: true, consumable: true, curesCondition: 'bleeding', useEffect: 'Останавливает состояние Руда.' },
	{ id: 'rope', name: 'Верёвка (10 саженей)', category: 'misc', weight: 2, price: 3, description: 'Для лазания, страховки, ловушек' },
	{ id: 'chalk', name: 'Мел', category: 'misc', weight: 0.05, price: 0.1, stackable: true, description: 'Для меток, черчения рун' },
	{ id: 'matches', name: 'Огниво', category: 'misc', weight: 0.1, price: 1, description: 'Разжечь костёр' },
	{ id: 'waterskin_empty', name: 'Пустая фляга', category: 'misc', weight: 0.3, price: 0.5, description: 'Ёмкость для воды' },
	{ id: 'small_crystal', name: 'Малый кристалл Живы', category: 'consumable', weight: 0.1, price: 10, stackable: true, consumable: true, restoresResource: 'mana', useDice: '1к4', useEffect: '+1к4 живы или энергии для механизма.' },

	// ═══════════════ ИНСТРУМЕНТЫ ═══════════════
	{ id: 'thieves_tools', name: 'Воровские инструменты', category: 'tool', weight: 1, price: 50, description: 'Отмычки и напильники для Взлома' },
	{ id: 'alchemy_kit', name: 'Алхимический набор', category: 'tool', weight: 3, price: 80, description: 'Колбы, реторты, реактивы для Алхимии' },
	{ id: 'smithing_kit', name: 'Кузнечный набор', category: 'tool', weight: 10, price: 100, description: 'Молоты, клещи, наковальня (малая)' },
	{ id: 'medical_kit', name: 'Медицинский набор', category: 'tool', weight: 2, price: 45, description: 'Скальпели, иглы, нити, жгуты' },
	{ id: 'cartographer_kit', name: 'Набор картографа', category: 'tool', weight: 2, price: 40, description: 'Циркуль, линейка, чернила' },
	{ id: 'climbing_kit', name: 'Набор скалолаза', category: 'tool', weight: 8, price: 60, description: 'Крючья, верёвки, карабины' },
	{ id: 'disguise_kit', name: 'Гримёрный набор', category: 'tool', weight: 2, price: 30, description: 'Краски, парики, клей' },
	{ id: 'ritual_kit', name: 'Ритуальный набор', category: 'tool', weight: 3, price: 70, description: 'Свечи, благовония, нож, вода' },
	{ id: 'cooking_kit', name: 'Походный котёл', category: 'tool', weight: 4, price: 25, description: 'Для готовки на привале' },

	// ═══════════════ ЦЕННОСТИ ═══════════════
	{ id: 'iron_ingot', name: 'Слиток железа', category: 'treasure', weight: 1, price: 5, stackable: true, description: 'Сырьё для кузнеца' },
	{ id: 'silver_ingot', name: 'Слиток серебра', category: 'treasure', weight: 1, price: 15, stackable: true, description: 'Сырьё для кузнеца, ценно' },
	{ id: 'gem', name: 'Драгоценный камень', category: 'treasure', weight: 0.05, price: 100, stackable: true, description: 'Для украшений и зачарований' },
	{ id: 'spell_scroll', name: 'Свиток заклинания', category: 'treasure', weight: 0.1, price: 50, description: 'Одноразовое заклинание 1-го круга' },
	{ id: 'magic_ink', name: 'Магические чернила', category: 'treasure', weight: 0.3, price: 25, description: 'Для зачарования, рун, карт' },

	// ═══════════════ ОДЕЖДА И МЕЛОЧИ ═══════════════
	{ id: 'clothes', name: 'Простая одежда', category: 'misc', weight: 0.5, price: 1, description: 'Рубаха, штаны, пояс' },
	{ id: 'cloak', name: 'Дорожный плащ', category: 'misc', weight: 0.7, price: 5, description: 'Защита от непогоды' },
	{ id: 'boots', name: 'Сапоги', category: 'misc', weight: 0.5, price: 3, description: 'Крепкие кожаные' },
	{ id: 'bag', name: 'Сумка', category: 'misc', weight: 0.3, price: 1, description: 'Для мелких вещей' },
	{ id: 'mug', name: 'Кружка', category: 'misc', weight: 0.2, price: 0.5, description: 'Глиняная или деревянная' },
	{ id: 'bedroll', name: 'Спальный мешок', category: 'misc', weight: 1, price: 2, description: 'Тёплый, для ночёвки в поле' }
];

export const ITEMS_BY_CATEGORY: Record<ItemCategory, Item[]> = ITEMS.reduce(
	(acc, item) => {
		if (!acc[item.category]) acc[item.category] = [];
		acc[item.category].push(item);
		return acc;
	},
	{} as Record<ItemCategory, Item[]>
);

export const CATEGORY_LABEL: Record<ItemCategory, string> = {
	weapon: 'Оружие',
	armor: 'Доспехи и щиты',
	consumable: 'Расходники',
	tool: 'Инструменты',
	treasure: 'Ценности',
	misc: 'Прочее'
};

export function getItem(itemId: string): Item | undefined {
	return ITEMS.find((i) => i.id === itemId);
}