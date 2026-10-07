<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { dicePresentation } from '$lib/ui/dice';
  import { diceNotation } from '$lib/engine/dice-animation';
  import { classifyRoll } from '$lib/engine/dice';

  let settled = $state(false);
  let fallback = $state(false);
  let box: any;
  let engineReady: Promise<any> | undefined;
  let closing: ReturnType<typeof setTimeout> | undefined;
  const result = $derived($dicePresentation?.sides === 100 && $dicePresentation.target !== undefined
    ? classifyRoll($dicePresentation.value, $dicePresentation.target) : null);
  const names = { crit_success: 'Правь! Критический успех', success: 'Успех', fail: 'Провал', crit_fail: 'Навь! Критический провал', double: 'Явь! Дубль' };

  $effect(() => {
    const request = $dicePresentation;
    settled = false;
    fallback = false;
    clearTimeout(closing);
    if (!request) { box?.clearDice(); return; }
    let cancelled = false;
    const deadline = setTimeout(() => reveal(true), 6500);
    function reveal(failed = false) {
      if (cancelled || $dicePresentation !== request) return;
      clearTimeout(deadline);
      if (failed) box?.clearDice();
      fallback = failed;
      settled = true;
      if (!request!.hold) closing = setTimeout(request!.finish, 1400);
    }
    async function run() {
      try {
        await tick();
        if (!engineReady) {
          engineReady = import('@3d-dice/dice-box-threejs').then(async ({ default: DiceBox }) => {
            const candidate = new DiceBox('#parma-dice-scene', {
              sounds: false, shadows: true, baseScale: 75, strength: 1.1,
              iterationLimit: 240, light_intensity: 0.9,
              theme_customColorset: { name: 'parma-bone', foreground: '#173d30', background: '#f1e6ca', outline: '#f1e6ca', edge: '#d3bc87', texture: 'none', material: 'none' }
            });
            try {
              await candidate.initialize();
              return candidate;
            } catch (error) {
              candidate.renderer?.dispose();
              candidate.renderer?.domElement.remove();
              throw error;
            }
          }).catch((error) => { engineReady = undefined; throw error; });
        }
        box = await engineReady;
        if (cancelled) return;
        box.clearDice();
        await box.roll(diceNotation(request!.sides, request!.value));
        reveal();
      } catch (error) {
        console.warn('Dice animation unavailable', error);
        reveal(true);
      }
    }
    void run();
    return () => { cancelled = true; clearTimeout(deadline); clearTimeout(closing); box?.clearDice(); };
  });

  function close() { $dicePresentation?.finish(); }
  function disable() { localStorage.setItem('parma_dice_animation', 'off'); close(); }
  onDestroy(() => { close(); box?.clearDice(); });
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape') close(); }} />
<section class="dice-overlay" class:visible={!!$dicePresentation} class:settled class:critical={result === 'crit_success'} class:failed={result === 'crit_fail'} aria-label="Результат броска" aria-hidden={!$dicePresentation} inert={!$dicePresentation}>
  <header>
    <div><span class="die-kind">к{$dicePresentation?.sides ?? 100}</span><strong>{$dicePresentation?.label ?? 'Бросок кубиков'}</strong></div>
    <button type="button" onclick={close} aria-label="Закрыть анимацию">×</button>
  </header>
  <div class="dice-table">
    <div class="table-mark" aria-hidden="true">✧</div>
    <div id="parma-dice-scene"></div>
    {#if fallback}<div class="fallback-face">{$dicePresentation?.value}</div>{/if}
    <div class="roll-caption">{settled ? ($dicePresentation?.sides === 100 ? 'Десятки + единицы' : 'Двадцатигранник') : 'Кубики на столе…'}</div>
  </div>
  <footer>
    <div class="result" aria-live="polite" aria-atomic="true">
      {#if settled}<b>{$dicePresentation?.value}</b><span>{result ? names[result] : $dicePresentation?.sides === 20 ? 'Прыть · результат кубика' : 'Результат броска'}{#if $dicePresentation?.target !== undefined}<small>Цель: {$dicePresentation.target} · {$dicePresentation.value <= $dicePresentation.target ? '≤' : '>'}</small>{/if}</span>
      {:else}<span class="waiting">Пусть судьба решит</span>{/if}
    </div>
    <div class="actions"><button type="button" onclick={disable}>Без анимации</button><button type="button" onclick={close}>{settled ? 'Готово' : 'Пропустить'}</button></div>
  </footer>
</section>

<style>
  .dice-overlay { position: fixed; z-index: 60; left: 50%; bottom: 24px; transform: translateX(-50%); width: min(600px, calc(100vw - 32px)); background: #fbf7ed; color: #173d30; border: 1px solid #aa946b; border-radius: 14px; box-shadow: 0 20px 80px #10251dcc; visibility: hidden; pointer-events: none; overflow: hidden; }
  .dice-overlay.visible { visibility: visible; pointer-events: auto; animation: arrive .22s ease-out; }
  header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; }
  header > div { display: flex; align-items: center; gap: 12px; min-width: 0; }
  strong { font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .die-kind { border: 1px solid #bbaa87; border-radius: 5px; padding: 4px 8px; font-size: 13px; flex-shrink: 0; }
  button { cursor: pointer; min-height: 44px; padding: 8px 12px; border-radius: 5px; }
  button:hover { background: #e8e5d6; }
  button:focus-visible { outline: 3px solid #b89142; outline-offset: -3px; }
  header button { font-size: 28px; line-height: 1; }
  .dice-table { position: relative; height: 290px; margin: 0 12px; border: 7px solid #5b4731; border-radius: 8px; background: radial-gradient(ellipse at center, #305a46, #173d30); box-shadow: inset 0 4px 18px #071e1d99, 0 1px 0 #cfbd96; overflow: hidden; }
  .dice-table::after { content: ''; position: absolute; inset: 12px; border: 1px solid #bdad752b; border-radius: 3px; pointer-events: none; }
  #parma-dice-scene { position: absolute; inset: 0; }
  .table-mark { position: absolute; inset: 0; display: grid; place-items: center; font: 120px Georgia, serif; color: #b9b38525; pointer-events: none; }
  .roll-caption { position: absolute; bottom: 14px; left: 0; right: 0; text-align: center; color: #d3dfc8; font-size: 12px; pointer-events: none; }
  footer { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 90px; }
  .result { display: flex; align-items: center; gap: 14px; }
  .result b { font: 48px/1 Georgia, serif; }
  .result span { font-weight: 600; font-size: 14px; }
  .result small { display: block; font-size: 12px; font-weight: 400; margin-top: 4px; color: #536954; }
  .waiting { font-family: Georgia, serif; font-style: italic; color: #66755e; }
  .actions { display: flex; flex-direction: column-reverse; align-items: flex-end; font-size: 12px; }
  .actions button { min-height: 32px; }
  .actions button:first-child { color: #64705b; font-size: 11px; }
  .critical .result { color: #886419; }
  .critical.settled .dice-table { box-shadow: inset 0 0 30px #d7ad483d; }
  .failed .result { color: #943f38; }
  .fallback-face { position: absolute; inset: 0; display: grid; place-items: center; color: #f1e6ca; font: 80px Georgia, serif; }
  @keyframes arrive { from { opacity: 0; transform: translate(-50%, 15px); } to { opacity: 1; transform: translate(-50%, 0); } }
  @media (max-width: 600px) { .dice-overlay { bottom: max(12px, env(safe-area-inset-bottom)); } .dice-table { height: 230px; } header, footer { padding: 12px 14px; } .result b { font-size: 40px; } }
</style>
