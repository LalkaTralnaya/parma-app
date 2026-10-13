import type { Character } from '$lib/type';
import { getItem } from '../rules/items';
import { addItemToInventory, getTotalCopper, normalizeMoney } from './inventory';

/** Buy whole bundles at catalog prices; leave the character untouched on failure. */
export function purchaseItem(character: Character, itemId: string, bundles = 1): Character {
 const item = getItem(itemId);
 if (!item || item.price === undefined || !Number.isFinite(item.price) || item.price < 0) throw new Error('Для предмета не указана цена.');
 if (!Number.isSafeInteger(bundles) || bundles < 1 || bundles > 99) throw new Error('Выберите количество от 1 до 99.');
 const costCopper = Math.round(item.price * 100) * bundles;
 if (getTotalCopper(character.money) < costCopper) throw new Error('Недостаточно денег для покупки.');
 const updated = addItemToInventory(character, item.id, (item.bundleQuantity ?? 1) * bundles);
 updated.money = normalizeMoney({ copper: getTotalCopper(character.money) - costCopper, silver: 0, gold: 0 });
 return updated;
}
