<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { showDice, dicePresentation } from '$lib/ui/dice';
  import { classifyRoll } from '$lib/engine/dice';
  const lifetime = new AbortController();
  onDestroy(() => lifetime.abort());
  let sides = $state(100);
  let target = $state(54);
  let last = $state<number | null>(null);
  let enabled = $state(true);
  let reduced = $state(false);
  const labels = { crit_success: 'Правь! Критический успех', success: 'Успех', fail: 'Провал', crit_fail: 'Навь! Критический провал', double: 'Явь! Дубль' };
  onMount(() => {
    enabled = localStorage.getItem('parma_dice_animation') !== 'off';
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  function toggle() { localStorage.setItem('parma_dice_animation', enabled ? 'on' : 'off'); }
  async function roll(value?: number) {
    $dicePresentation?.finish();
    const rolled = value ?? Math.floor(Math.random() * sides) + 1;
    last = rolled;
    await showDice({ sides, value: rolled, label: sides === 100 ? 'Проверка навыка' : 'Прыть (инициатива)', target: sides === 100 ? target : undefined, hold: true, signal: lifetime.signal });
    enabled = localStorage.getItem('parma_dice_animation') !== 'off';
  }
</script>

<svelte:head><title>Кубики — Парма</title></svelte:head>
<main class="dice-demo">
  <a class="back" href="/">← К персонажам</a>
  <div class="demo-grid">
    <section class="intro">
      <p class="context">За игровым столом</p>
      <h1>Один бросок.<br />Много судеб.</h1>
      <p class="description">Бросьте кубики на сукно. Проверьте навык или узнайте, кто первым вступит в бой.</p>
      <div class="choice" aria-label="Тип броска">
        <button type="button" class:chosen={sides === 100} aria-pressed={sides === 100} onclick={() => { sides = 100; last = null; $dicePresentation?.finish(); }}>к100 <span>Проверка навыка</span></button>
        <button type="button" class:chosen={sides === 20} aria-pressed={sides === 20} onclick={() => { sides = 20; last = null; $dicePresentation?.finish(); }}>к20 <span>Прыть</span></button>
      </div>
      {#if sides === 100}<label class="target" for="dice-target">Целевое число <input id="dice-target" type="number" min="1" max="100" bind:value={target} /></label>{/if}
      <button type="button" class="button primary throw" onclick={() => roll()}>Бросить {sides === 100 ? 'к100' : 'к20'}</button>
      <label class="setting"><input type="checkbox" bind:checked={enabled} onchange={toggle} /> Показывать анимацию броска</label>
      {#if reduced}<p class="motion-note">В системе включено уменьшение движения. Результат показывается сразу.</p>{/if}
    </section>
    <aside class="journal">
      <div class="journal-top"><span>Последний бросок</span><span>к{sides}</span></div>
      <div class="journal-result" aria-live="polite"><b>{last ?? '—'}</b><p>{last === null ? 'Судьба ждёт вашего хода' : sides === 100 ? labels[classifyRoll(last, target)] : 'Добавьте модификатор Ловкости'}</p></div>
      <div class="journal-bottom">{#if sides === 100}Два кубика: десятки и единицы.<br />00 + 0 означает 100.{:else}Двадцать граней. Один первый ход.{/if}</div>
    </aside>
  </div>
  {#if sides === 100}<div class="examples"><span>Попробовать особые исходы</span><button type="button" onclick={() => roll(1)}>Правь · 1</button><button type="button" onclick={() => roll(33)}>Явь · 33</button><button type="button" onclick={() => roll(100)}>Навь · 100</button></div>{/if}
</main>

<style>
  .dice-demo { max-width: 1100px; margin: auto; padding: 38px 32px 540px; }
  .back { font-size: 14px; color: #52664b; }
  .demo-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 90px; margin-top: 54px; align-items: center; }
  .context { margin: 0 0 18px; color: #627256; font-size: 15px; }
  h1 { font: 56px/1.05 Georgia, serif; letter-spacing: -1.8px; color: #173d30; margin: 0 0 24px; }
  .description { max-width: 370px; color: #5f6b55; line-height: 1.65; margin-bottom: 26px; }
  .choice { display: flex; gap: 10px; margin-bottom: 20px; }
  .choice button { text-align: left; border: 1px solid #c8cdb9; border-radius: 6px; padding: 12px 16px; font-size: 24px; color: #173d30; background: #fbfaf2; min-width: 140px; cursor: pointer; }
  .choice button.chosen { background: #e4ebd8; border-color: #397452; }
  .choice span { display: block; font-size: 12px; margin-top: 3px; }
  .target { display: flex; align-items: center; gap: 16px; font-size: 14px; margin-bottom: 18px; }
  .target input { background: #fffef8; border: 1px solid #b5c2aa; border-radius: 5px; padding: 8px 12px; width: 80px; }
  .throw { width: 100%; max-width: 330px; cursor: pointer; }
  .setting { display: flex; gap: 8px; margin-top: 16px; font-size: 13px; color: #53654b; align-items: center; }
  .setting input { width: 18px; height: 18px; accent-color: #24543c; }
  .journal { background: #e9ecd9; border: 1px solid #c3c9ac; padding: 25px; border-radius: 6px; transform: rotate(1deg); }
  .journal-top { display: flex; justify-content: space-between; font-size: 13px; color: #57664c; border-bottom: 1px solid #c4cab2; padding-bottom: 14px; }
  .journal-result { text-align: center; padding: 34px 0; }
  .journal-result b { font: 100px/1 Georgia, serif; color: #24543c; }
  .journal-result p { font-size: 14px; margin-top: 14px; }
  .journal-bottom { border-top: 1px solid #c4cab2; padding-top: 14px; font-size: 13px; color: #647258; line-height: 1.6; }
  .examples { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-top: 34px; }
  .examples span { font-size: 13px; color: #617157; }
  .examples button { min-height: 44px; padding: 8px 12px; border: 1px solid #c4ccb7; border-radius: 5px; cursor: pointer; background: #fbfaf2; font-size: 13px; }
  button:focus-visible, input:focus-visible { outline: 3px solid #b89142; outline-offset: 3px; }
  .motion-note { font-size: 13px; }
  @media (max-width: 760px) { .demo-grid { grid-template-columns: 1fr; gap: 28px; margin-top: 30px; } h1 { font-size: 44px; } .journal { transform: none; } .journal-result { padding: 18px 0; } .journal-result b { font-size: 68px; } .examples { margin-top: 24px; } }
</style>
