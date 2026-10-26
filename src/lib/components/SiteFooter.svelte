<script lang="ts">
  import ReleaseNotes from './ReleaseNotes.svelte';
  import Icon from './Icon.svelte';
  import { SITE_INFO } from '$lib/site-info';
  let { showRelease = false }: { showRelease?: boolean } = $props();
</script>

<footer class="app-footer">
  <div class="footer-main">
    <section class="footer-about" aria-labelledby="footer-about-title">
      <a href="/" class="footer-brand" id="footer-about-title"><Icon name="compass" size={26} /><span>Парма<small>Спутник приключений</small></span></a>
      <p>Помощник игрока и сказителя для настольной ролевой игры в мире славянского фэнтези. Листы персонажей, приключения, мир и правила — под рукой.</p>
    </section>
    <nav aria-label="Полезные ссылки в подвале">
      <h2>За игровым столом</h2>
      <a href="/learn">С чего начать</a>
      <a href="/lore">Мир Пармы</a>
      <a href="/mechanics">Механики игры</a>
      <a href="/account#feedback-title">Обратная связь</a>
    </nav>
    <section class="footer-rights" aria-labelledby="footer-rights-title">
      <h2 id="footer-rights-title">Права и лицензия</h2>
      {#if SITE_INFO.owner}<p>Автор и правообладатель: {SITE_INFO.owner}</p>{/if}
      <p>{SITE_INFO.rights}</p>
      {#if SITE_INFO.license}<p>{SITE_INFO.license}</p>{/if}
      {#if SITE_INFO.socials.length}
        <nav class="footer-socials" aria-label="Парма в социальных сетях">
          {#each SITE_INFO.socials as social}<a href={social.url} target="_blank" rel="noopener noreferrer">{social.label}<span class="sr-only"> (откроется в новой вкладке)</span><span aria-hidden="true">↗</span></a>{/each}
        </nav>
      {/if}
    </section>
  </div>
  <div class="footer-bottom"><p>© {new Date().getFullYear()} {SITE_INFO.owner || 'Парма'}</p><ReleaseNotes showFooter={showRelease} /></div>
</footer>

<style>
  .app-footer { display:block; padding:32px 0 20px; color:inherit; }
  .footer-main { display:grid; grid-template-columns:1.3fr .8fr 1.2fr; gap:42px; }
  .footer-brand { display:inline-flex; align-items:center; gap:12px; color:inherit; font:26px Georgia,serif; text-decoration:none; }
  .footer-brand small { display:block; font:12px/1.5 system-ui,sans-serif; letter-spacing:.06em; margin-top:4px; }
  h2 { margin:0 0 13px; color:inherit; font:19px/1.4 Georgia,serif; }
  p { margin:0; font-size:13px; line-height:1.8; max-width:48ch; }
  .footer-about p { margin-top:14px; }
  .footer-rights p + p { margin-top:8px; }
  nav > a { display:block; width:fit-content; font-size:13px; line-height:1.6; padding:5px 0; color:inherit; text-decoration:none; }
  a:hover { text-decoration:underline; text-underline-offset:4px; }
  a:focus-visible { outline:2px solid currentColor; outline-offset:4px; border-radius:2px; }
  .footer-socials { display:flex; flex-wrap:wrap; gap:8px 20px; margin-top:14px; }
  .footer-socials > a { display:inline-flex; align-items:center; gap:7px; }
  .footer-bottom { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px 24px; margin-top:26px; padding-top:16px; border-top:1px solid currentColor; border-color:color-mix(in srgb,currentColor 22%,transparent); }
  .footer-bottom p { font-size:12px; }
  .footer-bottom :global(.release-footer) { margin:0; color:inherit; }
  .footer-bottom :global(.release-footer button) { color:inherit; }
  .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
  @media(max-width:1200px) { .app-footer { margin:0 24px; } }
  @media(max-width:760px) { .footer-main { grid-template-columns:1fr 1fr; gap:26px; } .footer-about { grid-column:1/-1; } .footer-about p { max-width:65ch; } }
  @media(max-width:480px) { .app-footer { margin:0 16px; padding-top:26px; } .footer-main { grid-template-columns:1fr; gap:25px; } .footer-about { grid-column:auto; } }
  @media print { .app-footer { display:none; } }
</style>

