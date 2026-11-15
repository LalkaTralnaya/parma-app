export function verifiedDiceSummary(roll: { server_roll_id?: string | null; roll_data: Record<string, unknown> }): string | null {
 if (!roll.server_roll_id) return null;
 const { label, sides, values } = roll.roll_data;
 if (typeof label !== 'string' || !Array.isArray(sides) || !Array.isArray(values) || sides.length !== values.length || !sides.length) return null;
 if (!sides.every((count, index) => Number.isInteger(count) && Number.isInteger(values[index]) && values[index] >= 1 && values[index] <= count)) return null;
 return `${label}: ${sides.map((count, index) => `к${count} = ${values[index]}`).join(', ')} · серверный бросок`;
}
