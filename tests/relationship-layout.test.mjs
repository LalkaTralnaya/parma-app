import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutRelationships} from '../src/lib/engine/relationship-layout.ts';
import {BOOK_FACTIONS,BOOK_RELATIONSHIPS} from '../src/lib/rules/book-relationships.ts';

test('world graph lays out every faction and counts its real connections',()=>{
 const nodes=BOOK_FACTIONS.map(n=>({id:n.id,name:n.short})), edges=BOOK_RELATIONSHIPS.map(e=>({source:e.a,target:e.b}));
 const layout=layoutRelationships(nodes,edges);
 assert.equal(layout.size,24);
 assert.deepEqual(layout,layoutRelationships(nodes,edges));
 for(const [id,n] of layout){assert.ok(Number.isFinite(n.x)&&Number.isFinite(n.y));assert.ok(n.x>=100&&n.x<=900);assert.ok(n.y>=65&&n.y<=575);assert.equal(n.degree,edges.filter(e=>e.source===id||e.target===id).length);}
 const points=[...layout.values()];
 for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)assert.ok(Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y)>25);
});
test('small and disconnected graphs remain finite without changing their node identity',()=>{
 assert.equal(layoutRelationships([],[]).size,0);
 const single=layoutRelationships([{id:'a',name:'Один'}],[]).get('a');assert.equal(single.x,500);assert.equal(single.y,320);
 const layout=layoutRelationships([{id:'a',name:'Герой'},{id:'b',name:'Община'},{id:'c',name:'Поручение'}],[{source:'a',target:'b'}]);
 assert.equal(layout.get('c').degree,0);assert.ok([...layout.values()].every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)));
});
