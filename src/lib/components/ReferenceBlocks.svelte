<script lang="ts">
  import type { LibraryBlock } from '$lib/rules/parma-library';
  import { readingBlocks, readingSections, type ReadingBlock } from '$lib/ui/reference-reading';
  import ReferenceText from './ReferenceText.svelte';
  import ConditionIcon from './ConditionIcon.svelte';
  import Icon from './Icon.svelte';
  let { blocks, category = '', sectionLevel, expanded = false, entryTitle = '' }: { blocks: LibraryBlock[]; category?: string; sectionLevel?: number; expanded?: boolean; entryTitle?: string } = $props();
  const sections = $derived(readingSections(readingBlocks(blocks.filter((block, index) => !(index === 0 && block.kind === 'paragraph' && block.level && block.text === entryTitle))), sectionLevel));
</script>

{#snippet content(items: ReadingBlock[])}
  <div class="reading-flow">
    {#each items as block}
      {#if block.kind === 'table' && block.rows.length}
        {@const headers = block.rows[0]}
        {@const mobileCards = headers.length > 2 || block.rows.slice(1).some(row => row.some(cell => cell.length > 160))}
        <div class="table-scroll" role="region" aria-label={headers.join(' · ')}>
          <table class:mobile-cards={mobileCards}>
            <thead><tr>{#each headers as cell}<th scope="col">{cell}</th>{/each}</tr></thead>
            <tbody>{#each block.rows.slice(1) as row}<tr>{#each row as cell, column}<td data-label={headers[column] ?? ''}>
              {#if category === 'Состояния' && column === 0}<span class="condition-name"><ConditionIcon name={cell} size={28} /><span>{cell}</span></span>{:else}{cell}{/if}
            </td>{/each}</tr>{/each}</tbody>
          </table>
        </div>
      {:else if block.kind === 'list'}
        {#if block.ordered}<ol class="reading-list" start={block.start}>{#each block.items as item}<li><ReferenceText text={item} /></li>{/each}</ol>
        {:else}<ul class="reading-list">{#each block.items as item}<li><ReferenceText text={item} /></li>{/each}</ul>{/if}
      {:else if block.kind === 'paragraph' && block.level}
        <svelte:element this={block.level <= 2 ? 'h3' : block.level === 3 ? 'h4' : 'h5'} class="reading-heading">
          {#if category === 'Состояния'}<span class="condition-name"><ConditionIcon name={block.text} /><span>{block.text}</span></span>{:else}{block.text}{/if}
        </svelte:element>
      {:else if block.kind === 'paragraph'}<p><ReferenceText text={block.text} /></p>{/if}
    {/each}
  </div>
{/snippet}

<div class="book-blocks" lang="ru">
  {#each sections as section}
    {#if section.title}
      <details class="reading-subsection" open={expanded}>
        <summary><span>{section.title}</span><Icon name="arrow" size={18} /></summary>
        <div class="subsection-content">{@render content(section.blocks)}</div>
      </details>
    {:else}{@render content(section.blocks)}{/if}
  {/each}
</div>

<style>
  .book-blocks { display:grid; gap:16px; min-width:0; color:inherit; font-size:15px; line-height:1.8; }
  .reading-flow { display:grid; gap:14px; min-width:0; }
  p, .reading-list { max-width:80ch; margin:0; overflow-wrap:anywhere; }
  .reading-heading { max-width:75ch; margin:8px 0 0; font-family:Georgia,serif; font-weight:600; line-height:1.4; color:#294637; overflow-wrap:anywhere; }
  h3 { font-size:23px; } h4 { font-size:20px; } h5 { font-size:17px; }
  .reading-list { padding-left:24px; } ul { list-style:disc; } ol { list-style:decimal; } li + li { margin-top:7px; }
  .condition-name { display:inline-flex; align-items:center; gap:9px; }
  .table-scroll { min-width:0; max-width:100%; overflow-x:auto; border:1px solid #c4b391; border-radius:3px; }
  table { width:100%; border-collapse:collapse; font-size:14px; line-height:1.65; }
  th, td { padding:11px 13px; text-align:left; vertical-align:top; white-space:pre-line; overflow-wrap:anywhere; }
  th { font-weight:600; background:#eae0cb; color:#294637; }
  td { border-top:1px solid #d5c8ae; } td + td, th + th { border-left:1px solid #dfd3bd; }
  tr:nth-child(even) td { background:#b69b6410; }
  .reading-subsection { min-width:0; border:1px solid #c4b391; border-radius:4px; background:#fcf8ed; }
  summary { display:flex; justify-content:space-between; align-items:center; gap:16px; padding:15px 17px; list-style:none; cursor:pointer; font-family:Georgia,serif; font-size:20px; line-height:1.4; color:#294637; }
  summary::-webkit-details-marker { display:none; }
  summary :global(svg) { flex-shrink:0; transform:rotate(90deg); }
  details[open] > summary :global(svg) { transform:rotate(-90deg); }
  summary:hover { background:#ede5d2; } summary:focus-visible { outline:2px solid #856b47; outline-offset:3px; }
  .subsection-content { padding:0 17px 18px; }
  @media(max-width:600px) {
    .book-blocks { font-size:15px; line-height:1.75; } h3 { font-size:21px; } h4 { font-size:19px; }
    summary { padding:13px; font-size:18px; } .subsection-content { padding:0 12px 15px; }
    th, td { padding:9px; } table { font-size:13px; }
    .mobile-cards, .mobile-cards tbody, .mobile-cards tr, .mobile-cards td { display:block; }
    .mobile-cards thead { position:absolute; width:1px; height:1px; padding:0; overflow:hidden; clip-path:inset(50%); }
    .mobile-cards tr + tr { border-top:2px solid #b9a27a; }
    .mobile-cards td { border:0; padding:8px 12px; }
    .mobile-cards td::before { content:attr(data-label); display:block; font-size:12px; font-weight:600; color:#65583e; margin-bottom:2px; }
    .mobile-cards td:first-child { font-weight:600; color:#294637; padding-top:13px; }
    .mobile-cards td:last-child { padding-bottom:13px; }
  }
  @media print { .book-blocks { font-size:11pt; } table { font-size:10pt; } .table-scroll { overflow:visible; } tr { break-inside:avoid; } }
</style>
