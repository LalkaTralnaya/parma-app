import test from 'node:test';
import assert from 'node:assert/strict';
import { StoryPlotSimulation } from '../src/lib/engine/story-plot-simulation.ts';
import { normalizeStoryPlotWeb } from '../src/lib/engine/story-plot-web.ts';

const node = (id, patch = {}) => ({ id, type:'npc', name:id, description:'', ...patch });
const edge = { id:'ab', from:'a', to:'b', label:'Связан', notes:'' };

test('dragged nodes remain fixed while their neighbors respond to the new position', () => {
	const simulation = new StoryPlotSimulation([node('a'), node('b')], [edge]);
	simulation.settle();
	const before = simulation.snapshot();
	simulation.pin('a', before.a.x + 240, before.a.y + 100);
	simulation.settle();
	const after = simulation.snapshot();
	assert.equal(after.a.x, before.a.x + 240);
	assert.equal(after.a.y, before.a.y + 100);
	assert.ok(Math.hypot(after.b.x - before.b.x, after.b.y - before.b.y) > 20);
	assert.equal(simulation.active, false);
});

test('saved pinned positions survive normalization, reload and settling', () => {
	const saved = normalizeStoryPlotWeb({
		nodes:[node('a',{x:820,y:450,pinned:true}),node('b')],
		edges:[edge]
	});
	const loaded = normalizeStoryPlotWeb(JSON.parse(JSON.stringify(saved)));
	const simulation = new StoryPlotSimulation(loaded.nodes, loaded.edges);
	simulation.settle();
	assert.equal(simulation.snapshot().a.x, 820);
	assert.equal(simulation.snapshot().a.y, 450);
	assert.deepEqual(loaded, saved);
});

test('unpinning lets a saved node join the layout again', () => {
	const nodes = [node('a',{x:900,y:550,pinned:false}),node('b')];
	const simulation = new StoryPlotSimulation(nodes,[edge]);
	simulation.settle();
	assert.ok(Math.hypot(simulation.snapshot().a.x-900,simulation.snapshot().a.y-550)>10);
	assert.equal(nodes[0].x,900);
	assert.equal(nodes[0].y,550);
});

test('invalid saved positions are discarded and invalid drag coordinates have no effect', () => {
	for(const bad of [{x:NaN,y:5},{x:5,y:Infinity},{x:100001,y:5},{x:3,pinned:true}]){
		const graph=normalizeStoryPlotWeb({nodes:[node('a',bad)],edges:[]});
		assert.equal(graph.nodes[0].x,undefined);
		assert.equal(graph.nodes[0].y,undefined);
		assert.equal(graph.nodes[0].pinned,undefined);
	}
	const simulation = new StoryPlotSimulation([node('a')],[]);
	const before=simulation.snapshot();
	simulation.pin('a',NaN,10);
	assert.deepEqual(simulation.snapshot(),before);
});

test('empty graphs, coincident nodes and disconnected nodes settle to finite independent snapshots', () => {
	const empty=new StoryPlotSimulation([],[]);
	empty.settle();
	assert.deepEqual(empty.snapshot(),{});
	const simulation=new StoryPlotSimulation([node('a',{x:500,y:320}),node('b',{x:500,y:320}),node('c')],[edge]);
	simulation.settle();
	const result=simulation.snapshot();
	for(const position of Object.values(result)){
		assert.ok(Number.isFinite(position.x));
		assert.ok(Number.isFinite(position.y));
	}
	assert.ok(Math.hypot(result.a.x-result.b.x,result.a.y-result.b.y)>1);
	result.a.x=9999;
	assert.notEqual(simulation.snapshot().a.x,9999);
});
