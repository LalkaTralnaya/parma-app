<script lang="ts">
import { KOSCHEI_MASKS, PERSONAL_STORY } from '$lib/rules/book16-additions';
import { ROAD_EQUIPMENT_REFERENCE } from '$lib/rules/road-equipment-reference';
import ReferenceLibrary from '$lib/components/ReferenceLibrary.svelte';
import { BOOK16_CURRENT } from '$lib/rules/book16-current';
import { BOOK16_DRAFTS } from '$lib/rules/book16-drafts';
import { MECHANICS } from '$lib/rules/parma-library';
</script>
<ReferenceLibrary title="Механики" description="Правила Пармы по разделам: проверки, бой, магия, состояния, экономика и ремесло." entries={[PERSONAL_STORY, ...KOSCHEI_MASKS, ...ROAD_EQUIPMENT_REFERENCE, ...BOOK16_CURRENT, ...BOOK16_DRAFTS, ...MECHANICS.filter(e=>!['Действия в бою','Формулы для прокачки классический.','Формулы для прокачки нарративный, веха.'].includes(e.title))]} />
