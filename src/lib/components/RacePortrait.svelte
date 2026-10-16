<script lang="ts">
  import { racePortrait } from '$lib/ui/race-portraits';
  let { raceId, name }: { raceId: string; name: string } = $props();
  const portrait = $derived(racePortrait(raceId));
</script>

{#if portrait}
  <div class="race-portrait">
    <img src={portrait} alt={`Представитель расы: ${name}`} width="1024" height="1536" decoding="async" />
  </div>
{/if}

<style>
  .race-portrait { width: 100%; align-self: start; overflow: hidden; border: 1px solid #8e795b; border-radius: 80px 80px 3px 3px; background: #aaa293; }
  img { display: block; width: 100%; height: auto; aspect-ratio: 2 / 3; object-fit: cover; }
  @media print { .race-portrait { break-inside: avoid; } }
</style>
