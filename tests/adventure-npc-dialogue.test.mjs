import test from 'node:test';
import assert from 'node:assert/strict';
import { ADVENTURES } from '../src/lib/rules/adventures.ts';
import { adventureNpcLines } from '../src/lib/rules/adventure-npc-dialogue.ts';

test('each NPC in the five chapters has dialogue and lines stay with the correct speaker', () => {
  for (const adventure of ADVENTURES) {
    for (const npc of adventure.npcs) {
      const lines = adventureNpcLines(adventure, npc);
      assert.ok(lines.length, adventure.title + ' / ' + npc.name);
      assert.equal(new Set(lines.map(line => line.text)).size, lines.length);
    }
  }
  const well = ADVENTURES[0];
  const danila = adventureNpcLines(well, well.npcs.find(npc => npc.name === 'Данила'));
  const mikula = adventureNpcLines(well, well.npcs.find(npc => npc.name === 'Микула'));
  assert.ok(danila.some(line => line.context?.includes('О клыке')));
  assert.ok(danila.some(line => line.context?.includes('Если опоздали')));
  assert.ok(!mikula.some(line => line.text.includes('последнее, что отец дал мне')));
  const city = ADVENTURES[3];
  const halmiri = adventureNpcLines(city, city.npcs.find(npc => npc.name.startsWith('Халмири')));
  assert.ok(halmiri.some(line => line.text.includes('Три девятицы')));
  assert.ok(halmiri.some(line => line.text.includes('Рыж за мной')));
});
