import test from 'node:test';
import assert from 'node:assert/strict';
import { DRAFT_TREES, DRAFT_ABILITIES } from '../src/lib/rules/draft-trees.ts';
import { layoutAbilities, abilityAncestors } from '../src/lib/ui/ability-layout.ts';

test('all draft trees preserve every internal dependency and separate node hit areas', () => {
 for (const tree of DRAFT_TREES) {
  const abilities=DRAFT_ABILITIES.filter(a=>a.treeId===tree.id), ids=new Set(abilities.map(a=>a.id));
  const graph=layoutAbilities(abilities);
  assert.equal(graph.nodes.length,abilities.length,tree.id);
  const expected=abilities.flatMap(a=>[...new Set([...(a.requiresAll??[]),...(a.requiresAny??[])])].filter(id=>ids.has(id)).map(id=>`${id}>${a.id}`));
  assert.deepEqual(graph.edges.map(e=>`${e.from}>${e.to}`).sort(),expected.sort(),tree.id);
  for(const e of graph.edges) assert.ok(e.source.y>e.target.y,`${tree.id}: roots must precede children`);
  for(let i=0;i<graph.nodes.length;i++)for(let j=i+1;j<graph.nodes.length;j++){
   const a=graph.nodes[i],b=graph.nodes[j];
   assert.ok(Math.abs(a.x-b.x)>=170 || Math.abs(a.y-b.y)>=126,`${tree.id}: overlapping nodes`);
  }
 }
});
test('shared prerequisites and optional edges remain visible', () => {
 const restoration=DRAFT_ABILITIES.filter(a=>a.treeId==='RE');
 const graph=layoutAbilities(restoration);
 assert.equal(graph.edges.filter(e=>e.to==='RE.respite').length,2);
 assert.ok(abilityAncestors('RE.respite',restoration).has('RE.base1'));
 const optional=layoutAbilities(DRAFT_ABILITIES.filter(a=>a.treeId==='EN')).edges.filter(e=>e.any);
 assert.ok(optional.length>0);
});

test('every connection touches its own circles and avoids labels and unrelated circles', () => {
 for(const tree of DRAFT_TREES){
  const graph=layoutAbilities(DRAFT_ABILITIES.filter(a=>a.treeId===tree.id));
  const crosses=(a,b,r)=>a.y===b.y
   ? a.y>r.top&&a.y<r.bottom&&Math.max(a.x,b.x)>r.left&&Math.min(a.x,b.x)<r.right
   : a.x>r.left&&a.x<r.right&&Math.max(a.y,b.y)>r.top&&Math.min(a.y,b.y)<r.bottom;
  for(const edge of graph.edges){
   const first=edge.points[0],last=edge.points.at(-1);
   assert.equal(Math.abs(first.x-edge.source.x),15);
   assert.equal(first.y,edge.source.y+15);
   assert.equal(Math.abs(last.x-edge.target.x),15);
   assert.equal(last.y,edge.target.y+15);
   for(let i=1;i<edge.points.length;i++){
    const a=edge.points[i-1],b=edge.points[i];
    assert.ok(a.x===b.x||a.y===b.y,'orthogonal segments');
    for(const n of graph.nodes){
     assert.ok(!crosses(a,b,{left:n.x-88,right:n.x+88,top:n.y+33,bottom:n.y+132}),`${tree.id}: connection crosses label ${n.ability.id}`);
     if(n.ability.id!==edge.from&&n.ability.id!==edge.to)assert.ok(!crosses(a,b,{left:n.x-22,right:n.x+22,top:n.y-7,bottom:n.y+37}),`${tree.id}: connection crosses unrelated circle ${n.ability.id}`);
    }
   }
  }
 }
});
