<script module lang="ts">
 import { DRAFT_TREES, DRAFT_ABILITIES } from '$lib/rules/draft-trees';

 const nodesByTree = new Map<string, typeof DRAFT_ABILITIES>();
 const nodeSearchTexts = new Map<string, string[]>();
 for (const ability of DRAFT_ABILITIES) {
  if (ability.treeId === undefined) continue;
  const nodes = nodesByTree.get(ability.treeId);
  if (nodes) nodes.push(ability);
  else nodesByTree.set(ability.treeId, [ability]);
 }

 const trees = DRAFT_TREES.map(tree => ({ ...tree, searchName: tree.name.toLowerCase(), nodes: nodesByTree.get(tree.id) ?? [] }));

 function getNodeSearchTexts(treeId: string, nodes: typeof DRAFT_ABILITIES): string[] {
  let texts = nodeSearchTexts.get(treeId);
  if (!texts) {
   texts = nodes.map(ability => (ability.name + ' ' + ability.description).toLowerCase());
   nodeSearchTexts.set(treeId, texts);
  }
  return texts;
 }
</script>

<script lang="ts">
 import type { Character } from '$lib/type';
 import AbilityConstellation from './AbilityConstellation.svelte';
 import { learnAbility } from '$lib/engine/character';
 import { SCHOOL_TREE, usesGraceForSpellcasting } from '$lib/engine/spells';
 let { character, onchange, onapply }: { character: Character; onchange: (c: Character) => Promise<void>; onapply?: (text:string)=>void } = $props();
 let query = $state(''); let saving = $state(false); let notice = $state('');
 const useGrace = $derived(usesGraceForSpellcasting(character));
 const hasQuery = $derived(Boolean(query.trim()));
 const shown = $derived.by(() => {
  if (!hasQuery) return trees;
  const needle = query.toLowerCase();
  return trees.filter(tree => {
   if (tree.searchName.includes(needle)) return true;
   return getNodeSearchTexts(tree.id, tree.nodes).some(text => text.includes(needle));
  });
 });
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
  <details class="border rounded ability-tree" open={hasQuery}>
   <summary class="p-3 cursor-pointer font-semibold">{tree.name} <span class="text-xs font-normal text-gray-500">{useGrace && SCHOOL_TREE[tree.skillId] === tree.id ? 'Религия' : tree.attribute}</span></summary>
   <AbilityConstellation nodes={tree.nodes} treeId={tree.id} {character} {saving} onstudy={study} {onapply}/>
  </details>
 {/each}
 </div>
</section>
