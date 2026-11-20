<script lang="ts">
 import { untrack } from 'svelte';
 import { supabase } from '$lib/supabase/client';
 import { AdventureReportConflict, listAdventureReports, saveAdventureReport } from '$lib/sync/adventureReports';
 import type { PageData } from './$types';
 import { PILOT_ADVENTURES, type PilotSlug } from '$lib/rules/adventure-report-pilot';
 import {
  CITY_CONTEXTS, REVIEW_STATUSES, SCENARIO_REVISIONS, readReportDraft, reportDraftKey, type ReportDraft
 } from '$lib/ui/adventure-report-draft';

 let { data }: { data: PageData } = $props();
 let slug = $state<PilotSlug>('doroga-v-gardariki');
 function emptyDrafts() {
  return {
   'doroga-v-gardariki': readReportDraft('doroga-v-gardariki'),
   karngorn: readReportDraft('karngorn')
  };
 }
 let drafts = $state(emptyDrafts());
 const pilot = $derived(PILOT_ADVENTURES.find(adventure => adventure.slug === slug)!);
 const draft = $derived(drafts[slug]);
 let savedDrafts = $state<Partial<Record<PilotSlug, ReportDraft>>>({});
 const savedDraft = $derived(savedDrafts[slug]);
 let reportDialog: HTMLDialogElement;
 const decisionStatuses = [
  { id: 'scene-not-played', label: 'Сцену не играли' },
  { id: 'undecided', label: 'Решение не принято' },
  { id: 'other', label: 'Другое' }
 ];
 const outcomeStatuses = [{ id: 'unknown', label: 'Исход неизвестен' }, { id: 'other', label: 'Другое' }];
 const runStatuses = [
  { id: 'completed', label: 'Завершено' },
  { id: 'paused', label: 'На паузе' },
  { id: 'stopped', label: 'Прекращено' }
 ];

 function optionLabel(options: readonly { id: string; label: string }[], id: string): string {
  return options.find(option => option.id === id)?.label ?? 'Не указано';
 }

 let ready = $state(false);
 let loading = $state(true);
 let saving = $state(false);
 let notice = $state('');
 let ownerId = $state<string | null | undefined>(undefined);
 let revisions: Partial<Record<PilotSlug, string>> = {};
 let conflicts = $state<Partial<Record<PilotSlug, boolean>>>({});
 let generation = 0;

 function resetDrafts() {
  if (reportDialog?.open) reportDialog.close();
  drafts = emptyDrafts();
  savedDrafts = {};
  revisions = {};
  conflicts = {};
  notice = '';
  ready = false;
  loading = true;
  saving = false;
 }

 function rememberDraft(chapter: PilotSlug, snapshot: ReportDraft, revision?: string) {
  savedDrafts[chapter] = snapshot;
  revisions[chapter] = revision;
  drafts[chapter] = readReportDraft(chapter, snapshot);
 }

 function loadLocalDrafts() {
  for (const adventure of PILOT_ADVENTURES) {
   try {
    const saved = localStorage.getItem(reportDraftKey(adventure.slug));
    if (saved !== null) rememberDraft(adventure.slug, readReportDraft(adventure.slug, JSON.parse(saved)));
   } catch {
    notice = 'Не удалось прочитать один из локальных черновиков.';
   }
  }
  ready = true;
  loading = false;
 }

 async function loadCloudDrafts(account: string, request: number) {
  try {
   const reports = await listAdventureReports(account);
   if (generation !== request) return;
   for (const report of reports) rememberDraft(report.slug, report.draft, report.revision);
   ready = true;
  } catch (error) {
   if (generation === request) notice = (error as Error).message;
  } finally {
   if (generation === request) loading = false;
  }
 }

 $effect(() => {
  resetDrafts();
  ownerId = undefined;
  if (data.testMode) {
   untrack(loadLocalDrafts);
   return () => { generation++; };
  }
  let active = true;
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
   if (!active) return;
   const account = session?.user && !session.user.is_anonymous ? session.user.id : null;
   if (account === ownerId) return;
   const request = ++generation;
   resetDrafts();
   ownerId = account;
   if (account) void loadCloudDrafts(account, request);
   else loading = false;
  });
  return () => {
   active = false;
   generation++;
   subscription.unsubscribe();
  };
 });

 async function saveDraft(event: SubmitEvent) {
  event.preventDefault();
  if (!ready || saving) return;
  const chapter = slug;
  const snapshot = readReportDraft(chapter, draft);
  if (data.testMode) {
   try {
    localStorage.setItem(reportDraftKey(chapter), JSON.stringify(snapshot));
    rememberDraft(chapter, snapshot);
    notice = 'Черновик сохранён в этом браузере.';
   } catch {
    notice = 'Не удалось сохранить черновик. Проверьте, разрешено ли браузеру локальное хранение.';
   }
   return;
  }

  if (!ownerId || conflicts[chapter]) return;
  const request = generation;
  saving = true;
  notice = '';
  try {
   const saved = await saveAdventureReport(ownerId, chapter, snapshot, revisions[chapter]);
   if (generation !== request) return;
   savedDrafts[chapter] = saved.draft;
   revisions[chapter] = saved.revision;
   notice = 'Черновик сохранён в Supabase.';
  } catch (error) {
   if (generation !== request) return;
   if (error instanceof AdventureReportConflict) conflicts[chapter] = true;
   notice = (error as Error).message;
  } finally {
   if (generation === request) saving = false;
  }
 }

 async function reloadCloudDraft() {
  if (!ownerId || saving) return;
  const chapter = slug;
  const request = generation;
  saving = true;
  try {
   const current = (await listAdventureReports(ownerId)).find(report => report.slug === chapter);
   if (generation !== request) return;
   if (current) rememberDraft(chapter, current.draft, current.revision);
   else {
    delete savedDrafts[chapter];
    delete revisions[chapter];
    drafts[chapter] = readReportDraft(chapter);
   }
   delete conflicts[chapter];
   notice = current ? 'Облачная версия загружена.' : 'В облаке больше нет черновика этой главы.';
  } catch (error) {
   if (generation === request) notice = (error as Error).message;
  } finally {
   if (generation === request) saving = false;
  }
 }
</script>

<svelte:head>
 <title>Отчёт Сказителя · Парма</title>
</svelte:head>

<main class="max-w-4xl mx-auto p-6">
 <a href="/gm">← К пульту Сказителя</a>
 <h1 class="text-3xl font-bold mt-4">Отчёт Сказителя</h1>
 <p class="text-sm my-2"><a href="/learn?topic=storyteller#help-gm-report">Гайд Сказителя</a></p>
 {#if data.testMode}
  <div class="mt-2 mb-6 border rounded-lg p-3" role="note" aria-label="Где сохраняется тестовый отчёт">
   <p>Тестовый режим. Черновик хранится только в этом браузере по этому адресу сайта. В Supabase он не отправляется и в облачный экспорт не попадёт.</p>
   <p class="mt-2 text-sm">Для проверки используйте вымышленные данные группы. Обычная форма без <code>?test=1</code> сохраняет отчёты в аккаунте. Переход в неё не переносит тестовый черновик автоматически — сохранённый здесь черновик остаётся в этом браузере.</p>
  </div>
 {:else}
  <div class="mt-2 mb-3" role="note" aria-label="Где сохраняется облачный отчёт">
   <p>Это облачная форма. Нажмите «Сохранить черновик» и дождитесь сообщения «Черновик сохранён в Supabase» — после этого отчёт станет доступен в экспорте.</p>
   <p class="mt-2 text-sm">Для каждого приключения в аккаунте хранится один черновик. Следующее сохранение обновляет его. Тестовые черновики из режима <code>?test=1</code> остаются в исходном браузере и сюда автоматически не переносятся.</p>
  </div><p class="mb-6"><a href="/gm/adventure-report/export">Экспорт отчётов</a></p>
 {/if}

 {#if loading}
  <p role="status">Загружаем черновики…</p>
 {:else if !ready}
  {#if !ownerId}
   <a href="/account">Войти в аккаунт, чтобы открыть отчёты</a>
  {:else}
   <p role="alert">{notice}</p>
   <button class="mt-3 px-3 py-2 border rounded" type="button" onclick={() => location.reload()}>Повторить загрузку</button>
  {/if}
 {:else}
 <form onsubmit={saveDraft} class="space-y-5">
  <fieldset class="report-panel border rounded-lg p-4">
   <legend>Прохождение</legend>
   <div class="fields">
    <label>Приключение
     <select bind:value={slug} disabled={saving} onchange={() => { notice = ''; }}>
      {#each PILOT_ADVENTURES as adventure (adventure.slug)}
       <option value={adventure.slug}>{adventure.title}</option>
      {/each}
     </select>
    </label>
    <label>Редакция приключения
     <select bind:value={draft.revision}>
      <option value="">Не указана</option>
      {#each SCENARIO_REVISIONS as revision (revision.id)}
       <option value={revision.id}>{revision.label}</option>
      {/each}
     </select>
    </label>
    <div>
     <label>Код группы
      <input type="text" bind:value={draft.group} maxlength="120" aria-describedby="report-group-hint" />
     </label>
     <small class="block mt-1" id="report-group-hint">Придумайте короткий код для своей игровой группы, например <code>gruppa-07</code>. Повторяйте его во всех отчётах этой группы, даже если сменится комната или кампания.</small>
    </div>
    <div>
     <label>Код кампании
      <input type="text" bind:value={draft.campaign} maxlength="120" aria-describedby="report-campaign-hint" />
     </label>
     <small class="block mt-1" id="report-campaign-hint">Укажите код этой серии приключений, например <code>siver-01</code>. Для «Дороги в Вышгород» и «Карнгорна» в одной кампании используйте один и тот же код.</small>
    </div>
    <div>
     <label>Ветвь канона
      <input type="text" bind:value={draft.canonBranch} maxlength="120" aria-describedby="report-branch-hint" />
     </label>
     <small class="block mt-1" id="report-branch-hint">Укажите ветвь мира, в которой играет группа. Для проверки можно ввести <code>test-main</code>. Если ветвь ещё не согласована, оставьте поле пустым.</small>
    </div>
    <div>
     <label>Версия канона
      <input type="text" bind:value={draft.canonVersion} maxlength="120" aria-describedby="report-version-hint" />
     </label>
     <small class="block mt-1" id="report-version-hint">Укажите версию выбранной ветви на момент начала приключения. Для проверки можно ввести <code>test-v1</code>. Если версия неизвестна, оставьте поле пустым.</small>
    </div>
    <label>Состояние прохождения
     <select bind:value={draft.runStatus}>
      <option value="">Не указано</option>
      {#each runStatuses as status (status.id)}
       <option value={status.id}>{status.label}</option>
      {/each}
     </select>
    </label>
    {#if slug === 'karngorn'}
     <label>Передача свёртка в Вышгороде
      <select bind:value={draft.cityContext}>
       <option value="">Не указано</option>
       {#each CITY_CONTEXTS as context (context.id)}
        <option value={context.id}>{context.label}</option>
       {/each}
      </select>
     </label>
    {/if}
   </div>
   <p class="mt-3 text-sm">Регион: {pilot.region}</p>
  </fieldset>

  {#each pilot.cards as card (card.id)}
   {@const answer = draft.answers[card.id]}
   <fieldset class="report-panel border rounded-lg p-4">
    <legend>{card.title}</legend>
    <div class="fields">
     <label>Решение
      <select bind:value={answer.decision}>
       <option value="">Не указано</option>
       <option value="scene-not-played">Сцену не играли</option>
       <option value="undecided">Решение не принято</option>
       {#each card.decisions as option (option.id)}
        <option value={option.id}>{option.label}</option>
       {/each}
       <option value="other">Другое</option>
      </select>
     </label>
     <label>Исход
      <select bind:value={answer.outcome} disabled={answer.decision === 'scene-not-played'}>
       <option value="">Не указан</option>
       <option value="unknown">Исход неизвестен</option>
       {#each card.outcomes as option (option.id)}
        <option value={option.id}>{option.label}</option>
       {/each}
       <option value="other">Другое</option>
      </select>
     </label>
    </div>
    {#if answer.decision === 'other'}
     <label class="mt-3">Другое решение
      <textarea bind:value={answer.decisionNote} rows="2" maxlength="2000"></textarea>
     </label>
    {/if}
    <label class="mt-3">Наблюдаемый результат
     <textarea bind:value={answer.observed} rows="2" maxlength="2000" disabled={answer.decision === 'scene-not-played'}></textarea>
    </label>
    <div class="fields mt-3">
     <label>Сведения героев
      <textarea bind:value={answer.knowledge} rows="2" maxlength="2000" disabled={answer.decision === 'scene-not-played'}></textarea>
     </label>
     <label>Открытые последствия
      <textarea bind:value={answer.pending} rows="2" maxlength="2000" disabled={answer.decision === 'scene-not-played'}></textarea>
     </label>
    </div>
   </fieldset>
  {/each}

  <fieldset class="report-panel border rounded-lg p-4">
   <legend>Проверка отчёта</legend>
   <label>Статус проверки
    <select bind:value={draft.reviewStatus}>
     {#each REVIEW_STATUSES as status (status.id)}
      <option value={status.id}>{status.label}</option>
     {/each}
    </select>
   </label>
   {#if draft.reviewStatus !== 'draft'}
    <label class="mt-3">Причина отметки
     <textarea bind:value={draft.reviewReason} rows="2" maxlength="2000"></textarea>
    </label>
   {/if}
  </fieldset>

  <div class="flex flex-wrap items-center gap-3">
   <button class="px-4 py-2 border rounded-lg font-semibold" type="submit" disabled={saving || conflicts[slug]}>
    {saving ? 'Подождите…' : data.testMode ? 'Сохранить тестовый черновик' : 'Сохранить черновик'}
   </button>
   {#if conflicts[slug]}
    <button class="px-3 py-2 border rounded" type="button" disabled={saving} onclick={reloadCloudDraft}>Заменить правки версией из облака</button>
   {/if}
   {#if savedDraft}
    <button class="px-4 py-2 border rounded-lg font-semibold" type="button" onclick={() => reportDialog.showModal()}>Посмотреть отчёт</button>
   {/if}
   <p role="status">{notice}</p>
  </div>
 </form>
 {/if}
 <dialog bind:this={reportDialog} class="report-preview rounded-lg border p-5" aria-labelledby="report-preview-title">
  <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
   <h2 id="report-preview-title" class="text-2xl font-bold">Сохранённый отчёт</h2>
   <form method="dialog"><button class="px-3 py-2 border rounded" type="submit">Закрыть</button></form>
  </div>
  {#if savedDraft}
   <h3 class="text-lg font-bold">{pilot.title}</h3>
   <dl class="fields mt-3">
    <div><dt>Регион</dt><dd>{pilot.region}</dd></div>
    <div><dt>Код группы</dt><dd>{savedDraft.group || 'Не указан'}</dd></div>
    <div><dt>Код кампании</dt><dd>{savedDraft.campaign || 'Не указан'}</dd></div>
    <div><dt>Редакция приключения</dt><dd>{optionLabel(SCENARIO_REVISIONS, savedDraft.revision)}</dd></div>
    <div><dt>Ветвь канона</dt><dd>{savedDraft.canonBranch || 'Не указана'}</dd></div>
    <div><dt>Версия канона</dt><dd>{savedDraft.canonVersion || 'Не указана'}</dd></div>
    <div><dt>Состояние прохождения</dt><dd>{optionLabel(runStatuses, savedDraft.runStatus)}</dd></div>
    <div><dt>Статус проверки</dt><dd>{optionLabel(REVIEW_STATUSES, savedDraft.reviewStatus)}</dd></div>
    {#if savedDraft.reviewReason}
     <div><dt>Причина отметки</dt><dd>{savedDraft.reviewReason}</dd></div>
    {/if}
    {#if slug === 'karngorn'}
     <div><dt>Передача свёртка в Вышгороде</dt><dd>{optionLabel(CITY_CONTEXTS, savedDraft.cityContext)}</dd></div>
    {/if}
   </dl>
   {#each pilot.cards as card (card.id)}
    {@const answer = savedDraft.answers[card.id]}
    <section class="mt-4 border-t pt-3">
     <h3 class="font-bold">{card.title}</h3>
     <dl class="fields mt-2">
      <div><dt>Решение</dt><dd>{optionLabel([...card.decisions, ...decisionStatuses], answer.decision)}</dd></div>
      {#if answer.decisionNote}
       <div><dt>Другое решение</dt><dd>{answer.decisionNote}</dd></div>
      {/if}
      {#if answer.decision !== 'scene-not-played'}
       <div><dt>Исход</dt><dd>{optionLabel([...card.outcomes, ...outcomeStatuses], answer.outcome)}</dd></div>
       {#if answer.observed}<div><dt>Наблюдаемый результат</dt><dd>{answer.observed}</dd></div>{/if}
       {#if answer.knowledge}<div><dt>Сведения героев</dt><dd>{answer.knowledge}</dd></div>{/if}
       {#if answer.pending}<div><dt>Открытые последствия</dt><dd>{answer.pending}</dd></div>{/if}
      {/if}
     </dl>
    </section>
   {/each}
  {/if}
 </dialog>
</main>

<style>
 .report-panel { min-width: 0; }
 .report-preview { width: min(46rem, calc(100% - 2rem)); max-height: 85vh; overflow: auto; margin: auto; color: #24392d; background: #fffdf6; }
 .report-preview::backdrop { background: rgb(27 38 31 / .55); }
 .report-preview dt { font-weight: 650; font-size: .875rem; }
 .report-preview dd { margin: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
 legend { padding: 0 .35rem; font-weight: 650; }
 .fields { display: grid; gap: .75rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
 label { display: grid; align-content: start; gap: .25rem; font-size: .92rem; }
 input, select, textarea {
  width: 100%; min-width: 0; padding: .5rem .65rem; border: 1px solid #a79b83;
  border-radius: .35rem; background: #fffdf6; color: #24392d;
 }
 textarea { resize: vertical; }
 :disabled { opacity: .65; }
 @media (max-width: 640px) { .fields { grid-template-columns: minmax(0, 1fr); } }
</style>
