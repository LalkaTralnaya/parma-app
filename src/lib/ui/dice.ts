import { writable, get } from 'svelte/store';

export type DicePresentation = {
  sides: number; value: number; label: string; target?: number; hold?: boolean; signal?: AbortSignal;
  finish: () => void;
};
export const dicePresentation = writable<DicePresentation | null>(null);
let queue = Promise.resolve();

/** Display an existing result. Presentation never generates or changes a roll. */
export function showDice(input: Omit<DicePresentation, 'finish'>): Promise<void> {
  if (typeof window === 'undefined' || ![20, 100].includes(input.sides)) return Promise.resolve();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || localStorage.getItem('parma_dice_animation') === 'off') return Promise.resolve();
  const task = queue.then(() => new Promise<void>((resolve) => {
    if (input.signal?.aborted || window.matchMedia('(prefers-reduced-motion: reduce)').matches || localStorage.getItem('parma_dice_animation') === 'off') { resolve(); return; }
    const finish = () => {
      clearTimeout(watchdog);
      input.signal?.removeEventListener('abort', finish);
      if (get(dicePresentation)?.finish === finish) dicePresentation.set(null);
      resolve();
    };
    const watchdog = setTimeout(finish, input.hold ? 60000 : 10000);
    input.signal?.addEventListener('abort', finish, { once: true });
    dicePresentation.set({ ...input, finish });
  }));
  queue = task;
  return task;
}
