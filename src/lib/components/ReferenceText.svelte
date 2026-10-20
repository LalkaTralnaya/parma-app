<script lang="ts">
  import { readingLabel } from '$lib/ui/reference-reading';
  let { text }: { text: string } = $props();
  const parts = $derived(readingLabel(text));
</script>
{#if parts.label}<strong>{parts.label}</strong>{' '}{/if}{parts.text}
