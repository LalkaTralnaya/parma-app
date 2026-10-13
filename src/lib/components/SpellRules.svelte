<script lang="ts">
  import { playerText } from '$lib/ui/player-copy';
  let { text }: { text: string } = $props();
  type Block = { kind: 'table'; rows: string[][] } | { kind: 'paragraph'; text: string };
  const blocks = $derived.by(() => {
    const result: Block[] = [];
    let paragraph: string[] = [];
    const flush = () => { if (paragraph.length) { result.push({ kind: 'paragraph', text: paragraph.join('\n') }); paragraph = []; } };
    for (const raw of playerText(text).split(/\r?\n/)) {
      const line = raw.trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        flush();
        const cells = line.slice(1, -1).split('|').map(cell => cell.trim());
        if (cells.every(cell => /^:?-{2,}:?$/.test(cell))) continue;
        if (cells[0] === 'Поле' && cells[1] === 'Условия') continue;
        const previous = result[result.length - 1];
        if (previous?.kind === 'table') previous.rows.push(cells);
        else result.push({ kind: 'table', rows: [cells] });
      } else if (!line) flush();
      else paragraph.push(line);
    }
    flush();
    return result;
  });
</script>

{#snippet inline(value: string)}
  {#each value.split(/(\*\*[^*]+\*\*)/g) as part}
    {#if part.startsWith('**') && part.endsWith('**')}<strong>{part.slice(2, -2)}</strong>{:else}{part}{/if}
  {/each}
{/snippet}

<div class="spell-rules">
  {#each blocks as block}
    {#if block.kind === 'table'}
      <div class="rule-table"><table><caption class="sr-only">Условия заклинания</caption><tbody>
        {#each block.rows as row}<tr><th scope="row">{@render inline(row[0] ?? '')}</th><td>{@render inline(row.slice(1).join(' · '))}</td></tr>{/each}
      </tbody></table></div>
    {:else}
      <p>{@render inline(block.text)}</p>
    {/if}
  {/each}
</div>

<style>
  .spell-rules { font-size: 14px; line-height: 1.7; overflow-wrap: anywhere; }
  .spell-rules p { margin: 14px 0; white-space: pre-line; }
  .rule-table { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; background: transparent; }
  th, td { padding: 10px 12px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--decay-border, #d5daca); }
  th { width: 28%; font-weight: 600; }
  @media (max-width: 600px) { th, td { padding: 8px 6px; } th { width: 34%; } }
</style>
