<script lang="ts">
	import type { PageData } from './$types';
	import Icon from '$lib/components/Icon.svelte';
	let { data }: { data: PageData } = $props();
	const adventure = $derived(data.adventure);
	let showSecretMarkers = $state(false);
	const visibleMarkers = $derived(adventure.map.markers.filter((marker) => showSecretMarkers || !marker.gmOnly));
</script>

<svelte:head>
	<title>{adventure.title} — Приключения Пармы</title>
	<meta name="description" content={adventure.summary} />
</svelte:head>

<main class="adventure-page">
	<a class="back" href="/adventures">← Все приключения</a>
	<header class="adventure-heading">
		<span class="label">{adventure.label}</span>
		<h1>{adventure.title}</h1>
		<p>{adventure.summary}</p>
		<div class="facts"><span>{adventure.region}</span><span>{adventure.players} игроков</span><span>{adventure.levels} уровни</span><span>{adventure.duration}</span></div>
	</header>

	<section class="map-section" aria-labelledby="map-title">
		<div class="map-heading">
			<div><span class="map-eyebrow">Место действия</span><h2 id="map-title">Заречье и окрестности</h2></div>
			<button type="button" class="map-toggle" aria-pressed={showSecretMarkers} onclick={() => showSecretMarkers = !showSecretMarkers}>
				{showSecretMarkers ? 'Скрыть тайные места' : 'Показать точки мастера'}
			</button>
		</div>
		<figure>
			<div class="map-canvas">
				<img src={adventure.map.src} alt={adventure.map.alt} width="1672" height="941" />
				{#each visibleMarkers as marker, index (marker.id)}
					<span class:secret-marker={marker.gmOnly} class="map-marker" style:left={`${marker.x}%`} style:top={`${marker.y}%`} aria-hidden="true">
						<span class="marker-number">{index + 1}</span><span class="marker-label">{marker.label}</span>
					</span>
				{/each}
			</div>
			<figcaption>{adventure.map.caption} <a href={adventure.map.src} target="_blank" rel="noreferrer">Открыть карту отдельно</a></figcaption>
		</figure>
		<ol class="map-key">
			{#each visibleMarkers as marker (marker.id)}<li><strong>{marker.label}</strong><span>{marker.note}</span></li>{/each}
		</ol>
	</section>

	<div class="adventure-layout">
		<div class="story">
			<section class="panel" aria-labelledby="start-title">
				<h2 id="start-title">Начало истории</h2>
				<p class="read-aloud">{adventure.opening}</p>
				<h3>Как вовлечь героев</h3>
				<ul>{#each adventure.hooks as hook}<li>{hook}</li>{/each}</ul>
			</section>

			<details class="gm-materials">
				<summary><Icon name="book" size={21} /> Материалы для мастера <span>Сюжетные тайны и сцены</span></summary>
				<div class="gm-content">
					<section class="panel secret" aria-labelledby="secret-title">
						<h2 id="secret-title">Что происходит на самом деле</h2>
						<p>{adventure.secret}</p>
					</section>
					<section class="panel" aria-labelledby="pacing-title">
						<h2 id="pacing-title">Ритм истории</h2><ul>{#each adventure.pacing as beat}<li>{beat}</li>{/each}</ul>
					</section>
					<section class="panel" aria-labelledby="clues-title">
						<h2 id="clues-title">Нити расследования</h2><ul>{#each adventure.clues as clue}<li>{clue}</li>{/each}</ul>
					</section>
					<section class="panel" aria-labelledby="locations-title">
						<h2 id="locations-title">Места и ощущения</h2>
						<div class="location-grid">{#each adventure.locations as location}<div><h3>{location.name}</h3><p>{location.atmosphere}</p><p class="location-use">{location.use}</p></div>{/each}</div>
					</section>
					<section class="panel" aria-labelledby="npcs-title">
						<h2 id="npcs-title">Действующие лица</h2>
						<div class="npc-grid">{#each adventure.npcs as npc}<div><h3>{npc.name}</h3><p class="npc-role">{npc.role}</p><p>{npc.motive}</p><p class="npc-voice">{npc.voice}</p></div>{/each}</div>
					</section>
					<section aria-labelledby="scenes-title" class="scenes">
						<h2 id="scenes-title">Сцены</h2>
						{#each adventure.scenes as scene (scene.id)}
							<article class="panel scene" id={scene.id}>
								<h3>{scene.title}</h3>
								<p class="read-aloud">{scene.readAloud}</p>
								<h4>Задачи</h4><ul>{#each scene.goals as goal}<li>{goal}</li>{/each}</ul>
								<h4>Проверки и действия</h4><ul>{#each scene.checks as check}<li>{check}</li>{/each}</ul>
								{#if scene.dialogue?.length}<h4>Реплики</h4><ul>{#each scene.dialogue as line}<li>{line}</li>{/each}</ul>{/if}
								<h4>Если всё пошло иначе</h4><ul>{#each scene.outcomes as outcome}<li>{outcome}</li>{/each}</ul>
							</article>
						{/each}
					</section>
					<section class="panel" aria-labelledby="handouts-title">
						<h2 id="handouts-title">Тексты улик</h2>
						{#each adventure.handouts as handout}<h3>{handout.title}</h3><p class="handout">{handout.text}</p>{/each}
					</section>
					<section class="panel" aria-labelledby="encounter-title">
						<h2 id="encounter-title">Возможная встреча</h2>
						<p><strong>{adventure.encounter.name}.</strong> {adventure.encounter.advice}</p>
						<a class="button" href={`/gm/bestiary?monster=${adventure.encounter.bestiaryId}`}>Открыть карточку в бестиарии <Icon name="arrow" size={17} /></a>
					</section>
					<section class="panel" aria-labelledby="ending-title">
						<h2 id="ending-title">Развязки</h2><ul>{#each adventure.endings as ending}<li>{ending}</li>{/each}</ul>
						<h3>Награда</h3><ul>{#each adventure.rewards as reward}<li>{reward}</li>{/each}</ul>
					</section>
				</div>
			</details>
		</div>
		<aside class="guide" aria-label="О приключении">
			<h2>За столом</h2>
			<p>История второго плейтеста: дайте героям время осмотреться. Неудачная проверка меняет цену открытия, но не закрывает важную улику.</p>
			<div class="tags">{#each adventure.tags as tag}<span>{tag}</span>{/each}</div>
			<a href="/gm/cheatsheet"><Icon name="book" size={18} /> Правила под рукой</a>
			<a href="/gm/combat"><Icon name="sword" size={18} /> Боевой трекер</a>
		</aside>
	</div>
</main>

<style>
	.adventure-page { max-width: 1180px; margin: auto; padding: 32px; }
	.back { display: inline-block; color: #3e7657; font-size: 14px; margin-bottom: 24px; }
	.adventure-heading { background: linear-gradient(115deg, #211e1b, #29382e); color: #f8f5de; border-radius: 12px; padding: 35px 40px; }
	.label { font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #d2dcc1; }
	h1 { font-size: clamp(36px, 5vw, 52px); margin: 10px 0; line-height: 1.15; font-weight: 500; }
	.adventure-heading > p { max-width: 720px; color: #e5ecd9; font-size: 15px; }
	.facts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
	.facts span { border: 1px solid #759075; border-radius: 999px; padding: 4px 11px; font-size: 12px; }
	.map-section { margin-top: 24px; overflow: hidden; border: 1px solid #b8a47f; border-radius: 12px; background: #f1e9d4; box-shadow: 0 12px 30px #241b1130; }
	.map-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 24px; color: #302b24; }
	.map-heading h2 { margin: 2px 0 0; font: 29px Georgia, serif; }
	.map-eyebrow { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #766c5b; }
	.map-toggle { padding: 9px 14px; border: 1px solid #8d7658; border-radius: 6px; background: #fff9e9; color: #3b3025; font-size: 13px; cursor: pointer; }
	.map-toggle:hover, .map-toggle[aria-pressed="true"] { background: #3c3a2e; color: #fff9e9; }
	.map-section figure { margin: 0; }
	.map-canvas { position: relative; overflow: hidden; }
	.map-canvas img { display: block; width: 100%; height: auto; }
	.map-marker { position: absolute; display: inline-flex; align-items: center; gap: 4px; transform: translate(-50%, -50%); white-space: nowrap; filter: drop-shadow(0 2px 4px #0009); }
	.marker-number { display: grid; place-items: center; min-width: 26px; height: 26px; padding: 0 4px; border: 2px solid #fcf1d2; border-radius: 50%; color: #fff9e9; background: #263d34; font: bold 12px Georgia, serif; }
	.marker-label { border: 1px solid #6b5336; border-radius: 4px; padding: 3px 6px; color: #2d241b; background: #f6e6bcf2; font: 12px Georgia, serif; }
	.secret-marker .marker-number { background: #5a342f; }
	.secret-marker .marker-label { border-color: #6f4b42; }
	.map-section figcaption { padding: 10px 24px 0; color: #51473a; font-size: 13px; }
	.map-section figcaption a { color: #405b4d; margin-left: 8px; text-decoration: underline; }
	.map-key { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px 22px; padding: 14px 24px 22px 44px; margin: 0; color: #302b24; }
	.map-key li { padding-left: 2px; font-size: 12px; }
	.map-key li + li { margin-top: 0; }
	.map-key strong { display: block; font-size: 13px; }
	.map-key span { display: block; color: #665d50; }
	.adventure-layout { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 28px; align-items: start; margin-top: 28px; }
	.story, .gm-content, .scenes { display: grid; gap: 18px; }
	.panel { background: #fffef8; border: 1px solid #d5daca; border-radius: 10px; padding: 25px; }
	h2 { font-size: 26px; margin: 0 0 14px; }
	h3 { font: 21px Georgia, serif; margin: 22px 0 8px; }
	h4 { font-size: 14px; margin: 20px 0 5px; }
	.panel p, .panel li { font-size: 14px; line-height: 1.7; }
	ul { padding-left: 22px; margin: 8px 0 0; }
	li + li { margin-top: 6px; }
	.read-aloud { border-left: 3px solid #8c7962; background: #f2eee4; padding: 14px 17px; font: italic 16px/1.65 Georgia, serif !important; margin: 0; }
	.gm-materials { border: 1px solid #d5daca; border-radius: 10px; overflow: hidden; }
	.gm-materials summary { display: flex; align-items: center; gap: 10px; background: #e5ecd9; padding: 16px 20px; color: #173d30; font-weight: 700; cursor: pointer; }
	.gm-materials summary span { margin-left: auto; color: #52614f; font-size: 12px; font-weight: 400; }
	.gm-content { padding: 18px; background: #f7f7f0; }
	.secret { border-color: #c5b89a; background: #f8f3e7; }
	.npc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
	.location-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
	.location-grid > div { border: 1px solid #e0d9c9; border-radius: 8px; padding: 14px; background: #faf8f0; }
	.location-grid h3 { margin-top: 0; }
	.location-use { color: #5b574d; }
	.npc-grid > div { border: 1px solid #e1e3d6; border-radius: 8px; padding: 14px; }
	.npc-grid h3 { margin-top: 0; }
	.npc-role { color: #5f6c60; margin: 0; }
	.npc-voice { color: #493c35; font-style: italic; }
	.handout { border-left: 3px solid #897156; padding: 12px 16px; background: #f3ede0; font-family: Georgia, serif; }
	.scenes > h2 { margin: 16px 0 0; }
	.scene h3 { margin-top: 0; font-size: 23px; }
	.scene ul { margin-bottom: 12px; }
	.panel .button { margin-top: 12px; }
	.guide { position: sticky; top: 20px; background: #edf0e1; border: 1px solid #d5daca; border-radius: 10px; padding: 22px; }
	.guide h2 { font-size: 22px; }
	.guide p { font-size: 13px; color: #52614f; }
	.tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 18px 0; }
	.tags span { padding: 3px 9px; border-radius: 999px; background: #fffef8; font-size: 11px; }
	.guide a { display: flex; align-items: center; gap: 8px; color: #173d30; font-size: 13px; padding: 8px 0; }
	@media (max-width: 850px) { .adventure-layout { grid-template-columns: 1fr; } .guide { position: static; } }
	@media (max-width: 700px) { .marker-label { display: none; } .marker-number { min-width: 23px; height: 23px; font-size: 11px; } .map-heading { align-items: flex-start; flex-direction: column; padding: 15px 16px; } .map-section figcaption { padding: 10px 16px 0; } .map-key { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 12px 16px 18px 34px; } }
	@media (max-width: 600px) { .adventure-page { padding: 24px 16px; } .adventure-heading { padding: 27px 22px; } .panel { padding: 20px; } .gm-content { padding: 12px; } .gm-materials summary { flex-wrap: wrap; } .gm-materials summary span { width: 100%; margin-left: 0; } }
</style>
