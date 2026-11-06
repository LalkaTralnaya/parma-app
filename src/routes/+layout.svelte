<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import Icon from '$lib/components/Icon.svelte';
  import DiceOverlay from '$lib/components/DiceOverlay.svelte';
  import RollChat from '$lib/components/RollChat.svelte';
  import SiteFooter from '$lib/components/SiteFooter.svelte';
  import NoviceHelp from '$lib/components/NoviceHelp.svelte';
  import { PUBLIC_PAGES, SHARE_IMAGE, SITE_NAME, SITE_URL } from '$lib/site-seo';
  import { onMount } from 'svelte';
  let { children } = $props();
  let scrollPosition = $state(0);
  function backToTop() { window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }
  onMount(() => {
    try { sessionStorage.removeItem('parma.stale-build-reload'); } catch { /* Storage may be blocked. */ }
  });
  const adventure = $derived(page.route.id === '/adventures/[slug]' ? page.data.adventure : undefined);
  const seo = $derived(page.status === 200
    ? adventure
      ? { title: `${adventure.title} — Приключения Пармы`, description: adventure.summary }
      : PUBLIC_PAGES[page.route.id ?? '']
    : undefined);
  const canonical = $derived(new URL(page.url.pathname.replace(/\/$/, '') || '/', SITE_URL).href);

  const links = [
    { href: '/', label: 'Персонажи', icon: 'people' },
    { href: '/adventures', label: 'Приключения', icon: 'compass' },
    { href: '/gm', label: 'Сказитель', icon: 'dice' },
    { href: '/gm/combat', label: 'Бой', icon: 'sword' },
    { href: '/gm/bestiary', label: 'Бестиарий', icon: 'shield' },
    { href: '/gm/cheatsheet', label: 'Правила', icon: 'book' },
    { href: '/mechanics', label: 'Механики', icon: 'book' },
    { href: '/lore', label: 'Лор', icon: 'compass' },
    { href: '/events', label: 'Случайные события', icon: 'dice' },
    { href: '/account', label: 'Аккаунт', icon: 'people' }
  ];
  const hiddenOnCharacter = new Set(['/adventures', '/gm', '/gm/bestiary', '/events']);
  const visibleLinks = $derived(
    page.url.pathname.startsWith('/char/')
      ? links.filter((link) => !hiddenOnCharacter.has(link.href))
      : links
  );
  function active(href: string) {
    if (href === '/') return page.url.pathname === '/' || page.url.pathname.startsWith('/char') || page.url.pathname === '/new';
    return href === '/adventures' ? page.url.pathname.startsWith('/adventures') : page.url.pathname === href;
  }
</script>

<svelte:head>
  <title>{seo?.title ?? 'Парма — спутник приключений'}</title>
  {#if seo}
    <meta name="description" content={seo.description} />
    <link rel="canonical" href={canonical} />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content={SITE_NAME} />
    <meta property="og:locale" content="ru_RU" />
    <meta property="og:title" content={seo.title} />
    <meta property="og:description" content={seo.description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={SHARE_IMAGE.url} />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content={String(SHARE_IMAGE.width)} />
    <meta property="og:image:height" content={String(SHARE_IMAGE.height)} />
    <meta property="og:image:alt" content={SHARE_IMAGE.alt} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={seo.title} />
    <meta name="twitter:description" content={seo.description} />
    <meta name="twitter:image" content={SHARE_IMAGE.url} />
    <meta name="twitter:image:alt" content={SHARE_IMAGE.alt} />
  {:else}
    <meta name="robots" content="noindex, follow" />
  {/if}
  <meta name="theme-color" content="#173d30" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any" />
</svelte:head>

<svelte:window bind:scrollY={scrollPosition} />
{#if scrollPosition > 500}<button class="back-to-top" onclick={backToTop} aria-label="Наверх страницы" title="Наверх страницы">↑ <span>Наверх</span></button>{/if}
<a href="#content" class="skip-link">К содержимому</a>
<header class="app-header">
  <div class="header-inner">
    <a href="/" class="brand" aria-label="Парма — главная"><span class="brand-mark"><Icon name="compass" size={30} /></span><span>Парма<small>Спутник приключений</small></span></a>
    <nav class="primary-nav" aria-label="Основная навигация">
      {#each visibleLinks as link}
        <a href={link.href} class:active={active(link.href)} aria-current={active(link.href) ? 'page' : undefined}><Icon name={link.icon} size={19} /><span>{link.label}</span></a>
      {/each}
    </nav>
  </div>
</header>
<NoviceHelp />
<div id="content" tabindex="-1">{@render children()}</div>
<RollChat />
<DiceOverlay />
<SiteFooter showRelease={page.url.pathname === '/'} />
<style>.back-to-top { position:fixed; right:24px; bottom:96px; z-index:40; border:1px solid #b69b72; border-radius:6px; background:#173d30; color:#fff9e9; padding:10px 14px; font-size:15px; box-shadow:0 3px 12px #0003; cursor:pointer; } .back-to-top:hover { background:#28543f; } .back-to-top:focus-visible { outline:3px solid #c18d48; outline-offset:3px; } @media print { .back-to-top { display:none; } } .header-inner { flex-wrap: wrap; } .primary-nav { flex-wrap: wrap; }</style>
