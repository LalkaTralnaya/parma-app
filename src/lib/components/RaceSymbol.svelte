<script lang="ts">
  import Dialog from './Dialog.svelte';
  import { RACE_SYMBOLS } from '$lib/ui/race-symbols';
  let { id }: { id: string } = $props();
  const symbol = $derived(RACE_SYMBOLS[id]);
  let opened = $state(false);
</script>

{#if symbol}
  {#snippet mark()}
    <svg viewBox="0 0 100 100" role="img" aria-label={`${symbol.name} — ${symbol.title}`}>
      {#each symbol.paths as path}<path d={path} />{/each}
    </svg>
  {/snippet}
  <button class="race-symbol" type="button" aria-label={`Рассмотреть символ: ${symbol.name}`} onclick={() => opened = true}>
    {@render mark()}
    <span>Символ</span>
  </button>
  {#if opened}
    <div class="race-symbol-shell">
    <Dialog label={`Символ: ${symbol.name}`} onclose={() => opened = false}>
      <section class="symbol-detail">
        <header><div><p class="symbol-race">{symbol.name}</p><h3>{symbol.title}</h3></div><button class="symbol-close" type="button" aria-label="Закрыть символ" onclick={() => opened = false}>✕</button></header>
        <div class="large-symbol">{@render mark()}</div>
        <p class="symbol-meaning">{symbol.meaning}</p>
        <a href={`/art/races/symbols/${id}.svg`} target="_blank" rel="noreferrer">Открыть символ отдельно ↗</a>
      </section>
    </Dialog>
    </div>
  {/if}
{/if}

<style>
  .race-symbol-shell { display:contents; }
  .race-symbol-shell :global(dialog) { background:var(--decay-card,#fffef8); color:var(--decay-text,#294637); border-color:var(--decay-border,#b6a384); }
  .race-symbol { display:flex; flex-direction:column; align-items:center; gap:2px; flex-shrink:0; padding:4px; border:0; border-radius:3px; background:transparent; color:inherit; cursor:pointer; }
  .race-symbol svg { width:52px; height:52px; }
  .race-symbol span { font-size:11px; text-decoration:underline; text-underline-offset:3px; }
  .race-symbol:hover { background:#856b4710; }
  .race-symbol:focus-visible { outline:2px solid #856b47; outline-offset:4px; }
  svg { display:block; width:100%; height:auto; color:inherit; fill:none; stroke:currentColor; stroke-width:2.8; stroke-linecap:round; stroke-linejoin:round; }
  .symbol-detail { color:var(--decay-text,#294637); text-align:center; }
  header { display:flex; align-items:start; justify-content:space-between; gap:16px; text-align:left; }
  .symbol-race { font-size:13px; color:var(--decay-muted,#855d3e); margin:0 0 4px; }
  h3 { font:26px Georgia,serif; margin:0; }
  .symbol-close { min-width:44px; min-height:44px; padding:8px; border:0; background:transparent; color:inherit; cursor:pointer; }
  .large-symbol { width:min(100%,240px); margin:20px auto; }
  .symbol-meaning { font-size:15px; line-height:1.7; margin:0 0 20px; }
  a { font-size:13px; text-decoration:underline; text-underline-offset:3px; }
  @media print { .race-symbol span { display:none; } }
</style>
