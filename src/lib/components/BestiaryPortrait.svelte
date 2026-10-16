<script lang="ts">
  import { BESTIARY_ART } from '$lib/ui/bestiary-art';
  let { id, eager = false }: { id: string; eager?: boolean } = $props();
  const illustration = $derived(BESTIARY_ART[id]);
</script>

{#if illustration}
  <img src={illustration.src} alt={illustration.alt} width="768" height="512" loading={eager ? 'eager' : 'lazy'} decoding="async" />
{/if}

<style>
  img { display: block; width: 100%; height: auto; aspect-ratio: 3 / 2; object-fit: cover; background: #d9c8a6; }
  @media print { img { break-inside: avoid; } }
</style>
