import { CONDITIONS } from '$lib/rules/conditions';

export const CONDITION_ART_IDS = [
  'bleeding', 'poisoned', 'stunned', 'darkness',
  'frightened', 'charmed', 'paralyzed', 'burning',
  'frozen', 'exhausted', 'diseased', 'invisible',
  'blessed', 'cursed', 'asleep', 'magic_sleep'
] as const;

const normalize = (value: string) => value.trim().toLocaleLowerCase('ru').replace(/\s+/g, ' ');
const names: Record<string, string[]> = Object.fromEntries(CONDITIONS.map(condition => [normalize(condition.name), [condition.id]]));
Object.assign(names, {
  'тьма': ['darkness'],
  'ослепление': ['darkness'],
  'маг. сон': ['magic_sleep'],
  'благословение / проклятие': ['blessed', 'cursed'],
  'изнеможение / хворь': ['exhausted', 'diseased']
});

export function conditionArtIndices(id = '', name = ''): number[] {
  const ids = CONDITION_ART_IDS.includes(id as typeof CONDITION_ART_IDS[number]) ? [id] : names[normalize(name)] ?? [];
  return ids.map(value => CONDITION_ART_IDS.indexOf(value as typeof CONDITION_ART_IDS[number])).filter(index => index >= 0);
}
