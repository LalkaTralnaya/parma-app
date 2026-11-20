import test from 'node:test';
import assert from 'node:assert/strict';
import { PILOT_ADVENTURES } from '../src/lib/rules/adventure-report-pilot.ts';
import { getAdventure } from '../src/lib/rules/adventures.ts';
import { createSiverStoryPlotWeb } from '../src/lib/rules/siver-plot-web.ts';
import { readReportDraft, reportDraftKey } from '../src/lib/ui/adventure-report-draft.ts';

test('the eight stable decision IDs reference existing scenes and plot entities', () => {
 const cards = PILOT_ADVENTURES.flatMap(pilot => pilot.cards);
 assert.deepEqual(cards.map(card => card.id), [
  'siver.road.inspect-wagon', 'siver.road.follow-observer',
  'siver.road.inspect-ambush', 'siver.road.deal-with-patrol',
  'siver.karngorn.search-for-ryzh', 'siver.karngorn.deal-with-rival',
  'siver.karngorn.cross-ward', 'siver.karngorn.compare-evidence'
 ]);
 const plotNodes = new Set(createSiverStoryPlotWeb().nodes.map(node => node.id));
 for (const pilot of PILOT_ADVENTURES) {
  const adventure = getAdventure(pilot.slug);
  assert.ok(adventure);
  assert.equal(adventure.region, pilot.region);
  assert.ok(plotNodes.has(pilot.adventureId));
  const sceneIds = new Set(adventure.scenes.map(scene => scene.id));
  for (const card of pilot.cards) {
   assert.ok(card.sceneIds.every(id => sceneIds.has(id)), card.id);
   assert.ok(card.entityIds.every(id => plotNodes.has(id)), card.id);
   for (const options of [card.decisions, card.outcomes]) {
    assert.equal(new Set(options.map(option => option.id)).size, options.length);
   }
  }
 }
});

test('the draft preserves testimony separately from facts and open consequences', () => {
 const id = 'siver.karngorn.compare-evidence';
 const draft = readReportDraft('karngorn', {
  cityContext: 'skipped', canonBranch: 'test-branch', canonVersion: 'test-version',
  reviewStatus: 'disputed', reviewReason: 'Тестовая причина',
  answers: { [id]: { decision: 'other', decisionNote: 'Тестовый выбор', outcome: 'other', observed: 'Тестовый исход', knowledge: 'Сведения', pending: 'Открытый вопрос' } }
 });
 assert.equal(draft.cityContext, 'skipped');
 assert.equal(draft.canonBranch, 'test-branch');
 assert.equal(draft.canonVersion, 'test-version');
 assert.equal(draft.reviewStatus, 'disputed');
 assert.equal(draft.reviewReason, 'Тестовая причина');
 assert.deepEqual(draft.answers[id], { decision: 'other', decisionNote: 'Тестовый выбор', outcome: 'other', observed: 'Тестовый исход', knowledge: 'Сведения', pending: 'Открытый вопрос' });
 assert.equal(draft.answers['siver.road.inspect-wagon'], undefined);
 assert.notEqual(reportDraftKey('karngorn'), reportDraftKey('doroga-v-gardariki'));
});

test('unplayed scenes and invalid stored options do not become reported facts', () => {
 const draft = readReportDraft('doroga-v-gardariki', {
  cityContext: 'skipped', revision: 'fake',
  answers: {
   'siver.road.inspect-wagon': { decision: 'scene-not-played', outcome: 'vessel-found', observed: 'Устаревший результат' },
   'siver.road.follow-observer': { decision: 'not-an-option', outcome: 'unknown', knowledge: 123 }
  }
 });
 assert.equal(draft.cityContext, '');
 assert.equal(draft.revision, '');
 assert.deepEqual(draft.answers['siver.road.inspect-wagon'], { decision: 'scene-not-played', decisionNote: '', outcome: '', observed: '', knowledge: '', pending: '' });
 assert.equal(draft.answers['siver.road.follow-observer'].decision, '');
 assert.equal(draft.answers['siver.road.follow-observer'].outcome, 'unknown');
 assert.equal(draft.answers['siver.road.follow-observer'].knowledge, '');
});
