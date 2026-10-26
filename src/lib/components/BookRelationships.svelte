<script lang="ts">
 import { BOOK_FACTIONS, BOOK_RELATIONSHIPS, BOOK_RELATIONSHIP_JOBS } from '$lib/rules/book-relationships';
 import type { RelationshipLink, RelationshipTargetType } from '$lib/engine/relationship-web';
 import RelationshipGraph from './RelationshipGraph.svelte';
 let { onAdd, links = [], onRemove }: { onRemove?: (id:string)=>void; links?: RelationshipLink[]; onAdd?: (node:{id:string; name:string; type:RelationshipTargetType})=>void } = $props();
 let factionId=$state('');
 let query=$state('');
 let kind=$state('');
 const factions=new Map(BOOK_FACTIONS.map(f=>[f.id,f]));
 const kinds=[...new Set(BOOK_RELATIONSHIPS.map(e=>e.kind))];
 const customLinks=$derived(links.filter(link=>!link.id.startsWith('book:')));
 const extraNames=$derived([...new Set(customLinks.flatMap(link=>[...(link.sourceType==='organization'?[link.characterName]:[]),...(link.targetType==='organization'?[link.targetName]:[])]))].filter(name=>!BOOK_FACTIONS.some(f=>f.short===name)));
 const faction=$derived(factions.get(factionId));
 const selectedName=$derived(faction?.short ?? (factionId.startsWith('new:')?factionId.slice(4):''));
 const matches=(value:string)=>value.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru'));
 const jobs=$derived(BOOK_RELATIONSHIP_JOBS.filter(j=>(!factionId||j.owner===factionId||j.peer===factionId)&&(!kind||BOOK_RELATIONSHIPS.find(e=>e.id===j.edge)?.kind===kind)&&matches(`${j.title} ${j.brief} ${j.reward} ${factions.get(j.owner)?.name}`)));
 const graphLinks=$derived(links.filter(link=>(!selectedName||link.characterName===selectedName||link.targetName===selectedName)&&(!kind||link.relation.toLocaleLowerCase('ru').includes(kind))&&matches(`${link.characterName} ${link.targetName} ${link.relation} ${link.notes}`)));
</script>

<section class="book-web" aria-labelledby="book-web-heading">
 <div class="book-web-heading"><div><p class="eyebrow">Связи мира</p><h3 id="book-web-heading">Люди, общины и их связи</h3></div><span class="book-count">{links.length} связей · 120 книжных поручений</span></div>
 <div class="book-filters">
  <label>Сторона<select bind:value={factionId}><option value="">Все стороны</option>{#each [...new Set(BOOK_FACTIONS.map(f=>f.group))] as group}<optgroup label={group}>{#each BOOK_FACTIONS.filter(f=>f.group===group) as f}<option value={f.id}>{f.short}</option>{/each}</optgroup>{/each}{#if extraNames.length}<optgroup label="Новые стороны">{#each extraNames as name}<option value={`new:${name}`}>{name}</option>{/each}</optgroup>{/if}</select></label>
  <label>Отношения<select bind:value={kind}><option value="">Все отношения</option>{#each kinds as k}<option value={k}>{k}</option>{/each}</select></label>
  <label class="book-search">Поиск<input type="search" bind:value={query} placeholder="Сторона, отношение или поручение" /></label>
 </div>
 {#if faction}<details class="faction-profile"><summary>{faction.name}</summary><p><strong>Цель:</strong> {faction.goal}</p><p><strong>Ресурсы:</strong> {faction.leverage}</p><p><strong>Внутренний спор:</strong> {faction.split}</p><p><strong>Предел уступок:</strong> {faction.limit}</p>{#if onAdd}<button type="button" class="attach" onclick={()=>onAdd?.({id:`organization:${faction.id}`,name:faction.short,type:'organization'})}>Новая связь</button>{/if}</details>{/if}
 {#if graphLinks.length}<RelationshipGraph links={graphLinks} {onAdd} {onRemove} />{:else}<p class="empty">Отношений по этим условиям нет. Измените сторону или фильтры.</p>{/if}
 <details class="book-register"><summary>Отношения · {graphLinks.length}</summary><div class="relationship-register">{#each graphLinks as link (link.id)}<article><div class="edge-heading"><h4>{link.characterName} ↔ {link.targetName}</h4><span class="kind">{link.id.startsWith('book:')?'Книжная связь':'Новая связь'}</span></div><p class="edge-label">{link.relation || 'Связь'}</p>{#if link.notes}<p class="trigger">{link.notes}</p>{/if}{#if onRemove&&!link.id.startsWith('book:')}<button type="button" class="attach" onclick={()=>onRemove?.(link.id)} aria-label={`Удалить новую связь: ${link.characterName} — ${link.targetName}`}>Удалить новую связь</button>{/if}</article>{/each}</div></details>
 <details class="book-register"><summary>Поручения · {jobs.length}</summary><div class="job-register">{#each jobs as job (job.id)}<details class="job"><summary>{job.title}<small>{factions.get(job.owner)?.short}</small></summary><p>{job.brief}</p><p><strong>Дополнительная награда:</strong> {job.reward}</p><p class="trigger">Связь: {factions.get(job.owner)?.short} ↔ {factions.get(job.peer)?.short}</p>{#if onAdd}<button type="button" class="attach" onclick={()=>onAdd?.({id:`quest:${job.id}`,name:job.title,type:'quest'})}>Новая связь с поручением</button>{/if}</details>{/each}</div></details>
 <p class="book-source">По разделам «Реестр отношений» и «Стороны и их поручения». <a href="/lore#book16-82">Читать в книге</a></p>
</section>

<style>
 .book-web { color:inherit; padding-bottom:20px; margin-bottom:20px; border-bottom:1px solid #b6a27b; }
 .book-web-heading { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:18px; } .eyebrow { font-size:11px; text-transform:uppercase; letter-spacing:.14em; margin:0 0 4px; opacity:.7; } h3 { font:26px Georgia,serif; margin:0; } .book-count { font-size:12px; opacity:.75; }
 .book-filters { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:14px; } label { display:grid; gap:5px; font-size:12px; flex:1; min-width:160px; } .book-search { flex:1.5; } select,input { min-height:42px; width:100%; border:1px solid #b6a27b; padding:8px 10px; border-radius:6px; background:#fffaf0; color:#243e31; }
 .faction-profile { margin-bottom:16px; padding:12px 16px; border:1px solid #c7b58e; border-radius:8px; } summary { cursor:pointer; font-weight:600; } p { font-size:14px; line-height:1.6; margin:10px 0; }
 .book-register { margin-top:12px; padding:12px 0; border-bottom:1px solid #c7b58e; } .relationship-register { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr)); gap:12px; margin-top:16px; } article,.job { padding:16px; border:1px solid #c7b58e; border-radius:8px; background:#b6a27b0a; } .edge-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; } h4 { font:20px Georgia,serif; margin:0; } .kind { font-size:11px; border:1px solid #b6a27b; border-radius:20px; padding:3px 8px; } .edge-label { font-weight:600; } .trigger { opacity:.8; white-space:pre-line; } .job-register { display:grid; gap:10px; margin-top:16px; } small { display:block; font-weight:400; margin-top:4px; opacity:.7; } .attach { padding:9px 14px; border:1px solid currentColor; border-radius:6px; color:inherit; background:transparent; margin-top:8px; } .book-source { font-size:12px; opacity:.75; } a { text-decoration:underline; } .empty { padding:24px; text-align:center; }
</style>
