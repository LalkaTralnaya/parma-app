import type { Item } from './items';

export type ParmaSeason = 'spring' | 'summer' | 'ousen' | 'winter';
export type TavernKind = 'dish' | 'drink' | 'meal' | 'provision';

export const PARMA_SEASONS: Array<{ id: ParmaSeason; label: string }> = [
	{ id: 'spring', label: 'Весна' },
	{ id: 'summer', label: 'Лѣто' },
	{ id: 'ousen', label: 'Оусень' },
	{ id: 'winter', label: 'Зима' }
];

export const TAVERN_REGIONS = [
	{ id: 'forest', label: 'Асгард и лесная Гардарика' },
	{ id: 'veche', label: 'Вечевые республики' },
	{ id: 'volnitsa', label: 'Вольница' },
	{ id: 'haritonia', label: 'Харитония' },
	{ id: 'steppe', label: 'Кочевые степи' },
	{ id: 'eastern', label: 'Восточные рубежи' },
	{ id: 'other', label: 'Другая местность' }
] as const;

export interface TavernProduct {
	id: string;
	name: string;
	description: string;
	priceCopper: number;
	kind: TavernKind;
	availableSeasons?: ParmaSeason[];
	favoredRegions?: string[];
}

/** Меню и цены по «Меню корчмы Пармы»; цены хранятся в медяках. */
export const TAVERN_MENU: TavernProduct[] = [
	{ id: 'tavern_rye_bread', name: 'Ржаной хлеб', description: 'Два толстых ломтя.', priceCopper: 1, kind: 'dish', favoredRegions: ['veche', 'eastern'] },
	{ id: 'tavern_flatbread', name: 'Лепёшка', description: 'Одна большая лепёшка.', priceCopper: 2, kind: 'dish', favoredRegions: ['haritonia', 'steppe'] },
	{ id: 'tavern_millet_porridge', name: 'Пшённая каша', description: 'Миска каши на воде.', priceCopper: 3, kind: 'dish', favoredRegions: ['volnitsa', 'eastern'] },
	{ id: 'tavern_barley_onion', name: 'Ячменная каша с луком', description: 'Миска каши с жареным луком.', priceCopper: 4, kind: 'dish', favoredRegions: ['volnitsa', 'eastern'] },
	{ id: 'tavern_oat_milk', name: 'Овсяная каша с молоком', description: 'Миска горячей каши.', priceCopper: 5, kind: 'dish', favoredRegions: ['volnitsa'] },
	{ id: 'tavern_butter_porridge', name: 'Каша с маслом', description: 'Миска пшённой или ячменной каши.', priceCopper: 5, kind: 'dish', favoredRegions: ['volnitsa', 'eastern'] },
	{ id: 'tavern_mushroom_porridge', name: 'Каша с грибами', description: 'Миска каши с лесными грибами.', priceCopper: 7, kind: 'dish', availableSeasons: ['summer', 'ousen'], favoredRegions: ['forest'] },
	{ id: 'tavern_pea_soup', name: 'Гороховая похлёбка', description: 'Густая миска с луком.', priceCopper: 5, kind: 'dish', favoredRegions: ['eastern', 'volnitsa'] },
	{ id: 'tavern_shchi', name: 'Щи', description: 'Миска капустных щей без мяса.', priceCopper: 5, kind: 'dish', favoredRegions: ['volnitsa'] },
	{ id: 'tavern_turnip', name: 'Томлёная репа', description: 'Порция из печи.', priceCopper: 4, kind: 'dish', favoredRegions: ['volnitsa'] },
	{ id: 'tavern_sauerkraut', name: 'Квашеная капуста', description: 'Небольшая миска.', priceCopper: 2, kind: 'dish' },
	{ id: 'tavern_salted_mushrooms', name: 'Солёные грибы', description: 'Небольшая миска припасённых грибов.', priceCopper: 4, kind: 'dish', favoredRegions: ['forest'] },
	{ id: 'tavern_cottage_cheese', name: 'Творог', description: 'Миска свежего творога.', priceCopper: 6, kind: 'dish', favoredRegions: ['volnitsa', 'steppe'] },
	{ id: 'tavern_dried_curd', name: 'Сушёный творог', description: 'Дорожная порция.', priceCopper: 5, kind: 'provision', favoredRegions: ['steppe'] },
	{ id: 'tavern_fish_soup', name: 'Рыбная похлёбка', description: 'Миска с кусками местной рыбы.', priceCopper: 8, kind: 'dish', favoredRegions: ['veche', 'haritonia'] },
	{ id: 'tavern_fish_pie', name: 'Рыбник', description: 'Кусок пирога с рыбой.', priceCopper: 12, kind: 'dish', favoredRegions: ['veche', 'haritonia'] },
	{ id: 'tavern_baked_fish', name: 'Запечённая рыба', description: 'Порция с луком.', priceCopper: 18, kind: 'dish', favoredRegions: ['veche', 'haritonia'] },
	{ id: 'tavern_dried_fish', name: 'Сушёная или вяленая рыба', description: 'Небольшая дорожная порция.', priceCopper: 6, kind: 'provision', favoredRegions: ['veche', 'haritonia', 'eastern'] },
	{ id: 'tavern_meat_shchi', name: 'Щи с мясом', description: 'Миска с мясом и капустой.', priceCopper: 12, kind: 'dish', favoredRegions: ['volnitsa'] },
	{ id: 'tavern_kulish', name: 'Кулеш с салом', description: 'Миска пшённого кулеша с луком.', priceCopper: 10, kind: 'dish', favoredRegions: ['eastern', 'steppe'] },
	{ id: 'tavern_meat_soup', name: 'Мясная похлёбка', description: 'Миска с мясом и овощами.', priceCopper: 15, kind: 'dish', favoredRegions: ['haritonia', 'steppe'] },
	{ id: 'tavern_jerky', name: 'Вяленое мясо', description: 'Небольшая порция в дорогу.', priceCopper: 10, kind: 'provision', favoredRegions: ['steppe', 'eastern'] },
	{ id: 'tavern_roast', name: 'Печёное мясо', description: 'Порция свинины или баранины.', priceCopper: 30, kind: 'dish', favoredRegions: ['haritonia', 'steppe'] },
	{ id: 'tavern_game_roast', name: 'Жаркое из дичи', description: 'Порция с овощами; зависит от наличия добычи.', priceCopper: 40, kind: 'dish', availableSeasons: ['ousen', 'winter'], favoredRegions: ['forest'] },
	{ id: 'tavern_vegetable_pie', name: 'Пирог с капустой или горохом', description: 'Один небольшой пирог.', priceCopper: 4, kind: 'dish', favoredRegions: ['volnitsa'] },
	{ id: 'tavern_mushroom_pie', name: 'Пирог с грибами', description: 'Один небольшой пирог.', priceCopper: 6, kind: 'dish', availableSeasons: ['summer', 'ousen'], favoredRegions: ['forest'] },
	{ id: 'tavern_meat_pie', name: 'Пирог с мясом', description: 'Один небольшой пирог.', priceCopper: 10, kind: 'dish', favoredRegions: ['eastern', 'steppe'] },
	{ id: 'tavern_berry_porridge', name: 'Каша с мёдом и ягодами', description: 'Одна миска.', priceCopper: 9, kind: 'dish', availableSeasons: ['summer', 'ousen'], favoredRegions: ['forest'] },
	{ id: 'tavern_berry_pie', name: 'Ягодный пирог', description: 'Один небольшой пирог.', priceCopper: 6, kind: 'dish', availableSeasons: ['summer', 'ousen'], favoredRegions: ['forest'] },
	{ id: 'tavern_honey', name: 'Мёд к хлебу или каше', description: 'Небольшая добавка.', priceCopper: 3, kind: 'dish', favoredRegions: ['forest'] },
	{ id: 'tavern_water', name: 'Вода', description: 'Кружка местной воды к заказу.', priceCopper: 0, kind: 'drink' },
	{ id: 'tavern_kvas', name: 'Квас', description: 'Одна кружка.', priceCopper: 2, kind: 'drink' },
	{ id: 'tavern_berry_drink', name: 'Ягодный взвар', description: 'Одна чаша.', priceCopper: 3, kind: 'drink', availableSeasons: ['summer', 'ousen'], favoredRegions: ['forest'] },
	{ id: 'tavern_milk', name: 'Молоко', description: 'Одна кружка.', priceCopper: 3, kind: 'drink', favoredRegions: ['volnitsa', 'steppe'] },
	{ id: 'tavern_sour_milk', name: 'Кисломолочный напиток', description: 'Одна кружка.', priceCopper: 3, kind: 'drink', favoredRegions: ['steppe'] },
	{ id: 'tavern_sbiten', name: 'Обычный сбитень', description: 'Горячий напиток с мёдом и травами.', priceCopper: 6, kind: 'drink', favoredRegions: ['forest'] },
	{ id: 'tavern_honey_ale', name: 'Медовый хмельной напиток', description: 'Одна кружка для гостей и праздников.', priceCopper: 8, kind: 'drink' },
	{ id: 'tavern_simple_lunch', name: 'Простой обед', description: 'Щи без мяса, хлеб и квас.', priceCopper: 8, kind: 'meal' },
	{ id: 'tavern_hearty_porridge', name: 'Сытная каша', description: 'Каша с грибами, хлеб и квас.', priceCopper: 10, kind: 'meal', availableSeasons: ['summer', 'ousen'], favoredRegions: ['forest'] },
	{ id: 'tavern_fisher_lunch', name: 'Рыбацкий обед', description: 'Рыбная похлёбка, рыбник и квас.', priceCopper: 22, kind: 'meal', favoredRegions: ['veche', 'haritonia'] },
	{ id: 'tavern_druzhina_lunch', name: 'Обед дружинника', description: 'Кулеш с салом, мясной пирог, хлеб и квас.', priceCopper: 23, kind: 'meal', favoredRegions: ['eastern', 'steppe'] },
	{ id: 'tavern_good_dinner', name: 'Добрый ужин', description: 'Печёное мясо, каша с маслом, капуста, хлеб и медовый напиток.', priceCopper: 46, kind: 'meal', favoredRegions: ['haritonia', 'steppe'] },
	{ id: 'tavern_feast_lunch', name: 'Сытный обед корчмы', description: 'Жаркое из дичи, каша с маслом, грибной пирог, хлеб, ягодный пирог и две кружки сбитня.', priceCopper: 100, kind: 'meal', availableSeasons: ['ousen'], favoredRegions: ['forest'] },
	{ id: 'tavern_day_ration', name: 'Обычный дорожный паёк на день', description: 'Сухой хлеб и немного вяленого мяса.', priceCopper: 5, kind: 'provision' }
];

/** Еда и напитки существуют в инвентаре, но продаются только через отдельную Таверну. */
export const TAVERN_ITEMS: Item[] = TAVERN_MENU.map((product) => ({
	id: product.id,
	name: product.name,
	category: 'consumable',
	price: product.priceCopper / 100,
	description: product.description,
	stackable: true,
	consumable: true,
	tavernOnly: true
}));

export function isAvailableInSeason(product: TavernProduct, season: ParmaSeason): boolean {
	return !product.availableSeasons || product.availableSeasons.includes(season);
}
