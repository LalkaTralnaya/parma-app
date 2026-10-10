<script lang="ts">
  type Block = { kind: 'paragraph'; text: string; level?: number } | { kind: 'table'; rows: string[][] };
  type Entry = { id: string; title: string; category: string; blocks: Block[]; source?: string };
  let { title, description, entries }: { title: string; description: string; entries: Entry[] } = $props();
  let query = $state('');
  let category = $state('Все');
  const categories = $derived(['Все', ...new Set(entries.map(entry => entry.category))]);
  const visible = $derived(entries.filter(entry => (category === 'Все' || category === entry.category) && JSON.stringify(entry).toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru'))));
</script>

<svelte:head><title>{title} — Парма</title></svelte:head>
<main class="reference-page max-w-6xl mx-auto p-6 space-y-5">
  <header><h1 class="text-4xl font-bold">{title}</h1><p class="mt-2 text-gray-600">{description}</p></header>
  <label class="block"><span class="text-sm">Поиск по разделам и тексту</span><input class="block w-full border rounded px-3 py-2 mt-1" type="search" bind:value={query} placeholder="Введите слово или название" /></label>
  <nav class="flex flex-wrap gap-2" aria-label="Категории справочника">
    {#each categories as item}<button class="px-3 py-2 border rounded" class:chosen={category === item} aria-pressed={category === item} onclick={() => category = item}>{item}</button>{/each}
  </nav>
  <p class="text-sm text-gray-500" role="status">Разделов: {visible.length}</p>
  {#each visible as entry (entry.id)}
    <details class="border rounded-lg bg-white" open={Boolean(query.trim())}>
      <summary class="p-4 cursor-pointer font-semibold"><span class="text-xs text-gray-500 mr-2">{entry.category}</span>{entry.title}</summary>
      <div class="px-4 pb-4 space-y-3">
        {#if entry.source}<p class="text-xs text-gray-500">{entry.source}</p>{/if}
        {#each entry.blocks as block}
          {#if block.kind === 'table'}
            <div class="overflow-x-auto"><table class="w-full text-sm border-collapse"><thead><tr>{#each block.rows[0] as cell}<th class="border p-2 text-left bg-gray-100" scope="col">{cell}</th>{/each}</tr></thead><tbody>{#each block.rows.slice(1) as row}<tr>{#each row as cell}<td class="border p-2 align-top">{cell}</td>{/each}</tr>{/each}</tbody></table></div>
          {:else if block.level}<h3 class="font-semibold pt-3">{block.text}</h3>
          {:else}<p class="whitespace-pre-line">{block.text}</p>{/if}
        {/each}
      </div>
    </details>
  {:else}<p class="notice">Ничего не найдено. Измените запрос или категорию.</p>{/each}
  <p class="text-xs text-gray-500">Материалы «НРИ Парма». Справочник дополнен по единой книге 16.</p>
</main>
<style>.chosen { background: #24543c; color: white; } summary:hover { background: #efefe6; } td { min-width: 100px; } @media(max-width:600px) { h1 { font-size: 2rem; } }</style>
