<script lang="ts">
  type Group = { id: string; title: string; sheet: string; names: string[]; notes?: string };
  type Marker = { name: string; group: string; x: number; y: number };
  const groups: Group[] = [
    { id: 'gardariki', title: 'Гардарика', sheet: '/heraldry/gardariki.png', names: ['Заречье — каменный мост и волна', 'Вышгород — башня на возвышении', 'Ледогорск — белая вершина и синий клин', 'Белобережье — ладья', 'Каменный Волок — горные врата', 'Дружино — щит и молния', 'Торговище — весы и волна'] },
    { id: 'asg', title: 'Асгард Ирийский', sheet: '/heraldry/asgard.png', names: ['Ткацкое — челноки', 'Верхнее — сноп', 'Нижнее — излучина реки', 'Боровое — хвойное дерево', 'Рудное — кирка и камень', 'Кузнечное — молот и наковальня', 'Травное — ветвь'] },
    { id: 'khar', title: 'Харитония', sheet: '/heraldry/kharitonia.png', names: ['Ак-Кент — голова коня', 'Кызыл-Кент — молот и клещи', 'Гюль-Кент — цветок', 'Тау-Кент — гора и молот', 'Денгиз-Кент — рыба и волна'], notes: 'Сары-Кала — столица и центр удела Яик. Её стяг показан отдельно.' },
    { id: 'east', title: 'Восточные Рубежи', sheet: '/heraldry/east.png', names: ['Заряград — колесо и восход', 'Острог — запертые врата', 'Сторожевой — соколиное око', 'Твердыня — две башни', 'Крепь — щит и ларь', 'Рубеж — светлая черта', 'Предел — огонь', 'Чернокамень — камень с закрытым оком'], notes: 'Стяг Хашара показан отдельно. Девять кругов в его малом знаке на этих изображениях требуют уточнения.' },
    { id: 'arimia', title: 'Аримия', sheet: '/heraldry/arimia-nests.png', names: ['Шамшир — меч и пламя', 'Денгиз-Кала — корабль и волна', 'Кур-Кала — гора, кирка и молот', 'Намтар — зеркало'], notes: 'Столица Аримии и знак Дракона-Императора.' },
    { id: 'steppe', title: 'Кочевые степи', sheet: '/heraldry/steppe.png', names: ['Волки — чёрная голова волка', 'Щиты — белый щит и синяя дорога'] },
    { id: 'veche', title: 'Вечевые Республики', sheet: '/heraldry/veche.png', names: ['Древлянск — резец и киянка', 'Камнеград — молот и камень', 'Кожевники — шкура', 'Травники — ветвь', 'Плотбище — ладья', 'Мельники — сноп и колесо', 'Гончары — кувшин'], notes: 'Общий знак республик — белый дуб. В малом знаке на изображениях он стилизован как три листа.' },
    { id: 'volnitsa', title: 'Вольница Дикого Поля', sheet: '/heraldry/volnitsa.png', names: ['Вольный Стан — кремень и искра', 'Курень Ветров — голова коня', 'Соляной Брод — кристаллы соли и волна', 'Табунное — голова быка', 'Костёр — огонь', 'Тихий Плёс — ладья', 'Горелый Дол — молот и наковальня'] }
  ];
  const capitals = [
    { name: 'Ашшур-Кала', image: '/heraldry/arimia-capital.png', position: '100%' },
    { name: 'Сары-Кала', image: '/heraldry/kharitonia-capital.png', position: '0%' },
    { name: 'Вышгород', image: '/heraldry/gardariki.png', position: '33.333% 0%', size: '400% 200%' },
    { name: 'Асгард', image: '/heraldry/asgard-capital.png', position: '50%' },
    { name: 'Хашар', image: '/heraldry/east-capital.png', position: '0%' },
    { name: 'Вечевые Республики — общий знак', image: '/heraldry/veche-common.png', position: '0%' },
    { name: 'Вольница — общий знак Рады', image: '/heraldry/volnitsa-common.png', position: '0%' }
  ];
  const markers: Marker[] = [
    { name: 'Ашшур-Кала', group: 'arimia', x: 91.50, y: 38.49 },
    { name: 'Вольный Стан', group: 'volnitsa', x: 44.4, y: 61.8 },
    { name: 'Волки', group: 'steppe', x: 37.35, y: 79.63 },
    { name: 'Щиты', group: 'steppe', x: 55.87, y: 75.42 },
    { name: 'Вышгород', group: 'gardariki', x: 25.94, y: 49.01 },
    { name: 'Асгард', group: 'asg', x: 43.8, y: 27.6 },
    { name: 'Сары-Кала', group: 'khar', x: 19.4, y: 73.8 },
    { name: 'Хашар', group: 'east', x: 61.2, y: 57.7 },
  ];
  const markerArt: Record<string, { image: string; size: string; position: string }> = {
    'Ашшур-Кала': { image: 'arimia-capital', size: '300% 100%', position: '100% 50%' },
    'Вольный Стан': { image: 'volnitsa', size: '400% 200%', position: '0% 0%' },
    'Волки': { image: 'steppe', size: '200% 100%', position: '0% 50%' },
    'Щиты': { image: 'steppe', size: '200% 100%', position: '100% 50%' },
    'Вышгород': { image: 'gardariki', size: '400% 200%', position: '33.333% 0%' },
    'Асгард': { image: 'asgard-capital', size: '300% 100%', position: '50% 50%' },
    'Сары-Кала': { image: 'kharitonia-capital', size: '300% 100%', position: '0% 50%' },
    'Хашар': { image: 'east-capital', size: '300% 100%', position: '0% 50%' },
  };
  let activeGroup = $state('gardariki');
  let selectedPlace = $state('');
  const selected = $derived(groups.find(group => group.id === activeGroup) ?? groups[0]);
  function selectMarker(marker: Marker) {
    activeGroup = marker.group;
    selectedPlace = marker.name;
  }
</script>

<section class="world-heraldry" aria-labelledby="world-heraldry-title">
  <header>
    <span class="eyebrow">Мир Пармы</span>
    <h2 id="world-heraldry-title">Карта и стяги земель</h2>
    <p>Выберите отметку на карте или откройте стяги нужной земли ниже.</p>
  </header>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="map-scroll" role="region" aria-label="Карта Пармы с отмеченными стягами" tabindex="0">
    <div class="map-frame">
      <img src="/heraldry/parma-map.png" alt="Иллюстрированная карта Пармы с землями и поселениями" width="3840" height="2160" />
      {#each markers as marker}
        <button class:chosen={selectedPlace === marker.name} class="map-flag" style:left={`${marker.x}%`} style:top={`${marker.y}%`} aria-label={`Показать стяги: ${marker.name}`} aria-pressed={selectedPlace === marker.name} title={marker.name} onclick={() => selectMarker(marker)}>
          <span class="flag-art" aria-hidden="true" style:background-image={`url("/heraldry/${markerArt[marker.name].image}.png")`} style:background-size={markerArt[marker.name].size} style:background-position={markerArt[marker.name].position}></span><span class="flag-label">{marker.name}</span>
        </button>
      {/each}
    </div>
  </div>
  <p class="map-note">На карте отмечены столицы и земли кланов. Стяги других городов и общин доступны в списках земель.</p>
  <div class="land-buttons" role="group" aria-label="Выбрать землю">
    {#each groups as group}<button class:active={activeGroup === group.id} aria-pressed={activeGroup === group.id} onclick={() => { activeGroup = group.id; selectedPlace = ''; }}>{group.title}</button>{/each}
  </div>
  <article class="sheet-panel" aria-live="polite">
    <h3>{selected.title}</h3>
    {#if selectedPlace}<p class="selection">Выбрано на карте: {selectedPlace}</p>{/if}
    {#if selected.id === 'arimia'}<div class="arimia-banner capital-crop" style:background-image={`url("/heraldry/arimia-capital.png")`} style:background-position="100% center" role="img" aria-label="Стяг Ашшур-Калы: драконий глаз"></div><img class="banner-sheet" src={selected.sheet} alt="Стяги гнездовий Аримии: Шамшир, Денгиз-Кала, Кур-Кала и Намтар" loading="lazy" />{:else}<a href={selected.sheet} target="_blank" rel="noreferrer" aria-label={`Открыть стяги: ${selected.title}`}><img class="banner-sheet" src={selected.sheet} alt={`Стяги земель: ${selected.title}. Порядок указан под изображением.`} loading="lazy" /></a>{/if}
    <ol>{#each selected.names as name}<li>{name}</li>{/each}</ol>
    {#if selected.notes}<p class="map-note">{selected.notes}</p>{/if}
  </article>
  <details class="capital-section">
    <summary>Стяги столиц и общие знаки</summary>
    <div class="capitals">
      {#each capitals as capital}
        <figure><div class="capital-crop" style:background-image={`url("${capital.image}")`} style:background-position={capital.size ? capital.position : `${capital.position} center`} style:background-size={capital.size ?? '300% 100%'} role="img" aria-label={`Стяг: ${capital.name}`}></div><figcaption>{capital.name}</figcaption></figure>
      {/each}
    </div>
  </details>
</section>

<style>
  .world-heraldry { max-width:1152px; margin:28px auto; padding:24px; border:1px solid #b59b72; border-radius:5px; background:#fffaf0; color:#253d30; }
  .eyebrow { font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:#82683f; }
  h2 { margin:6px 0 9px; font:30px Georgia,serif; } h3 { font:24px Georgia,serif; margin:0 0 12px; }
  header p,.map-note,.selection { font-size:13px; line-height:1.6; color:#596b5b; }
  .map-scroll { overflow:auto; margin-top:18px; border:1px solid #ad956d; }
  .map-frame { position:relative; min-width:940px; line-height:0; }
  .map-frame img { display:block; width:100%; height:auto; }
  .map-flag { position:absolute; z-index:1; display:flex; align-items:center; gap:3px; transform:translate(-35%,-100%); padding:0; border:1px solid #f6e8bc; border-radius:3px; background:#173d30e8; color:#fff7dc; font-size:14px; line-height:1.3; cursor:pointer; }
  .map-flag:hover,.map-flag:focus-visible,.map-flag.chosen { z-index:2; background:#713c2e; outline:2px solid #f8db91; }
  .flag-art { display:block; width:25px; height:34px; background-repeat:no-repeat; }
  .flag-label { position:absolute; bottom:100%; left:0; padding:3px 6px; background:#173d30; border-radius:3px; font-size:12px; white-space:nowrap; opacity:0; pointer-events:none; }
  .map-flag:hover .flag-label,.map-flag:focus-visible .flag-label,.map-flag.chosen .flag-label { opacity:1; }
  .map-note { margin:10px 0 0; } .land-buttons { display:flex; gap:8px; flex-wrap:wrap; margin:20px 0; }
  .land-buttons button { border:1px solid #ad9c7d; border-radius:4px; padding:9px 12px; color:#294938; background:#f7efdf; cursor:pointer; }
  .land-buttons button.active { background:#294938; color:#fff9eb; }
  button:focus-visible, a:focus-visible, .map-scroll:focus-visible, summary:focus-visible { outline:3px solid #af793b; outline-offset:2px; }
  .sheet-panel { padding:20px; border:1px solid #d6c9af; background:#f7f0e2; border-radius:4px; }
  .banner-sheet { display:block; max-width:100%; max-height:800px; width:auto; margin:12px auto; }
  ol { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:7px 26px; padding-left:25px; font-size:14px; line-height:1.5; }
  .capital-section { margin-top:18px; border:1px solid #d6c9af; background:#f7f0e2; }
  summary { padding:15px; cursor:pointer; font:20px Georgia,serif; }
  .capitals { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:14px; padding:0 15px 15px; }
  figure { margin:0; text-align:center; } figcaption { margin-top:6px; font-size:13px; }
  .arimia-banner { max-width:300px; margin:12px auto; }
  .capital-crop { width:100%; aspect-ratio:1 / 2; background-size:300% 100%; background-repeat:no-repeat; }
  @media(max-width:600px) { .world-heraldry { margin:16px; padding:16px; } h2 { font-size:25px; } .sheet-panel { padding:12px; } }
  @media print { .world-heraldry { display:none; } }
</style>
