<script lang="ts">
 import { onMount } from 'svelte';
 import { APP_VERSION, RELEASES, LATEST_RELEASE, releaseDate } from '$lib/releases';
 import { markReleaseShown, shouldShowRelease } from '$lib/ui/release-notes';
 let { showFooter = false }: { showFooter?: boolean } = $props();
 let dialog: HTMLDialogElement;
 let showHistory = $state(false);

 function storage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
 }
 function open(history = false) {
  showHistory = history;
  if (!dialog || dialog.open) return;
  dialog.showModal();
  markReleaseShown(storage(), LATEST_RELEASE.id);
 }
 onMount(() => {
  if (shouldShowRelease(storage(), LATEST_RELEASE.id)) open();
 });
</script>

{#if showFooter}
 <div class="release-footer">
  <span>Версия {APP_VERSION}</span>
  <span aria-hidden="true">·</span>
  <button type="button" aria-haspopup="dialog" onclick={() => open(true)}>История обновлений</button>
 </div>
{/if}

<dialog bind:this={dialog} class="release-dialog" aria-labelledby="release-title" aria-describedby="release-intro">
 <header class="release-header">
  <div><span class="eyebrow">Парма · версия {APP_VERSION}</span><h2 id="release-title">Что нового в Парме</h2></div>
  <button type="button" class="close-button" aria-label="Закрыть обновления" onclick={() => dialog.close()}>×</button>
 </header>
 <div class="release-body">
  <p id="release-intro" class="intro">Последние изменения приложения. Историю всегда можно открыть из подвала главной страницы.</p>
  <article class="latest-release">
   <time datetime={LATEST_RELEASE.date}>{releaseDate(LATEST_RELEASE.date)}</time>
   <h3>{LATEST_RELEASE.title}</h3>
   <ul>{#each LATEST_RELEASE.changes as change}<li>{change}</li>{/each}</ul>
  </article>
  <button type="button" class="history-toggle" aria-expanded={showHistory} aria-controls="release-history" onclick={() => showHistory = !showHistory}>{showHistory ? 'Скрыть прошлые обновления' : 'Все обновления'}</button>
  <div id="release-history" hidden={!showHistory} class="history">
   {#each RELEASES.slice(1) as release (release.id)}
    <details><summary><time datetime={release.date}>{releaseDate(release.date)}</time><span>{release.title}</span></summary><ul>{#each release.changes as change}<li>{change}</li>{/each}</ul></details>
   {/each}
  </div>
 </div>
 <div class="release-actions"><button type="button" class="done-button" onclick={() => dialog.close()}>Понятно</button></div>
</dialog>

<style>
 .release-footer { display: flex; gap: .7rem; align-items: center; justify-content: center; flex-wrap: wrap; margin-top: .6rem; color: #52614f; font-size: 13px; }
 .release-footer button { color: #24543c; text-decoration: underline; text-underline-offset: 3px; padding: 6px 0; cursor: pointer; }
 .release-dialog { width: min(640px, calc(100vw - 24px)); max-height: min(85dvh, 800px); margin: auto; padding: 0; border: 1px solid #b8a47f; border-radius: 12px; background: #fffdf5; color: #24392e; box-shadow: 0 20px 80px #0005; overflow: hidden; }
 .release-dialog[open] { display: flex; flex-direction: column; }
 .release-dialog::backdrop { background: #14271eb8; }
 .release-header { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; padding: 24px 26px 18px; border-bottom: 1px solid #ddd5c3; flex-shrink: 0; }
 .eyebrow { font-size: 12px; color: #6c755f; }
 h2 { font: 30px Georgia, serif; margin: 6px 0 0; }
 h3 { font: 23px Georgia, serif; margin: 8px 0 14px; }
 .close-button { min-width: 44px; min-height: 44px; font-size: 28px; line-height: 1; border: 1px solid #d4dbc9; border-radius: 7px; cursor: pointer; }
 .release-body { padding: 18px 26px; overflow-y: auto; min-height: 0; overscroll-behavior: contain; text-align: left; }
 .intro { color: #5f6c60; font-size: 13px; margin: 0 0 22px; }
 time { color: #68765e; font-size: 12px; }
 ul { list-style: disc; padding-left: 21px; display: grid; gap: 10px; font-size: 14px; line-height: 1.65; margin: 0; }
 .history-toggle { margin-top: 22px; min-height: 44px; color: #24543c; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
 .history { margin-top: 10px; }
 .history[hidden] { display: none; }
 details { border-top: 1px solid #ddd5c3; padding: 14px 0; }
 summary { cursor: pointer; font-size: 15px; }
 summary time { display: block; margin-bottom: 5px; }
 summary span { font-weight: 600; }
 details ul { padding-top: 14px; }
 .release-actions { display: flex; justify-content: flex-end; padding: 14px 26px; border-top: 1px solid #ddd5c3; flex-shrink: 0; }
 .done-button { min-height: 44px; padding: 9px 24px; border-radius: 6px; background: #24543c; color: #fffdf5; cursor: pointer; }
 button:focus-visible, summary:focus-visible { outline: 2px solid #24543c; outline-offset: 3px; }
 @media(max-width:480px) { .release-header { padding: 18px; } .release-body { padding: 16px 18px; } .release-actions { padding: 12px 18px; } h2 { font-size: 25px; } }
 @media print { .release-footer, .release-dialog { display: none !important; } }
</style>
