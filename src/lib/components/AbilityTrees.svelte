<script lang="ts">
 import type { Character } from '$lib/type';
 import AbilityConstellation from './AbilityConstellation.svelte';
 import { DRAFT_TREES, DRAFT_ABILITIES } from '$lib/rules/draft-trees';
 import { learnAbility } from '$lib/engine/character';
 let { character, onchange, onapply }: { character: Character; onchange: (c: Character) => Promise<void>; onapply?: (text:string)=>void } = $props();
 let query = $state(''); let saving = $state(false); let notice = $state('');
 const shown = $derived(DRAFT_TREES.filter(t => !query.trim() || t.name.toLowerCase().includes(query.toLowerCase()) || DRAFT_ABILITIES.some(a=>a.treeId===t.id && (a.name+' '+a.description).toLowerCase().includes(query.toLowerCase()))));
 async function study(id: string) {
  if (saving) return; const updated = learnAbility(character,id); if (!updated) return;
  saving=true;notice='';try { await onchange(updated); } catch { notice='Не удалось сохранить умение.'; } finally { saving=false; }
 }
 async function form(id: 'werewolf'|'vampire', enabled: boolean) {
  if(saving)return;saving=true;try { await onchange({...character,storyForms: enabled ? [...new Set([...(character.storyForms??[]),id])] : (character.storyForms??[]).filter(x=>x!==id)}); } finally { saving=false; }
 }
</script>
<section>
 <h2 id="abilities" class="text-xl font-semibold mb-3">Созвездия умений</h2>
 <p class="text-sm mb-3">Очков: <strong>{character.abilityPoints ?? 0}</strong>. За уровень — 5, каждый узел — 1. Требуются указанные предшественники; порогов характеристик нет. Старший ранг заменяет младший. Заклинания изучаются отдельно.</p>
 <label class="block mb-3">Поиск по деревьям и умениям<input class="block w-full border rounded p-2" type="search" bind:value={query} /></label>
 <details class="border rounded p-3 mb-3"><summary>Особые формы, полученные по сюжету</summary><p class="text-sm my-2">Отметьте только формы, уже разрешённые сказителем. Покупка узла не превращает персонажа.</p>
  {#each ['werewolf','vampire'] as id}<label class="mr-4"><input type="checkbox" checked={(character.storyForms??[]).includes(id as 'werewolf'|'vampire')} disabled={saving} onchange={e=>form(id as 'werewolf'|'vampire',e.currentTarget.checked)} /> {id==='werewolf'?'Оборотень':'Вампир'}</label>{/each}
 </details>
 {#if notice}<p role="alert">{notice}</p>{/if}
 <div class="space-y-3">
 {#each shown as tree (tree.id)}
  <details class="border rounded ability-tree" open={Boolean(query.trim())}>
   <summary class="p-3 cursor-pointer font-semibold">{tree.name} <span class="text-xs font-normal text-gray-500">{tree.attribute}</span></summary>
   <AbilityConstellation nodes={DRAFT_ABILITIES.filter(a=>a.treeId===tree.id)} treeId={tree.id} {character} {saving} onstudy={study} {onapply}/>
  </details>
 {/each}
 </div>
</section>
