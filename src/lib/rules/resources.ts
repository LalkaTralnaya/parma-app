export interface ResourceDef {
	id: string;
	name: string;
	short: string;
	parent: 'strength' | 'intelligence' | 'dexterity' | 'eloquence' | 'religion';
	base: number;
	baseModMul: number;
	perLevelDice: string;
	perLevelModMul: number;
}

export const RESOURCES: ResourceDef[] = [
	{ id: 'hp',        name: 'Здравие', short: 'ЗДР', parent: 'strength',     base: 20, baseModMul: 1, perLevelDice: '1d6', perLevelModMul: 1 },
	{ id: 'mana',      name: 'Жива',      short: 'ЖИВ', parent: 'intelligence', base: 10, baseModMul: 2, perLevelDice: '1d8', perLevelModMul: 1 },
	{ id: 'stamina',   name: 'Бодрость',  short: 'БДР', parent: 'dexterity',    base: 15, baseModMul: 1, perLevelDice: '1d6', perLevelModMul: 1 },
	{ id: 'influence', name: 'Влияние',   short: 'ВЛН', parent: 'eloquence',    base: 15, baseModMul: 1, perLevelDice: '1d6', perLevelModMul: 1 },
	{ id: 'grace',     name: 'Благодать', short: 'БЛГ', parent: 'religion',     base: 10, baseModMul: 2, perLevelDice: '1d8', perLevelModMul: 1 }
];