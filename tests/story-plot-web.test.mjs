import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_STORY_PLOT_WEB, normalizeStoryPlotWeb } from '../src/lib/engine/story-plot-web.ts';
import { addSiverStoryPlotWeb, createSiverStoryPlotWeb, prepareStoryPlotWeb, SIVER_PLOT_TEMPLATE_ID } from '../src/lib/rules/siver-plot-web.ts';

test('old plot graphs retain their data and gain optional origin and consequence fields', () => {
	const graph = normalizeStoryPlotWeb({
		version: 1,
		nodes: [{ id:'a', type:'npc', name:'Старый НИП', description:'Собственная заметка' }, { id:'b', type:'location', name:'Деревня' }],
		edges: [{ id:'link', from:'a', to:'b', label:'Живёт', notes:'Давно' }]
	});
	assert.equal(graph.nodes[0].description, 'Собственная заметка');
	assert.equal(graph.nodes[0].origin, '');
	assert.equal(graph.nodes[0].inclinations, '');
	assert.equal(graph.edges[0].notes, 'Давно');
	assert.equal(graph.edges[0].condition, '');
	assert.equal(graph.edges[0].consequence, '');
	assert.deepEqual(normalizeStoryPlotWeb(JSON.parse(JSON.stringify(graph))), graph);
});

test('the campaign has unique connected nodes, all NPC origins and conditional consequences', () => {
	const graph = createSiverStoryPlotWeb();
	const ids = new Set(graph.nodes.map(node => node.id));
	assert.equal(ids.size, graph.nodes.length);
	assert.equal(new Set(graph.edges.map(edge => edge.id)).size, graph.edges.length);
	assert.ok(graph.nodes.length > 50);
	assert.ok(graph.edges.length > 80);
	for (const edge of graph.edges) {
		assert.ok(ids.has(edge.from), edge.from);
		assert.ok(ids.has(edge.to), edge.to);
		assert.notEqual(edge.from, edge.to);
		if (edge.consequence) assert.ok(edge.condition, edge.label);
	}
	for (const node of graph.nodes.filter(node => node.type === 'npc')) {
		assert.ok(node.origin, node.name);
		assert.ok(node.inclinations, node.name);
	}
	assert.equal(graph.nodes.filter(node => node.name === 'Сивер').length, 1);
	assert.ok(graph.nodes.find(node => node.id === 'siver:ambush-client').description.includes('не установлено'));
	assert.ok(graph.nodes.find(node => node.id === 'siver:father').description.includes('пятёрку'));
	assert.deepEqual(normalizeStoryPlotWeb(JSON.parse(JSON.stringify(graph))), graph);
	assert.ok(Buffer.byteLength(JSON.stringify(graph)) < 2097152);
});

test('adding the campaign preserves custom records and existing edits', () => {
	const graph = normalizeStoryPlotWeb({
		nodes: [{ id:'custom', type:'character', name:'Наш герой' }, { id:'siver:petr', type:'npc', name:'Пётр', origin:'Наше происхождение', inclinations:'Изменено за столом' }],
		edges: [{ id:'custom-edge', from:'custom', to:'siver:petr', label:'Спасён героем', consequence:'Стал союзником' }]
	});
	const merged = addSiverStoryPlotWeb(graph);
	assert.deepEqual(merged.nodes.find(node => node.id === 'custom'), graph.nodes[0]);
	assert.deepEqual(merged.nodes.find(node => node.id === 'siver:petr'), graph.nodes[1]);
	assert.deepEqual(merged.edges.find(edge => edge.id === 'custom-edge'), graph.edges[0]);
	assert.ok(merged.templateIds.includes(SIVER_PLOT_TEMPLATE_ID));
	assert.deepEqual(addSiverStoryPlotWeb(merged), merged);
	assert.deepEqual(prepareStoryPlotWeb(graph), graph);
});

test('deleted imported records stay deleted after reload and a second import attempt', () => {
	const graph = createSiverStoryPlotWeb();
	const changed = {
		...graph,
		nodes: graph.nodes.filter(node => node.id !== 'siver:petr'),
		edges: graph.edges.filter(edge => edge.from !== 'siver:petr' && edge.to !== 'siver:petr')
	};
	const loaded = normalizeStoryPlotWeb(JSON.parse(JSON.stringify(changed)));
	assert.deepEqual(addSiverStoryPlotWeb(loaded), loaded);
	assert.deepEqual(prepareStoryPlotWeb(loaded), loaded);
	const cleared = normalizeStoryPlotWeb({ ...graph, nodes:[], edges:[] });
	assert.equal(prepareStoryPlotWeb(cleared).nodes.length, 0);
	assert.equal(addSiverStoryPlotWeb(cleared).nodes.length, 0);
});

test('first launch creates independent scenario copies', () => {
	const first = prepareStoryPlotWeb(EMPTY_STORY_PLOT_WEB);
	const second = prepareStoryPlotWeb(EMPTY_STORY_PLOT_WEB);
	first.nodes[0].description = 'Сказитель изменил описание';
	first.edges[0].label = 'Сказитель изменил связь';
	assert.notEqual(first.nodes[0].description, second.nodes[0].description);
	assert.notEqual(first.edges[0].label, second.edges[0].label);
	assert.equal(EMPTY_STORY_PLOT_WEB.nodes.length, 0);
	assert.equal(EMPTY_STORY_PLOT_WEB.edges.length, 0);
});
