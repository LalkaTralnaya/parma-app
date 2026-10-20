<script lang="ts">
  import { tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { playerText, playerTable } from '$lib/ui/player-copy';
  import PantheonGallery from './PantheonGallery.svelte';
  import ReferenceBlocks from './ReferenceBlocks.svelte';
  import Icon from './Icon.svelte';
  import { REFERENCE_SECTION_LEVELS } from '$lib/ui/reference-reading';
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
  const shortcutIds = { lore: ['book16-masters', 'book16-rulers-and-circles'], mechanics: ['book16-skill-growth-story', 'book16-navi-shadows'] };
  const shortcuts = $derived(readingOrder ? shortcutIds[readingOrder].flatMap(id => playerEntries.filter(entry => entry.id === id)) : []);
  async function revealEntry(event: MouseEvent, id: string) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    query = ''; category = 'Все';
    await tick();
    const target = document.getElementById(id);
    if (target instanceof HTMLDetailsElement) target.open = true;
    await goto(`#${id}`, { keepFocus: true, noScroll: true });
    target?.scrollIntoView({ block: 'start' });
  }
</script>

<svelte:head><title>{title} — Парма</title></svelte:head>
<main class="reference-page max-w-6xl mx-auto p-6 space-y-5">
  <header><h1 class="text-4xl font-bold">{title}</h1><p class="mt-2 text-gray-600">{description}</p><a class="reading-help" href="/learn?topic=reading">Первый раз здесь? Как пользоваться справочниками →</a></header>
  {#if shortcuts.length}
    <nav class="quick-reference" aria-label="Быстрый переход к новым разделам"><span>Новые разделы</span>{#each shortcuts as entry}<a href={`#${entry.id}`} onclick={event => revealEntry(event, entry.id)}>{entry.title}<Icon name="arrow" size={16} /></a>{/each}</nav>
  {/if}
  {#if readingOrder && visibleChapters.length}
    <details class="reading-contents" open>
      <summary>Порядок чтения <span>От основ к подробностям</span></summary>
      <nav aria-label="Оглавление"><ol>{#each visibleChapters as chapter}<li><a href={`#chapter-${chapter.id}`}><span class="chapter-number">{chapter.number.toString().padStart(2, '0')}</span><span><strong>{chapter.title}</strong><small>{chapter.description}</small></span></a><details class="chapter-entries"><summary>Разделы главы · {chapter.entries.length}</summary><ul>{#each chapter.entries as entry}<li><a href={`#${entry.id}`} onclick={event => revealEntry(event, entry.id)}>{entry.title}</a></li>{/each}</ul></details></li>{/each}</ol></nav>
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
    <details id={entry.id} class="reference-entry border rounded-lg bg-white" open={Boolean(query.trim()) || page.url.hash === `#${entry.id}`}>
      <summary class="entry-summary"><span><small>{entry.category}</small><strong>{entry.title}</strong></span><Icon name="arrow" size={20} /></summary>
      <div class="entry-content">
        {#if entry.title === 'Пантеон'}
          <PantheonGallery blocks={entry.blocks} expanded={Boolean(query.trim())} />
        {:else}
        <ReferenceBlocks blocks={entry.blocks} category={entry.category} entryTitle={entry.title} sectionLevel={REFERENCE_SECTION_LEVELS[entry.id]} expanded={Boolean(query.trim())} />
        {/if}
      </div>
    </details>
      {/each}
    </section>
  {:else}<p class="notice">Ничего не найдено. Измените запрос или категорию.</p>{/each}
</main>
<style>
  .quick-reference { display:flex; flex-wrap:wrap; align-items:center; gap:10px 16px; padding:14px 16px; border:1px solid #c0aa83; border-radius:4px; background:#f3ead7; }
  .quick-reference > span { font-size:13px; color:#655439; }
  .quick-reference a { display:inline-flex; align-items:center; gap:8px; color:#294637; text-decoration:underline; text-underline-offset:3px; font-size:14px; }
  .chapter-entries { margin:8px 0 0 34px; }
  .chapter-entries summary { cursor:pointer; font-size:12px; color:#655439; padding:5px 0; }
  .chapter-entries ul { display:grid; gap:8px; margin:8px 0; padding:0; list-style:none; }
  .chapter-entries li a { display:block; font-size:13px; color:#294637; text-decoration:underline; text-underline-offset:3px; overflow-wrap:anywhere; }
  summary:hover { background: #efefe6; }
  .reference-page, .book-chapter, .reference-entry, .entry-content { min-width:0; }
  .entry-summary { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:18px 20px; cursor:pointer; list-style:none; }
  .entry-summary::-webkit-details-marker { display:none; }
  .entry-summary > span { min-width:0; }
  .entry-summary small { display:block; font-size:12px; line-height:1.5; color:#756449; margin-bottom:4px; }
  .entry-summary strong { display:block; font:22px/1.4 Georgia,serif; color:#294637; overflow-wrap:anywhere; }
  .entry-summary :global(svg) { flex-shrink:0; transform:rotate(90deg); }
  .reference-entry[open] > .entry-summary :global(svg) { transform:rotate(-90deg); }
  .entry-summary:focus-visible { outline:2px solid #856b47; outline-offset:3px; }
  .entry-content { padding:4px 20px 22px; }
  @media(max-width:600px) { .entry-summary { padding:14px; gap:10px; } .entry-summary strong { font-size:20px; } .entry-content { padding:2px 12px 16px; } }
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
