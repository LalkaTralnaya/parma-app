<script lang="ts">
  import { tick } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import Icon from './Icon.svelte';
  import type { TourStep } from '$lib/ui/learning-tours';
  let { steps, title, autoStart = false }: { steps: TourStep[]; title: string; autoStart?: boolean } = $props();
  let open = $state(false);
  let index = $state(0);
  let startedAutomatically = false;
  let panel = $state<HTMLElement>();
  const current = $derived(steps[index]);
  const launcherId = $derived(`tour-launch-${title.replace(/\s+/g, '-')}`);

  function start() { index = 0; open = true; }
  async function close() { open = false; await tick(); document.getElementById(launcherId)?.focus({ preventScroll: true }); }
  afterNavigate(() => { if (autoStart && !startedAutomatically) { startedAutomatically = true; start(); } });
  $effect(() => {
    if (!open) return;
    document.body.setAttribute('data-tour-open', 'true');
    return () => document.body.removeAttribute('data-tour-open');
  });
  $effect(() => {
    if (!open || !current) return;
    const selector = current.target;
    let target: Element | null = null;
    let cancelled = false;
    void tick().then(() => {
      if (cancelled) return;
      target = document.querySelector(selector);
      target?.setAttribute('data-tour-current', 'true');
      target?.scrollIntoView({ behavior: 'instant', block: 'start' });
      if (target) window.scrollBy({ top: -Math.min(100, window.innerHeight * .15), behavior: 'instant' });
      panel?.focus({ preventScroll: true });
    });
    return () => { cancelled = true; target?.removeAttribute('data-tour-current'); };
  });
</script>

<svelte:window onkeydown={event => { if (open && event.key === 'Escape') { event.preventDefault(); void close(); } }} />
<button id={launcherId} type="button" class="tour-launch print-hide" aria-expanded={open} onclick={start}><Icon name="compass" size={17} />Обучение</button>
{#if open && current}
  <aside class="tour-panel print-hide" role="region" aria-label={`Обучение: ${title}`} tabindex="-1" bind:this={panel}>
    <div class="tour-top"><span>{title} · {index + 1} из {steps.length}</span><button type="button" class="tour-close" aria-label="Закрыть обучение" onclick={close}>×</button></div>
    <progress max={steps.length} value={index + 1} aria-label="Прогресс обучения"></progress>
    <div aria-live="polite" aria-atomic="true"><h2>{current.title}</h2><p>{current.text}</p></div>
    {#if current.href}<a class="tour-reference" href={current.href} target="_blank" rel="noreferrer">{current.link} ↗</a>{/if}
    <div class="tour-actions"><button type="button" disabled={index === 0} onclick={() => index--}>Назад</button><button type="button" class="tour-next" onclick={() => index < steps.length - 1 ? index++ : close()}>{index < steps.length - 1 ? 'Далее' : 'Завершить'}<Icon name="arrow" size={17} /></button></div>
    <a class="tour-all" href="/learn">Все темы обучения</a>
  </aside>
{/if}

<style>
  .tour-launch { display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:8px 12px;border:1px solid #a5906b;border-radius:5px;background:#fff7e7;color:#294633;font-size:13px; }
  .tour-panel { position:fixed;right:24px;bottom:24px;z-index:1000;width:min(390px,calc(100vw - 32px));max-height:calc(100svh - 32px);overflow-y:auto;background:#fff7e7;color:#263c31;border:1px solid #9d7b4c;border-top:4px solid #31543f;border-radius:6px;padding:18px 20px;box-shadow:0 12px 55px #13291f45;text-align:left;font-size:14px;outline:none; }
  .tour-top { display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:11px;letter-spacing:.03em;color:#796545; }
  .tour-close { font-size:25px;line-height:1;padding:2px 5px;border:0;background:transparent;color:#263c31; }
  progress { display:block;width:100%;height:4px;margin:10px 0 17px;accent-color:#31543f; }
  h2 { font:24px Georgia,serif;margin-bottom:10px;color:#263c31; } p { line-height:1.65;color:#465144; }
  .tour-reference { display:inline-block;margin-top:12px;font-size:12px;color:#31543f;text-decoration:underline;text-underline-offset:3px; }
  .tour-actions { display:flex;justify-content:space-between;gap:12px;margin-top:18px; }
  .tour-actions button { display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:8px 14px;border:1px solid #b4a080;border-radius:4px;background:#fff7e7;color:#294633; }
  .tour-actions .tour-next { background:#294b38;color:#fff8e9;border-color:#294b38; }
  button:disabled { opacity:.35;cursor:default; }
  button:focus-visible, a:focus-visible { outline:2px solid #a26c38;outline-offset:3px; }
  .tour-all { display:inline-block;margin-top:14px;font-size:11px;color:#796545; }
  :global([data-tour-current='true']) { outline:3px solid #ac783c!important;outline-offset:5px;scroll-margin:24px; }
  :global(body[data-tour-open='true']) { padding-bottom:50vh; }
  @media(max-width:600px) { .tour-panel { right:12px;bottom:12px;width:calc(100vw - 24px);padding:14px 16px;max-height:45svh; } h2 { font-size:21px; } }
  @media print { .print-hide { display:none!important; } :global([data-tour-current='true']) { outline:none!important; } }
</style>
