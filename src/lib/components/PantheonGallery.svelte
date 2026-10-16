<script lang="ts">
  import type { LibraryBlock } from '$lib/rules/parma-library';
  import ReferenceBlocks from './ReferenceBlocks.svelte';

  let { blocks, expanded = false }: { blocks: LibraryBlock[]; expanded?: boolean } = $props();

  const portraits: Record<string, { id: string; name: string; alt: string }> = {
    РОД: { id: 'rod', name: 'Род', alt: 'Прародитель с колом вечного круговорота среди корней и звёзд' },
    ЛАДА: { id: 'lada', name: 'Лада', alt: 'Лада с тканой лентой среди цветущих ветвей и голубей' },
    ВЕЛЕС: { id: 'veles', name: 'Велес', alt: 'Мудрый Велес с посохом и гуслями у лесных корней' },
    СВАРОГ: { id: 'svarog', name: 'Сварог', alt: 'Небесный кузнец Сварог у наковальни, искры которой становятся звёздами' },
    МОРЕНА: { id: 'morena', name: 'Морена', alt: 'Морена с зеркалом среди обнажённых зимних ветвей' },
    ПЕРУН: { id: 'perun', name: 'Перун', alt: 'Перун с секирой и щитом под молниями у древнего дуба' },
    ДАЖДЬБОГ: { id: 'dazhdbog', name: 'Даждьбог', alt: 'Даждьбог с колосьями и солнечным колесом над полями' },
    ЯРИЛО: { id: 'yarilo', name: 'Ярило', alt: 'Ярило в венке среди весенних побегов и птиц' },
    СТРИБОГ: { id: 'stribog', name: 'Стрибог', alt: 'Стрибог в развевающемся плаще среди ветров, облаков и птиц' },
    ХОРС: { id: 'khors', name: 'Хорс', alt: 'Хорс оберегает светильник под бледным зимним солнцем' },
    ЧЕРНОБОГ: { id: 'chernobog', name: 'Чернобог', alt: 'Тёмный силуэт Чернобога среди увядших ветвей под угасшим солнцем' }
  };

  const sections = $derived.by(() => {
    const intro: LibraryBlock[] = [];
    const gods: { portrait: (typeof portraits)[string]; subtitle: string; blocks: LibraryBlock[] }[] = [];
    const after: LibraryBlock[] = [];
    let current: (typeof gods)[number] | undefined;
    let ended = false;
    for (const block of blocks) {
      if (block.kind === 'paragraph' && block.level) {
        const separator = block.text.indexOf(':');
        const key = block.text.slice(0, separator).trim().toLocaleUpperCase('ru');
        if (separator > 0 && portraits[key]) {
          current = { portrait: portraits[key], subtitle: block.text.slice(separator + 1).trim(), blocks: [] };
          gods.push(current);
          continue;
        }
        if (current) { ended = true; current = undefined; }
      }
      if (ended) after.push(block);
      else if (current) current.blocks.push(block);
      else intro.push(block);
    }
    return { intro, gods, after };
  });
</script>

<div class="pantheon">
  <div class="pantheon-intro"><ReferenceBlocks blocks={sections.intro} /></div>
  <div class="deity-grid">
    {#each sections.gods as god (god.portrait.id)}
      <article class="deity-card" aria-labelledby={`deity-${god.portrait.id}`}>
        <div class="deity-overview">
          <a class="deity-art" href={`/art/pantheon/${god.portrait.id}.jpg`} target="_blank" rel="noreferrer" aria-label={`Рассмотреть панно: ${god.portrait.name}`}>
            <img class="deity-portrait" src={`/art/pantheon/${god.portrait.id}.jpg`} alt={god.portrait.alt} loading="lazy" decoding="async" width="1024" height="1536" />
          </a>
          <div class="deity-copy">
            <h3 id={`deity-${god.portrait.id}`}>{god.portrait.name}</h3>
            <p class="deity-domain">{god.subtitle}</p>
            {#if god.blocks[0]?.kind === 'paragraph'}<blockquote>{god.blocks[0].text}</blockquote>{/if}
          </div>
        </div>
        <details class="deity-details" open={expanded}>
          <summary>Почитание, дары и слабости <svg class="disclosure" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16m-6-6 6 6 6-6" /></svg></summary>
          <ReferenceBlocks blocks={god.blocks.slice(1)} />
        </details>
      </article>
    {/each}
  </div>
  {#if sections.after.length}<div class="pantheon-after"><ReferenceBlocks blocks={sections.after} /></div>{/if}
</div>

<style>
  .pantheon { color: #2c3b31; }
  .pantheon-intro { max-width: 76ch; margin: 0 auto 1.8rem; line-height: 1.75; }
  .deity-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 1.3rem; }
  .deity-card { min-width: 0; padding: 1.1rem; border: 1px solid #b6a07c; border-radius: 3px; background: linear-gradient(125deg, #fff9eb, #eee2c9); box-shadow: inset 0 0 0 4px #fff8e855, 0 3px 9px #57492c0d; }
  .deity-overview { display: grid; grid-template-columns: 36% minmax(0, 1fr); align-items: start; gap: 1.1rem; }
  .deity-portrait { display: block; width: 100%; height: auto; aspect-ratio: 2 / 3; object-fit: cover; border: 1px solid #7f7059; border-radius: 90px 90px 3px 3px; background: #a79e8b; }
  .deity-art { display: block; cursor: zoom-in; border-radius: 90px 90px 3px 3px; }
  .deity-art:focus-visible { outline: 2px solid #856b47; outline-offset: 4px; }
  h3 { margin: .5rem 0 .4rem; font-family: Georgia, 'Times New Roman', serif; font-size: 1.8rem; font-weight: 500; line-height: 1.15; color: #294637; }
  .deity-domain { font-size: .78rem; line-height: 1.5; color: #855d3e; }
  blockquote { margin: .85rem 0 0; font-size: .85rem; line-height: 1.7; color: #4e5144; }
  .deity-details { margin-top: 1.1rem; padding-top: .8rem; border-top: 1px solid #b6a07c80; }
  summary { display: flex; justify-content: space-between; align-items: center; gap: .75rem; cursor: pointer; list-style: none; font-size: .85rem; color: #344e3b; }
  summary::-webkit-details-marker { display: none; }
  summary:hover { color: #7d3c32; }
  summary:focus-visible { outline: 2px solid #856b47; outline-offset: 5px; }
  .disclosure { width: 20px; height: 20px; flex-shrink: 0; }
  details[open] .disclosure { transform: rotate(180deg); }
  .deity-details :global(.book-blocks) { font-size: .88rem; line-height: 1.75; }
  .pantheon-after { margin-top: 1.8rem; padding-top: .5rem; border-top: 1px solid #b6a07c; line-height: 1.75; }
  @media (max-width: 950px) { .deity-grid { grid-template-columns: 1fr; } .deity-overview { grid-template-columns: minmax(110px, 170px) minmax(0, 1fr); } }
  @media (max-width: 480px) { .deity-card { padding: .8rem; } .deity-overview { grid-template-columns: 30% minmax(0, 1fr); gap: .8rem; } h3 { margin-top: .2rem; font-size: 1.5rem; } blockquote { font-size: .8rem; line-height: 1.6; } .deity-domain { font-size: .73rem; } }
  @media print { .deity-card { break-inside: avoid; box-shadow: none; } }
</style>
