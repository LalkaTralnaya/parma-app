<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import Icon from '$lib/components/Icon.svelte';
  import DiceOverlay from '$lib/components/DiceOverlay.svelte';
  import RollChat from '$lib/components/RollChat.svelte';
  import favicon from '$lib/assets/favicon.svg';
  let { children } = $props();
  const links = [
    { href: '/', label: 'Персонажи', icon: 'people' },
    { href: '/adventures', label: 'Приключения', icon: 'compass' },
    { href: '/gm', label: 'Мастер', icon: 'dice' },
    { href: '/gm/combat', label: 'Бой', icon: 'sword' },
    { href: '/gm/bestiary', label: 'Бестиарий', icon: 'shield' },
    { href: '/gm/cheatsheet', label: 'Правила', icon: 'book' }
  ];
  function active(href: string) {
    if (href === '/') return page.url.pathname === '/' || page.url.pathname.startsWith('/char') || page.url.pathname === '/new';
    return href === '/adventures' ? page.url.pathname.startsWith('/adventures') : page.url.pathname === href;
  }
</script>

<svelte:head>
  <title>Парма — спутник приключений</title>
  <meta name="description" content="Персонажи, игровые броски, заклинания и инструменты мастера для настольной ролевой игры Парма." />
  <meta name="theme-color" content="#173d30" />
  <link rel="icon" href={favicon} />
</svelte:head>

<a href="#content" class="skip-link">К содержимому</a>
<header class="app-header">
  <div class="header-inner">
    <a href="/" class="brand" aria-label="Парма — главная"><span class="brand-mark"><Icon name="compass" size={30} /></span><span>Парма<small>Спутник приключений</small></span></a>
    <nav class="primary-nav" aria-label="Основная навигация">
      {#each links as link}
        <a href={link.href} class:active={active(link.href)} aria-current={active(link.href) ? 'page' : undefined}><Icon name={link.icon} size={19} /><span>{link.label}</span></a>
      {/each}
    </nav>
  </div>
</header>
<div id="content" tabindex="-1">{@render children()}</div>
<RollChat />
<DiceOverlay />
<footer class="app-footer"><span>Парма · Помощник игрока и мастера</span><span><Icon name="shield" size={16} /> Данные сохраняются в этом браузере</span></footer>
