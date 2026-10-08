<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EVENT_TABLES } from '$lib/rules/random-events';
  import { rollEvent, resolveEvent } from '$lib/engine/random-events';
  import { showDice } from '$lib/ui/dice';
  let query = $state('');
  let category = $state('Все');
  let mode = $state<'online' | 'offline'>('online');
  let rolling = $state(false);
  let manualDice = $state<Record<string, number>>({});
  let errors = $state<Record<string, string>>({});
  let results = $state<Record<string, { value: number; row: number }>>({});
  const lifetime = new AbortController();
  onMount(() => { mode = localStorage.getItem('parma_roll_mode') === 'offline' ? 'offline' : 'online'; });
  onDestroy(() => lifetime.abort());
  const categories = ['Все', ...new Set(EVENT_TABLES.map(table => table.category))];
  const visible = $derived(EVENT_TABLES.filter(table => (category === 'Все' || category === table.category) && JSON.stringify(table).toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru'))));
  async function selectEvent(table: typeof EVENT_TABLES[number]) {
    if (rolling) return;
    errors[table.id] = '';
    let result;
    try { result = mode === 'offline' ? resolveEvent(table, manualDice[table.id]) : rollEvent(table); }
    catch { errors[table.id] = `Введите целое число от 1 до ${table.sides}.`; return; }
    rolling = true;
    try {
      if (mode === 'online') await showDice({ sides: table.sides, value: result.value, label: table.title, signal: lifetime.signal });
      if (!lifetime.signal.aborted) results[table.id] = result;
    } finally { rolling = false; }
  }
</script>
<svelte:head><title>Случайные события — Парма</title></svelte:head>
<main class="max-w-6xl mx-auto p-6 space-y-5">
  <header><h1 class="text-4xl font-bold">Случайные события</h1><p class="mt-2 text-gray-600">Выберите категорию и бросьте кубик у нужной таблицы. Выпавшее событие появится здесь вместе с его эффектом.</p></header>
  <label class="block"><span class="text-sm">Поиск по таблицам и событиям</span><input class="block w-full border rounded px-3 py-2 mt-1" type="search" bind:value={query} placeholder="Погода, деревня, монстры…" /></label>
  <div class="flex flex-wrap gap-2" role="group" aria-label="Режим бросков событий">
    <button class="px-3 py-2 border rounded" aria-pressed={mode === 'online'} onclick={() => mode = 'online'}>Бросок в приложении</button>
    <button class="px-3 py-2 border rounded" aria-pressed={mode === 'offline'} onclick={() => mode = 'offline'}>Физический кубик</button>
  </div>
  <nav class="flex flex-wrap gap-2" aria-label="Категории событий">{#each categories as item}<button class="px-3 py-2 border rounded" class:chosen={category === item} aria-pressed={category === item} onclick={() => category = item}>{item}</button>{/each}</nav>
  <p class="text-sm text-gray-500" role="status">Таблиц: {visible.length}</p>
  {#each visible as table (table.id)}
    <section class="border rounded-lg bg-white p-4 space-y-3" aria-labelledby={table.id}>
      <header class="flex items-center justify-between flex-wrap gap-3">
        <div><p class="text-xs text-gray-500">{table.category}</p><h2 id={table.id} class="text-xl font-semibold">{table.title}</h2></div>
        <div class="flex flex-wrap items-center gap-2">
          {#if mode === 'offline'}<label class="text-sm" for={'die-' + table.id}>Результат к{table.sides}</label><input id={'die-' + table.id} class="w-24 border rounded px-2 py-1" type="number" min="1" max={table.sides} step="1" bind:value={manualDice[table.id]} />{/if}
          <button class="button primary" disabled={rolling} onclick={() => selectEvent(table)}>{mode === 'offline' ? 'Показать событие' : `Бросить к${table.sides}`}</button>
        </div>
      </header>
      {#if table.note}<p class="text-sm text-gray-600">{table.note}</p>{/if}
      {#if errors[table.id]}<p class="text-red-700 text-sm" role="alert">{errors[table.id]}</p>{/if}
      {#if results[table.id]}
        {@const result = results[table.id]}
        <div class="notice" role="status" aria-live="polite"><strong>Выпало {result.value}: {table.rows[result.row].cells[0]}</strong>{#each table.rows[result.row].cells.slice(1) as cell}<p class="mt-1 whitespace-pre-line">{cell}</p>{/each}</div>
      {/if}
      <details><summary class="cursor-pointer text-sm font-semibold py-2">Показать таблицу · {table.rows.length} строк</summary>
        <div class="overflow-x-auto"><table class="w-full text-sm border-collapse"><thead><tr>{#each table.headers as header}<th scope="col" class="border p-2 text-left bg-gray-100">{header}</th>{/each}</tr></thead><tbody>{#each table.rows as row, index}<tr class:selected={results[table.id]?.row === index}><td class="border p-2 whitespace-nowrap font-mono">{row.range}</td>{#each row.cells as cell}<td class="border p-2 align-top whitespace-pre-line">{cell}</td>{/each}</tr>{/each}</tbody></table></div>
      </details>
    </section>
  {:else}<p class="notice">Таблицы не найдены. Измените поиск или категорию.</p>{/each}
  <p class="text-xs text-gray-500">Таблицы книги «НРИ Парма», редакция «литправка 12». Дополнительные броски и решения, указанные в событии, выполняет Сказитель.</p>
</main>
<style>.chosen { background:#24543c; color:white; } .selected { background:#dceade; font-weight:600; } td { min-width:100px; } td:first-child { min-width:60px; } @media(max-width:600px) { h1 { font-size:2rem; } }</style>
