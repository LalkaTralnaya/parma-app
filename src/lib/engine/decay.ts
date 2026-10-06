import type { Character } from '$lib/type';

/** Поздняя справка основной книги «Парма», таблица «Механика: очки Тлена». */
export interface DecayStage {
  /** Индекс порога, а не номер сюжетной стадии Чернобога. */
  level: 0 | 1 | 2 | 3 | 4;
  bookStage: string;
  name: string;
  effects: string[];
  isPlayerCharacter: boolean;
}

function wholePoints(points: number): number {
  return Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
}

export function getDecayStage(points: number): DecayStage {
  const total = wholePoints(points);
  if (total >= 20) return {
    level: 4,
    bookStage: '4+',
    name: 'Поглощённый',
    effects: ['Персонаж становится неигровым или перерождается как тень; решение принимает Мастер.'],
    isPlayerCharacter: false
  };
  if (total >= 10) return {
    level: 3,
    bookStage: '4',
    name: 'Слуга Тьмы',
    effects: ['−15 к Убеждению.', '+15 к Запугиванию.', 'Нельзя использовать Благодать.'],
    isPlayerCharacter: true
  };
  if (total >= 5) return {
    level: 2,
    bookStage: '3',
    name: 'Теневой',
    effects: ['−10 к Убеждению.', '+10 к Запугиванию.', 'Нежить не атакует первой.'],
    isPlayerCharacter: true
  };
  if (total >= 1) return {
    level: 1,
    bookStage: '1–2',
    name: 'Отмеченный',
    effects: ['−5 к Убеждению с добрыми людьми.', '+5 к Запугиванию.'],
    isPlayerCharacter: true
  };
  return { level: 0, bookStage: '0', name: 'Чистый', effects: ['Нет эффектов Тлена.'], isPlayerCharacter: true };
}

export function normalizeDecay(value: Partial<Character['decay']> | null | undefined): Character['decay'] {
  const points = wholePoints(value?.points ?? 0);
  return { points, stage: getDecayStage(points).level };
}

export function adjustDecayPoints(char: Character, delta: number): Character {
  const current = normalizeDecay(char.decay);
  const points = Math.max(0, current.points + (Number.isFinite(delta) ? Math.trunc(delta) : 0));
  return { ...char, decay: { points, stage: getDecayStage(points).level } };
}

/** Штраф Убеждения на 1–4 ОТ действует лишь с добрыми людьми. */
export function getDecaySkillModifier(points: number, skillId: string, targetIsGoodPerson = false): number {
  const total = wholePoints(points);
  if (skillId === 'intimidation') return total >= 10 ? 15 : total >= 5 ? 10 : total >= 1 ? 5 : 0;
  if (skillId !== 'persuasion') return 0;
  if (total >= 10) return -15;
  if (total >= 5) return -10;
  return total >= 1 && targetIsGoodPerson ? -5 : 0;
}

export function canUseGraceWithDecay(points: number): boolean {
  return wholePoints(points) < 10;
}

export function undeadAttacksFirst(points: number): boolean {
  return wholePoints(points) < 5;
}

export type DecaySource =
  | { kind: 'nezhiva_cast' }
  | { kind: 'navi_critical_failure'; d4: number }
  | { kind: 'grave_kon_violation'; points: number }
  | { kind: 'story'; points: number };

function requireInteger(value: number, min: number, max: number, label: string): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${label}: требуется целое число от ${min} до ${max}`);
  }
  return value;
}

/** Не бросает кости: результат броска или решение Мастера передаётся явно. */
export function gainDecay(char: Character, source: DecaySource): { character: Character; gained: number; stageChanged: boolean } {
  const gained = source.kind === 'nezhiva_cast' ? 1
    : source.kind === 'navi_critical_failure' ? requireInteger(source.d4, 1, 4, 'к4')
    : source.kind === 'grave_kon_violation' ? requireInteger(source.points, 2, 6, 'Нарушение Кона')
    : requireInteger(source.points, 1, Number.MAX_SAFE_INTEGER, 'Сюжетное воздействие');
  const before = getDecayStage(char.decay?.points ?? 0).level;
  const character = adjustDecayPoints(char, gained);
  return { character, gained, stageChanged: character.decay.stage !== before };
}

export interface DecayAtonementResult {
  character: Character;
  outcome: 'full' | 'partial' | 'failure';
  removed: number;
  stageChanged: boolean;
}

/** Поздняя справка: к100 = 1 снимает всё, 2–20 снимает 1к4, 21–100 не снимает ОТ.
 * Фраза «переходит на стадию ниже» противоречит размеру 1к4: стадию всегда определяют оставшиеся ОТ. */
export function resolveDecayAtonement(char: Character, d100: number, d4?: number): DecayAtonementResult {
  requireInteger(d100, 1, 100, 'к100');
  const before = normalizeDecay(char.decay);
  const outcome = d100 === 1 ? 'full' : d100 <= 20 ? 'partial' : 'failure';
  const amount = outcome === 'full' ? before.points
    : outcome === 'partial' ? requireInteger(d4 as number, 1, 4, 'к4') : 0;
  const removed = Math.min(before.points, amount);
  const character = adjustDecayPoints(char, -removed);
  return { character, outcome, removed, stageChanged: character.decay.stage !== before.stage };
}
