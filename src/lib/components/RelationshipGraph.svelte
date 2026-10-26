<script lang="ts">
 import { tick } from 'svelte';
 import type { RelationshipLink, RelationshipTargetType, RelationshipNpc } from '$lib/engine/relationship-web';
 import { relationshipTargetLabel } from '$lib/engine/relationship-web';
 import { layoutRelationships } from '$lib/engine/relationship-layout';
 let {links,ownerCharacterId,onAdd,onRemove}:{links:RelationshipLink[];ownerCharacterId?:string;onRemove?:(id:string)=>void|Promise<void>;onAdd?:(node:{id:string;name:string;type:RelationshipTargetType})=>void}=$props();
 type Node={id:string;name:string;type:RelationshipTargetType;x:number;y:number;r:number;degree:number;npc?:RelationshipNpc};
 let selected=$state(''),hovered=$state(''),menuNode=$state(''),infoOpen=$state(false);
 let hoveredEdge=$state(''),selectedEdge=$state('');
 let infoPanel=$state<HTMLDivElement>();let svg=$state<SVGSVGElement>();
 let zoom=$state(1),panX=$state(0),panY=$state(0);
 let positions=$state<Record<string,{x:number;y:number}>>({});
 let drag:{id?:string;clientX:number;clientY:number;x:number;y:number;pointer:number;moved:boolean}|undefined;
 let suppressClick=false;
 const graph=$derived.by(()=>{
  const nodes=new Map<string,Node>();
  const key=(type:RelationshipTargetType,id:string)=>`${type}:${id}`;
  const edges=links.map(link=>{
   const sourceId=key(link.sourceType??'character',link.characterId),targetId=key(link.targetType,link.targetId);
   nodes.set(sourceId,{id:sourceId,name:link.characterName,type:link.sourceType??'character',x:0,y:0,r:7,degree:0,npc:link.sourceNpc??nodes.get(sourceId)?.npc});
   nodes.set(targetId,{id:targetId,name:link.targetName,type:link.targetType,x:0,y:0,r:7,degree:0,npc:link.targetNpc??nodes.get(targetId)?.npc});
   return {link,sourceId,targetId};
  }).filter(e=>e.sourceId!==e.targetId);
  const layout=layoutRelationships([...nodes.values()],edges.map(e=>({source:e.sourceId,target:e.targetId})));
  for(const n of nodes.values())Object.assign(n,layout.get(n.id));
  return {nodes:[...nodes.values()],edges};
 });
 $effect(()=>{graph.nodes;positions={};hoveredEdge='';selectedEdge='';selected=ownerCharacterId&&graph.nodes.some(n=>n.id===`character:${ownerCharacterId}`)?`character:${ownerCharacterId}`:'';hovered='';menuNode='';infoOpen=false;zoom=1;panX=0;panY=0;});
 const highlighted=$derived(hovered||selected);
 const edgeId=$derived(hoveredEdge||selectedEdge);
 const focusedEdge=$derived(graph.edges.find(e=>e.link.id===edgeId));
 const edgeNodes=$derived(new Set(focusedEdge?[focusedEdge.sourceId,focusedEdge.targetId]:[]));
 const activeNode=$derived(graph.nodes.find(n=>n.id===selected));
 const activeEdges=$derived(graph.edges.filter(e=>e.sourceId===selected||e.targetId===selected));
 const neighborIds=$derived(new Set(graph.edges.filter(e=>e.sourceId===highlighted||e.targetId===highlighted).flatMap(e=>[e.sourceId,e.targetId])));
 function edgeKind(relation:string){return relation.split('·')[0].trim()||'Связь';}
 function edgeIcon(relation:string){const kind=edgeKind(relation).toLocaleLowerCase('ru');return ({'союз':'∞','обмен':'⇄','спор':'≠','соперничество':'⚔','вражда':'×'} as Record<string,string>)[kind]??'↔';}
 function clearSelection(){selected='';hovered='';selectedEdge='';hoveredEdge='';menuNode='';infoOpen=false;const focused=document.activeElement;if(svg?.contains(focused)&&(focused instanceof HTMLElement||focused instanceof SVGElement))focused.blur();}
 function selectEdge(id:string){selectedEdge=selectedEdge===id?'':id;selected='';menuNode='';infoOpen=false;}
 function keyboardNavigation(element:HTMLDivElement){element.addEventListener('keydown',keyboard);return{destroy(){element.removeEventListener('keydown',keyboard);}};}
 function pos(n:Node){return positions[n.id]??n;}
 function rootPoint(clientX:number,clientY:number){const matrix=svg?.getScreenCTM();if(!matrix)return{x:500,y:320};return new DOMPoint(clientX,clientY).matrixTransform(matrix.inverse());}
 function changeZoom(next:number,p={x:500,y:320}){const z=Math.max(.35,Math.min(3,next));panX=p.x-(p.x-panX)*z/zoom;panY=p.y-(p.y-panY)*z/zoom;zoom=z;}
 function wheelZoom(element:SVGSVGElement){const wheel=(e:WheelEvent)=>{e.preventDefault();changeZoom(zoom*Math.exp(-e.deltaY*.0015),rootPoint(e.clientX,e.clientY));};element.addEventListener('wheel',wheel,{passive:false});return{destroy(){element.removeEventListener('wheel',wheel);}};}
 function startDrag(event:PointerEvent,node?:Node){if(event.button!==0)return;if(!node&&(event.target as Element).closest('button'))return;event.preventDefault();event.stopPropagation();suppressClick=false;drag={id:node?.id,clientX:event.clientX,clientY:event.clientY,x:node?pos(node).x:panX,y:node?pos(node).y:panY,pointer:event.pointerId,moved:false};svg?.setPointerCapture(event.pointerId);}
 function move(event:PointerEvent){if(!drag)return;const delta=rootPoint(event.clientX,event.clientY),start=rootPoint(drag.clientX,drag.clientY);const dx=delta.x-start.x,dy=delta.y-start.y;if(Math.hypot(event.clientX-drag.clientX,event.clientY-drag.clientY)>4)drag.moved=true;if(!drag.moved)return;if(drag.id)positions={...positions,[drag.id]:{x:drag.x+dx/zoom,y:drag.y+dy/zoom}};else{panX=drag.x+dx;panY=drag.y+dy;}}
 function stop(event:PointerEvent){if(!drag)return;const finished=drag;drag=undefined;if(svg?.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);if(finished.id&&!finished.moved&&event.type!=='pointercancel'){const node=graph.nodes.find(n=>n.id===finished.id);if(node)choose(node);}else if(!finished.id&&!finished.moved&&event.type!=='pointercancel'){clearSelection();}suppressClick=true;setTimeout(()=>suppressClick=false,0);}
 function choose(node:Node){selectedEdge='';hoveredEdge='';if(suppressClick){suppressClick=false;return;}selected=node.id;menuNode=menuNode===node.id?'':node.id;infoOpen=false;}
 function keyboard(event:KeyboardEvent){if((event.target as Element).closest('button'))return;const actions:Record<string,()=>void>={'+':()=>changeZoom(zoom*1.2),'=':()=>changeZoom(zoom*1.2),'-':()=>changeZoom(zoom/1.2),ArrowLeft:()=>panX+=35,ArrowRight:()=>panX-=35,ArrowUp:()=>panY+=35,ArrowDown:()=>panY-=35,Escape:clearSelection};if(actions[event.key]){event.preventDefault();actions[event.key]();}}
</script>

<div class="relationship-atlas">
 <div class="atlas-toolbar"><div class="atlas-legend"><span class="people">● Люди</span><span class="organizations">● Организации</span><span class="quests">● Поручения</span><span>● НИПы</span></div><div class="atlas-zoom" aria-label="Масштаб паутины"><button type="button" aria-label="Уменьшить паутину" disabled={zoom<=.35} onclick={()=>changeZoom(zoom/1.2)}>−</button><button type="button" aria-label="Показать всю паутину" onclick={()=>{zoom=1;panX=0;panY=0;positions={};clearSelection();}}>{Math.round(zoom*100)}%</button><button type="button" aria-label="Увеличить паутину" disabled={zoom>=3} onclick={()=>changeZoom(zoom*1.2)}>+</button></div></div>
 <!-- svelte-ignore a11y_no_noninteractive_tabindex (Focusable graph canvas supports keyboard pan and zoom.) -->
 <div class="atlas-stage" role="application" aria-label="Граф связей. Стрелки перемещают граф, плюс и минус меняют масштаб" tabindex="0" use:keyboardNavigation>
  <svg bind:this={svg} use:wheelZoom viewBox="0 0 1000 640" role="group" aria-label="Паутина связей персонажей" onpointerdown={e=>startDrag(e)} onpointermove={move} onpointerup={stop} onpointercancel={stop}>
   <g transform={`translate(${panX} ${panY}) scale(${zoom})`}>
    {#each graph.edges as edge(edge.link.id)}
     {@const source=graph.nodes.find(n=>n.id===edge.sourceId)!}{@const target=graph.nodes.find(n=>n.id===edge.targetId)!}
     <line x1={pos(source).x} y1={pos(source).y} x2={pos(target).x} y2={pos(target).y} class="thread" class:lit={edge.link.id===edgeId||!!highlighted&&(edge.sourceId===highlighted||edge.targetId===highlighted)} class:dimmed={!!(highlighted||edgeId)&&edge.link.id!==edgeId&&edge.sourceId!==highlighted&&edge.targetId!==highlighted}/>
     <line x1={pos(source).x} y1={pos(source).y} x2={pos(target).x} y2={pos(target).y} class="edge-hit" role="button" tabindex="0" aria-label={`Отношение: ${source.name} — ${target.name}, ${edge.link.relation||'связь'}`} aria-pressed={selectedEdge===edge.link.id} onpointerenter={()=>{hoveredEdge=edge.link.id;hovered='';}} onpointerleave={()=>hoveredEdge=''} onpointerdown={event=>event.stopPropagation()} onclick={()=>selectEdge(edge.link.id)} onkeydown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectEdge(edge.link.id);}}}><title>{source.name} — {target.name}: {edge.link.relation||'Связь'}</title></line>
    {/each}
    {#each graph.nodes as node(node.id)}
     {@const p=pos(node)}
     <g role="group" class="atlas-node" data-type={node.type} class:chosen={selected===node.id} class:dimmed={!!(highlighted||edgeId)&&highlighted!==node.id&&!neighborIds.has(node.id)&&!edgeNodes.has(node.id)} onpointerenter={()=>{if(!drag)hovered=node.id;}} onpointerleave={()=>hovered=''}>
      {#if selected===node.id}<circle class="selection-ring" cx={p.x} cy={p.y} r={node.r+6}/>{/if}
      <circle class="node-disc" cx={p.x} cy={p.y} r={node.r}/>
      <text class="node-name" x={p.x+node.r+8} y={p.y+5}>{node.name}</text>
      <foreignObject x={p.x-20} y={p.y-20} width="40" height="40"><button type="button" class="node-hit" aria-label={`${relationshipTargetLabel(node.type)}: ${node.name}`} aria-pressed={selected===node.id} onpointerdown={e=>startDrag(e,node)} onclick={()=>choose(node)} title={`Действия: ${node.name}`}></button></foreignObject>
     </g>
    {/each}
    {#if focusedEdge}
     {@const a=graph.nodes.find(n=>n.id===focusedEdge.sourceId)!}{@const b=graph.nodes.find(n=>n.id===focusedEdge.targetId)!}
     <g class="edge-marker" transform={`translate(${(pos(a).x+pos(b).x)/2} ${(pos(a).y+pos(b).y)/2})`} role="img" aria-label={`Значок отношения: ${edgeKind(focusedEdge.link.relation)}`}>
      <circle r="16"/><text class="edge-symbol" y="6">{edgeIcon(focusedEdge.link.relation)}</text><text class="edge-kind" x="24" y="5">{edgeKind(focusedEdge.link.relation)}</text>
     </g>
     {#if onRemove&&selectedEdge===focusedEdge.link.id&&!focusedEdge.link.id.startsWith('book:')}
      <foreignObject x={(pos(a).x+pos(b).x)/2+22} y={(pos(a).y+pos(b).y)/2-48} width="40" height="40">
       <button type="button" class="edge-remove" aria-label={`Удалить связь: ${a.name} — ${b.name}`} title="Удалить связь" onclick={()=>onRemove?.(focusedEdge.link.id)}>×</button>
      </foreignObject>
     {/if}
    {/if}
    {#if menuNode}{@const node=graph.nodes.find(n=>n.id===menuNode)}{#if node}{@const p=pos(node)}<foreignObject x={p.x-(onAdd?43:21)} y={p.y-node.r-55} width={onAdd?86:42} height="44"><div class="node-actions" role="group" aria-label={`Действия: ${node.name}`}><button type="button" aria-label={`Информация: ${node.name}`} aria-expanded={infoOpen} onclick={async()=>{infoOpen=!infoOpen;await tick();if(infoOpen)infoPanel?.scrollIntoView({block:'nearest',behavior:'instant'});}}>i</button>{#if onAdd}<button type="button" aria-label={`Новая связь: ${node.name}`} onclick={()=>onAdd?.(node)}>+</button>{/if}</div></foreignObject>{/if}{/if}
   </g>
  </svg>
 </div>
 <div class="atlas-hint"><span>Узлы: {graph.nodes.length} · связи: {graph.edges.length}</span><span>Колесо — масштаб · потяните узел или фон</span></div>
 {#if selectedEdge&&focusedEdge}<div class="edge-description" role="status"><strong>{graph.nodes.find(n=>n.id===focusedEdge.sourceId)?.name} ↔ {graph.nodes.find(n=>n.id===focusedEdge.targetId)?.name}</strong><p>{focusedEdge.link.relation||'Связь'}</p>{#if focusedEdge.link.notes}<p>{focusedEdge.link.notes}</p>{/if}<button type="button" aria-label="Закрыть описание отношения" onclick={()=>selectedEdge=''}>Закрыть</button></div>{/if}
 {#if infoOpen&&activeNode}<div class="atlas-detail" bind:this={infoPanel} aria-live="polite"><span class="detail-kind">{relationshipTargetLabel(activeNode.type)}</span><h3>{activeNode.name}</h3>{#if activeNode.npc}<p>{activeNode.npc.role}</p><p class="npc-description">{activeNode.npc.description}</p>{/if}<ul>{#each activeEdges as edge(edge.link.id)}<li><strong>{graph.nodes.find(n=>n.id===(edge.sourceId===selected?edge.targetId:edge.sourceId))?.name}</strong><span>{edge.link.relation||'Связь'}</span>{#if edge.link.notes}<p>{edge.link.notes}</p>{/if}</li>{/each}</ul></div>{/if}
</div>

<style>
 .edge-remove{display:block;width:36px!important;height:36px!important;min-height:36px!important;padding:0!important;border:1px solid #8b3448!important;border-radius:50%;background:var(--atlas-paper)!important;color:#8b3448!important;font:26px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 6px #0002;}.edge-remove:hover{background:#f6dfe3!important;}.edge-remove:focus-visible{outline:2px solid #8b3448;outline-offset:2px;}

 .edge-hit{stroke:transparent;stroke-width:16;fill:none;pointer-events:stroke;cursor:pointer;vector-effect:non-scaling-stroke;}.edge-hit:focus-visible{stroke:var(--atlas-ink);stroke-opacity:.2;outline:none;}
 .edge-marker{pointer-events:none;}.edge-marker circle{fill:var(--atlas-paper);stroke:var(--atlas-ink);stroke-width:1.2;}.edge-symbol{fill:var(--atlas-ink);font:22px Georgia,serif;text-anchor:middle;}.edge-kind{fill:var(--atlas-ink);font:13px system-ui,sans-serif;paint-order:stroke;stroke:var(--atlas-paper);stroke-width:5px;stroke-linejoin:round;}
 .edge-description{border-top:1px solid var(--atlas-line);padding:16px 20px;font-size:14px;}.edge-description p{margin:6px 0;white-space:pre-line;}.edge-description button{border:1px solid var(--atlas-line);border-radius:5px;background:transparent;color:inherit;padding:5px 10px;margin-top:8px;}

 .relationship-atlas { --atlas-ink:var(--decay-text,#263e32); --atlas-muted:var(--decay-muted,#687469); --atlas-paper:var(--decay-card,#f8f1e1); --atlas-line:var(--decay-border,#c4b897); color:var(--atlas-ink); border:1px solid var(--atlas-line); border-radius:10px; overflow:hidden; background:var(--atlas-paper); }
 .atlas-toolbar { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:12px 16px; border-bottom:1px solid var(--atlas-line); } .atlas-legend { display:flex; gap:16px; flex-wrap:wrap; font-size:12px; } .people{color:#417b72}.organizations{color:#9a7138}.quests{color:#93647f}
 .atlas-zoom { display:flex; gap:4px; } .atlas-zoom button{min-height:34px; min-width:34px; padding:4px 8px; border:1px solid var(--atlas-line); border-radius:5px; color:inherit;background:transparent;} .atlas-zoom button:disabled{opacity:.4;}
 .atlas-stage{height:clamp(380px,58vw,640px);touch-action:none;cursor:grab;} .atlas-stage:active{cursor:grabbing;} .atlas-stage:focus-visible{outline:2px solid var(--atlas-ink);outline-offset:-3px;} svg{display:block;width:100%;height:100%;user-select:none;touch-action:none;}
 .thread{stroke:var(--atlas-ink);stroke-width:1;opacity:.25;pointer-events:none;vector-effect:non-scaling-stroke;}.thread.lit{opacity:.85;stroke-width:1.6;}.thread.dimmed{opacity:.07;}
 .node-disc{fill:#a18355;stroke:var(--atlas-paper);stroke-width:2;}.atlas-node[data-type="npc"] .node-disc{fill:#677da4;}.npc-description{white-space:pre-line;margin:8px 0 16px;}.atlas-node[data-type="character"] .node-disc{fill:#4e8b7f;}.atlas-node[data-type="quest"] .node-disc{fill:#9b7290;}.selection-ring{fill:none;stroke:var(--atlas-ink);stroke-width:1;opacity:.6;}
 .node-name{fill:var(--atlas-ink);font:14px system-ui,sans-serif;paint-order:stroke;stroke:var(--atlas-paper);stroke-width:4px;stroke-linejoin:round;pointer-events:none;}.atlas-node.chosen .node-name{font-weight:650;}.atlas-node.dimmed{opacity:.22;}
 .node-hit{display:block;width:40px!important;height:40px!important;min-height:0!important;border:0!important;background:transparent!important;box-shadow:none!important;padding:0!important;cursor:grab;border-radius:50%;}.node-hit:focus-visible{outline:2px solid var(--atlas-ink);outline-offset:-2px;}
 .node-actions{display:flex;justify-content:center;gap:6px;padding:2px;}.node-actions button{width:36px;height:36px!important;min-height:36px!important;min-width:36px;flex-shrink:0;padding:0!important;border:1px solid var(--atlas-ink)!important;border-radius:50%;background:var(--atlas-paper)!important;color:var(--atlas-ink)!important;font:bold 21px Georgia,serif;box-shadow:0 2px 6px #0002;cursor:pointer;}.node-actions button:focus-visible{outline:2px solid var(--atlas-ink);outline-offset:2px;}
 .atlas-hint{display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap;padding:9px 16px;border-top:1px solid var(--atlas-line);font-size:11px;color:var(--atlas-muted);}
 .atlas-detail{padding:18px 22px;border-top:1px solid var(--atlas-line);}.detail-kind{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--atlas-muted);}h3{font:24px Georgia,serif;margin:4px 0 14px;}ul{display:grid;gap:12px;margin:0;padding:0;list-style:none;}li{border-left:2px solid var(--atlas-line);padding-left:12px;font-size:14px;}li strong{display:block;}li span{color:var(--atlas-muted);}li p{margin:4px 0 0;}
 @media(prefers-reduced-motion:no-preference){.thread,.atlas-node{transition:opacity .12s ease;}}
</style>
