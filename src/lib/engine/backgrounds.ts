import type { Character } from '../type';
import { BACKGROUNDS } from '../rules/backgrounds';

/** Выдаётся только при создании героя; старые инвентари не мигрируют. */
export function giveBackgroundStartingInventory(char: Character, backgroundId?: string): boolean {
 const background = BACKGROUNDS.find(b => b.id === backgroundId);
 if (!background?.startingItems) return false;
 char.inventory ??= [];
 char.money ??= { copper: 0, silver: 0, gold: 0 };
 for (const item of background.startingItems) {
  char.inventory.push({ instanceId: crypto.randomUUID(), itemId: item.itemId, quantity: item.quantity });
 }
 char.money.silver += background.startingSilver ?? 0;
 return true;
}
