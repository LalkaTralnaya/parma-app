<script lang="ts">
  import { onMount } from 'svelte';
  import { listCharacters, deleteCharacter, saveCharacter } from '$lib/db/characters';
  import { RACES } from '$lib/rules/races';
  import type { Character } from '$lib/type';
  import Icon from '$lib/components/Icon.svelte';
  import CloudAccount from '$lib/components/CloudAccount.svelte';
  import { exportCharacterToJson, exportAllCharactersToJson, importCharactersFromJson } from '$lib/utils/export';
  let importInput: HTMLInputElement;

  async function handleImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    let imported = 0;
    const existingById = new Map(characters.map((character) => [character.id, character]));
    for (const file of Array.from(files)) {
      try {
        const importedCharacters = await importCharactersFromJson(file);
        for (const char of importedCharacters) {
          if (existingById.has(char.id) && !confirm(`Персонаж «${char.name}» уже есть. Заменить?`)) continue;
          await saveCharacter(char);
          existingById.set(char.id, char);
          imported++;
        }
      } catch (err) {
        alert(`Ошибка импорта «${file.name}»: ${(err as Error).message}`);
      }
    }
    input.value = '';
    await load();
    if (imported > 0) alert(`Импортировано: ${imported}`);
  }
  let characters = $state<Character[]>([]);
  let loading = $state(true);
  let error = $state('');
  let query = $state('');
  let deleting = $state<string | null>(null);
  let busy = $state(false);
	let loadVersion = 0;
  const filtered = $derived(characters.filter(c => `${c.name} ${raceName(c.raceId)}`.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru'))));
  async function load() {
	const version = ++loadVersion;
    loading = true;
    error = '';
    try { const loaded = await listCharacters(); if (version === loadVersion) characters = loaded; }
    catch { if (version === loadVersion) error = 'Не удалось загрузить персонажей. Проверьте, разрешено ли браузеру хранить данные, и попробуйте ещё раз.'; }
    finally { if (version === loadVersion) loading = false; }
  }
  async function remove(id: string) {
    if (busy) return;
    busy = true;
    try { await deleteCharacter(id); characters = characters.filter(c => c.id !== id); deleting = null; }
    catch { error = 'Не удалось удалить персонажа. Попробуйте ещё раз.'; }
    finally { busy = false; }
  }
  function raceName(id: string) { return RACES.find(r => r.id === id)?.name ?? id; }
  onMount(() => {
    void load();
    const refresh = () => { void load(); };
    window.addEventListener('parma-cloud-sync', refresh);
    return () => window.removeEventListener('parma-cloud-sync', refresh);
  });
</script>

<main class="home">
  <section class="journey" aria-labelledby="journey-title">
    <div class="journey-copy">
      <span class="journey-note">Мир славянского сказа · меча и магии</span>
      <h1 id="journey-title">Ваша сага<br />начинается в Парме.</h1>
      <p>Создайте героя, соберите друзей и отправляйтесь навстречу истории. Листы персонажей и инструменты мастера — всегда под рукой.</p>
      <div class="hero-actions">
        <a class="button hero-button" href="/new"><Icon name="plus" size={20} /> Создать персонажа</a>
        <a class="hero-link" href="/adventures">Найти приключение <Icon name="arrow" size={17} /></a>
      </div>
    </div>
    <img class="forest" src="/forest.svg" alt="" width="700" height="420" />
  </section>
  <section class="world ornament-frame" id="world" aria-labelledby="world-title">
    <div class="world-copy">
      <span class="world-note">Добро пожаловать в Парму</span>
      <h2 id="world-title">Мир, где у всего есть память.</h2>
      <p>Жива течёт сквозь всё сущее. Боги хранят Кон — закон равновесия, а леса и древние руины берегут свои тайны.</p>
      <p>Здесь кузнец вкладывает в оружие частицу духа, волхв слышит шёпот трав, а судьбу героя определяют его выбор, память и воля.</p>
    </div>
    <div class="world-pillars">
      <div class="world-pillar"><span class="pillar-icon"><Icon name="leaf" size={20} /></span><div><h3>Живой мир</h3><p>Боги, древние народы и тайны руин</p></div></div>
      <div class="world-pillar"><span class="pillar-icon"><Icon name="compass" size={20} /></span><div><h3>Ваш собственный путь</h3><p>Свободное сочетание навыков и умений</p></div></div>
      <div class="world-pillar"><span class="pillar-icon"><Icon name="dice" size={20} /></span><div><h3>У силы есть цена</h3><p>Жива, Навь и след Тлена</p></div></div>
    </div>
    <details class="world-details">
      <summary>Познакомиться с миром</summary>
      <div>
        <p>Парма — мир славянского сказа, меча и магии. Боги взирают на дела смертных из Прави. Лесовики берегут леса, а под сводами гор ждут Пробуждённые механизмы, созданные ушедшей расой дженази.</p>
        <p>В Парме нет классов: вы сами выбираете сочетание навыков и умений. Герои растут, совершая значимые поступки — заключая союзы, побеждая в сюжетных битвах и разгадывая тайны древних руин.</p>
        <p>Магия Живы пронизывает всё сущее. Путь Нави тоже даёт силу, но оставляет след Тлена. У каждого выбора есть цена, а история героя важнее цифр.</p>
        <small>По вступлению «Добро пожаловать в Парму» из книги игры.</small>
      </div>
    </details>
  </section>
  <input
    type="file"
    accept=".json,application/json"
    multiple
    bind:this={importInput}
    onchange={handleImport}
    class="hidden"
  />
  <div class="home-columns">
    <section class="characters" aria-labelledby="characters-title">
      <div class="section-heading"><h2 id="characters-title">Ваши персонажи <span class="count">{characters.length}</span></h2><a class="button" href="/new"><Icon name="plus" size={18} /> Создать</a></div>
      <p class="characters-note">Выберите героя, чтобы продолжить приключение.</p>
      {#if characters.length > 0}
        <label class="search"><Icon name="search" size={20} /><span class="sr-only">Поиск по имени или расе</span><input type="search" bind:value={query} placeholder="Найти по имени или расе" /></label>
      {/if}
      {#if error}<div class="notice error" role="alert">{error}<button class="button mt-3" onclick={load}>Повторить загрузку</button></div>{/if}
      {#if loading}
        <div class="empty" role="status"><Icon name="compass" size={40} /><p>Открываем летопись героев…</p></div>
      {:else if characters.length === 0 && !error}
        <div class="empty"><span class="empty-symbol"><Icon name="people" size={38} /></span><h3>У каждого героя есть начало</h3><p>Придумайте имя, выберите расу и предысторию.<br />Парма поможет собрать ваш первый лист.</p><a href="/new" class="button primary"><Icon name="plus" size={18} /> Создать первого героя</a></div>
      {:else if filtered.length === 0 && characters.length > 0}
        <div class="empty"><h3>Герои не найдены</h3><p>Попробуйте другое имя или название расы.</p><button class="button" onclick={() => query = ''}>Сбросить поиск</button></div>
      {:else}
        <ul class="character-list">
          {#each filtered as c (c.id)}
            <li class="character-card">
              <a href={`/char/${c.id}`} class="character-link"><span class="portrait">{(c.name || 'П').slice(0, 1).toUpperCase()}</span><span class="character-info"><strong>{c.name || 'Без имени'}</strong><span>{raceName(c.raceId)}</span></span><span class="level">{c.level}<small>уровень</small></span><Icon name="arrow" size={18} /></a>
              <button class="export-button" aria-label={`Скачать персонажа ${c.name || 'Без имени'} в JSON`} onclick={() => exportCharacterToJson(c)}>JSON</button>
              {#if deleting === c.id}
                <div class="delete-confirm"><p>Удалить «{c.name || 'Без имени'}»? Восстановить лист будет нельзя.</p><div><button class="button danger" disabled={busy} onclick={() => remove(c.id)}>{busy ? 'Удаляем…' : 'Удалить'}</button><button class="button" disabled={busy} onclick={() => deleting = null}>Отмена</button></div></div>
              {:else}
                <button class="delete-button" aria-label={`Удалить персонажа ${c.name || 'Без имени'}`} onclick={() => deleting = c.id}><Icon name="trash" size={18} /></button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
      <div class="character-utilities">
        <button type="button" onclick={() => importInput.click()}>↓ Импорт персонажей</button>
        <button type="button" disabled={characters.length === 0} onclick={() => exportAllCharactersToJson(characters)}>↑ Экспорт всех</button>
      </div>
      <CloudAccount compact />
    </section>
    <aside class="toolbox ornament-frame" aria-labelledby="tools-title">
      <h2 id="tools-title">За ширмой мастера</h2><p>Подготовьте встречу и ведите игру.</p>
      <a href="/adventures" class="tool"><span class="tool-icon"><Icon name="compass" /></span><span><strong>Приключения</strong><small>Готовые истории для группы</small></span><Icon name="arrow" size={17} /></a>
      <a href="/gm" class="tool"><span class="tool-icon"><Icon name="dice" /></span><span><strong>Пульт мастера</strong><small>Группа и общие проверки</small></span><Icon name="arrow" size={17} /></a>
      <a href="/room" class="tool"><span class="tool-icon"><Icon name="people" /></span><span><strong>Комната</strong><small>Общий стол для мастера и игроков</small></span><Icon name="arrow" size={17} /></a>
      <a href="/gm/combat" class="tool"><span class="tool-icon"><Icon name="sword" /></span><span><strong>Боевой трекер</strong><small>Инициатива, ходы и здоровье</small></span><Icon name="arrow" size={17} /></a>
      <a href="/gm/bestiary" class="tool"><span class="tool-icon"><Icon name="shield" /></span><span><strong>Бестиарий</strong><small>Противники для вашей истории</small></span><Icon name="arrow" size={17} /></a>
      <a href="/gm/cheatsheet" class="tool"><span class="tool-icon"><Icon name="book" /></span><span><strong>Правила под рукой</strong><small>Краткая шпаргалка за столом</small></span><Icon name="arrow" size={17} /></a>
      <div class="table-note"><Icon name="leaf" size={23} /><p>Мастер и листы игроков могут быть открыты в разных вкладках одного браузера.</p></div>
    </aside>
  </div>
</main>

<style>
  .home { max-width: 1250px; margin: auto; padding: 32px; }
  .journey { position: relative; overflow: hidden; background: #173d30; color: #f8f5de; border-radius: 5px; min-height: 263px; }
  .journey-copy { position: relative; z-index: 1; padding: 32px 36px; width: 62%; }
  .journey-note { color: #d2dcc1; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; }
  h1 { font-size: clamp(32px, 4vw, 40px); line-height: 1.15; margin: 12px 0 14px; font-weight: 500; }
  .journey-copy p { font-size: 14px; color: #d2dcc1; line-height: 1.8; margin-bottom: 24px; }
  .hero-button { background: #e9edcd; border-color: #e9edcd; }
  .forest { position: absolute; right: -30px; bottom: 0; width: 61%; height: 100%; object-fit: cover; object-position: center; opacity: .9; }
  .home-columns { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 28px; margin-top: 28px; }
  h2 { font-size: 27px; font-weight: 600; margin: 0; }
  .characters-note, .toolbox > p { color: #5f6c60; font-size: 13px; margin: 5px 0 18px; }
  .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .hero-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .hero-link { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; color: #edf0dc; font-size: 13px; }
  .hero-link:hover { text-decoration: underline; }
  .world { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 12px 34px; margin-top: 24px; background: #fffef9; align-items: center; }
  .home :global(.ornament-frame) { padding: 38px !important; }
  .world-note { color: #87613e; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; }
  .world h2 { margin: 8px 0 12px; font-weight: 500; }
  .world p { color: #52614f; font-size: 14px; margin: 0 0 10px; }
  .world-pillars { display: grid; gap: 16px; padding-left: 26px; border-left: 1px solid #d5daca; }
  .world-pillar { display: flex; align-items: center; gap: 14px; }
  .world-pillar h3 { font: 18px Georgia, serif; }
  .world-pillar p { font-size: 12px; margin: 3px 0 0; }
  .pillar-icon { display: grid; place-items: center; width: 36px; height: 36px; flex-shrink: 0; border: 1px solid #b8a17d; transform: rotate(45deg); color: #315440; }
  .pillar-icon :global(svg) { transform: rotate(-45deg); }
  .world-details { grid-column: 1 / -1; }
  .world-details summary { width: fit-content; min-height: 44px; display: flex; align-items: center; gap: 10px; cursor: pointer; color: #315440; font-weight: 600; font-size: 13px; list-style: none; }
  .world-details summary::-webkit-details-marker { display: none; }
  .world-details summary::after { content: '→'; }
  .world-details[open] summary::after { content: '↓'; }
  .world-details > div { border-top: 1px solid #d5daca; padding-top: 14px; margin-top: 6px; max-width: 850px; }
  .world-details small { color: #727e70; font-size: 11px; }
  .character-utilities { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 10px; }
  .character-utilities button { background: none; border: 0; padding: 6px 0; color: #5f6c60; font-size: 12px; }
  .character-utilities button:hover { color: #173d30; text-decoration: underline; }
  .count { vertical-align: middle; font: 13px 'Segoe UI', sans-serif; background: #e4e8d9; padding: 4px 9px; border-radius: 20px; margin-left: 7px; }
  .empty { background: #fffef8; border: 1px dashed #bdc8ae; border-radius: 10px; min-height: 275px; padding: 28px 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 12px; }
  .empty h3 { font: 24px Georgia, serif; }
  .empty p { font-size: 14px; color: #5f6c60; }
  .empty-symbol { color: #678256; padding: 13px; background: #f0f2e4; border-radius: 50%; }
  .toolbox { border-left: 1px solid #d5daca; padding-left: 28px; }
  .toolbox h2 { font-size: 24px; }
  .tool { display: flex; align-items: center; gap: 12px; padding: 15px 0; border-bottom: 1px solid #d5daca; }
  .tool > span:nth-child(2) { flex: 1; }
  .tool strong { font-size: 14px; font-weight: 600; display: block; }
  .tool small { font-size: 12px; color: #5f6c60; }
  .tool:hover strong { text-decoration: underline; }
  .tool-icon { width: 40px; height: 40px; background: #e7ecd9; border-radius: 8px; display: grid; place-items: center; color: #45623c; }
  .table-note { display: flex; align-items: flex-start; gap: 12px; margin-top: 22px; color: #657553; }
  .table-note :global(svg) { flex-shrink: 0; }
  .table-note p { font-size: 12px; }
  .search { display: flex; align-items: center; gap: 10px; border: 1px solid #bdc8ae; background: #fffef8; border-radius: 6px; padding: 0 12px; margin-bottom: 16px; }
  .search input { min-width: 0; width: 100%; background: transparent; outline-offset: 0; }
  .character-list { display: grid; gap: 12px; }
  .character-card { position: relative; background: #fffef8; border: 1px solid #d5daca; border-radius: 8px; }
  .character-card:hover { border-color: #8da481; }
  .character-link { display: flex; align-items: center; gap: 16px; padding: 20px 100px 20px 18px; }
  .portrait { width: 50px; height: 56px; border-radius: 24px 24px 6px 6px; background: #e5ecd9; display: grid; place-items: center; font: 30px Georgia, serif; flex-shrink: 0; }
  .character-info { flex: 1; min-width: 0; }
  .character-info strong { display: block; font: bold 21px Georgia, serif; overflow-wrap: anywhere; }
  .character-info > span { font-size: 13px; color: #5f6c60; }
  .level { font-size: 24px; text-align: center; line-height: 1.3; }
  .level small { display: block; font-size: 10px; color: #5f6c60; }
  .delete-button { position: absolute; right: 7px; top: 26px; width: 40px; display: grid; place-items: center; color: #6c7765; border-radius: 5px; }
  .export-button { position: absolute; right: 50px; top: 27px; border: 1px solid #bdc8ae; border-radius: 5px; padding: 5px 7px; color: #45623c; font-size: 11px; }
  .export-button:hover { background: #e7ecd9; }
  .delete-button:hover { color: #a93232; background: #fff0eb; }
  .delete-confirm { border-top: 1px solid #d5daca; padding: 16px; font-size: 14px; }
  .delete-confirm > div { display: flex; gap: 10px; margin-top: 12px; }
  @media (max-width: 900px) { .home-columns { grid-template-columns: 1fr 280px; gap: 24px; } .toolbox { padding-left: 20px; } }
  @media (max-width: 700px) { .home-columns, .world { grid-template-columns: 1fr; gap: 24px; } .home-columns { margin-top: 28px; } .toolbox { border-left: 0; padding-left: 0; } .journey-copy { padding: 28px 24px; width: 100%; } .forest { width: 100%; opacity: .2; right: 0; } .journey { min-height: auto; } .character-link { gap: 10px; padding-left: 12px; } .world-pillars { border-left: 0; border-top: 1px solid #d5daca; padding: 20px 0 0; } }
  @media (max-width: 600px) { .home :global(.ornament-frame) { padding: 30px !important; } .world h2 { font-size: 25px; } }
</style>
