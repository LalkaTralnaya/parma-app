import test from 'node:test';
import assert from 'node:assert/strict';
import { diceNotation } from '../src/lib/engine/dice-animation.ts';

test('percentile animation uses tens and units, with 00 + 0 representing 100', () => {
  assert.equal(diceNotation(100, 1), '1d100+1d10@100,1');
  assert.equal(diceNotation(100, 7), '1d100+1d10@100,7');
  assert.equal(diceNotation(100, 10), '1d100+1d10@10,10');
  assert.equal(diceNotation(100, 37), '1d100+1d10@30,7');
  assert.equal(diceNotation(100, 99), '1d100+1d10@90,9');
  assert.equal(diceNotation(100, 100), '1d100+1d10@100,10');
});

test('animation uses the supplied d20 outcome and rejects impossible faces', () => {
  assert.equal(diceNotation(20, 20), '1d20@20');
  assert.equal(diceNotation(20, 1), '1d20@1');
  assert.throws(() => diceNotation(20, 0), RangeError);
  assert.throws(() => diceNotation(20, 21), RangeError);
  assert.throws(() => diceNotation(20, 1.5), RangeError);
});

test('disabling animation skips rolls already waiting in the queue', async () => {
  const { showDice, dicePresentation } = await import('../src/lib/ui/dice.ts');
  const { get } = await import('svelte/store');
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  let disabled = false;
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  globalThis.localStorage = { getItem: () => disabled ? 'off' : null };
  try {
    const first = showDice({ sides: 20, value: 1, label: 'first' });
    const second = showDice({ sides: 20, value: 2, label: 'second' });
    await new Promise(setImmediate);
    assert.equal(get(dicePresentation).value, 1);
    disabled = true;
    get(dicePresentation).finish();
    await first;
    await new Promise(setImmediate);
    assert.equal(get(dicePresentation), null);
    await second;
  } finally {
    get(dicePresentation)?.finish();
    globalThis.window = previousWindow;
    globalThis.localStorage = previousStorage;
  }
});

test('leaving a page cancels its held preview and skips its pending rolls', async () => {
  const { showDice, dicePresentation } = await import('../src/lib/ui/dice.ts');
  const { get } = await import('svelte/store');
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  globalThis.localStorage = { getItem: () => null };
  const lifetime = new AbortController();
  try {
    const first = showDice({ sides: 100, value: 33, label: 'preview', hold: true, signal: lifetime.signal });
    const queued = showDice({ sides: 20, value: 7, label: 'queued', signal: lifetime.signal });
    await new Promise(setImmediate);
    lifetime.abort();
    await new Promise(setImmediate);
    assert.equal(get(dicePresentation), null);
    await Promise.all([first, queued]);
  } finally {
    get(dicePresentation)?.finish();
    await new Promise(setImmediate);
    get(dicePresentation)?.finish();
    globalThis.window = previousWindow;
    globalThis.localStorage = previousStorage;
  }
});
