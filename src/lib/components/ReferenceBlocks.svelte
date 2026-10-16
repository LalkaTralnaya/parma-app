<script lang="ts">
 import type { LibraryBlock } from '$lib/rules/parma-library';
 let { blocks }: { blocks: LibraryBlock[] } = $props();
</script>

<div class="book-blocks">
 {#each blocks as block}
  {#if block.kind === 'table'}
   <div class="table-scroll"><table><thead><tr>{#each block.rows[0] as cell}<th scope="col">{cell}</th>{/each}</tr></thead><tbody>{#each block.rows.slice(1) as row}<tr>{#each row as cell}<td>{cell}</td>{/each}</tr>{/each}</tbody></table></div>
  {:else if block.level}<h3>{block.text}</h3>
  {:else}<p>{block.text}</p>{/if}
 {/each}
</div>

<style>
 .book-blocks { display: grid; gap: .8rem; padding-top: 1rem; }
 p { white-space: pre-line; }
 h3 { font-weight: 600; padding-top: .5rem; }
 .table-scroll { overflow-x: auto; }
 table { width: 100%; border-collapse: collapse; }
 th, td { border: 1px solid #b8c8b5; padding: .5rem; text-align: left; vertical-align: top; min-width: 100px; }
</style>
