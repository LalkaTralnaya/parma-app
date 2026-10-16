<script lang="ts">
  import { conditionArtIndices } from '$lib/ui/condition-art';
  let { id = '', name = '', size = 40 }: { id?: string; name?: string; size?: number } = $props();
  const indices = $derived(conditionArtIndices(id, name));
</script>

{#if indices.length}
  <span class="condition-art" aria-hidden="true">
    {#each indices as index}
      <span class="condition-medallion" style={`width:${size}px;height:${size}px;background-position:${(index % 4) * 100 / 3}% ${Math.floor(index / 4) * 100 / 3}%`}></span>
    {/each}
  </span>
{/if}

<style>
  .condition-art { display: inline-flex; gap: 3px; flex: 0 0 auto; vertical-align: middle; line-height: 0; }
  .condition-medallion { display: inline-block; flex: 0 0 auto; background-image: url('/art/conditions-medallions.jpg'); background-size: 400% 400%; border-radius: 50%; box-shadow: 0 0 0 1px #8b755747; }
  @media print { .condition-medallion { print-color-adjust: exact; } }
</style>
