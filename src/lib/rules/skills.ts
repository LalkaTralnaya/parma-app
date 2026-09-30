export interface Skill {
	id: string;
	name: string;
	parent: 'strength' | 'intelligence' | 'dexterity' | 'eloquence' | 'religion';
}

export const SKILLS: Skill[] = [
	// ─── Интеллект (Маг) ───
	{ id: 'destruction',     name: 'Разрушение',              parent: 'intelligence' },
	{ id: 'transmutation',   name: 'Изменение',               parent: 'intelligence' },
	{ id: 'witchcraft',      name: 'Колдовство',              parent: 'intelligence' },
	{ id: 'illusion',        name: 'Иллюзия',                 parent: 'intelligence' },
	{ id: 'restoration',     name: 'Восстановление',          parent: 'intelligence' },
	{ id: 'enchantment',     name: 'Зачарование',             parent: 'intelligence' },
	{ id: 'perception',      name: 'Наблюдательность',        parent: 'intelligence' },
	{ id: 'survival',        name: 'Выживание',               parent: 'intelligence' },
	{ id: 'animal_handling', name: 'Обращение с животными',   parent: 'intelligence' },

	// ─── Сила (Воин) ───
	{ id: 'smithing',        name: 'Кузнечное дело',          parent: 'strength' },
	{ id: 'heavy_armor',     name: 'Тяжёлая броня',           parent: 'strength' },
	{ id: 'blocking',        name: 'Блокирование',            parent: 'strength' },
	{ id: 'two_handed',      name: 'Двуручное оружие',        parent: 'strength' },
	{ id: 'one_handed',      name: 'Одноручное оружие',       parent: 'strength' },
	{ id: 'archery',         name: 'Стрельба',                parent: 'strength' },
	{ id: 'athletics',       name: 'Атлетика',                parent: 'strength' },
	{ id: 'fortitude',       name: 'Стойкость',               parent: 'strength' },

	// ─── Ловкость (Вор) ───
	{ id: 'light_armor',     name: 'Лёгкая броня',            parent: 'dexterity' },
	{ id: 'stealth',         name: 'Скрытность',              parent: 'dexterity' },
	{ id: 'lockpicking',     name: 'Взлом',                   parent: 'dexterity' },
	{ id: 'pickpocketing',   name: 'Карманные кражи',         parent: 'dexterity' },
	{ id: 'alchemy',         name: 'Алхимия',                 parent: 'dexterity' },
	{ id: 'evasion',         name: 'Уклонение',               parent: 'dexterity' },

	// ─── Красноречие (Дипломат) ───
	{ id: 'persuasion',      name: 'Убеждение',               parent: 'eloquence' },
	{ id: 'deception',       name: 'Обман',                   parent: 'eloquence' },
	{ id: 'intimidation',    name: 'Запугивание',             parent: 'eloquence' },
	{ id: 'trade',           name: 'Торговля',                parent: 'eloquence' },
	{ id: 'gossip',          name: 'Сплетничество',           parent: 'eloquence' },

	// ─── Религия (Жрец) ───
	{ id: 'prayer',          name: 'Молитва',                 parent: 'religion' },
	{ id: 'cult_knowledge',  name: 'Знания культов',          parent: 'religion' },
	{ id: 'higher_power',    name: 'Сила высших',             parent: 'religion' }
];