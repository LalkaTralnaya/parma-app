import type { Character } from '$lib/type';

export interface DecayStage {
  level: 0 | 1 | 2 | 3;
  name: string;
  effects: string[];
}

export function getDecayStage(points: number): DecayStage {
  const total = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
  if (total >= 10) return {
    level: 3,
    name: 'Гниющий',
    effects: [
      '−15 к социальным проверкам (применяет Сказитель по ситуации).',
      '+10 к избавлению от Жути и Морока.',
      'Магическое лечение школы Восстановления требует проверку с −5.',
      '+10 к Скрытности от нежити и низших духов.',
      '1/день: игнорировать Ошеломление, Оцепенение или Паралич; затем получить Изнеможение.'
    ]
  };
  if (total >= 5) return {
    level: 2,
    name: 'Отмеченный Навью',
    effects: [
      '−10 к социальным проверкам (применяет Сказитель по ситуации).',
      '+5 к избавлению от Жути и Морока.',
      '1/день реакцией при атаке живого существа (не нежити): оно проходит Избавление Интеллекта или получает Жуть на 1 раунд; стоимость — 2 Бодрости.'
    ]
  };
  if (total >= 1) return {
    level: 1,
    name: 'Тень на душе',
    effects: [
      '−5 к Убеждению и Торговле с незнакомыми обычными людьми (применяет Сказитель по ситуации).',
      'Животные беспокоятся рядом.',
      '1/день: +5 к проверке Запугивания.'
    ]
  };
  return { level: 0, name: 'Чистый', effects: ['Нет эффектов Тлена.'] };
}

export function normalizeDecay(value: Partial<Character['decay']> | null | undefined): Character['decay'] {
  const points = Number.isFinite(value?.points) ? Math.max(0, Math.floor(value!.points!)) : 0;
  return { points, stage: getDecayStage(points).level };
}

export function adjustDecayPoints(char: Character, delta: number): Character {
  const current = normalizeDecay(char.decay);
  const points = Math.max(0, current.points + (Number.isFinite(delta) ? Math.trunc(delta) : 0));
  return { ...char, decay: { points, stage: getDecayStage(points).level } };
}

/** The book grants a bonus to saves against Frightened and Charmed at 5+ Tlen. */
export function getDecaySaveBonus(points: number, conditionId: string): number {
  if (conditionId !== 'frightened' && conditionId !== 'charmed') return 0;
  const stage = getDecayStage(points).level;
  return stage >= 3 ? 10 : stage >= 2 ? 5 : 0;
}
