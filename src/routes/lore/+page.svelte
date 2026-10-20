<script lang="ts">
import { KOSCHEI_MASKS } from '$lib/rules/book16-additions';
import ReferenceLibrary from '$lib/components/ReferenceLibrary.svelte';
import { LORE } from '$lib/rules/parma-library';
import { MASTERS_REFERENCE, RULERS_REFERENCE } from '$lib/rules/book16-reference-additions';
</script>
<ReferenceLibrary title="Лор" description="Знакомство с Пармой: от вступления и законов мира к народам, обычаям и легендам." readingOrder="lore" entries={[RULERS_REFERENCE, MASTERS_REFERENCE, ...KOSCHEI_MASKS, ...LORE]} />
