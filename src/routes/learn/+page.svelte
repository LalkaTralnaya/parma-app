<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import Icon from '$lib/components/Icon.svelte';
  import StoryPanel from '$lib/components/StoryPanel.svelte';
  import { listCharacters } from '$lib/db/characters';
  import type { Character } from '$lib/type';
  import { CREATION_TOUR, SHEET_TOUR, READING_ROUTE, PLAYER_LESSONS, playerLessonHref, STORYTELLER_PHASES, STORYTELLER_ROUTE } from '$lib/ui/learning-tours';

  const topics = [{ id: 'create', title: 'Создать персонажа', icon: 'people' }, { id: 'sheet', title: 'Разобраться в листе', icon: 'compass' }, { id: 'play', title: 'Игра за столом', icon: 'dice' }, { id: 'reading', title: 'Мир и правила', icon: 'book' }, { id: 'storyteller', title: 'Маршрут Сказителя', icon: 'compass' }];
  let topic = $state('create');
  let characters = $state<Character[]>([]);
  let characterId = $state('');
  let loading = $state(true);
  let loadError = $state(false);
  $effect(() => { const requested = page.url.searchParams.get('topic'); if (requested && topics.some(item => item.id === requested)) topic = requested; });
  onMount(async () => {
    try { characters = await listCharacters(); characterId = characters[0]?.id ?? ''; }
    catch { loadError = true; }
    finally { loading = false; }
  });
  const creationSteps = CREATION_TOUR;
  const readingLinks = READING_ROUTE;
</script>

<main class="learn-page">
  <header class="learn-hero">
    <div><p class="eyebrow">Первые шаги в Парме</p><h1>У каждой истории<br />есть начало.</h1><p class="lead">Создайте героя, познакомьтесь с его листом и разберите действия за столом. Затем переходите к нужным главам мира и правил. Можно пройти всё по порядку или выбрать одну тему.</p><a href="/characters" class="home-link">← К персонажам</a></div>
    <StoryPanel scene="road" label="Путник на дороге к лесному святилищу" width={140} />
  </header>
  <nav class="topic-tabs" aria-label="Темы обучения">
    {#each topics as item}<button type="button" class:active={topic === item.id} aria-pressed={topic === item.id} onclick={() => topic = item.id}><Icon name={item.icon} size={19} />{item.title}</button>{/each}
  </nav>

  {#if topic === 'create'}
    <section aria-labelledby="creation-guide"><div class="section-heading"><p class="eyebrow">Шаг 1 · Ваш герой</p><h2 id="creation-guide">От замысла к готовому листу</h2><p>В Парме нет классов: сочетайте происхождение, навыки и умения под свою историю.</p></div>
      <ol class="learning-steps">{#each creationSteps as step, index}<li id={'help-' + step.topicId}><span class="step-number">{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>{/each}</ol>
      <div class="lesson-actions"><a class="button primary" href="/new?learn=1"><Icon name="plus" size={18} />Создать героя с подсказками</a><button class="button" onclick={() => topic = 'sheet'}>Дальше: лист персонажа <Icon name="arrow" size={18} /></button></div>
    </section>
  {:else if topic === 'sheet'}
    <section aria-labelledby="sheet-guide"><div class="section-heading"><p class="eyebrow">Шаг 2 · Лист персонажа</p><h2 id="sheet-guide">Что где находится</h2><p>Запустите экскурсию на своём листе: подсказки будут по очереди подсвечивать его разделы.</p></div>
      <div class="tour-choice">
        {#if loading}<p role="status">Открываем список героев…</p>
        {:else if loadError}<p>Список героев не удалось открыть. Обучение также доступно кнопкой в шапке любого листа.</p>
        {:else if characters.length}<label>Выберите персонажа<select bind:value={characterId}>{#each characters as character}<option value={character.id}>{character.name || 'Без имени'}</option>{/each}</select></label><a class="button primary" href={`/char/${characterId}?learn=1`}>Показать на моём листе <Icon name="arrow" size={18} /></a>
        {:else}<p>Сначала создайте героя, чтобы пройти обучение на его листе.</p><a class="button primary" href="/new?learn=1">Создать персонажа</a>{/if}
      </div>
      <div class="sheet-map">{#each SHEET_TOUR as step, index}<article id={'help-' + step.topicId}><span>{(index + 1).toString().padStart(2, '0')}</span><h3>{step.title}</h3><p>{step.text}</p></article>{/each}</div>
      <div class="lesson-actions"><button class="button" onclick={() => topic = 'play'}>Разобрать действия за столом <Icon name="arrow" size={18} /></button><button class="button" onclick={() => topic = 'reading'}>Дальше: мир и правила <Icon name="arrow" size={18} /></button></div>
    </section>
  {:else if topic === 'play'}
    <section aria-labelledby="player-guide">
      <div class="section-heading"><p class="eyebrow">Шаг 3 · За игровым столом</p><h2 id="player-guide">От первого действия к продолжению истории</h2><p>У каждого шага есть порядок действий и ожидаемый результат. Чтение гайда не меняет героя. Броски, покупки и изучение умений выполняются только на соответствующих экранах.</p></div>
      <div class="tour-choice">
        {#if loading}<p role="status">Открываем список героев…</p>
        {:else if loadError}<p>Список героев не удалось открыть. Инструкции можно прочитать здесь, а нужный раздел открыть из своего листа.</p>
        {:else if characters.length}<label>Персонаж для переходов<select bind:value={characterId}>{#each characters as character}<option value={character.id}>{character.name || 'Без имени'}</option>{/each}</select></label>
        {:else}<p>Инструкции доступны без героя. Для действий создайте отдельного учебного персонажа или выберите существующего на своём устройстве.</p><a class="button primary" href="/new?learn=1">Создать персонажа</a>{/if}
      </div>
      <ol class="player-lessons">
        {#each PLAYER_LESSONS as lesson, index (lesson.topicId)}
          {@const href = playerLessonHref(lesson, characterId)}
          <li><details id={'help-' + lesson.topicId} open={index === 0 || page.url.hash === "#help-" + lesson.topicId}>
            <summary><span class="step-number">{index + 1}</span><strong>{lesson.title}</strong></summary>
            <div class="lesson-body">
              <p>{lesson.text}</p>
              <ol>{#each lesson.practice.steps as action}<li>{action}</li>{/each}</ol>
              <p><strong>Ожидаемый результат.</strong> {lesson.practice.result}</p>
              {#if lesson.practice.caution}<p class="lesson-caution">{lesson.practice.caution}</p>{/if}
              {#if href}<a class="button" href={href}>{lesson.destination === 'home' ? 'К персонажам и экспорту JSON' : lesson.destination === 'room' ? 'Открыть комнаты' : lesson.destination === 'growth' ? 'Открыть рост героя' : lesson.destination === 'tavern' ? 'Открыть таверну для героя' : 'Открыть раздел листа'} <Icon name="arrow" size={17} /></a>
              {:else}<p class="lesson-caution">Выберите персонажа выше, чтобы перейти к этому шагу.</p>{/if}
            </div>
          </details></li>
        {/each}
      </ol>
      <div class="lesson-actions"><button class="button" onclick={() => topic = 'reading'}>Дальше: мир и правила <Icon name="arrow" size={18} /></button></div>
    </section>
  {:else if topic === 'storyteller'}
    <section aria-labelledby="storyteller-guide">
      <div class="section-heading"><p class="eyebrow">Сказителю · Полный маршрут</p><h2 id="storyteller-guide">От подготовки к итогам приключения</h2><p>Все инструкции доступны без аккаунта и комнаты. Чтение не меняет игровые данные. Реальные действия выполняются на соответствующих экранах с действующими правами доступа.</p></div>
      <div class="lesson-actions"><a class="button primary" href="/gm?learn=1">Экскурсия по пульту Сказителя <Icon name="arrow" size={18} /></a></div>
      <nav class="lesson-actions" aria-label="Этапы маршрута Сказителя">{#each STORYTELLER_PHASES as phase}<a class="button" href={'/learn?topic=storyteller#storyteller-' + phase.id}>{phase.title}</a>{/each}</nav>
      {#each STORYTELLER_PHASES as phase}
        <section aria-labelledby={'storyteller-' + phase.id}>
          <h3 id={'storyteller-' + phase.id} class="phase-heading">{phase.title}</h3>
          <ol class="player-lessons" start={STORYTELLER_ROUTE.findIndex(lesson => lesson.phase === phase.id) + 1}>
            {#each STORYTELLER_ROUTE.filter(lesson => lesson.phase === phase.id) as lesson (lesson.topicId)}
              <li><details id={'help-' + lesson.topicId} open={lesson.topicId === 'gm-orientation' || page.url.hash === '#help-' + lesson.topicId}>
                <summary><span class="step-number">{STORYTELLER_ROUTE.indexOf(lesson) + 1}</span><strong>{lesson.title}</strong></summary>
                <div class="lesson-body"><p>{lesson.text}</p><ol>{#each lesson.practice.steps as action}<li>{action}</li>{/each}</ol><p><strong>Ожидаемый результат.</strong> {lesson.practice.result}</p>{#if lesson.practice.caution}<p class="lesson-caution">{lesson.practice.caution}</p>{/if}<a class="button" href={lesson.href}>{lesson.action} <Icon name="arrow" size={17} /></a></div>
              </details></li>
            {/each}
          </ol>
        </section>
      {/each}
      <div class="lesson-actions"><button class="button" onclick={() => topic = 'reading'}>Мир и правила <Icon name="arrow" size={18} /></button></div>
    </section>
  {:else}
    <section aria-labelledby="reading-guide"><div class="section-heading"><p class="eyebrow">Шаг 4 · Знакомство с Пармой</p><h2 id="reading-guide">Что и в каком порядке читать</h2><p>В лоре — мир и его истории. В механиках — подробные правила. Оглавление в начале каждой страницы помогает идти последовательно.</p></div>
      <ol class="reading-route">{#each readingLinks as item}<li id={'help-' + item.topicId}><a href={item.href}><span class="step-number">{item.number}</span><div><small>{item.label}</small><h3>{item.title}</h3><p>{item.text}</p></div><Icon name="arrow" size={20} /></a></li>{/each}</ol>
      <div class="quick-reference"><h3>Во время игры</h3><p>Чтобы быстро вспомнить правило, откройте шпаргалку. Для подготовки встречи со Сказителем пригодится бестиарий.</p><div class="lesson-actions"><a class="button" href="/gm/cheatsheet"><Icon name="book" size={18} />Правила · краткая шпаргалка</a><a class="button" href="/gm/bestiary"><Icon name="shield" size={18} />Бестиарий</a></div></div>
    </section>
  {/if}
</main>

<style>
  .learn-page { max-width:1040px;margin:0 auto;padding:32px 24px 60px;color:#2b4033; }
  .learn-hero { display:flex;align-items:center;justify-content:space-between;gap:40px;padding:10px 0 30px; }
  .learn-hero > div { max-width:660px; } .eyebrow { text-transform:uppercase;letter-spacing:.1em;color:#926a3f;font-size:11px;margin-bottom:12px; }
  h1 { font:clamp(36px,5vw,52px)/1.12 Georgia,serif;margin-bottom:20px; } .lead { max-width:60ch;line-height:1.8;color:#626755; }
  .home-link { display:inline-block;margin-top:16px;font-size:13px;color:#53644c; }
  .topic-tabs { display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid #bfa984;padding-bottom:18px;margin-bottom:30px; }
  .topic-tabs button { display:flex;align-items:center;gap:8px;padding:11px 16px;border:1px solid #baa582;border-radius:5px;background:#fff9ec;font-size:13px; }
  .topic-tabs button.active { background:#2b4b38;border-color:#2b4b38;color:#fff7e4; }
  .section-heading h2 { font:30px Georgia,serif;margin-bottom:12px; } .section-heading > p:last-child { color:#626755;line-height:1.7;max-width:78ch; }
  .learning-steps { display:grid;gap:0;margin:24px 0;list-style:none; }
  .learning-steps li { display:flex;gap:20px;border-bottom:1px solid #c5b39080;padding:20px 0; }
  .step-number { flex-shrink:0;display:grid;place-items:center;width:38px;height:38px;border:1px solid #b69b6d;border-radius:50%;font:20px Georgia,serif;color:#91683e; }
  h3 { font:21px Georgia,serif;color:#294333;margin-bottom:8px; } li p, article p, .quick-reference p { font-size:14px;line-height:1.75;color:#626755; }
  .lesson-actions { display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:24px; }
  .tour-choice { display:flex;align-items:end;flex-wrap:wrap;gap:16px;padding:20px;background:#eee3cc;border:1px solid #c1a981;border-radius:5px;margin:24px 0; }
  .tour-choice label { display:grid;gap:7px;font-size:13px; } select { border:1px solid #b6a17c;padding:9px 12px;min-width:200px;max-width:100%;border-radius:4px; }
  .sheet-map { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px; }
  .sheet-map article { position:relative;border:1px solid #c2ad89;background:#fff9ed;padding:22px;border-radius:4px; }
  .sheet-map article > span { display:block;color:#ad8854;font:20px Georgia,serif;margin-bottom:10px; }
  .reading-route { list-style:none;display:grid;gap:14px;margin:24px 0; }
  .reading-route a { display:flex;gap:18px;align-items:start;background:#fff8e9;border:1px solid #c1aa83;border-radius:5px;padding:22px; }
  .reading-route a:hover { border-color:#7b825c;background:#fbf0da; } .reading-route a > :last-child { flex-shrink:0;margin-left:auto; }
  small { display:block;color:#91683e;font-size:11px;margin:0 0 7px; } .quick-reference { border-top:1px solid #c1aa83;margin-top:30px;padding-top:24px; }
  button:focus-visible, a:focus-visible { outline:2px solid #a26c38;outline-offset:4px; }
  @media(max-width:600px) { .learn-page { padding:24px 16px 40px; } .learn-hero { gap:14px;align-items:start; } .learn-hero :global(.story-panel) { width:76px; } .topic-tabs button { padding:9px 11px; } .sheet-map { grid-template-columns:1fr; } .reading-route a { padding:16px;gap:12px; } .learning-steps li { gap:14px; } .section-heading h2 { font-size:26px; } }
  .phase-heading { margin-top:32px;scroll-margin-top:24px; }
  .player-lessons { display:grid;gap:14px;list-style:none;padding:0;margin:24px 0; }
  .player-lessons details { border:1px solid #c1aa83;border-radius:5px;background:#fff9ed;scroll-margin-top:20px; }
  .player-lessons summary { display:flex;align-items:center;gap:14px;padding:16px;cursor:pointer; }
  .player-lessons summary strong { font:22px Georgia,serif; }
  .lesson-body { padding:0 18px 20px;overflow-wrap:anywhere; }
  .lesson-body p,.lesson-body li { font-size:14px;line-height:1.75; }
  .lesson-body ol { list-style:decimal;padding-left:22px;margin:14px 0; }
  .lesson-body li { margin:7px 0; }
  .lesson-body p { margin:12px 0; }
  .lesson-caution { color:#756449; }
  .player-lessons summary:focus-visible { outline:2px solid #a26c38;outline-offset:3px; }
  @media(max-width:600px) { .player-lessons summary { padding:12px;gap:10px; } .player-lessons summary strong { font-size:20px; } .lesson-body { padding:0 14px 16px; } }
</style>
