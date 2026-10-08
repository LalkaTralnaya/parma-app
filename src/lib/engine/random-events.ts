import type { EventTable } from '../rules/random-events';
export function resolveEvent(table: EventTable, value: number): { value: number; row: number } {
  if (!Number.isInteger(value) || value < 1 || value > table.sides) throw new Error('Invalid event roll');
  const row = table.rows.findIndex(entry => value >= entry.min && value <= entry.max);
  if (row === -1) throw new Error('Event table has no matching row');
  return { value, row };
}
export function rollEvent(table: EventTable, die: (sides: number) => number = sides => Math.floor(Math.random() * sides) + 1) {
  return resolveEvent(table, die(table.sides));
}
