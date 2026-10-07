export function diceNotation(sides: number, value: number): string {
  if (!Number.isInteger(value) || value < 1 || value > sides) throw new RangeError('Invalid die result');
  // The renderer calls the 00 face 100 and the units' 0 face 10.
  if (sides === 100) return `1d100+1d10@${Math.floor((value % 100) / 10) * 10 || 100},${value % 10 || 10}`;
  return `1d${sides}@${value}`;
}
