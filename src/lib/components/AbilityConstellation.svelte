<script lang="ts">
 import { playerText } from '$lib/ui/player-copy';
 import type { Character } from '$lib/type';
 import { ABILITIES, type Ability } from '$lib/rules/abilities';
 import { getAbilityBlockReason, isAbilityLearned } from '$lib/engine/character';
 import { layoutAbilities } from '$lib/ui/ability-layout';
 let { nodes, treeId, character, saving, onstudy, onapply }: { nodes: Ability[]; treeId: string; character: Character; saving: boolean; onstudy: (id: string) => void | Promise<void>; onapply?: (text: string) => void } = $props();
 let selectedId = $state(''); let zoom = $state<number | null>(null); let viewportWidth = $state(0); let pendingId = $state(''); let circleNotice = $state('');
 const layout = $derived(layoutAbilities(nodes));
 const autoZoom = $derived(Math.max(65, Math.min(85, viewportWidth > 0 ? Math.floor(viewportWidth / layout.width * 20) * 5 : 85)));
 const displayedZoom = $derived(zoom ?? autoZoom);
 const selected = $derived(nodes.find(n => n.id === selectedId) ?? nodes[0]);
 const reason = $derived(selected ? getAbilityBlockReason(character, selected.id) : null);
 const learnedSelected = $derived(selected ? isAbilityLearned(character, selected.id) : false);
 const names = (ids: string[]) => ids.map(id => ABILITIES.find(a => a.id === id)?.name ?? id).join(', ');
 const nodeState = (a: Ability) => { if (isAbilityLearned(character,a.id)) return 'learned'; const blocked = getAbilityBlockReason(character,a.id); return blocked === null || blocked === 'Нет очков умений' ? 'available' : 'locked'; };
 const stateLabel = (a: Ability) => nodeState(a) === 'learned' ? 'Изучено' : nodeState(a) === 'available' ? 'Не изучено · открыто' : 'Не изучено · закрыто';
 const highlighted = (from: string, to: string) => from === selected?.id || to === selected?.id;
 async function activateCircle(ability: Ability) {
  selectedId = ability.id; circleNotice = '';
  if (saving || pendingId || isAbilityLearned(character, ability.id)) return;
  const blocked = getAbilityBlockReason(character, ability.id);
  if (blocked) { circleNotice = blocked === 'Нет очков умений' ? blocked : 'Закрыто · см. требования'; return; }
  pendingId = ability.id;
  try { await onstudy(ability.id); } finally { pendingId = ''; }
 }

</script>

<div class="ability-constellation">
 <div class="constellation-legend" aria-label="Состояния умений">
  <span><i class="legend-mark learned"></i> Изучено</span>
  <span><i class="legend-mark available"></i> Не изучено · открыто</span>
  <span><i class="legend-mark locked"></i> Не изучено · закрыто</span>
 </div>
 <div class="constellation-tools">
  <label>Масштаб <input type="range" min="50" max="150" step="5" value={displayedZoom} oninput={(event) => zoom = Number(event.currentTarget.value)} aria-label="Масштаб созвездия"/> <span>{displayedZoom}%</span></label>
  <button type="button" class="border rounded px-2 py-1" onclick={() => zoom = null}>Автомасштаб</button>
  <span>Кружок с + — изучить за 1 очко · название — описание</span>
 </div>
 <div class="constellation-scroll" bind:clientWidth={viewportWidth} role="region" aria-label="Созвездие умений. Можно прокручивать горизонтально">
  <div class="constellation-size" style:width={`${layout.width * displayedZoom / 100}px`} style:height={`${layout.height * displayedZoom / 100}px`}>
   <div class="constellation-map" style:width={`${layout.width}px`} style:height={`${layout.height}px`} style:transform={`scale(${displayedZoom / 100})`}>
    <svg class="constellation-lines" width={layout.width} height={layout.height} aria-hidden="true">
     <g>
      {#each layout.edges as edge}
       <path d={edge.path} class:optional={edge.any} class:learned-line={isAbilityLearned(character,edge.from) && isAbilityLearned(character,edge.to)} class:selected-line={highlighted(edge.from,edge.to)}/>
      {/each}
     </g>
    </svg>
    {#each layout.nodes as n (n.ability.id)}
     {@const blocked = getAbilityBlockReason(character,n.ability.id)}
     {@const learned = isAbilityLearned(character,n.ability.id)}
     <div class="constellation-node" data-state={nodeState(n.ability)} data-selected={selected?.id === n.ability.id} data-related={layout.edges.some(e => (e.from === selected?.id && e.to === n.ability.id) || (e.to === selected?.id && e.from === n.ability.id))} style:left={`${n.x-85}px`} style:top={`${n.y}px`}>
      <button type="button" class="star-action" aria-label={learned ? `${n.ability.name}. Изучено` : `Изучить ${n.ability.name} · 1 очко`} title={learned ? 'Уже изучено' : blocked ?? 'Изучить · 1 очко'} disabled={saving || Boolean(pendingId)} onclick={() => activateCircle(n.ability)}>
       <span class="star-mark" aria-hidden="true">{learned ? '✓' : blocked === null ? '+' : ''}</span>
      </button>
      <button type="button" class="star-name" aria-pressed={selected?.id === n.ability.id} aria-label={`Описание: ${n.ability.name}`} onclick={() => {selectedId=n.ability.id;circleNotice='';}}>{n.ability.name}</button>
      <span class="star-state" role="status">{selectedId===n.ability.id && circleNotice ? circleNotice : pendingId===n.ability.id ? 'Изучаем…' : blocked===null && !learned ? 'Нажмите + · 1 очко' : stateLabel(n.ability)}</span>
     </div>
    {/each}
   </div>
  </div>
 </div>
 {#if selected}
  <div class="constellation-detail" aria-live="polite">
   <div class="detail-heading"><h3>{selected.name}</h3><span>{selected.type==='passive'?'Пассивное':selected.type==='reaction'?'Реакция':'Активное'}</span></div>
   <p class="requirements">Требуются все: {selected.requiresAll?.length ? names(selected.requiresAll) : 'нет (корень или альтернативное требование)'}{#if selected.requiresAny?.length}<br>Достаточно одного: {names(selected.requiresAny)}{/if}</p>
   <p class="ability-description">{playerText(selected.description)}</p>
   <div class="detail-actions">
    <button class="border rounded px-3 py-2 disabled:opacity-50" disabled={saving || reason !== null} onclick={() => onstudy(selected.id)}>{learnedSelected?'Изучено':'Изучить · 1 очко'}</button>
    {#if reason && !learnedSelected}<span>{reason}</span>{/if}
    {#if learnedSelected}<button class="border rounded px-3 py-2 disabled:opacity-50" disabled={!onapply || saving} onclick={() => onapply?.(selected.name+': '+selected.description)}>Применить эффект к цели</button>{/if}
   </div>
  </div>
 {/if}
</div>

<style>
 .ability-constellation {--star-learned:#235c40;--star-ready:#80501a;--star-locked:#607365;--star-line:#807453;--star-check:#fff9e9;padding:16px;color:inherit;}
 .constellation-legend,.constellation-tools,.detail-actions,.detail-heading {display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
 .constellation-legend {font-size:12px;}
 .constellation-legend>span {display:flex;align-items:center;gap:7px;}
 .legend-mark {width:12px;height:12px;border-radius:50%;border:2px solid var(--star-locked);box-sizing:border-box;}
 .legend-mark.learned {background:var(--star-learned);border-color:var(--star-learned);}
 .legend-mark.available {border-color:var(--star-ready);}
 .legend-mark.locked {border-style:dashed;}
 .constellation-tools {font-size:12px;margin:14px 0 8px;}
 .constellation-tools label {display:flex;align-items:center;gap:8px;}
 .constellation-tools input {width:110px;accent-color:var(--star-ready);}
 .constellation-scroll {overflow-x:auto;max-width:100%;padding:8px 0;}
 .constellation-size {position:relative;}
 .constellation-map {position:absolute;transform-origin:top left;}
 .constellation-lines {position:absolute;inset:0;pointer-events:none;}
 .constellation-lines path {fill:none;stroke:var(--star-line);stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round;}
 .constellation-lines path.optional {stroke-dasharray:5 5;}
 .constellation-lines path.selected-line {stroke:var(--star-ready);stroke-width:2.5;}
 .constellation-lines path.learned-line {stroke:var(--star-learned);stroke-width:2;}
 .constellation-node {position:absolute;width:170px;min-height:126px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:0 4px;background:transparent;border:0;color:inherit;cursor:pointer;box-shadow:none;}
 .star-action {width:44px;height:44px;display:flex;align-items:center;justify-content:center;position:absolute;top:-7px;left:63px;padding:7px;border:0;background:transparent;color:inherit;cursor:pointer;}
 .star-action:disabled {cursor:wait;}
 .star-name {margin-top:36px;padding:0;border:0;background:transparent;color:inherit;cursor:pointer;}
 .star-action:focus-visible,.star-name:focus-visible {outline:2px solid currentColor;outline-offset:3px;}
 .star-mark {display:flex;align-items:center;justify-content:center;width:30px;height:30px;border:2px solid var(--star-locked);border-radius:50%;box-sizing:border-box;font-size:18px;}
 [data-state="learned"] .star-mark {background:var(--star-learned);border-color:var(--star-learned);color:var(--star-check);box-shadow:0 0 0 4px color-mix(in srgb,var(--star-learned) 12%,transparent),0 0 14px color-mix(in srgb,var(--star-learned) 25%,transparent);}
 [data-state="available"] .star-mark {border-color:var(--star-ready);}
 [data-state="locked"] .star-mark {border-style:dashed;}
 [data-selected="true"] .star-mark {outline:2px solid currentColor;outline-offset:5px;}
 [data-related="true"]:not([data-selected="true"]) .star-mark {outline:1px solid var(--star-ready);outline-offset:3px;}
 .star-name {font-size:14px;line-height:1.45;font-weight:500;}
 [data-state="learned"] .star-name {font-weight:650;}
 .star-state {font-size:12px;line-height:1.4;}
 .constellation-detail {margin-top:12px;padding-top:16px;border-top:1px solid var(--decay-border,#ab9675);}
 h3 {font:21px/1.35 Georgia,serif;margin:0;}
 .detail-heading>span,.requirements,.detail-actions>span {font-size:12px;}
 .requirements {margin:10px 0;}
 .ability-description {font-size:14px;line-height:1.7;white-space:pre-line;margin:12px 0;}
 :global(main.character-sheet:is([data-decay-stage="3"],[data-decay-stage="4"]) .ability-constellation) {--star-learned:#b5e5bd;--star-ready:#f0cb81;--star-locked:#b5c1b8;--star-line:#91a195;--star-check:#183424;}
 :global(#content main.character-sheet[data-decay-stage] .ability-constellation svg.constellation-lines) {filter:none!important;}
 /* The sheet's decay theme paints ordinary controls. Stars remain transparent. */
 :global(#content main.character-sheet[data-decay-stage] .ability-constellation.ability-constellation :is(button.star-action,button.star-name)),:global(#content main.character-sheet[data-decay-stage] .ability-constellation.ability-constellation :is(button.star-action,button.star-name):hover) {background:transparent!important;background-image:none!important;border:0!important;box-shadow:none!important;color:inherit!important;filter:none!important;}
 :global(#content main.character-sheet[data-decay-stage] .ability-constellation.ability-constellation [data-state="learned"] button.star-action .star-mark) {color:var(--star-check)!important;}
 @media(max-width:600px) {.ability-constellation {padding:12px;}.constellation-legend {gap:8px;} .constellation-tools {align-items:flex-start;}}
 @media print {.constellation-tools {display:none;}.constellation-scroll {overflow:visible;}.constellation-lines path {stroke:#555!important;}.star-mark {box-shadow:none!important;}}
</style>
