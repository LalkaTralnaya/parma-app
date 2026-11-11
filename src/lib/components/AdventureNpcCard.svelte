<script lang="ts">
  import { tick } from 'svelte';
  import type { Adventure } from '$lib/rules/adventures';
  import { adventureNpcLines } from '$lib/rules/adventure-npc-dialogue';
  import AdventureImageShare from './AdventureImageShare.svelte';

  let { adventure, npc }: { adventure: Adventure; npc: Adventure['npcs'][number] } = $props();
  const portrait = $derived(npc.portrait?.startsWith('/adventures/') ? npc.portrait : undefined);
  const lines = $derived(adventureNpcLines(adventure, npc));
  const titleId = $props.id();
  let dialog = $state<HTMLDialogElement>();
  let opened = $state(false);

  async function open() {
    if (opened) return;
    opened = true;
    await tick();
    dialog?.showModal();
  }
</script>

<article class="npc">
  {#if portrait}
    <button class="portrait-button" type="button" onclick={open} aria-label={'Открыть портрет и реплики: ' + npc.name}>
      <img src={portrait} alt={'Портрет: ' + npc.name} loading="lazy" decoding="async" />
    </button>
    <AdventureImageShare src={portrait} caption={'Портрет: ' + npc.name} />
  {/if}
  <h3><button class="name-button" type="button" onclick={open} aria-haspopup="dialog">{npc.name}</button></h3>
  <p class="role">{npc.role}</p>
  <p>{npc.motive}</p>

  <dialog bind:this={dialog} aria-labelledby={titleId} onclose={() => opened = false}>
    {#if opened}
      <header>
        <div><h2 id={titleId}>{npc.name}</h2><p class="role">{npc.role}</p></div>
        <button class="close" type="button" onclick={() => dialog?.close()}>Закрыть</button>
      </header>
      <div class="details" class:with-portrait={portrait}>
        {#if portrait}
          <figure>
            <img src={portrait} alt={'Портрет: ' + npc.name} />
            <AdventureImageShare src={portrait} caption={'Портрет: ' + npc.name} />
          </figure>
        {/if}
        <section aria-label="Заготовленные реплики">
          <h3>Заготовленные реплики</h3>
          {#if lines.length}
            <ul>
              {#each lines as line}
                <li>
                  {#if line.context}<small>{line.context}</small>{/if}
                  <blockquote>{line.text}</blockquote>
                </li>
              {/each}
            </ul>
          {:else}
            <p>Для этого НИПа пока нет заготовленных реплик.</p>
          {/if}
          {#if npc.voice && !npc.voice.trimStart().startsWith('«')}
            <p class="voice"><strong>Манера речи.</strong> {npc.voice}</p>
          {/if}
        </section>
      </div>
    {/if}
  </dialog>
</article>

<style>
  .npc { border:1px solid #e1e3d6; border-radius:8px; padding:14px; min-width:0; }
  h3 { margin:8px 0 4px; }
  p { margin:6px 0; }
  .role { font-size:.92em; color:#52624c; }
  .portrait-button { display:block; width:100%; border:0; border-radius:6px; overflow:hidden; padding:0; cursor:zoom-in; }
  .portrait-button img { display:block; width:100%; aspect-ratio:2/3; object-fit:cover; }
  .name-button { color:inherit; font:inherit; text-align:left; cursor:pointer; text-decoration:underline; text-underline-offset:3px; }
  button:focus-visible { outline:2px solid #765d37; outline-offset:3px; }
  dialog { width:min(94vw, 900px); max-width:none; max-height:92vh; overflow:auto; margin:auto; padding:20px; border:1px solid #b59b72; border-radius:8px; background:#fffaf0; color:#263e32; }
  dialog::backdrop { background:#0009; }
  header { display:flex; align-items:start; justify-content:space-between; gap:16px; margin-bottom:16px; }
  header h2 { margin:0; font-size:clamp(22px, 4vw, 30px); }
  .close { padding:6px 10px; border:1px solid #586c55; border-radius:5px; cursor:pointer; }
  .details { display:grid; gap:20px; }
  .with-portrait { grid-template-columns:minmax(160px, 1fr) minmax(0, 1.35fr); }
  figure { margin:0; }
  figure img { display:block; width:100%; max-height:64vh; object-fit:contain; border-radius:6px; }
  ul { display:grid; gap:10px; list-style:none; padding:0; margin:12px 0; }
  li { padding:10px 12px; background:#f0ead9; border-radius:5px; }
  small { display:block; color:#536348; margin-bottom:4px; }
  blockquote { margin:0; }
  .voice { margin-top:14px; }
  @media(max-width:600px) {
    .with-portrait { grid-template-columns:1fr; }
    figure img { max-height:44vh; }
  }
</style>
