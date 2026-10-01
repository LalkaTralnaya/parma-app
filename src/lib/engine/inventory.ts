import { getItem, type Item } from '../rules/items';
import type { Character, InventoryItem } from '$lib/type';

/** Список инвентаря с расшифровкой из справочника */
export interface InventoryEntry {
	instance: InventoryItem;
	item: Item;
}

export function listInventory(char: Character): InventoryEntry[] {
	if (!char.inventory) return [];
	return char.inventory
		.map((instance) => {
			const item = getItem(instance.itemId);
			if (!item) return null;
			return { instance, item };
		})
		.filter((x): x is InventoryEntry => x !== null);
}

/** Добавить предмет в инвентарь. Если стакается и такой уже есть — увеличивает quantity. */
export function addItemToInventory(
	char: Character,
	itemId: string,
	qty: number = 1
): Character {
	const updated = JSON.parse(JSON.stringify(char)) as Character;
	if (!updated.inventory) updated.inventory = [];

	const item = getItem(itemId);
	if (!item) return updated;

	if (item.stackable) {
		const existing = updated.inventory.find((i) => i.itemId === itemId);
		if (existing) {
			existing.quantity += qty;
			return updated;
		}
	}

	updated.inventory.push({
		instanceId: crypto.randomUUID(),
		itemId,
		quantity: qty
	});
	return updated;
}

/** Удалить предмет (или уменьшить количество) */
export function removeItemFromInventory(
	char: Character,
	instanceId: string,
	qty: number = 1
): Character {
	const updated = JSON.parse(JSON.stringify(char)) as Character;
	if (!updated.inventory) return updated;

	const entry = updated.inventory.find((i) => i.instanceId === instanceId);
	if (!entry) return updated;

	if (entry.quantity <= qty) {
		updated.inventory = updated.inventory.filter((i) => i.instanceId !== instanceId);
	} else {
		entry.quantity -= qty;
	}
	return updated;
}

/** Изменить количество (+/−) */
export function adjustItemQuantity(
	char: Character,
	instanceId: string,
	delta: number
): Character {
	const updated = JSON.parse(JSON.stringify(char)) as Character;
	if (!updated.inventory) return updated;

	const entry = updated.inventory.find((i) => i.instanceId === instanceId);
	if (!entry) return updated;

	entry.quantity = Math.max(0, entry.quantity + delta);
	if (entry.quantity === 0) {
		updated.inventory = updated.inventory.filter((i) => i.instanceId !== instanceId);
	}
	return updated;
}

/** Общий вес инвентаря в пудах */
export function getTotalWeight(char: Character): number {
	return listInventory(char).reduce((sum, e) => sum + (e.item.weight ?? 0) * e.instance.quantity, 0);
}

/** Общая стоимость инвентаря (в серебряниках) */
export function getTotalValue(char: Character): number {
	return listInventory(char).reduce((sum, e) => sum + (e.item.price ?? 0) * e.instance.quantity, 0);
}

/** Общая сумма денег в серебряниках (для удобства сравнения) */
export function getMoneyInSilver(money: { copper: number; silver: number; gold: number }): number {
	return money.silver + money.gold * 100 + money.copper / 100;
}
/** Курсы валют */
export const CURRENCY_RATES = {
	copperPerSilver: 100,   // 100 медяков = 1 серебряник
	silverPerGold: 100       // 100 серебряников = 1 златник
};

/** Нормализация: перевести 100+ медяков в серебро, 100+ серебра в золото */
export function normalizeMoney(money: { copper: number; silver: number; gold: number }): {
	copper: number;
	silver: number;
	gold: number;
} {
	let totalCopper = money.copper
		+ money.silver * CURRENCY_RATES.copperPerSilver
		+ money.gold * CURRENCY_RATES.copperPerSilver * CURRENCY_RATES.silverPerGold;

	// Не даём уйти в минус
	if (totalCopper < 0) totalCopper = 0;

	const gold = Math.floor(totalCopper / (CURRENCY_RATES.copperPerSilver * CURRENCY_RATES.silverPerGold));
	totalCopper -= gold * CURRENCY_RATES.copperPerSilver * CURRENCY_RATES.silverPerGold;

	const silver = Math.floor(totalCopper / CURRENCY_RATES.copperPerSilver);
	totalCopper -= silver * CURRENCY_RATES.copperPerSilver;

	return { copper: totalCopper, silver, gold };
}

/** Всего денег в медяках (для сравнения цен) */
export function getTotalCopper(money: { copper: number; silver: number; gold: number }): number {
	return money.copper
		+ money.silver * CURRENCY_RATES.copperPerSilver
		+ money.gold * CURRENCY_RATES.copperPerSilver * CURRENCY_RATES.silverPerGold;
}

/** Может ли персонаж позволить покупку за N серебряников */
export function canAfford(char: Character, priceSilver: number): boolean {
	return getTotalCopper(char.money) >= priceSilver * CURRENCY_RATES.copperPerSilver;
}

/** Списать деньги за покупку. Возвращает новое состояние денег (уже нормализованное). */
export function spendSilver(char: Character, priceSilver: number): { copper: number; silver: number; gold: number } {
	const totalCopper = getTotalCopper(char.money) - priceSilver * CURRENCY_RATES.copperPerSilver;
	if (totalCopper < 0) return char.money;
	return normalizeMoney({
		copper: totalCopper,
		silver: 0,
		gold: 0
	});
}

/** Добавить деньги в медяках (награда, продажа, etc.) */
export function addCopper(money: { copper: number; silver: number; gold: number }, amount: number) {
	return normalizeMoney({
		copper: getTotalCopper(money) + amount,
		silver: 0,
		gold: 0
	});
}