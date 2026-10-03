<script lang="ts">
  import { onMount } from 'svelte';
  import { listCharacters, deleteCharacter } from '$lib/db/characters';
  import { RACES } from '$lib/rules/races';
  import type { Character } from '$lib/type';
  import Icon from '$lib/components/Icon.svelte';
  import { exportCharacterToJson, exportAllCharactersToJson, importCharacterFromJson } from '$lib/utils/export';
  let importInput: HTMLInputElement;

  async function handleImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    let imported = 0;
    for (const file of Array.from(files)) {
      try {
        const char = await importCharacterFromJson(file);
        const existing = characters.find((c) => c.id === char.id);
        if (existing) {
          if (!confirm(`Персонаж «${char.name}» уже есть. Заменить?`)) continue;
        }
        await saveCharacter(char);
        imported++;
      } catch (err) {
        alert(`Ошибка импорта «${file.name}»: ${(err as Error).message}`);
      }
    }
    input.value = '';
    await loadCharacters(); // ← функция загрузки у вас на главной должна называться так
    if (imported > 0) alert(`Импортировано: ${imported}`);
  }
  let characters = $state<Character[]>([]);
  let loading = $state(true);
  let error = $state('');
  let query = $state('');
  let deleting = $state<string | null>(null);
  let busy = $state(false);
  const filtered = $derived(characters.filter(c => `${c.name} ${raceName(c.raceId)}`.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru'))));
  async function load() {
    loading = true;
    error = '';
    try { characters = await listCharacters(); }
    catch { error = 'Не удалось загрузить персонажей. Проверьте, разрешено ли браузеру хранить данные, и попробуйте ещё раз.'; }
    finally { loading = false; }
  }
  async function remove(id: string) {
    if (busy) return;
    busy = true;
    try { await deleteCharacter(id); characters = characters.filter(c => c.id !== id); deleting = null; }
    catch { error = 'Не удалось удалить персонажа. Попробуйте ещё раз.'; }
    finally { busy = false; }
  }
  function raceName(id: string) { return RACES.find(r => r.id === id)?.name ?? id; }
  onMount(load);
  async function loadCharacters() {
	  characters = await listCharacters();
  }
</script>

<main class="home">
  <section class="journey" aria-labelledby="journey-title">
    <div class="journey-copy">
      <span class="journey-note"><Icon name="leaf" size={18} /> Мир историй начинается с героя</span>
      <h1 id="journey-title">Соберите свою<br />историю в Парме.</h1>
      <p>Листы героев, броски и инструменты мастера.<br class="desktop-break" /> Всё, что нужно за игровым столом.</p>
      <a class="button hero-button" href="/new"><Icon name="plus" size={20} /> Создать персонажа</a>
    </div>
    <img class="forest" src="/forest.svg" alt="" width="700" height="420" />
  </section>
  <input
    type="file"
    accept=".json,application/json"
    multiple
    bind:this={importInput}
    onchange={handleImport}
    class="hidden"
  />
  <button
    class="px-3 py-2 border rounded hover:bg-gray-50"
    onclick={() => importInput.click()}>
    📥 Импорт JSON
  </button>
  <button
    class="px-3 py-2 border rounded hover:bg-gray-50"
    disabled={characters.length === 0}
    onclick={() => exportAllCharactersToJson(characters)}>
    📦 Экспорт всех
  </button>
  <div class="home-columns">
    <section class="characters" aria-labelledby="characters-title">
      <div class="section-heading"><div><h2 id="characters-title">Ваши персонажи <span class="count">{characters.length}</span></h2><p>Выберите героя, чтобы продолжить приключение.</p></div></div>
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
              {#if deleting === c.id}
                <div class="delete-confirm"><p>Удалить «{c.name || 'Без имени'}»? Восстановить лист будет нельзя.</p><div><button class="button danger" disabled={busy} onclick={() => remove(c.id)}>{busy ? 'Удаляем…' : 'Удалить'}</button><button class="button" disabled={busy} onclick={() => deleting = null}>Отмена</button></div></div>
              {:else}
                <button class="delete-button" aria-label={`Удалить персонажа ${c.name || 'Без имени'}`} onclick={() => deleting = c.id}><Icon name="trash" size={18} /></button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
      <p class="storage-note"><Icon name="shield" size={16} /> Ваши герои хранятся на этом устройстве, в этом браузере.</p>
    </section>
    <aside class="toolbox" aria-labelledby="tools-title">
      <h2 id="tools-title">За ширмой мастера</h2><p>Подготовьте встречу и ведите игру.</p>
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
  .journey { position: relative; overflow: hidden; background: #173d30; color: #f8f5de; border-radius: 12px; min-height: 340px; }
  .journey-copy { position: relative; z-index: 1; padding: 40px; width: 62%; }
  .journey-note { display: flex; align-items: center; gap: 8px; color: #d2dcc1; font-size: 13px; }
  h1 { font-size: clamp(34px, 4vw, 49px); line-height: 1.13; margin: 17px 0; font-weight: 500; }
  .journey-copy p { font-size: 14px; color: #d2dcc1; line-height: 1.8; margin-bottom: 24px; }
  .hero-button { background: #e9edcd; border-color: #e9edcd; }
  .forest { position: absolute; right: -30px; bottom: 0; width: 61%; height: 100%; object-fit: cover; object-position: center; opacity: .9; }
  .home-columns { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 44px; margin-top: 38px; }
  h2 { font-size: 27px; font-weight: 600; margin: 0; }
  .section-heading p, .toolbox > p { color: #5f6c60; font-size: 13px; margin: 5px 0 22px; }
  .count { vertical-align: middle; font: 13px 'Segoe UI', sans-serif; background: #e4e8d9; padding: 4px 9px; border-radius: 20px; margin-left: 7px; }
  .empty { background: #fffef8; border: 1px dashed #bdc8ae; border-radius: 10px; min-height: 275px; padding: 28px 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 12px; }
  .empty h3 { font: 24px Georgia, serif; }
  .empty p { font-size: 14px; color: #5f6c60; }
  .empty-symbol { color: #678256; padding: 13px; background: #f0f2e4; border-radius: 50%; }
  .storage-note { display: flex; gap: 8px; align-items: center; color: #5f6c60; font-size: 12px; margin-top: 16px; }
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
  .character-link { display: flex; align-items: center; gap: 16px; padding: 20px 56px 20px 18px; }
  .portrait { width: 50px; height: 56px; border-radius: 24px 24px 6px 6px; background: #e5ecd9; display: grid; place-items: center; font: 30px Georgia, serif; flex-shrink: 0; }
  .character-info { flex: 1; min-width: 0; }
  .character-info strong { display: block; font: bold 21px Georgia, serif; overflow-wrap: anywhere; }
  .character-info > span { font-size: 13px; color: #5f6c60; }
  .level { font-size: 24px; text-align: center; line-height: 1.3; }
  .level small { display: block; font-size: 10px; color: #5f6c60; }
  .delete-button { position: absolute; right: 7px; top: 26px; width: 40px; display: grid; place-items: center; color: #6c7765; border-radius: 5px; }
  .delete-button:hover { color: #a93232; background: #fff0eb; }
  .delete-confirm { border-top: 1px solid #d5daca; padding: 16px; font-size: 14px; }
  .delete-confirm > div { display: flex; gap: 10px; margin-top: 12px; }
  @media (max-width: 900px) { .home-columns { grid-template-columns: 1fr 280px; gap: 24px; } .toolbox { padding-left: 20px; } }
  @media (max-width: 700px) { .home-columns { grid-template-columns: 1fr; gap: 30px; margin-top: 28px; } .toolbox { border-left: 0; padding-left: 0; } .journey-copy { padding: 28px 24px; width: 100%; } .forest { width: 100%; opacity: .2; right: 0; } .journey { min-height: auto; } .journey-note { font-size: 11px; } .desktop-break { display: none; } .character-link { gap: 10px; padding-left: 12px; } }
</style>
