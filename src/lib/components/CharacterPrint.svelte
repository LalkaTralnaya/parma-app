<script lang="ts">
  import type { Character } from '$lib/type';
  import type { ConditionModifiers } from '$lib/rules/conditions';
  import { CHARACTERISTICS } from '$lib/rules/characteristics';
  import { RESOURCES } from '$lib/rules/resources';
  import { SKILLS } from '$lib/rules/skills';
  import { RACES } from '$lib/rules/races';
  import { BACKGROUNDS } from '$lib/rules/backgrounds';
  import { PERSONALITY_TRAITS, IDEALS, BONDS, FLAWS } from '$lib/rules/personality';
  import { getSkillTotal, getSkillCheckTarget, getCharacteristicValue, getModifier, getResourceMax } from '$lib/engine/character';
  import { playerText } from '$lib/ui/player-copy';

  let { character: c, modifiers = {}, preview = false, onclose }: {
    character: Character; modifiers?: ConditionModifiers; preview?: boolean; onclose: () => void;
  } = $props();
  let includeHistory = $state(false);
  const race = $derived(RACES.find(r => r.id === c.raceId));
  const background = $derived(BACKGROUNDS.find(b => b.id === c.backgroundId));
  const signed = (n: number) => n >= 0 ? `+${n}` : `${n}`;
</script>

<div class="print-sheet" class:preview aria-label="Печатный лист персонажа">
  <div class="print-toolbar">
    <div><strong>Печатный бланк · A4</strong><p>Две страницы для игры на бумаге. Характеристики, навыки и максимумы ресурсов заполнены; текущие показатели, оружие, умения и заклинания — для записи от руки.</p></div>
    <label class="print-option"><input type="checkbox" bind:checked={includeHistory} /> Добавить личность, происхождение и историю</label>
    <div class="print-actions"><button type="button" onclick={onclose}>Вернуться к листу</button><button type="button" onclick={() => window.print()}>Распечатать / сохранить PDF</button></div>
  </div>
  <article class="paper">
    <div class="sheet-page">
      <header class="print-heading">
        <div><p class="eyebrow">ПАРМА · ЛИСТ ПЕРСОНАЖА</p><h1>{c.name || 'Без имени'}</h1><p>{race?.name ?? c.raceId}{#if c.raceVariantId} · {race?.variants?.find(v => v.id === c.raceVariantId)?.name ?? c.raceVariantId}{/if} · {background?.name ?? 'Без предыстории'}</p></div>
        <div class="level"><span class="number-box" aria-label="Уровень — вписать"></span><span>уровень</span></div>
      </header>
      <div class="stats">
        {#each CHARACTERISTICS as a}
          {@const value = getCharacteristicValue(c,a.id)}<div><span>{a.name}</span><strong class="stat-value">{value}</strong><small>мод. {signed(getModifier(value))} · избавл. ≤ {value}</small></div>
        {/each}
      </div>
      <div class="stats resources">
        {#each RESOURCES as r}
          <div><span>{r.name}</span><div class="resource-blanks"><span aria-label={`${r.name} сейчас — вписать`}></span><b>/</b><span aria-label={`${r.name} максимум`}>{getResourceMax(c,r.id)}</span></div><small>сейчас / максимум</small></div>
        {/each}
      </div>
      <div class="tracking">
        <span>Временное Здравие <span class="write-line"></span></span>
        <span>Вдохновение <span class="write-line"></span> / 3</span>
        <span>Очки умений <span class="write-line"></span></span>
      </div>
      <div class="tracking rest-tracking">
        <span>Короткий отдых <span class="mark-box" aria-label="Отметка короткого отдыха"></span></span>
        <span>Продолжительный отдых <span class="mark-box" aria-label="Отметка продолжительного отдыха"></span></span>
      </div>
      <section class="combat-summary">
        <h2>Бой и состояния</h2>
        <div class="tracking"><span>Броня <span class="number-box"></span></span><span>Доспех <span class="mark-box"></span> <span class="write-line wide"></span></span><span>Щит <span class="mark-box"></span> <span class="write-line"></span></span></div>
        <p><strong>Прыть: к20 + модификатор Ловкости.</strong></p>
        <div class="tracking"><span>Тлен <span class="write-line"></span> ОТ · стадия <span class="write-line"></span></span><span>Смертей <span class="write-line"></span></span><span>Долг <span class="write-line"></span></span><span>Метка Нави <span class="mark-box"></span></span></div>
        <div class="tracking"><span>Глас крови <span class="mark-box"></span></span><span>Зов Живы <span class="mark-box"></span></span><span>Состояния <span class="write-line extra-wide"></span></span></div>
      </section>
      <section>
        <h2>Навыки</h2><p class="footnote">Бонус и цель к100 перенесены из листа персонажа на момент печати.</p>
        <div class="skill-columns">
          {#each CHARACTERISTICS as a}
            <div class="skill-group"><h3>{a.name}</h3><table><thead><tr><th scope="col">Навык</th><th scope="col">Бонус</th><th scope="col">Цель</th></tr></thead><tbody>
              {#each SKILLS.filter(s => s.parent === a.id) as s}<tr><td>{s.name}</td><td>{signed(getSkillTotal(c,s.id,modifiers))}</td><td>≤ {getSkillCheckTarget(c,s.id,modifiers)}</td></tr>{/each}
            </tbody></table></div>
          {/each}
        </div>
      </section>
    </div>
    <div class="sheet-page records-page">
      <header class="records-heading"><strong>{c.name || 'Персонаж'}</strong><span>Снаряжение, умения и магия</span></header>
      <section><h2>Оружие</h2><table class="writing-table weapons-table"><colgroup><col style="width:40%" /><col style="width:20%" /><col style="width:20%" /><col style="width:20%" /></colgroup><thead><tr><th scope="col">Оружие</th><th scope="col">Попадание к100</th><th scope="col">Урон</th><th scope="col">Пометки</th></tr></thead><tbody>{#each Array(6) as _}<tr><td></td><td></td><td></td><td></td></tr>{/each}</tbody></table></section>
      <section><h2>Умения</h2><table class="writing-table abilities-table"><colgroup><col style="width:35%" /><col style="width:65%" /></colgroup><thead><tr><th scope="col">Умение / ранг</th><th scope="col">Эффект и пометки</th></tr></thead><tbody>{#each Array(8) as _}<tr><td></td><td></td></tr>{/each}</tbody></table></section>
      <section><h2>Заклинания</h2><table class="writing-table spells-table"><colgroup><col style="width:25%" /><col style="width:17%" /><col style="width:12%" /><col style="width:13%" /><col style="width:33%" /></colgroup><thead><tr><th scope="col">Заклинание</th><th scope="col">Школа / ступень</th><th scope="col">Цена</th><th scope="col">Цель к100</th><th scope="col">Эффект / длительность</th></tr></thead><tbody>{#each Array(8) as _}<tr><td></td><td></td><td></td><td></td><td></td></tr>{/each}</tbody></table></section>
      <section><h2>Инвентарь и деньги</h2><div class="tracking money"><span>Златники <span class="write-line"></span></span><span>Серебряники <span class="write-line"></span></span><span>Медяки <span class="write-line"></span></span><span>Вес <span class="write-line"></span> пуд.</span></div><div class="inventory-columns">{#each [0,1] as _}<table class="writing-table inventory-table"><colgroup><col style="width:75%" /><col style="width:25%" /></colgroup><thead><tr><th scope="col">Предмет / пометки</th><th scope="col">Кол.</th></tr></thead><tbody>{#each Array(5) as _}<tr><td></td><td></td></tr>{/each}</tbody></table>{/each}</div></section>
    </div>
    {#if includeHistory}
      <div class="sheet-page history-page">
        <header class="records-heading"><strong>{c.name || 'Персонаж'}</strong><span>Личность и история</span></header>
        <div class="history-columns">
          <section><h2>Личность и цели</h2>{#each [{field:'personality',label:'Характер',list:PERSONALITY_TRAITS},{field:'ideal',label:'Идеал',list:IDEALS},{field:'bond',label:'Привязанность',list:BONDS},{field:'flaw',label:'Слабость',list:FLAWS}] as const as aspect}{@const text = c.bio[`${aspect.field}Text`] || aspect.list.find(o => o.id === c.bio[`${aspect.field}Key`])?.description}<p><strong>{aspect.label}:</strong> {text || '—'}</p>{/each}<h3>Цели</h3><p class="personal-text">{c.bio.goals || '—'}</p></section>
          <section><h2>Происхождение</h2><p>{race?.description}</p>{#if c.raceVariantId}<p>{race?.variants?.find(v => v.id === c.raceVariantId)?.note}</p>{/if}{#if background}<h3>{background.name} · {background.feature.name}</h3><p>{playerText(background.feature.description)}</p>{/if}</section>
          {#if c.bio.backstory}<section><h2>Предыстория героя</h2><p class="personal-text">{c.bio.backstory}</p></section>{/if}
          {#if c.bio.appearance}<section><h2>Внешность</h2><p class="personal-text">{c.bio.appearance}</p></section>{/if}
        </div>
      </div>
    {/if}
  </article>
</div>

<style>
  .print-sheet { display:none; color:#111; font:10pt/1.25 Arial,sans-serif; text-align:left; }
  .print-sheet.preview { display:block; }
  .paper { background:white; color:#111; max-width:210mm; margin:auto; }
  .sheet-page { padding:10mm; }
  .sheet-page + .sheet-page { border-top:1px dashed #999; }
  .print-toolbar { max-width:210mm; margin:0 auto 20px; padding:16px; background:#f4efdf; color:#213b2d; border:1px solid #a99570; font:14px/1.5 Arial,sans-serif; }
  .print-toolbar p { margin:4px 0 12px; }
  .print-option { display:flex; align-items:center; gap:6px; }
  .print-actions { display:flex; gap:12px; flex-wrap:wrap; margin-top:12px; }
  .print-actions button { padding:8px 12px; border:1px solid #485f4c; cursor:pointer; }
  .print-heading { display:flex; justify-content:space-between; gap:12px; border-bottom:2px solid #222; padding-bottom:3mm; margin-bottom:3mm; }
  .eyebrow { font-size:8pt; letter-spacing:2px; }
  h1 { font:bold 24pt/1.15 Georgia,serif; margin:1mm 0; overflow-wrap:anywhere; }
  .level { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1mm; font-size:8pt; }
  .level .number-box { width:13mm; height:10mm; }
  h2 { font:bold 13pt/1.2 Georgia,serif; border-bottom:1px solid #777; margin:3mm 0 1.5mm; padding-bottom:1mm; break-after:avoid; }
  h3 { font-weight:bold; margin:2mm 0 1mm; break-after:avoid; }
  p { margin:1mm 0 2mm; overflow-wrap:anywhere; orphans:3; widows:3; }
  small,.footnote { font-size:8pt; } small { font-weight:normal; }
  .number-box,.mark-box { display:inline-block; border:1px solid #555; vertical-align:middle; background:white; }
  .number-box { width:12mm; height:6mm; }
  .mark-box { width:4mm; height:4mm; }
  .write-line { display:inline-block; height:4mm; border-bottom:1px solid #777; vertical-align:baseline; }
  .write-line { width:12mm; } .wide { width:23mm; } .extra-wide { width:58mm; }
  .stats { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:2mm; margin-bottom:2mm; }
  .stats > div { border:1px solid #999; padding:1.5mm; text-align:center; min-width:0; }
  .stat-value { display:block; height:8mm; font-size:17pt; line-height:8mm; }
  .stats small { display:block; font-size:7pt; white-space:nowrap; }
  .resources .resource-blanks { display:flex; align-items:center; gap:1mm; margin:2mm 0; }
  .resource-blanks > span { height:6mm; line-height:6mm; font-weight:bold; border-bottom:1px solid #777; flex:1; }
  .tracking { display:flex; align-items:center; flex-wrap:wrap; gap:2mm 5mm; font-size:9pt; margin:1.5mm 0; }
  .tracking > span { white-space:nowrap; }
  .rest-tracking { padding:1mm 0; }
  .combat-summary p { font-size:9pt; }
  table { width:100%; border-collapse:collapse; font:inherit; background:white!important; }
  th,td { padding:.6mm 1mm; border-bottom:1px solid #bbb; vertical-align:top; overflow-wrap:anywhere; }
  th { text-align:left; font-size:8pt; border-bottom:1px solid #555; }
  thead { display:table-header-group; } tr { break-inside:avoid; }
  .skill-columns { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1.5mm 6mm; }
  .skill-group { break-inside:avoid; }
  .skill-group h3 { margin-top:0; font-size:9pt; }
  .skill-group table { font-size:8.5pt; }
  .skill-group td:not(:first-child),.skill-group th:not(:first-child) { text-align:right; white-space:nowrap; }
  .records-heading { display:flex; justify-content:space-between; gap:5mm; padding-bottom:2mm; border-bottom:1px solid #555; font-size:9pt; }
  .records-page section { break-inside:avoid; }
  .writing-table { table-layout:fixed; }
  .writing-table td { height:6mm; border:1px solid #aaa; }
  .writing-table th { border:1px solid #777; }
  .spells-table td { height:7mm; }
  .inventory-table td { height:5.5mm; }
  .inventory-columns { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:5mm; }
  .history-columns { column-count:2; column-gap:6mm; column-rule:1px solid #ddd; }
  .personal-text { white-space:pre-wrap; overflow-wrap:anywhere; }
  @media screen and (max-width:650px) { .sheet-page { padding:5mm; } .skill-columns { grid-template-columns:1fr; } .history-columns { column-count:1; } .stats { grid-template-columns:repeat(2,1fr); } .inventory-columns { grid-template-columns:1fr; } }
  @media print {
    @page { size:A4 portrait; margin:10mm; }
    .print-sheet { display:block!important; margin:0!important; }
    .print-toolbar { display:none!important; }
    .paper { margin:0; max-width:none; }
    .sheet-page { padding:0; }
    .sheet-page + .sheet-page { break-before:page; border:0; }
    :global(html:has(.print-sheet)) { background:white!important; }
    :global(body:has(.print-sheet) .app-header), :global(body:has(.print-sheet) .app-footer), :global(body:has(.print-sheet) .skip-link), :global(body:has(.print-sheet) #content ~ *) { display:none!important; }
    :global(#content > main.character-sheet) { padding:0!important; margin:0!important; max-width:none!important; width:100%!important; }
    :global(#content > main.character-sheet > :not(.print-sheet)) { display:none!important; }
  }
</style>
