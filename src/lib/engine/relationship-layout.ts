export interface LayoutNode { id:string; name:string }
export interface LayoutEdge { source:string; target:string }

/** Stable force layout: links pull neighbors together; nodes and labels repel. */
export function layoutRelationships(input:LayoutNode[], edges:LayoutEdge[], width=1000, height=640) {
 const nodes=[...input].sort((a,b)=>a.id.localeCompare(b.id)).map((n,i)=>({ ...n, x:width/2+Math.cos(i*2.39996)*Math.sqrt(i+1)*42, y:height/2+Math.sin(i*2.39996)*Math.sqrt(i+1)*34, vx:0,vy:0,degree:0 }));
 const byId=new Map(nodes.map(n=>[n.id,n]));
 const springs=edges.map(e=>({source:byId.get(e.source),target:byId.get(e.target)})).filter(e=>e.source&&e.target&&e.source!==e.target);
 for(const e of springs){e.source!.degree++;e.target!.degree++;}
 for(let step=0;step<420;step++) {
  const heat=1-step/460;
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
   const a=nodes[i],b=nodes[j];let dx=a.x-b.x,dy=a.y-b.y;if(Math.abs(dx)+Math.abs(dy)<.01){dx=.1;dy=.2;}
   const distance=Math.max(5,Math.hypot(dx,dy));const force=2200/(distance*distance);
   const fx=dx/distance*force,fy=dy/distance*force;a.vx+=fx;b.vx-=fx;a.vy+=fy;b.vy-=fy;
   // Leave vertical breathing room between nearby labels.
   if(Math.abs(dy)<27&&Math.abs(dx)<Math.min(190,55+(a.name.length+b.name.length)*3)){
    const push=(27-Math.abs(dy))*.035*(dy>=0?1:-1);a.vy+=push;b.vy-=push;
   }
  }
  for(const e of springs){const a=e.source!,b=e.target!,dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy)),f=(d-145)*.012;a.vx+=dx/d*f;a.vy+=dy/d*f;b.vx-=dx/d*f;b.vy-=dy/d*f;}
  for(const n of nodes){n.vx+=(width/2-n.x)*.0015;n.vy+=(height/2-n.y)*.0015;n.vx*=.78;n.vy*=.78;n.x+=Math.max(-7,Math.min(7,n.vx))*heat;n.y+=Math.max(-7,Math.min(7,n.vy))*heat;}
 }
 const minX=Math.min(...nodes.map(n=>n.x)),maxX=Math.max(...nodes.map(n=>n.x)),minY=Math.min(...nodes.map(n=>n.y)),maxY=Math.max(...nodes.map(n=>n.y));
 const scale=Math.min(1.55,(width-260)/Math.max(1,maxX-minX),(height-150)/Math.max(1,maxY-minY));
 return new Map(nodes.map(n=>[n.id,{x:width/2+(n.x-(minX+maxX)/2)*scale,y:height/2+(n.y-(minY+maxY)/2)*scale,r:5+Math.min(7,Math.sqrt(n.degree)*2),degree:n.degree}]));
}
