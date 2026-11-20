<script lang="ts">
 import Icon from "$lib/components/Icon.svelte";
 import { APP_VERSION, LATEST_RELEASE, releaseDate } from "$lib/releases";
</script>
<main class="home">
  <section class="journey" aria-labelledby="journey-title">
    <div class="journey-copy">
      <span class="journey-note">Мир славянского сказа · меча и магии</span>
      <h1 id="journey-title">Ваша сага<br />начинается в Парме.</h1>
      <p>Создайте героя, соберите друзей и отправляйтесь навстречу истории. Листы персонажей и инструменты сказителя — всегда под рукой.</p>
      <div class="hero-actions">
        <a class="button hero-button" href="/characters"><Icon name="people" size={20} /> Ваши персонажи</a>
        <a class="hero-link" href="/adventures">Найти приключение <Icon name="arrow" size={17} /></a>
      </div>
    </div>
    <img class="forest" src="/forest.svg" alt="" width="700" height="420" />
  </section>
  <section class="learning-invitation" aria-label="Обучение"><Icon name="compass" size={25} /><div><strong>Первый раз в Парме?</strong><p>Создание героя, знакомство с листом и первые главы мира и правил.</p></div><a class="button" href="/learn">Начать обучение <Icon name="arrow" size={18} /></a></section>
  <section class="world ornament-frame" id="world" aria-labelledby="world-title">
    <div class="world-copy">
      <span class="world-note">Добро пожаловать в Парму</span>
      <h2 id="world-title">Парма — мир, к которому хочется возвращаться</h2>
      <p class="world-lead">Настольная ролевая игра в мире славянского фэнтези, где слово имеет вес, природа хранит тайны, а боги могут услышать.</p>
    </div>
    <div class="world-pillars">
      <div class="world-pillar"><span class="pillar-icon"><Icon name="leaf" size={20} /></span><div><h3>Живой мир</h3><p>Боги, древние народы и тайны руин</p></div></div>
      <div class="world-pillar"><span class="pillar-icon"><Icon name="compass" size={20} /></span><div><h3>Ваш собственный путь</h3><p>Свободное сочетание навыков и умений</p></div></div>
      <div class="world-pillar"><span class="pillar-icon"><Icon name="dice" size={20} /></span><div><h3>У силы есть цена</h3><p>Жива, Навь и след Тлена</p></div></div>
    </div>
    <details class="world-details">
      <summary><span class="read-more">Читать дальше</span><span class="read-less">Свернуть вступление</span><span class="disclosure-mark" aria-hidden="true"><Icon name="arrow" size={20} /></span></summary>
      <div class="world-story">
      <p>У каждого героя есть цель: найти пропавшего близкого, раскрыть древнюю тайну, освоить мастерство или увидеть, что лежит за пределами родных земель. Цель задаёт направление. История рождается по дороге к ней.</p>
      <p>Вы решаете, как поступит ваш персонаж. Навыки, умения и броски кубов помогают сражаться, преодолевать препятствия и узнавать исход рискованных действий. Успех открывает возможности. Неудача меняет обстоятельства: приходится искать другой путь, принимать помощь или пересматривать замысел. Следующее решение остаётся за вами.</p>
      <p>Рядом идут компаньоны со своими желаниями, убеждениями и привязанностями. Вы помогаете друг другу, спорите, даёте обещания и проходите испытания вместе. Чужая просьба становится общим делом. Неожиданная помощь рождает доверие. Ваши спутники видят, кем становится герой, и сами меняются рядом с ним.</p>
      <p>Жива пронизывает мир Пармы, связывая людей, природу, богов и вещи. Старый клинок может пробудиться и обрести голос. Забытый механизм Предтечи — открыть тайну своего предназначения. Просьба у священного источника — получить ответ, смысл которого ещё предстоит понять. За знакомой дорогой всегда остаётся место неизвестному.</p>
      <p>Между испытаниями есть время пожить: разделить ужин, послушать лес, починить любимую вещь, поговорить у огня. Найти друзей, освоиться в чужом доме, вернуться туда, где вас помнят. В такие минуты герой понимает, что стало ему дорого и ради чего хочется продолжать путь.</p>
      <p>В Парме нет классов. Предыстория становится началом, а сочетание навыков и умений позволяет развивать героя по своему замыслу. Пережитое придаёт этому развитию смысл: у нового умения появляется учитель, у вещи — память, у обещания — человек, который ждёт его исполнения.</p>
      <p>Цель может быть достигнута, измениться или утратить значение. Путь способен привести к тому, чего герой прежде даже не искал. Всё пережитое останется частью вашей общей истории.</p>
      <p class="world-closing"><strong>Создайте героя. Найдите спутников. Следующую главу вы узнаете за игровым столом.</strong></p>
      </div>
    </details>
  </section>
<div class="home-sections"><section class="home-panel" aria-labelledby="start-title"><h2 id="start-title">С чего начать</h2>
<ol><li>Познакомьтесь с миром и основными правилами.</li><li>Создайте героя с подсказками и разберите его лист.</li><li>Выберите приключение и соберите группу в комнате.</li></ol>
<div class="panel-links"><a class="button primary" href="/learn">Гайд для первых шагов</a><a class="button" href="/learn?topic=play">Гайд игрока</a><a class="button" href="/learn?topic=storyteller">Гайд Сказителя</a></div></section>
<section class="home-panel" aria-labelledby="updates-title"><p class="release-meta">Версия {APP_VERSION} · <time datetime={LATEST_RELEASE.date}>{releaseDate(LATEST_RELEASE.date)}</time></p><h2 id="updates-title">Последние обновления</h2><p><strong>{LATEST_RELEASE.title}</strong></p><ul>{#each LATEST_RELEASE.changes.slice(0, 3) as change}<li>{change}</li>{/each}</ul><div class="panel-links"><a href="#app-updates" class="button">Полная история обновлений ↓</a></div></section></div>
<section class="home-panel" aria-labelledby="useful-title"><h2 id="useful-title">Полезные ссылки</h2><div class="useful-links">
<a href="/characters"><strong>Ваши персонажи</strong><small>Листы героев, импорт и резервные копии</small></a>
<a href="/adventures"><strong>Приключения</strong><small>Готовые истории и создание своей</small></a>
<a href="/gm"><strong>Пульт Сказителя</strong><small>Проверки, заметки и паутины связей</small></a>
<a href="/room"><strong>Комнаты</strong><small>Общий стол для игроков и Сказителя</small></a>
<a href="/lore"><strong>Мир Пармы</strong><small>Земли, народы и истории</small></a>
<a href="/mechanics"><strong>Механики</strong><small>Правила и поиск по справочнику</small></a>
<a href="/gm/bestiary"><strong>Бестиарий</strong><small>Противники для вашей истории</small></a>
<a href="/gm/combat"><strong>Боевой трекер</strong><small>Участники, очередь ходов и эффекты</small></a>
<a href="/gm/cheatsheet"><strong>Краткая шпаргалка</strong><small>Правила под рукой во время игры</small></a>
<a href="/events"><strong>Случайные события</strong><small>Категории таблиц и броски</small></a>
<a href="/account#feedback-title"><strong>Обратная связь</strong><small>Сообщить о проблеме или предложить изменение</small></a>
</div></section>
</main>
<style>
  .learning-invitation { display:flex;align-items:center;gap:16px;padding:18px 22px;border:1px solid #bca77f;border-radius:5px;background:#eee3cb;color:#2d4937;margin:24px 0; }
  .learning-invitation > :global(svg) { flex-shrink:0;color:#947344; }
  .learning-invitation > div { flex:1; } .learning-invitation strong { font:21px Georgia,serif; } .learning-invitation p { font-size:13px;line-height:1.6;color:#65705a;margin-top:5px; }
  @media(max-width:600px) { .learning-invitation { flex-wrap:wrap;padding:16px; } .learning-invitation > div { flex-basis:75%; } }
  .home { max-width: 1250px; margin: auto; padding: 32px; }
  .journey { position: relative; overflow: hidden; background: #173d30; color: #f8f5de; border-radius: 5px; min-height: 263px; }
  .journey-copy { position: relative; z-index: 1; padding: 32px 36px; width: 62%; }
  .journey-note { color: #d2dcc1; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; }
  h1 { font-size: clamp(32px, 4vw, 40px); line-height: 1.15; margin: 12px 0 14px; font-weight: 500; }
  .journey-copy p { font-size: 14px; color: #d2dcc1; line-height: 1.8; margin-bottom: 24px; }
  .hero-button { background: #e9edcd; border-color: #e9edcd; }
  .forest { position: absolute; right: -30px; bottom: 0; width: 61%; height: 100%; object-fit: cover; object-position: center; opacity: .9; }
 h2 { font-size:27px;font-weight:600;margin:0; }
  .hero-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .hero-link { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; color: #edf0dc; font-size: 13px; }
  .hero-link:hover { text-decoration: underline; }
  .world { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 12px 34px; margin-top: 24px; background: #fffef9; align-items: center; }
  .world-copy { min-width: 0; }
  .home :global(.ornament-frame) { padding: 38px !important; }
  .world-note { color: #87613e; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; }
  .world h2 { margin: 10px 0 18px; font-weight: 600; font-size: clamp(25px, 3vw, 32px); line-height: 1.25; text-wrap: balance; }
  .world p { color: #52614f; font-size: 15px; line-height: 1.8; margin: 0 0 18px; }
  .world .world-lead { color: #315440; font-size: 15px; line-height: 1.7; margin-bottom: 0; }
  .world .world-closing { border-top: 1px solid #d5daca; padding-top: 22px; margin: 24px 0 0; color: #173d30; }

  .world-pillars { display: grid; gap: 16px; padding-left: 26px; border-left: 1px solid #d5daca; }
  .world-pillar { display: flex; align-items: center; gap: 14px; }
  .world-pillar h3 { font: 18px Georgia, serif; }
  .world-pillar p { font-size: 12px; line-height: 1.5; margin: 3px 0 0; }
  .pillar-icon { display: grid; place-items: center; width: 36px; height: 36px; flex-shrink: 0; border: 1px solid #b8a17d; transform: rotate(45deg); color: #315440; }
  .pillar-icon :global(svg) { transform: rotate(-45deg); }
  .world-details { grid-column: 1 / -1; }
  .world-details summary { display: flex; align-items: center; gap: 10px; width: fit-content; min-height: 44px; cursor: pointer; color: #315440; font-weight: 600; font-size: 13px; list-style: none; }
  .world-details summary::-webkit-details-marker { display: none; }
  .world-details summary:hover { text-decoration: underline; }
  .world-details .read-less { display: none; }
  .world-details[open] .read-more { display: none; }
  .world-details[open] .read-less { display: inline; }
  .disclosure-mark { display: inline-flex; flex-shrink: 0; transform: rotate(90deg); }
  .world-details[open] .disclosure-mark { transform: rotate(-90deg); }
  .world-story { border-top: 1px solid #d5daca; padding-top: 20px; max-width: 84ch; }
  @media (max-width: 700px) { .world { grid-template-columns: 1fr; gap: 20px; } .world-pillars { border-left: 0; border-top: 1px solid #d5daca; padding: 20px 0 0; } }
 .home-sections {display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;margin:24px 0;} .home-panel {border:1px solid #bca77f;border-radius:5px;background:#fffef9;padding:26px;min-width:0;} .home-panel p,.home-panel li{font-size:14px;line-height:1.75;color:#52614f;} .home-panel h2{margin-bottom:14px;} .home-panel ol,.home-panel ul{padding-left:20px;list-style:disc;} .home-panel ol{list-style:decimal;} .home-panel li+li{margin-top:10px;} .panel-links{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px;} .release-meta{color:#87613e;font-size:12px;} .useful-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;} .useful-links a{display:block;border:1px solid #d5daca;border-radius:5px;padding:16px;font-size:14px;} .useful-links a:hover{background:#e9edcd;} .useful-links small{display:block;margin-top:5px;color:#5f6c60;line-height:1.5;}
 @media(max-width:700px){.home{padding:24px 16px;}.home-sections{grid-template-columns:minmax(0,1fr);}.journey-copy{padding:28px 24px;width:100%;}.forest{width:100%;opacity:.2;right:0;}.journey{min-height:auto;}.home-panel{padding:20px;}}
 @media(max-width:450px){.useful-links{grid-template-columns:minmax(0,1fr);}.home :global(.ornament-frame){padding:24px!important;}}

</style>
