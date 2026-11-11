<script lang="ts">
 import { tick } from 'svelte';
 import { normalizeRoomImage } from '$lib/engine/room-image';
 let { data }: { data: unknown } = $props();
 const image = $derived(normalizeRoomImage(data));
 let dialog = $state<HTMLDialogElement>();
 let failed = $state(false);
 let large = $state(false);
 let actualSize = $state(false);
 $effect(() => { image?.url; failed = false; });
 async function enlarge() { large = true; actualSize = false; await tick(); dialog?.showModal(); }
</script>
{#if image}
 <figure>
  <figcaption>{image.kind === 'map' ? 'Карта' : 'Изображение'}{image.caption ? ': ' + image.caption : ''}</figcaption>
  {#if failed}<p role="status">Изображение недоступно. Проверьте ссылку или доступ к файлу.</p>
  {:else}<button type="button" class="preview" onclick={enlarge} aria-label="Открыть изображение крупнее"><img src={image.url} alt={image.caption || 'Изображение комнаты'} loading="lazy" referrerpolicy="no-referrer" onerror={() => failed = true} /></button>{/if}
  <a href={image.url} target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">Открыть оригинал ↗</a>
 </figure>
 {#if large}
  <dialog bind:this={dialog} onclose={() => large = false} oncancel={() => large = false} aria-label={image.caption || 'Просмотр изображения'}>
   <header><strong>{image.caption || (image.kind === 'map' ? 'Карта' : 'Изображение')}</strong><button type="button" onclick={() => actualSize = !actualSize}>{actualSize ? 'Вписать' : 'Исходный размер'}</button><button type="button" onclick={() => dialog?.close()} aria-label="Закрыть изображение">✕</button></header>
   <div class="viewer"><img class:actual={actualSize} src={image.url} alt={image.caption || 'Изображение комнаты'} referrerpolicy="no-referrer" /></div>
  </dialog>
 {/if}
{:else}<p>Некорректная ссылка на изображение.</p>{/if}
<style>
 figure { margin:8px 0; } figcaption { font-weight:600; margin-bottom:8px; overflow-wrap:anywhere; } .preview { display:block; width:100%; padding:0; border:0; background:#f8f1e1; cursor:zoom-in; } .preview img { display:block; max-width:100%; max-height:260px; margin:auto; object-fit:contain; } a { display:inline-block; margin-top:8px; text-decoration:underline; }
 dialog { padding:16px; width:95vw; max-width:1400px; max-height:95vh; border:1px solid #b59b72; border-radius:8px; background:#fffaf0; color:#263e32; } dialog::backdrop { background:#0009; } header { display:flex; gap:12px; align-items:center; margin-bottom:12px; } strong { flex:1; } button { padding:8px; cursor:pointer; } .viewer { max-height:75vh; overflow:auto; } .viewer img { display:block; max-width:100%; max-height:75vh; margin:auto; object-fit:contain; } .viewer img.actual { max-width:none; max-height:none; } button:focus-visible,a:focus-visible { outline:3px solid #b89142; }
</style>
