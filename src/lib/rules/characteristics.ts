export interface Characteristic {
	id: string;
	name: string;
	short: string;
}

export const CHARACTERISTICS: Characteristic[] = [
	{ id: 'strength',     name: 'Сила',        short: 'СИЛ' },
	{ id: 'intelligence', name: 'Интеллект',   short: 'ИНТ' },
	{ id: 'dexterity',    name: 'Ловкость',    short: 'ЛОВ' },
	{ id: 'eloquence',    name: 'Красноречие', short: 'КРА' },
	{ id: 'religion',     name: 'Религия',     short: 'РЕЛ' }
];

export const BASE_CHARACTERISTIC_VALUE = 36;
export const MAX_CHECK_TARGET = 95;