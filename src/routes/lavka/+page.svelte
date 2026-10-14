<script lang="ts">
 import { onMount } from 'svelte';
 import { page } from '$app/state';
 import { listCharacters, getCharacter, saveCharacter } from '$lib/db/characters';
 import { ITEMS, CATEGORY_LABEL, type ItemCategory } from '$lib/rules/items';
 import { canAfford } from '$lib/engine/inventory';
 import { purchaseItem } from '$lib/engine/shop';
 import type { Character } from '$lib/type';
 let characters = $state<Character[]>([]);
 let selectedId = $state('');
 let loading = $state(true);
 let busy = $state(false);
 let error = $state('');
 let notice = $state('');
 let query = $state('');
 let category = $state<ItemCategory | 'all' | 'road'>('all');
 let bundles = $state(1);
 const selected = $derived(characters.find(c => c.id === selectedId));
 const filtered = $derived(ITEMS.filter(i => (category === 'all' || (category === 'road' ? Boolean(i.equipmentGroup) : i.category === category)) && `${i.name} ${i.description ?? ''}`.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru'))));
 function priceLabel(price: number) { const copper = Math.round(price * 100); const silver = Math.floor(copper / 100); const remainder = copper % 100; return silver ? `${silver} с.${remainder ? ` ${remainder} м.` : ''}` : `${copper} м.`; }
 async function load() {
  try {
   characters = await listCharacters();
   if (!characters.some(c => c.id === selectedId)) selectedId = characters.some(c => c.id === page.url.searchParams.get('character')) ? page.url.searchParams.get('character')! : characters[0]?.id ?? '';
  } catch { error = 'Не удалось загрузить персонажей. Попробуйте ещё раз.'; }
  finally { loading = false; }
 }
 onMount(() => { void load(); const refresh = () => { if (!busy) void load(); }; window.addEventListener('parma-cloud-sync', refresh); return () => window.removeEventListener('parma-cloud-sync', refresh); });
 async function buy(itemId: string) {
  if (busy || !selectedId) return;
  busy = true; error = ''; notice = '';
  const id = selectedId;
  try {
   const current = await getCharacter(id);
   if (!current) throw new Error('Персонаж не найден. Выберите другого.');
   const updated = purchaseItem(current, itemId, bundles);
   await saveCharacter(updated);
   characters = characters.map(c => c.id === id ? updated : c);
   const item = ITEMS.find(i => i.id === itemId)!;
   notice = `${updated.name || 'Безымянный'}: ${item.name} × ${(item.bundleQuantity ?? 1) * bundles} — ${item.contents ? 'состав добавлен отдельными предметами' : 'добавлено в инвентарь'}.`;
  } catch (cause) { error = cause instanceof Error ? cause.message : 'Не удалось сохранить покупку. Попробуйте ещё раз.'; }
  finally { busy = false; }
 }
</script>
<svelte:head><title>Лавка — Парма</title></svelte:head>
<main class="lavka">
 <header class="shop-heading"><span class="eyebrow">Снаряжение в дорогу</span><h1>Лавка</h1><p>Оружие, доспехи и припасы. Выберите героя: покупка списывает его монеты и пополняет инвентарь.</p></header>
 {#if loading}<p>Загружаем персонажей…</p>{:else}
 <section class="buyer" aria-label="Покупатель">
  {#if characters.length}
   <label>Покупатель<select bind:value={selectedId} disabled={busy} onchange={() => { notice = ''; error = ''; }}>{#each characters as character}<option value={character.id}>{character.name || 'Безымянный'}</option>{/each}</select></label>
   {#if selected}<div class="purse"><span>Кошель</span><strong>{selected.money?.gold ?? 0} златников · {selected.money?.silver ?? 0} серебряников · {selected.money?.copper ?? 0} медяков</strong><a href={`/char/${selected.id}#inventory`}>Открыть инвентарь →</a></div>{/if}
  {:else}<p>Для покупок нужен персонаж. <a href="/new">Создать персонажа →</a></p>{/if}
 </section>
 {/if}
 {#if error}<p class="feedback error" role="alert">{error}</p>{/if}
 {#if notice}<p class="feedback" role="status">{notice}</p>{/if}
 <div class="filters">
  <label>Поиск предметов<input type="search" bind:value={query} placeholder="Название или свойство" /></label>
  <label>Категория<select bind:value={category}><option value="all">Все предметы</option><option value="road">Дорожное и полезное снаряжение</option>{#each Object.entries(CATEGORY_LABEL) as [id, label]}<option value={id}>{label}</option>{/each}</select></label>
  <label>Количество упаковок<input type="number" min="1" max="99" step="1" bind:value={bundles} disabled={busy}/></label>
 </div>
 <p class="catalog-count">Предметов: {filtered.length} · 100 медяков = 1 серебряник · 100 серебряников = 1 златник</p>
 <div class="catalog">
 {#each filtered as item (item.id)}
  {@const priced = item.price !== undefined && Number.isFinite(item.price) && item.price >= 0}
  {@const quantityValid = Number.isSafeInteger(bundles) && bundles >= 1 && bundles <= 99}
  {@const total = (item.price ?? 0) * (quantityValid ? bundles : 1)}
  {@const affordable = selected && priced && quantityValid && canAfford(selected, total)}
  <article class="item-card">
   <span class="item-category">{item.equipmentGroup ?? CATEGORY_LABEL[item.category]}</span><h2>{item.name}</h2>
   {#if item.description}<p class="description">{item.description}</p>{/if}
   {#if item.useEffect && item.useEffect !== item.description}<p class="effect">{item.useEffect}</p>{/if}
   <div class="item-facts">{#if item.weight !== undefined}<span>Вес: {item.weight} пуд.</span>{/if}{#if (item.bundleQuantity ?? 1) > 1}<span>В упаковке: {item.bundleQuantity} шт.</span>{/if}</div>
   <div class="purchase"><strong>{priced ? priceLabel(total) : 'Цена не указана'}</strong><button onclick={() => buy(item.id)} disabled={busy || !affordable} aria-label={`Купить: ${item.name}`}>{busy ? 'Сохраняем…' : 'Купить'}</button></div>
   {#if selected && priced && quantityValid && !affordable}<small>Недостаточно денег</small>{/if}
  </article>
 {:else}<p>Таких предметов нет. Измените поиск или категорию.</p>{/each}
 </div>
</main>
<style>
 .lavka{max-width:1200px;margin:auto;padding:2rem 1.25rem 4rem}.shop-heading{max-width:720px;margin-bottom:1.75rem}.eyebrow,.item-category{text-transform:uppercase;letter-spacing:.08em;font-size:.75rem;opacity:.7}h1{font-size:2.8rem;margin:.25rem 0 .5rem}h2{font-size:1.3rem;margin:.45rem 0 .75rem}.buyer{border:1px solid var(--border,#7c8e79);border-radius:14px;padding:1.25rem;display:flex;gap:2rem;align-items:center;flex-wrap:wrap;margin-bottom:1rem;background:var(--surface,#f6f4ec)}label{display:flex;flex-direction:column;gap:.4rem;font-size:.9rem}input,select{border:1px solid var(--border,#7c8e79);border-radius:8px;padding:.65rem;background:var(--surface,#f6f4ec);color:inherit;min-width:0}.buyer select{min-width:220px}.purse{display:flex;flex-direction:column;gap:.35rem}.purse span{font-size:.8rem;opacity:.7}a{text-decoration:underline}.filters{display:grid;grid-template-columns:2fr 1fr 1fr;gap:1rem;margin-top:1.5rem}.catalog-count{font-size:.8rem;opacity:.7;margin:1rem 0}.catalog{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.item-card{border:1px solid var(--border,#7c8e79);border-radius:14px;padding:1.25rem;display:flex;flex-direction:column;background:var(--surface,#f6f4ec)}.description,.effect{font-size:.9rem;margin:0 0 .75rem}.item-facts{display:flex;gap:.75rem;flex-wrap:wrap;font-size:.8rem;opacity:.75;margin-bottom:1rem}.purchase{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:1rem}.purchase strong{font-size:.95rem}button{padding:.55rem .9rem;border-radius:8px;background:#254d3a;color:#fff;border:1px solid #254d3a;cursor:pointer}button:disabled{opacity:.45;cursor:not-allowed}small{margin-top:.5rem;opacity:.7}.feedback{padding:.85rem 1rem;border:1px solid #648567;border-radius:8px}.error{border-color:#b87756}@media(max-width:900px){.catalog{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.catalog,.filters{grid-template-columns:1fr}.buyer{gap:1rem}.buyer select{width:100%}.buyer label{width:100%}.lavka{padding:1.25rem .8rem 3rem}h1{font-size:2.2rem}}
</style>
