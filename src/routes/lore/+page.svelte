<script lang="ts">
import { KOSCHEI_MASKS } from '$lib/rules/book16-additions';
import ReferenceLibrary from '$lib/components/ReferenceLibrary.svelte';
import { LORE } from '$lib/rules/parma-library';
</script>
<ReferenceLibrary title="Лор" description="Мир Пармы, Жива, народы, пантеон и законы Кона." entries={[...KOSCHEI_MASKS, ...LORE]} />
