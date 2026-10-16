import test from 'node:test';
import assert from 'node:assert/strict';
import { IDEALS, BONDS, FLAWS, findOption } from '../src/lib/rules/personality.ts';

test('aspect choices offer only the five new examples per category', () => {
  for (const [list, prefix] of [[IDEALS, 'book16-ideals-'], [BONDS, 'book16-bonds-'], [FLAWS, 'book16-flaws-']]) {
    assert.equal(list.length, 5);
    assert.ok(list.every(option => option.id.startsWith(prefix)));
    assert.ok(list.every(option => option.name.length < 40 && option.description.length > option.name.length));
  }
});

test('saved legacy choices still resolve without returning to selection lists', () => {
  for (const [list, key, name] of [[IDEALS, 'freedom', 'Свобода'], [BONDS, 'family', 'Семья'], [FLAWS, 'pride', 'Гордыня']]) {
    assert.ok(!list.some(option => option.id === key));
    assert.equal(findOption(list, key)?.name, name);
  }
  assert.equal(findOption(IDEALS, 'family'), undefined);
});
