<script lang="ts">
  import Icon from './Icon.svelte';
  import type { ContextTip } from '$lib/ui/novice-help';
  let { tips, returning = false, onClose, onHide }: { tips: ContextTip[]; returning?: boolean; onClose: () => void; onHide: () => void } = $props();
  let index = $state(0);
  const current = $derived(tips[index % tips.length]);
</script>

{#if current}
  <aside class="novice-help" aria-label="Подсказки по разделу">
    <div class="hint-symbol" aria-hidden="true"><Icon name="compass" size={24} /></div>
    <div class="hint-body">
      <div class="hint-label">{returning ? 'С возвращением в Парму' : 'Осваиваемся в Парме'}<span>{index % tips.length + 1} / {tips.length}</span></div>
      <div aria-live="polite" aria-atomic="true"><h2>{current.title}</h2><p>{current.text}</p></div>
      <div class="hint-actions">
        {#if current.href}<a href={current.href}>{current.link}<span aria-hidden="true"> →</span></a>{/if}
        {#if tips.length > 1}<button type="button" onclick={() => index++}>Ещё подсказка <span aria-hidden="true">→</span></button>{/if}
        <button type="button" class="hint-hide" onclick={() => onHide()}>Скрыть подсказки на эту неделю</button>
      </div>
    </div>
    <button type="button" class="hint-close" aria-label="Закрыть подсказки в этом разделе" onclick={() => onClose()}>×</button>
  </aside>
{/if}

<style>
  .novice-help { display:flex; align-items:flex-start; gap:16px; position:relative; width:calc(100% - 48px); max-width:1186px; margin:22px auto 0; padding:18px 48px 18px 20px; box-sizing:border-box; background:#f6eedc; color:#294135; border:1px solid #bca67e; border-left:3px solid #526f52; border-radius:4px; }
  .hint-symbol { flex-shrink:0; padding-top:4px; color:#927041; }
  .hint-body { min-width:0; flex:1; }
  .hint-label { display:flex; align-items:center; gap:14px; font-size:11px; color:#6c644e; }
  .hint-label span { font-variant-numeric:tabular-nums; }
  h2 { font:21px/1.35 Georgia,serif; margin:5px 0 6px; color:inherit; }
  p { max-width:95ch; margin:0; font-size:14px; line-height:1.65; color:inherit; }
  .hint-actions { display:flex; flex-wrap:wrap; align-items:center; gap:4px 22px; margin-top:9px; }
  .hint-actions a, .hint-actions button { display:inline-block; padding:5px 0; color:inherit; font-size:12px; line-height:1.5; background:transparent; border:0; text-align:left; cursor:pointer; }
  .hint-actions a { text-decoration:underline; text-underline-offset:3px; }
  .hint-actions .hint-hide { color:#716a58; margin-left:auto; }
  .hint-close { position:absolute; top:9px; right:9px; width:36px; height:36px; font-size:26px; background:transparent; border:0; color:inherit; cursor:pointer; }
  a:focus-visible, button:focus-visible { outline:2px solid #977543; outline-offset:3px; }
  :global(body[data-tour-open='true']) .novice-help { display:none; }
  @media(max-width:600px) { .novice-help { width:calc(100% - 32px); gap:10px; padding:15px 42px 15px 14px; margin-top:16px; } h2 { font-size:19px; } .hint-actions { gap:4px 18px; } .hint-actions .hint-hide { margin-left:0; } .hint-symbol { display:none; } }
  @media print { .novice-help { display:none; } }
</style>
