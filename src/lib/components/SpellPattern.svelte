<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import Dialog from './Dialog.svelte';
  import { SPELL_PATTERNS } from '$lib/ui/spell-patterns';
  let { spellId, name }: { spellId: string; name: string } = $props();
  const pattern = $derived(SPELL_PATTERNS[spellId]);
  let expanded = $state(false);
  let drawing: SVGPathElement | undefined = $state();
  let animation: Animation | undefined;

  function replay() {
    animation?.cancel();
    if (!drawing || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const length = drawing.getTotalLength();
    animation = drawing.animate([
      { strokeDasharray: `${length}`, strokeDashoffset: length },
      { strokeDasharray: `${length}`, strokeDashoffset: 0 }
    ], { duration: 2100, easing: 'linear' });
  }
  async function openPattern() { expanded = true; await tick(); replay(); }
  function closePattern() { animation?.cancel(); expanded = false; }
  onDestroy(() => animation?.cancel());
</script>

{#if pattern}
  <button type="button" class="spell-pattern-preview" aria-label={`Показать начертание: ${name}`} onclick={openPattern}>
    <svg viewBox="0 0 240 240" aria-hidden="true">
      <path d={pattern.path} />
      <circle class="start" cx={pattern.start[0]} cy={pattern.start[1]} r="4" />
      <circle class="finish" cx={pattern.end[0]} cy={pattern.end[1]} r="4" />
    </svg>
    <span>Начертание</span>
  </button>
  {#if expanded}
    <div class="spell-pattern-shell">
    <Dialog label={`Начертание: ${name}`} onclose={closePattern}>
      <section class="spell-pattern-detail">
        <header><h3>{name}</h3><button type="button" class="close-pattern" aria-label="Закрыть начертание" onclick={closePattern}>✕</button></header>
        <svg viewBox="0 0 240 240" role="img" aria-label={`Непрерывное начертание: ${pattern.cue}`}>
          <path bind:this={drawing} d={pattern.path} />
          <circle class="start" cx={pattern.start[0]} cy={pattern.start[1]} r="4" />
          <circle class="finish" cx={pattern.end[0]} cy={pattern.end[1]} r="4" />
        </svg>
        <p class="gesture-cue">{pattern.cue}</p>
        <p class="gesture-legend">● начало · ○ конец · одно движение</p>
        <button type="button" class="replay-pattern" onclick={replay}>Повторить движение</button>
      </section>
    </Dialog>
    </div>
  {/if}
{/if}

<style>
  .spell-pattern-shell { display:contents; }
  .spell-pattern-shell :global(dialog) { background:var(--decay-card,#fffef8); color:var(--decay-text,#24392e); border-color:var(--decay-border,#b6a384); }
  .spell-pattern-preview { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; width:96px; padding:0; border:0; border-radius:4px; color:var(--decay-text,#24392e); background:transparent; cursor:pointer; }
  .spell-pattern-preview svg { width:88px; height:88px; }
  .spell-pattern-preview span { font-size:11px; text-decoration:underline; text-underline-offset:3px; }
  .spell-pattern-preview:hover { background:var(--decay-bg,#8d724212); }
  .spell-pattern-preview:focus-visible { outline:2px solid currentColor; outline-offset:4px; }
  svg { display:block; overflow:visible; }
  path { fill:none; stroke:currentColor; stroke-width:3; stroke-linecap:round; stroke-linejoin:round; }
  .start { fill:currentColor; }
  .finish { fill:var(--decay-card,#fffef8); stroke:currentColor; stroke-width:2; }
  .spell-pattern-detail { color:var(--decay-text,#24392e); text-align:center; }
  header { display:flex; align-items:start; gap:16px; justify-content:space-between; text-align:left; }
  h3 { font:24px Georgia,serif; margin:0; }
  .close-pattern { flex-shrink:0; border:0; background:transparent; padding:8px 12px; color:inherit; cursor:pointer; }
  .spell-pattern-detail svg { width:min(100%,280px); height:auto; margin:16px auto 8px; }
  .gesture-cue { margin:8px 0; font-size:15px; }
  .gesture-legend { margin:8px 0 20px; font-size:12px; }
  .replay-pattern { padding:10px 16px; border:1px solid var(--decay-border,#b6a384); border-radius:4px; background:transparent; color:inherit; cursor:pointer; }
  @media print { .spell-pattern-preview { color:inherit; } .spell-pattern-preview span { display:none; } }
</style>
