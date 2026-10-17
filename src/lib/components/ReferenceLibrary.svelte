<script lang="ts">
  import { page } from '$app/state';
  import { playerText, playerTable } from '$lib/ui/player-copy';
  import PantheonGallery from './PantheonGallery.svelte';
  import ConditionIcon from './ConditionIcon.svelte';
  import { arrangeReference, type ReadingOrder } from '$lib/ui/reference-order';
  type Block = { kind: 'paragraph'; text: string; level?: number } | { kind: 'table'; rows: string[][] };
  type Entry = { id: string; title: string; category: string; blocks: Block[]; source?: string };
  let { title, description, entries, readingOrder }: { title: string; description: string; entries: Entry[]; readingOrder?: ReadingOrder } = $props();
  let query = $state('');
  let category = $state('Все');
  const playerEntries = $derived(entries.filter(entry => entry.title !== 'Перенос уже созданного героя').map(entry => ({ id: entry.id, title: playerText(entry.title), category: playerText(entry.category), blocks: entry.blocks.map(block => block.kind === 'table' ? { ...block, rows: playerTable(block.rows) } : { ...block, text: playerText(block.text) }).filter(block => block.kind === 'table' ? block.rows.length > 0 : Boolean(block.text)) })).filter(entry => entry.blocks.length));
  const chapters = $derived(readingOrder ? arrangeReference(entries, readingOrder).map(chapter => ({ ...chapter, entries: chapter.entries.map(entry => playerEntries.find(clean => clean.id === entry.id)).filter((entry): entry is typeof playerEntries[number] => Boolean(entry)) })).filter(chapter => chapter.entries.length) : [{ id: 'all', title: '', description: '', number: 0, entries: playerEntries }]);
  const categories = $derived(['Все', ...(readingOrder ? chapters.map(chapter => chapter.title) : new Set(playerEntries.map(entry => entry.category)))]);
  const visible = $derived(playerEntries.filter(entry => (category === 'Все' || (readingOrder ? chapters.some(chapter => chapter.title === category && chapter.entries.some(member => member.id === entry.id)) : category === entry.category)) && JSON.stringify([entry.title, entry.category, entry.blocks]).toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru'))));
  const visibleChapters = $derived(chapters.map(chapter => ({ ...chapter, entries: chapter.entries.filter(entry => visible.some(member => member.id === entry.id)) })).filter(chapter => chapter.entries.length));
</script>

<svelte:head><title>{title} — Парма</title></svelte:head>
<main class="reference-page max-w-6xl mx-auto p-6 space-y-5">
  <header><h1 class="text-4xl font-bold">{title}</h1><p class="mt-2 text-gray-600">{description}</p><a class="reading-help" href="/learn?topic=reading">Первый раз здесь? Как пользоваться справочниками →</a></header>
  {#if readingOrder && visibleChapters.length}
    <details class="reading-contents" open>
      <summary>Порядок чтения <span>От основ к подробностям</span></summary>
      <nav aria-label="Оглавление"><ol>{#each visibleChapters as chapter}<li><a href={`#chapter-${chapter.id}`}><span class="chapter-number">{chapter.number.toString().padStart(2, '0')}</span><span><strong>{chapter.title}</strong><small>{chapter.description}</small></span></a></li>{/each}</ol></nav>
    </details>
  {/if}
  <label class="block"><span class="text-sm">Поиск по разделам и тексту</span><input class="block w-full border rounded px-3 py-2 mt-1" type="search" bind:value={query} placeholder="Введите слово или название" /></label>
  <nav class="flex flex-wrap gap-2" aria-label="Категории справочника">
    <label class="chapter-filter">{readingOrder ? 'Показать главу' : 'Категория'}<select bind:value={category}>{#each categories as item}<option value={item}>{item}</option>{/each}</select></label>
  </nav>
  <p class="text-sm text-gray-500" role="status">Разделов: {visible.length}</p>
  {#each visibleChapters as chapter (chapter.id)}
    <section class="book-chapter">
      {#if readingOrder}<header class="chapter-heading" id={`chapter-${chapter.id}`}><span>{chapter.number.toString().padStart(2, '0')}</span><div><h2>{chapter.title}</h2><p>{chapter.description}</p></div></header>{/if}
      {#each chapter.entries as entry (entry.id)}
    <details id={entry.id} class="border rounded-lg bg-white" open={Boolean(query.trim()) || page.url.hash === `#${entry.id}`}>
      <summary class="p-4 cursor-pointer font-semibold"><span class="text-xs text-gray-500 mr-2">{entry.category}</span>{entry.title}</summary>
      <div class="px-4 pb-4 space-y-3">
        {#if entry.title === 'Пантеон'}
          <PantheonGallery blocks={entry.blocks} expanded={Boolean(query.trim())} />
        {:else}
        {#each entry.blocks as block}
          {#if block.kind === 'table'}
            <div class="overflow-x-auto"><table class="w-full text-sm border-collapse"><thead><tr>{#each block.rows[0] as cell}<th class="border p-2 text-left bg-gray-100" scope="col">{cell}</th>{/each}</tr></thead><tbody>{#each block.rows.slice(1) as row}<tr>{#each row as cell, column}<td class="border p-2 align-top">{#if entry.category === 'Состояния' && column === 0}<span class="inline-flex items-center gap-2"><ConditionIcon name={cell} size={28} /><span>{cell}</span></span>{:else}{cell}{/if}</td>{/each}</tr>{/each}</tbody></table></div>
          {:else if block.level}<h3 class="font-semibold pt-3">{#if entry.category === 'Состояния'}<span class="inline-flex items-center gap-2"><ConditionIcon name={block.text} /><span>{block.text}</span></span>{:else}{block.text}{/if}</h3>
          {:else}<p class="whitespace-pre-line">{block.text}</p>{/if}
        {/each}
        {/if}
      </div>
    </details>
      {/each}
    </section>
  {:else}<p class="notice">Ничего не найдено. Измените запрос или категорию.</p>{/each}
</main>
<style>
  summary:hover { background: #efefe6; } td { min-width: 100px; }
  .reading-help { display:inline-block;margin-top:12px;font-size:13px;color:#345c43;text-decoration:underline;text-underline-offset:3px; }
  .reading-contents { border:1px solid #c0aa83;border-radius:5px;background:#f3ead7;padding:16px 20px; }
  .reading-contents > summary { cursor:pointer;font-family:Georgia,serif;font-size:21px;color:#294333; }
  .reading-contents > summary span { font-family:system-ui,sans-serif;font-size:12px;color:#756449;margin-left:12px; }
  ol { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 28px;padding-top:18px;list-style:none; }
  ol a { display:flex;gap:12px;align-items:start;border-radius:3px; } ol a:hover strong { text-decoration:underline; }
  .chapter-number { flex-shrink:0;color:#9a6e41;font-family:Georgia,serif;font-size:22px;line-height:1.25; }
  ol strong { font-size:14px;color:#294333;font-weight:600; } ol small { display:block;font-size:12px;line-height:1.55;margin-top:3px;color:#716b59; }
  .chapter-filter { display:flex;align-items:center;gap:12px;font-size:13px;flex-wrap:wrap; } select { border:1px solid #b7a587;border-radius:4px;padding:8px 12px;max-width:100%; }
  .book-chapter { display:grid;gap:12px; }
  .chapter-heading { display:flex;gap:16px;align-items:start;padding-top:20px;scroll-margin-top:20px; }
  .chapter-heading > span { font:32px Georgia,serif;color:#a17a48; }
  .chapter-heading h2 { font:26px Georgia,serif;color:#294333; }
  .chapter-heading p { font-size:13px;color:#716b59;margin:5px 0 8px; }
  details[id] { scroll-margin-top:20px; }
  @media(max-width:600px) { h1 { font-size:2rem; } ol { grid-template-columns:1fr; } .reading-contents > summary span { display:block;margin:4px 0 0; } }
</style>
