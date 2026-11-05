import test from 'node:test';
import assert from 'node:assert/strict';
import { HELP_DAY as DAY, HELP_WEEK as WEEK, HELP_ABSENCE as ABSENCE, helpHistory, helpWindow, recordHelpActivity, shouldShowHelp, mergeHelpHistory, contextHelp } from '../src/lib/ui/novice-help.ts';

const start = Date.parse('2026-11-05T12:00:00Z');
const created = new Date(start).toISOString();
const old = new Date(start - 100 * DAY).toISOString();

test('new account has exactly seven days from creation, not from first login', () => {
  let state = recordHelpActivity(created, null, start + 2 * DAY);
  assert.equal(shouldShowHelp(created, state, start + WEEK - 1), true);
  assert.equal(shouldShowHelp(created, state, start + WEEK), false);
  state = recordHelpActivity(created, state, start + 8 * DAY);
  assert.equal(shouldShowHelp(created, state, start + 8 * DAY), false);
  assert.equal(helpWindow(created, state, start + 8 * DAY).until, start + WEEK);
});

test('thirty days of absence starts one fixed week, ordinary visits cannot extend it', () => {
  const before = helpHistory({ lastActive: start });
  assert.equal(recordHelpActivity(old, before, start + ABSENCE - 1).returnUntil, 0);
  const returnedAt = start + ABSENCE;
  let state = recordHelpActivity(old, before, returnedAt);
  assert.equal(state.returnUntil, returnedAt + WEEK);
  assert.equal(helpWindow(old, state, returnedAt).returning, true);
  for (let day = 1; day <= 8; day++) state = recordHelpActivity(old, state, returnedAt + day * DAY);
  assert.equal(state.returnUntil, returnedAt + WEEK);
  assert.equal(shouldShowHelp(old, state, returnedAt + WEEK), false);
});

test('a subsequent thirty-day absence restores help and clears prior dismissals', () => {
  const hidden = { lastActive: start, returnUntil: start + WEEK, hiddenUntil: start + WEEK, dismissed: ['sheet'] };
  assert.equal(shouldShowHelp(old, hidden, start), false);
  const state = recordHelpActivity(old, hidden, start + ABSENCE);
  assert.equal(shouldShowHelp(old, state, start + ABSENCE), true);
  assert.deepEqual(state.dismissed, []);
  assert.equal(state.hiddenUntil, 0);
});

test('an old account without activity history is not falsely declared absent', () => {
  const state = recordHelpActivity(old, undefined, start);
  assert.equal(state.returnUntil, 0);
  assert.equal(shouldShowHelp(old, state, start), false);
  assert.equal(shouldShowHelp('invalid', state, start), false);
});

test('activity on another device prevents a false return window', () => {
  const history = mergeHelpHistory({ lastActive: start + 29 * DAY }, { lastActive: start });
  const state = recordHelpActivity(old, history, start + 30 * DAY);
  assert.equal(state.returnUntil, 0);
  const merged = mergeHelpHistory({ returnUntil: start + WEEK }, { hiddenUntil: start + WEEK, dismissed: ['home'] });
  assert.equal(shouldShowHelp(old, merged, start), false);
});

test('malformed cached history is safe and every displayed tip has readable content', () => {
  assert.deepEqual(helpHistory({ lastActive: 'yesterday', returnUntil: NaN, dismissed: [1, null, 'home'] }), { lastActive: 0, returnUntil: 0, hiddenUntil: 0, dismissed: ['home'] });
  for (const route of ['/', '/new', '/char/test', '/lore', '/mechanics', '/adventures/doroga-v-gardariki', '/gm', '/room', '/gm/combat', '/gm/bestiary', '/account', '/lavka', '/events']) {
    const help = contextHelp(route);
    assert.ok(help?.tips.length, route);
    for (const tip of help.tips) { assert.ok(tip.title.trim()); assert.ok(tip.text.trim()); }
  }
  assert.match(contextHelp('/char/test', '#abilities').tips[0].text, /кружок/);
  assert.notEqual(contextHelp('/char/test', '#abilities').id, contextHelp('/char/test', '#spells').id);
  assert.equal(contextHelp('/learn'), null);
});
