import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import * as entries from '../src/lib/rules/book16-reference-additions.ts';
import { readingBlocks, readingSections } from '../src/lib/ui/reference-reading.ts';
import { arrangeReference } from '../src/lib/ui/reference-order.ts';

test('reformatting the October 20 references preserves all original words, names and numbers', () => {
  const hashes = {
    MASTERS_REFERENCE: '14d85ab39ea21d4c95a9399eec36e571c445e84ee30ba8f8875ef667d89f9b47',
    NAVI_SHADOWS_REFERENCE: '7b258f3e8fca342ceee98a4372128767e06ac118d10931bdb99b6f3b11fe05ba',
    RULERS_REFERENCE: 'aa9b101e0e568511d019055b8e15518ae492add08e3cf0b2f699cb7c04505e99',
    SKILL_GROWTH_STORY: 'd4fb422d4bb7ee134bc23b1b070becb05ac57e39435361813e23c2c715331a4f'
  };
  for (const [key, expected] of Object.entries(hashes)) {
    const entry = entries[key];
    const words = entry.blocks.flatMap(block => block.kind === 'table' ? block.rows.flat() : [block.text]).join(' ').replaceAll('\u00ad', '-').split(/\s+/).filter(Boolean).sort().join('\n');
    assert.equal(crypto.createHash('sha256').update(words).digest('hex'), expected, key);
    for (const block of entry.blocks) {
      if (block.kind === 'paragraph') assert.ok(!block.text.includes('\n'), `${key}: no PDF line wrapping`);
      else assert.ok(block.rows.every(row => row.length === block.rows[0].length), `${key}: complete table rows`);
    }
  }
});

test('restored tables include twelve elder mages and all twenty named shadow powers', () => {
  const councils = entries.RULERS_REFERENCE.blocks.filter(block => block.kind === 'table' && block.rows[0][0] === 'Школа');
  assert.equal(councils.reduce((total, block) => total + block.rows.length - 1, 0), 12);
  const powers = entries.NAVI_SHADOWS_REFERENCE.blocks.filter(block => block.kind === 'table' && block.rows[0][0] === 'Великая Тень');
  assert.equal(powers.reduce((total, block) => total + block.rows.length - 1, 0), 20);
  assert.equal(new Set(powers.flatMap(block => block.rows.slice(1).map(row => row[0]))).size, 20);
  const groups = readingSections(readingBlocks(entries.MASTERS_REFERENCE.blocks), 3);
  assert.equal(groups.filter(group => group.title?.includes(', ')).length, 17);
});

test('new lore and development entries are reachable in the intended chapters', () => {
  assert.ok(arrangeReference([entries.MASTERS_REFERENCE], 'lore').some(chapter => chapter.id === 'society'));
  assert.ok(arrangeReference([entries.SKILL_GROWTH_STORY], 'mechanics').some(chapter => chapter.id === 'growth'));
  const route = fs.readFileSync(new URL('../src/routes/mechanics/+page.svelte', import.meta.url), 'utf8');
  assert.match(route, /entries=\{\[[^\]]*SKILL_GROWTH_STORY/u);
});

test('list conversion retains lead prose, wrapped items, ordering and trailing prose', () => {
  const result = readingBlocks([{ kind: 'paragraph', text: 'Перед выбором:\n• Порог и условие. Когда доступно\nумение.\n• Событие. Встреча с наставником.\n\nРешение остаётся за героем.' }]);
  assert.deepEqual(result, [
    { kind: 'paragraph', text: 'Перед выбором:' },
    { kind: 'list', ordered: false, start: 1, items: ['Порог и условие. Когда доступно умение.', 'Событие. Встреча с наставником.'] },
    { kind: 'paragraph', text: 'Решение остаётся за героем.' }
  ]);
  const ordered = readingBlocks([{ kind: 'paragraph', text: '3. Проверка.\n4. Исход.' }]);
  assert.equal(ordered[0].start, 3);
  assert.equal(ordered[0].ordered, true);
});
