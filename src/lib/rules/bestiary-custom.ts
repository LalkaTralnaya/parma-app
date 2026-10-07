import type { BaseMonster } from './bestiary';

// Авторские карточки для названных пользователем существ без отдельного стат-блока в книгах.
export const BESTIARY_CUSTOM: BaseMonster[] = [
	{
		id: 'boar',
		name: 'Кабан',
		source: 'custom',
		description: 'Крупный лесной зверь, который бросается на того, кто вторгся на его территорию.',
		baseLevel: 1,
		dangerLabel: '1',
		primaryStat: 'strength',
		baseMods: { strength: 8, dexterity: 6, intelligence: 3, eloquence: 2, religion: 3 },
		hp: 36,
		armor: 14,
		speed: 8,
		attacks: [
			{ name: 'Клыки', hitBonus: 8, attackStat: 'strength', damageStat: 'strength', damageDice: '1к8', damageType: 'колющий' },
			{ name: 'Рывок', hitBonus: 13, attackStat: 'strength', attackBonus: 5, damageStat: 'strength', damageDice: '2к6', damageType: 'колющий', notes: 'Доступен после перемещения минимум на 4 сажени по прямой. Цель проходит Избавление Силы или падает.' }
		],
		traits: [
			'Толстая шкура: Броня 14 уже учитывает природную защиту.',
			'Упрямство: +5 к Избавлению Силы против захвата и сбивания с ног.'
		]
	},
	{
		id: 'vodyanoy',
		name: 'Водяной',
		source: 'custom',
		description: 'Древний дух реки или озера, который заманивает нарушителей в глубину.',
		baseLevel: 4,
		dangerLabel: '4',
		primaryStat: 'intelligence',
		hpStat: 'intelligence',
		baseMods: { strength: 8, dexterity: 8, intelligence: 9, eloquence: 8, religion: 7 },
		hp: 48,
		armor: 15,
		speed: 6,
		movement: '6 саженей на суше, 10 саженей в воде',
		attacks: [
			{ name: 'Хватка глубины', hitBonus: 8, attackStat: 'strength', damageStat: 'strength', damageDice: '1к8', damageType: 'дробящий', notes: 'При попадании цель проходит Избавление Силы или оказывается схваченной до конца следующего хода.' },
			{ name: 'Омут', hitBonus: 9, attackStat: 'intelligence', damageModifier: 0, damageDice: '2к6', damageType: 'холод', ignoresArmor: true, notes: 'Цель в пределах 10 саженей проходит Избавление Ловкости. При провале получает полный урон и теряет 2 сажени скорости на 1 раунд; при успехе — половину урона.' }
		],
		traits: [
			'Хозяин воды: в воде +5 к Броне и попаданию.',
			'Подводное дыхание: не нуждается в воздухе.',
			'Связь с водоёмом: вдали от своего водоёма не может использовать «Омут».'
		]
	}
];
