<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import CharacterPrint from '$lib/components/CharacterPrint.svelte';
  import { createEmptyCharacter } from '$lib/db/characters';
  import type { Character } from '$lib/type';
  let character = $state<Character | null>(null);
  onMount(() => { character = createEmptyCharacter(); });
</script>
<svelte:head><title>Пустой лист персонажа — Парма</title></svelte:head>
<main class="character-sheet print-preview">
  {#if character}<CharacterPrint {character} preview={true} blank={true} onclose={() => goto('/characters')} />{:else}<p>Подготавливаем бланк…</p>{/if}
</main>
