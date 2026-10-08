<script lang="ts">
	import { page } from '$app/state';
	import { BESTIARY, BESTIARY_SECTIONS, getMonsterSection } from '$lib/rules/bestiary';
	import { BESTIARY_HABITATS, getMonsterHabitats, filterBestiary } from '$lib/rules/bestiary-habitats';
	import { scaleMonster, type ScaledMonster } from '$lib/engine/bestiary';
	import Dialog from '$lib/components/Dialog.svelte';
	import Icon from '$lib/components/Icon.svelte';
	const initialMonster = BESTIARY.find(monster => monster.id === page.url.searchParams.get('monster'));
	let selectedId = $state(initialMonster?.id ?? '');
	let targetLevel = $state(initialMonster?.baseLevel ?? 1);
	let scaled = $state<ScaledMonster | null>(initialMonster ? scaleMonster(initialMonster,initialMonster.baseLevel) : null);
	let habitatId = $state('all');
	let categoryId = $state('all');
	let levelRange = $state('all');
	let searchQuery = $state('');
	const selectedMonster = $derived(BESTIARY.find(monster => monster.id === selectedId));
	const visibleMonsters = $derived(filterBestiary({ habitat:habitatId, type:categoryId, query:searchQuery, level:levelRange }).sort((a,b) => a.baseLevel-b.baseLevel || a.name.localeCompare(b.name,'ru')));
	const habitatCounts = Object.fromEntries(BESTIARY_HABITATS.map(habitat => [habitat.id, BESTIARY.filter(monster => getMonsterHabitats(monster.id).some(entry => entry.id === habitat.id)).length]));
	const visibleGroups = $derived(BESTIARY_HABITATS.filter(habitat => habitatId === 'all' || habitat.id === habitatId).map(habitat => ({ ...habitat, monsters:visibleMonsters.filter(monster => habitatId === 'all' ? getMonsterHabitats(monster.id)[0]?.id === habitat.id : true) })).filter(group => group.monsters.length));
	function resetFilters() { habitatId='all';categoryId='all';levelRange='all';searchQuery=''; }
	function chooseMonster(id:string) {
		const base=BESTIARY.find(monster => monster.id===id);
		if(!base)return;
		selectedId=id;targetLevel=base.baseLevel;scaled=scaleMonster(base,base.baseLevel);
	}
	function closeMonster(){scaled=null;selectedId='';}
	function generate(){if(!selectedMonster)return;scaled=scaleMonster(selectedMonster,Math.min(20,targetLevel));targetLevel=scaled.level;}
	function statLabel(stat:string):string { return ({strength:'СИЛ',dexterity:'ЛОВ',intelligence:'ИНТ',eloquence:'КРА',religion:'РЕЛ'} as Record<string,string>)[stat] ?? stat; }
	function modSign(value:number):string { return value>=0?'+'+value:String(value); }
	function modS(value:number):string { return modSign(value); }
	async function copyToClipboard() {
		if (!scaled) return;
		const s = scaled;
		const mods = Object.entries(s.scaledMods)
			.map(([k, v]) => `${statLabel(k)}: ${v * 6} (${modS(v as number)})`)
			.join('\n');
		const attacks = s.scaledAttacks
			.map((a) => `${a.name}: ${a.ignoresArmor ? 'проверка' : 'попадание'} ${statLabel(a.attackStat)} ≤ ${a.hitTarget}${a.damageDice !== '0' ? `, урон ${a.damageDice}${a.damageModifier ? ' ' + modS(a.damageModifier) : ''}${(a.extraDamageDice ?? []).map((dice) => ` + ${dice}`).join('')} ${a.damageType}` : ''}${a.notes ? ' (' + a.notes + ')' : ''}${a.save ? `; Избавление: ${a.save}` : ''}`)
			.join('\n');
		const text = `${s.base.name} (уровень ${s.level}, +${s.levelsGained} от базового)\nЗДР: ${s.scaledHp}\nБроня: ${s.scaledArmor}\nСкорость: ${s.base.movement ?? `${s.base.speed} саженей`}\n\nХарактеристики:\n${mods}\n\nАтаки:\n${attacks}\n\nУмения:\n${s.base.traits.join('\n')}`;
		try {
			await navigator.clipboard.writeText(text);
			alert('Скопировано в буфер обмена');
		} catch {
			alert(text);
		}
	}

</script>
<svelte:head><title>Бестиарий — Парма</title></svelte:head>
<main class="bestiary-page max-w-6xl mx-auto p-6 space-y-6">
  <header class="flex items-start justify-between gap-4 flex-wrap">
    <div><p class="eyebrow">Справочник Сказителя</p><h1 class="text-4xl font-bold">Бестиарий</h1><p class="text-gray-600 mt-2">Выберите местность и найдите противника для следующей встречи.</p></div>
    <a href="/gm/combat" class="button"><Icon name="sword" size={18} />К боевому трекеру</a>
  </header>
  <section class="filters" aria-label="Фильтры бестиария">
    <label class="search-label"><span>Найти существо</span><input type="search" bind:value={searchQuery} placeholder="Название, описание или местность" /></label>
    <label><span>Тип существа</span><select bind:value={categoryId}><option value="all">Все типы</option>{#each BESTIARY_SECTIONS as section}<option value={section.id}>{section.name}</option>{/each}</select></label>
    <label><span>Базовый уровень</span><select bind:value={levelRange}><option value="all">Все уровни</option><option value="1-3">1–3</option><option value="4-6">4–6</option><option value="7-10">7–10</option><option value="11-99">11 и выше</option></select></label>
  </section>
  <nav class="habitat-tabs" aria-label="Местность">
    <button class:active={habitatId === 'all'} aria-pressed={habitatId === 'all'} onclick={() => habitatId = 'all'}>Вся местность <span>{BESTIARY.length}</span></button>
    {#each BESTIARY_HABITATS as habitat}<button class:active={habitatId === habitat.id} aria-pressed={habitatId === habitat.id} onclick={() => habitatId = habitat.id}><Icon name={habitat.icon} size={17} />{habitat.name}<span>{habitatCounts[habitat.id]}</span></button>{/each}
  </nav>
  <div class="catalogue-count"><p role="status">Найдено существ: <strong>{visibleMonsters.length}</strong></p>{#if habitatId !== 'all' || categoryId !== 'all' || levelRange !== 'all' || searchQuery}<button class="reset-filters" onclick={resetFilters}>Сбросить фильтры</button>{/if}</div>
  {#each visibleGroups as group (group.id)}
    <section aria-labelledby={'habitat-' + group.id} class="habitat-group">
      <header class="group-heading"><div><h2 id={'habitat-' + group.id}>{group.name} <span>{group.monsters.length}</span></h2><p>{group.description}</p></div><Icon name={group.icon} size={26} /></header>
      <div class="monster-grid">
        {#each group.monsters as monster (monster.id)}
          <article class="monster-card" aria-labelledby={'monster-' + monster.id}>
            <div class="card-type"><span>{getMonsterSection(monster.id)?.name}</span><span class="level-badge">Ур. {monster.dangerLabel}</span></div>
            <h3 id={'monster-' + monster.id}>{monster.name}</h3>
            {#if monster.source === 'custom'}<p class="custom-label">Авторское существо</p>{/if}
            <p class="card-description">{monster.description}</p>
            <dl class="card-stats"><div><dt>Здравие</dt><dd>{monster.hp}</dd></div><div><dt>Броня</dt><dd>{monster.armor}</dd></div><div><dt>Скорость</dt><dd>{monster.speed}<small> саж.</small></dd></div></dl>
            <div class="card-habitats">{#each getMonsterHabitats(monster.id) as habitat}<span>{habitat.name}</span>{/each}</div>
            <p class="card-attack"><Icon name="sword" size={16} />{monster.attacks[0]?.name ?? 'Особые действия'}</p>
            <button class="card-open" aria-label={'Открыть карточку: ' + monster.name} onclick={() => chooseMonster(monster.id)}>Открыть карточку <Icon name="arrow" size={18} /></button>
          </article>
        {/each}
      </div>
    </section>
  {:else}
    <div class="empty-catalogue"><Icon name="search" size={32} /><h2>Существа не найдены</h2><p>Измените запрос или снимите часть фильтров.</p><button class="button" onclick={resetFilters}>Показать весь бестиарий</button></div>
  {/each}
  <p class="habitat-note">Местность показывает возможные места встреч. Сказитель может разместить существо в другой локации, если это подходит истории.</p>

  {#if scaled}
    <Dialog label={'Карточка противника: ' + scaled.base.name} onclose={closeMonster} wide>
      <div class="detail-toolbar"><div><p class="eyebrow">Карточка противника</p><h2>{scaled.base.name}</h2></div><button aria-label="Закрыть карточку" class="detail-close" onclick={closeMonster}>✕</button></div>
      <p class="text-sm text-gray-600 mb-3">{scaled.base.description}</p>
      <div class="card-habitats mb-4">{#each getMonsterHabitats(scaled.base.id) as habitat}<span>{habitat.name}</span>{/each}</div>
      <div class="level-controls"><label for="monster-level">Целевой уровень<input id="monster-level" type="number" min={selectedMonster?.baseLevel ?? 1} max="20" bind:value={targetLevel} /></label><button class="button primary" onclick={generate}>Создать противника</button></div>

		<section class="border-2 border-red-300 rounded-lg p-5 bg-red-50">
			<div class="flex justify-between items-start mb-4 flex-wrap gap-2">
				<div>
					<h3 class="text-lg font-bold">Характеристики противника</h3>
					<div class="text-sm text-gray-600">{getMonsterSection(scaled.base.id)?.name}{scaled.base.source === 'custom' ? ' · авторская карточка' : ''}</div>
					<div class="text-sm text-gray-600">
						Уровень {scaled.level}
						{#if scaled.levelsGained > 0}
							· масштабирован от базового {scaled.base.baseLevel} (+{scaled.levelsGained})
						{:else}
							· базовый уровень
						{/if}
					</div>
				</div>
				<button
					class="px-3 py-1.5 text-sm border rounded bg-white hover:bg-gray-50"
					onclick={copyToClipboard}>📋 Скопировать</button>
			</div>

			<!-- ЗДР / Броня / Скорость -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
				<div class="border rounded-lg p-3 bg-white text-center">
					<div class="text-xs uppercase text-gray-500">Здравие</div>
					<div class="text-2xl font-bold">{scaled.scaledHp}</div>
					{#if scaled.levelsGained > 0}
						<div class="text-xs text-gray-500">
							базовая {scaled.base.hp} + [{scaled.hpRolls.join(', ')}] + мод. {statLabel(scaled.base.hpStat ?? 'strength')} {modSign(scaled.base.baseMods[scaled.base.hpStat ?? 'strength'])} × {scaled.levelsGained}
						</div>
					{/if}
				</div>
				<div class="border rounded-lg p-3 bg-white text-center">
					<div class="text-xs uppercase text-gray-500">Броня</div>
					<div class="text-2xl font-bold">{scaled.scaledArmor}</div>
					{#if scaled.levelsGained > 0}
						<div class="text-xs text-gray-500">не растёт от уровня</div>
					{/if}
				</div>
				<div class="border rounded-lg p-3 bg-white text-center">
					<div class="text-xs uppercase text-gray-500">Скорость</div>
					<div class="text-lg font-bold">{scaled.base.movement ?? `${scaled.base.speed} саженей`}</div>
				</div>
			</div>

			<!-- Модификаторы -->
			<div class="border rounded-lg p-4 bg-white mb-4">
				<h3 class="font-semibold mb-2">Характеристики</h3>
				<div class="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
					{#each Object.entries(scaled.scaledMods) as [key, value]}
						<div class="border rounded p-2 {key === scaled.base.primaryStat && scaled.levelsGained > 0 ? 'bg-green-50 border-green-400' : ''}">
							<div class="text-xs uppercase text-gray-500">
								{key === 'strength' ? 'СИЛ' :
								 key === 'intelligence' ? 'ИНТ' :
								 key === 'dexterity' ? 'ЛОВ' :
								 key === 'eloquence' ? 'КРА' : 'РЕЛ'}
							</div>
							<div class="text-xl font-bold">{(value as number) * 6}</div>
							<div class="text-xs text-gray-500">мод. {modSign(value as number)}</div>
							{#if key === scaled.base.primaryStat && scaled.levelsGained > 0}
								<div class="text-xs text-green-700">+{scaled.levelsGained}</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Атаки -->
			<div class="border rounded-lg p-4 bg-white mb-4">
				<h3 class="font-semibold mb-2">Атаки</h3>
				<div class="space-y-2">
					{#each scaled.scaledAttacks as atk}
						<div class="border-b pb-2 last:border-b-0">
							<div class="font-medium">{atk.name}</div>
							<div class="text-sm text-gray-600">
								{atk.ignoresArmor ? 'Проверка' : 'Попадание'} {statLabel(atk.attackStat)}:
								{scaled.scaledMods[atk.attackStat] * 6} + {scaled.scaledMods[atk.attackStat]}
								{#if atk.attackBonus} + {atk.attackBonus}{/if}
								= ≤ <span class="font-bold">{atk.hitTarget}</span>
							</div>
							{#if atk.damageDice !== '0'}
								<div class="text-sm text-gray-600">
									Урон: <span class="font-bold">{atk.damageDice}{atk.damageModifier ? ` ${modSign(atk.damageModifier)}` : ''}{#each atk.extraDamageDice ?? [] as dice} + {dice}{/each}</span>
									{atk.damageType}
								</div>
							{/if}
							{#if atk.notes}
								<div class="text-xs text-gray-500">{atk.notes}</div>
							{/if}
							{#if atk.save}
								<div class="text-xs text-gray-500">Избавление: {atk.save}</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Умения -->
			<div class="border rounded-lg p-4 bg-white">
				<h3 class="font-semibold mb-2">Особенности</h3>
				<ul class="text-sm space-y-1 list-disc list-inside">
					{#each scaled.base.traits as t}
						<li>{t}</li>
					{/each}
				</ul>
				{#if scaled.base.resistance}
					<div class="mt-2 text-sm">
						<span class="text-gray-500">Сопротивление:</span> {scaled.base.resistance}
					</div>
				{/if}
				{#if scaled.base.weakness}
					<div class="mt-1 text-sm text-red-700">
						<span class="text-gray-500">Уязвимость:</span> {scaled.base.weakness}
					</div>
				{/if}
			</div>
		</section>
    </Dialog>
  {/if}
</main>
<style>
.eyebrow { color:#6d795e; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; margin-bottom:5px; }
.filters { display:grid; grid-template-columns:minmax(220px,2fr) 1fr 1fr; gap:16px; }
.filters label { display:grid; gap:6px; font-size:13px; font-weight:600; }
.filters input,.filters select { width:100%; padding:10px 12px; border:1px solid #bdc8b5; border-radius:7px; }
.habitat-tabs { display:flex; flex-wrap:wrap; gap:8px; }
.habitat-tabs button { display:flex; align-items:center; gap:7px; padding:8px 12px; border:1px solid #c7d0bd; border-radius:7px; background:#fffef8; font-size:13px; }
.habitat-tabs button span { font-size:11px; opacity:.7; }
.habitat-tabs button.active { background:#24543c; color:white; border-color:#24543c; }
.catalogue-count { display:flex; gap:16px; justify-content:space-between; align-items:center; font-size:13px; color:#5f6c60; }
.reset-filters { color:#24543c; text-decoration:underline; }
.group-heading { display:flex; align-items:center; justify-content:space-between; margin:28px 0 14px; gap:16px; }
.group-heading h2 { font-size:25px; font-weight:700; }
.group-heading h2 span { font-family:'Segoe UI',sans-serif; font-size:12px; font-weight:500; color:#6d795e; margin-left:8px; }
.group-heading p { color:#6d795e; font-size:13px; margin-top:4px; }
.monster-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
.monster-card { display:flex; flex-direction:column; padding:22px; border:1px solid #c4cbbb; border-top:3px solid #71865d; border-radius:9px; background:#fffef9; box-shadow:0 3px 12px #263e3006; }
.card-type { display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:10px; color:#6d795e; }
.level-badge { flex-shrink:0; background:#ecf0e1; color:#435538; padding:3px 7px; border-radius:5px; font-weight:700; }
.monster-card h3 { font-family:Georgia,serif; font-size:23px; font-weight:700; line-height:1.3; margin:12px 0 8px; color:#173d30; }
.custom-label { font-size:11px; color:#7c643b; margin-bottom:5px; }
.card-description { font-size:13px; line-height:1.65; color:#596750; margin-bottom:16px; }
.card-stats { display:grid; grid-template-columns:repeat(3,1fr); border-top:1px solid #e1e3d6; border-bottom:1px solid #e1e3d6; padding:12px 0; gap:6px; margin-top:auto; }
.card-stats dt { color:#6d795e; font-size:10px; }
.card-stats dd { font-size:23px; font-weight:700; color:#24392d; }
.card-stats small { font-size:10px; font-weight:400; }
.card-habitats { display:flex; flex-wrap:wrap; gap:5px; margin-top:12px; }
.card-habitats span { font-size:10px; padding:2px 6px; border-radius:4px; background:#f0f1e7; color:#627157; }
.card-attack { display:flex; align-items:center; gap:7px; font-size:12px; margin:12px 0; color:#5f6c60; }
.card-open { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 0 0; border-top:1px solid #e1e3d6; color:#24543c; font-size:13px; font-weight:700; }
.card-open:hover { color:#a66a23; }
.empty-catalogue { display:grid; justify-items:center; gap:12px; text-align:center; padding:60px 20px; border:1px dashed #bdc8b5; border-radius:9px; }
.empty-catalogue h2 { font-size:26px; }
.empty-catalogue p,.habitat-note { font-size:13px; color:#6d795e; }
.detail-toolbar { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:12px; }
.detail-toolbar h2 { font-size:28px; font-weight:700; }
.detail-close { min-width:44px; padding:8px; border:1px solid #c7d0bd; border-radius:6px; }
.level-controls { display:flex; align-items:end; gap:12px; flex-wrap:wrap; margin:16px 0; }
.level-controls label { display:grid; gap:5px; font-size:13px; font-weight:600; }
.level-controls input { width:130px; padding:8px 10px; border:1px solid #bdc8b5; border-radius:6px; }
@media(max-width:1000px) { .monster-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media(max-width:600px) { .filters,.monster-grid { grid-template-columns:1fr; } .bestiary-page h1 { font-size:32px; } .monster-card { padding:18px; } .habitat-tabs button { font-size:12px; } }

</style>
