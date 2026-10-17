<script lang="ts">
 import SpellPattern from './SpellPattern.svelte';
 import { playerText } from '$lib/ui/player-copy';
  import type { Spell } from '$lib/rules/spells';
  type Cost = { reduced: number; reduction: number; resource: 'mana' | 'grace' | 'hp' };
  let { spell, oneHand, twoHands, holdable, useGrace = false }: { spell: Spell; oneHand: Cost; twoHands: Cost; holdable: boolean; useGrace?: boolean } = $props();
  const rangeLabels: Record<string, string> = { touch: 'Касание', self: 'На себя', close: 'Ближняя дистанция', far: 'Дальняя дистанция', deep: 'Глубокая дистанция', specified: 'По условиям' };
  const targetLabels: Record<string, string> = { creature: 'Существо', ally: 'Союзник', object: 'Предмет', point: 'Точка', area: 'Область', self: 'На себя' };
  const resource = $derived(oneHand.resource === 'hp' ? 'Здравия' : oneHand.resource === 'grace' || useGrace ? 'Благодати' : 'Живы');
  const initialEffect = $derived(spell.damage ?? spell.effect ?? 'По условиям заклинания');
  const repeatedEffect = $derived(spell.holdDamage ?? spell.holdEffect ?? 'Эффект продолжается');
</script>

<div class="spell-overview">
  <p class="spell-description text-gray-600">{playerText(spell.description)}</p>
  <SpellPattern spellId={spell.id} name={spell.name} />
</div>
<div class="spell-facts">
  <span>{spell.rangeText ?? rangeLabels[spell.range]}</span>
  <span>{targetLabels[spell.target]}</span>
  {#if spell.action === 'reaction'}<span>Реакция</span>{/if}
  {#if spell.application === 'ritual'}<span>Ритуал{spell.ritualTime ? ' · ' + spell.ritualTime : ''}</span>{/if}
  {#if spell.duration}<span>{spell.duration}</span>{/if}
</div>
<div class="spell-phase">
  <h4>{spell.application === 'ritual' ? 'Ритуал' : 'Сотворение'}</h4>
  <div class="spell-effect"><span>{spell.damage ? 'Урон' : 'Эффект'}</span><strong>{initialEffect}</strong></div>
  <div class="spell-costs">
    {#if spell.costGrace !== undefined}<div><span>Стоимость</span><strong>{oneHand.reduced} {resource}</strong></div>
    {:else}
      {#if spell.costOneHand !== undefined}<div><span>{spell.requiresTwoHands ? 'Две руки' : 'Одна рука'}</span><strong>{oneHand.reduced} {resource}</strong>{#if oneHand.reduction > 0}<small>−{oneHand.reduction} от умений</small>{/if}</div>{/if}
      {#if spell.costTwoHands !== undefined}<div><span>Две руки · усиление</span><strong>{twoHands.reduced} {resource}</strong>{#if twoHands.reduction > 0}<small>−{twoHands.reduction} от умений</small>{/if}</div>{/if}
    {/if}
  </div>
  {#if spell.save}<p class="spell-save"><strong>Избавление:</strong> {spell.save}</p>{/if}
</div>
{#if holdable}
  <div class="spell-phase spell-maintenance">
    <h4>{spell.holdInterval === 'hour' ? 'Следующие часы' : 'Следующие раунды'}</h4>
    <div class="spell-effect"><span>{spell.holdDamage ? 'Урон' : 'Эффект'}</span><strong>{repeatedEffect}</strong></div>
    <p class="spell-maintenance-cost">{spell.holdCost ?? 0} Живы/{spell.holdInterval === 'hour' ? 'час' : 'раунд'} · без нового броска к100</p>
    {#if spell.holdRounds}<p class="spell-save">Всего {spell.holdRounds} раундов, включая сотворение</p>{/if}
  </div>
{/if}

<style>
  .spell-overview { display:grid; grid-template-columns:minmax(0,1fr) 96px; gap:16px; align-items:center; margin-bottom:10px; }
  .spell-description { margin: 10px 0 14px; font-size: 14px; line-height: 1.65; }
  .spell-facts { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .spell-facts span { padding: 4px 9px; border: 1px solid var(--decay-border, #c4cbbb); border-radius: 6px; font-size: 12px; }
  .spell-phase { padding: 16px; border: 1px solid var(--decay-border, #c4cbbb); border-radius: 8px; margin: 10px 0; background: #173d3005; }
  h4 { font: 19px Georgia, serif; margin: 0 0 10px; }
  .spell-effect { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .spell-effect > span { font-size: 12px; }
  .spell-effect strong { font-size: 21px; line-height: 1.4; }
  .spell-costs { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-top: 12px; }
  .spell-costs div { display: flex; flex-direction: column; gap: 3px; }
  .spell-costs span, .spell-costs small { font-size: 12px; }
  .spell-costs strong { font-size: 15px; }
  .spell-maintenance-cost, .spell-save { font-size: 13px; margin: 9px 0 0; }
  @media (max-width: 600px) { .spell-phase { padding: 12px; } .spell-effect strong { font-size: 18px; } }
</style>
