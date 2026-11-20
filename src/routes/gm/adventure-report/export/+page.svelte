<script lang="ts">
 import { onMount } from 'svelte';
 import { supabase } from '$lib/supabase/client';
 import { PILOT_ADVENTURES } from '$lib/rules/adventure-report-pilot';
 import { REVIEW_STATUSES } from '$lib/ui/adventure-report-draft';
 import { emptyExportFilters, exportReportCsv, type ReportExport } from '$lib/reports/export';

 let scope = $state('own-drafts');
 let filters = $state({ ...emptyExportFilters });
 let bundle = $state<ReportExport | null>(null);
 let busy = $state(false);
 let message = $state('');
 let generation = 0;
 let account: string | undefined;
 onMount(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
   const next = session?.user.id;
   if (next === account) return;
   account = next;
   generation++;
   bundle = null;
   message = '';
   busy = false;
  });
  return () => { generation++; subscription.unsubscribe(); };
 });
 async function prepare(event: SubmitEvent) {
  event.preventDefault();
  if (busy) return;
  const requestId = ++generation;
  busy = true;
  bundle = null;
  message = '';
  try {
   const { data: { session }, error } = await supabase.auth.getSession();
   if (error || !session) throw new Error('Войдите в аккаунт, чтобы выгрузить отчёты.');
   const params = new URLSearchParams({ ...filters, scope });
   const response = await fetch('/gm/adventure-report/export/data?' + params, {
    headers: { Authorization: 'Bearer ' + session.access_token }, cache: 'no-store'
   });
   const result = await response.json();
   if (!response.ok) throw new Error(result.error);
   if (requestId !== generation) return;
   bundle = result;
  } catch (error) {
   if (requestId === generation) message = (error as Error).message;
  } finally {
   if (requestId === generation) busy = false;
  }
 }
 function download(kind: 'json' | 'reports' | 'decisions') {
  if (!bundle) return;
  const body = kind === 'json' ? JSON.stringify(bundle, null, 2) : exportReportCsv(bundle)[kind];
  const type = kind === 'json' ? 'application/json' : 'text/csv;charset=utf-8';
  const url = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = kind === 'json' ? 'parma-reports.json' : kind + '.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
 }
</script>

<svelte:head><title>Экспорт отчётов · Парма</title><meta name="robots" content="noindex" /></svelte:head>
<main class="max-w-4xl mx-auto p-6">
 <a href="/gm/adventure-report">← К отчётам Сказителя</a>
 <h1 class="text-3xl font-bold mt-4">Экспорт отчётов</h1>
 <p class="text-sm my-2"><a href="/learn?topic=storyteller#help-gm-report-export">Гайд Сказителя</a></p>
 <p class="mt-2 mb-5">По умолчанию доступны ваши облачные черновики. Просмотр всех отчётов требует отдельного права администратора. Период задаётся по дате последнего сохранения в UTC.</p>
 <details class="mb-5 border rounded-lg p-3">
  <summary>Какие отчёты попадут в файл</summary>
  <p class="mt-2 text-sm">Сначала сохраните отчёт в обычной облачной форме и дождитесь сообщения «Черновик сохранён в Supabase». Тестовые черновики из режима <code>?test=1</code> и несохранённые изменения формы в выгрузку не входят.</p>
  <p class="mt-2 text-sm">JSON содержит полный отчёт. В <code>reports.csv</code> одна строка на отчёт, а в <code>decisions.csv</code> — на карточку решения. Это выгрузка отчётов, а не резервная копия всей базы.</p>
 </details>
 <form onsubmit={prepare} class="border rounded-lg p-4">
  <div class="fields"><label>Область просмотра<select bind:value={scope}><option value="own-drafts">Мои отчёты</option><option value="all-drafts">Все отчёты (для администратора)</option></select></label>
   <label>Приключение<select bind:value={filters.adventure}><option value="">Все</option>
    {#each PILOT_ADVENTURES as pilot}<option value={pilot.slug}>{pilot.title}</option>{/each}
   </select></label>
   <label>Регион<select bind:value={filters.region}><option value="">Все</option>
    {#each PILOT_ADVENTURES as pilot}<option value={pilot.region}>{pilot.region}</option>{/each}
   </select></label>
   <label>Ветвь канона<input bind:value={filters.branch} maxlength="120" /></label>
   <label>Версия канона<input bind:value={filters.canonVersion} maxlength="120" /></label>
   <label>С даты<input type="date" bind:value={filters.from} /></label>
   <label>По дату включительно<input type="date" bind:value={filters.to} /></label>
   <label>Статус проверки<select bind:value={filters.reviewStatus}><option value="">Все</option>
    {#each REVIEW_STATUSES as status}<option value={status.id}>{status.label}</option>{/each}
   </select></label>
  </div>
  <button class="border rounded px-4 py-2 mt-4" type="submit" disabled={busy}>{busy ? 'Готовим выгрузку…' : 'Подготовить выгрузку'}</button>
 </form>
 {#if message}<p role="alert" class="mt-4">{message}</p>{/if}
 {#if bundle}
  <section aria-label="Готовая выгрузка" class="mt-5 border rounded-lg p-4">
   <p role="status">Отчётов в выгрузке: {bundle.report_count}</p><p class="mt-1">{bundle.scope === 'all-drafts' ? 'Режим администратора: все доступные отчёты' : 'Ваши отчёты'}</p>
   <p class="text-sm mt-1">Сформировано {bundle.exported_at}. Все три файла относятся к одному снимку данных и фильтрам на момент подготовки. После изменения фильтров или сохранения отчёта нажмите «Подготовить выгрузку» ещё раз.</p>
   {#if bundle.report_count === 0}
    <div class="mt-3 border rounded p-3" role="note" aria-label="Почему выгрузка пуста">
     {#if bundle.source_count === 0}
      <p>В облаке нет сохранённых отчётов, доступных для этой выгрузки.</p>
      <p class="mt-1 text-sm">Если вы заполняли форму с <code>?test=1</code>, черновик остался только в браузере. Облачный экспорт его не читает. В обычной форме нажмите «Сохранить черновик» и дождитесь подтверждения Supabase.</p>
     {:else}
      <p>Ни один из {bundle.source_count} доступных облачных отчётов не соответствует выбранным фильтрам.</p>
      <p class="mt-1 text-sm">Проверьте приключение, регион, ветвь и версию канона, статус и даты. Затем подготовьте выгрузку снова.</p>
     {/if}
     <a class="inline-block mt-2 underline" href="/gm/adventure-report">Открыть облачную форму отчёта</a>
    </div>
   {/if}
   <div class="flex gap-3 flex-wrap mt-4">
    <button type="button" class="border rounded px-3 py-2" onclick={() => download('json')}>Скачать JSON</button>
    <button type="button" class="border rounded px-3 py-2" onclick={() => download('reports')}>Скачать reports.csv</button>
    <button type="button" class="border rounded px-3 py-2" onclick={() => download('decisions')}>Скачать decisions.csv</button>
   </div>
   {#each bundle.reports as report (report.report_key)}
    <details class="mt-3 border rounded p-3">
     <summary>{PILOT_ADVENTURES.find(p => p.slug === report.adventure_slug)?.title ?? report.adventure_slug} · {String(report.payload.group ?? 'Группа не указана')}</summary>
     <p class="text-sm mt-2">Сохранено: {report.updated_at}. Ревизия: {report.saved_revision}</p>
     <pre class="mt-2 whitespace-pre-wrap break-words text-sm">{JSON.stringify(report.payload, null, 2)}</pre>
    </details>
   {/each}
   {#each bundle.warnings as warning}<p class="mt-2 text-sm">{warning}</p>{/each}
  </section>
 {/if}
</main>
<style>
 .fields { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.8rem; }
 label { display:grid; gap:.3rem; }
 input, select { width:100%; min-width:0; border:1px solid #a79b83; border-radius:.35rem; padding:.5rem; background:#fffdf6; color:#24392d; }
 @media(max-width:640px) { .fields { grid-template-columns:minmax(0,1fr); } }
</style>
