import type { Ability } from '../rules/abilities';

/** Lay out every node and dependency; roots are at the bottom of the constellation. */
export function layoutAbilities(abilities: Ability[]) {
 const byId = new Map(abilities.map(a => [a.id, a]));
 const levels = new Map<string, number>();
 const visiting = new Set<string>();
 const parents = (a: Ability) => [...new Set([...(a.requiresAll ?? []), ...(a.requiresAny ?? [])])].filter(id => byId.has(id));
 function level(id: string): number {
  if (levels.has(id)) return levels.get(id)!;
  if (visiting.has(id)) return 0;
  visiting.add(id);
  const dependencies = parents(byId.get(id)!);
  const depth = dependencies.length ? Math.max(...dependencies.map(level)) + 1 : 0;
  visiting.delete(id); levels.set(id, depth); return depth;
 }
 abilities.forEach(a => level(a.id));
 const maxLevel = Math.max(0, ...levels.values());
 const layers = Array.from({ length: maxLevel + 1 }, (_, i) => abilities.filter(a => levels.get(a.id) === i));
 const columns = Math.max(3, ...layers.map(l => l.length));
 const width = columns * 210;
 const height = (maxLevel + 1) * 170 + 32;
 const nodes: { ability: Ability; x: number; y: number }[] = [];
 const centres = new Map<string, number>();
 layers.forEach((layer, depth) => {
  const weight = (a: Ability) => { const ps = parents(a); return ps.length ? ps.reduce((sum, p) => sum + (centres.get(p) ?? width / 2), 0) / ps.length : width / 2; };
  layer.sort((a, b) => weight(a) - weight(b));
  layer.forEach((ability, i) => {
   const x = width * (i + 0.5) / layer.length;
   centres.set(ability.id, x);
   nodes.push({ ability, x, y: (maxLevel - depth) * 170 + 24 });
  });
 });
 const positions = new Map(nodes.map(n => [n.ability.id, n]));
 const edges = abilities.flatMap(a => parents(a).map(from => ({
  from, to: a.id, any: (a.requiresAny ?? []).includes(from),
  source: positions.get(from)!, target: positions.get(a.id)!
 })));
 return { width, height, nodes, edges: routeEdges(nodes, edges, width, height) };
}

export function abilityAncestors(id: string, abilities: Ability[]): Set<string> {
 const byId = new Map(abilities.map(a => [a.id, a]));
 const result = new Set<string>();
 function visit(key: string) {
  const node = byId.get(key);
  for (const p of [...(node?.requiresAll ?? []), ...(node?.requiresAny ?? [])]) {
   if (!result.has(p)) { result.add(p); visit(p); }
  }
 }
 visit(id); result.delete(id); return result;
}

type Point = { x: number; y: number };
type PlacedNode = { ability: Ability; x: number; y: number };
type LayoutEdge = { from: string; to: string; any: boolean; source: PlacedNode; target: PlacedNode };

/** Orthogonal visibility grid: route continuous connections outside star and label hit areas. */
function routeEdges(nodes: PlacedNode[], edges: LayoutEdge[], width: number, height: number) {
 const xs = [...new Set([8, width-8, ...nodes.flatMap(n => [n.x-96, n.x+96])])].sort((a,b)=>a-b);
 const ys = [...new Set([8, height-8, ...nodes.flatMap(n => [n.y+15, n.y+150])])].sort((a,b)=>a-b);
 const obstacles = nodes.map(n => ({left:n.x-90,right:n.x+90,top:n.y-9,bottom:n.y+135}));
 const inside = (p: Point) => obstacles.some(r=>p.x>r.left && p.x<r.right && p.y>r.top && p.y<r.bottom);
 const clear = (a:Point,b:Point) => !obstacles.some(r=>a.y===b.y
  ? a.y>r.top && a.y<r.bottom && Math.max(a.x,b.x)>r.left && Math.min(a.x,b.x)<r.right
  : a.x>r.left && a.x<r.right && Math.max(a.y,b.y)>r.top && Math.min(a.y,b.y)<r.bottom);
 const point = (key:number):Point => ({x:xs[key%xs.length],y:ys[Math.floor(key/xs.length)]});
 const index = (p:Point) => ys.indexOf(p.y)*xs.length+xs.indexOf(p.x);
 const graph=new Map<number,{to:number;length:number}[]>();
 for(let row=0;row<ys.length;row++)for(let col=0;col<xs.length;col++){
  const key=row*xs.length+col,a=point(key);if(inside(a))continue;
  const neighbours:{to:number;length:number}[]=[];
  for(const [r,c] of [[row-1,col],[row+1,col],[row,col-1],[row,col+1]]){
   if(r<0||c<0||r>=ys.length||c>=xs.length)continue;
   const next=r*xs.length+c,b=point(next);
   if(!inside(b)&&clear(a,b))neighbours.push({to:next,length:Math.abs(a.x-b.x)+Math.abs(a.y-b.y)});
  }
  graph.set(key,neighbours);
 }
 const usage=new Map<string,number>();
 const edgeKey=(a:number,b:number)=>a<b?`${a}:${b}`:`${b}:${a}`;
 function search(start:Point,finish:Point){
  const first=index(start),last=index(finish);
  const heuristic=(key:number)=>{const p=point(key);return Math.abs(p.x-finish.x)+Math.abs(p.y-finish.y);};
  const open=[first],scores=new Map([[first,0]]),previous=new Map<number,number>();
  while(open.length){
   open.sort((a,b)=>(scores.get(b)!+heuristic(b))-(scores.get(a)!+heuristic(a)));
   const current=open.pop()!;
   if(current===last){const keys=[last];while(keys[0]!==first)keys.unshift(previous.get(keys[0])!);return {keys,score:scores.get(last)!};}
   for(const next of graph.get(current)??[]){
    const parent=previous.get(current),a=point(current),b=point(next.to),before=parent===undefined?null:point(parent);
    const turn=before && ((before.x===a.x)!==(a.x===b.x)) ? 12 : 0;
    const score=scores.get(current)!+next.length+turn+(usage.get(edgeKey(current,next.to))??0)*45;
    if(score<(scores.get(next.to)??Infinity)){scores.set(next.to,score);previous.set(next.to,current);if(!open.includes(next.to))open.push(next.to);}
   }
  }
  return null;
 }
 return edges.map(edge=>{
  let best:{keys:number[];score:number;sideA:number;sideB:number}|null=null;
  for(const sideA of [-1,1])for(const sideB of [-1,1]){
   const route=search({x:edge.source.x+sideA*96,y:edge.source.y+15},{x:edge.target.x+sideB*96,y:edge.target.y+15});
   if(route && (!best||route.score<best.score))best={...route,sideA,sideB};
  }
  if(!best)throw new Error(`Cannot route ability connection ${edge.from} > ${edge.to}`);
  for(let i=1;i<best.keys.length;i++){const key=edgeKey(best.keys[i-1],best.keys[i]);usage.set(key,(usage.get(key)??0)+1);}
  const raw=[{x:edge.source.x+best.sideA*15,y:edge.source.y+15},...best.keys.map(point),{x:edge.target.x+best.sideB*15,y:edge.target.y+15}];
  const points=raw.filter((p,i)=>!i||i===raw.length-1||!((raw[i-1].x===p.x&&raw[i+1].x===p.x)||(raw[i-1].y===p.y&&raw[i+1].y===p.y)));
  return {...edge,points,path:points.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' ')};
 });
}
