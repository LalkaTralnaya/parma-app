<script lang="ts">
import { KOSCHEI_MASKS, PERSONAL_STORY } from '$lib/rules/book16-additions';
import { NAVI_SHADOWS_REFERENCE } from '$lib/rules/book16-oct17-additions';
import { ROAD_EQUIPMENT_REFERENCE } from '$lib/rules/road-equipment-reference';
import ReferenceLibrary from '$lib/components/ReferenceLibrary.svelte';
import { BOOK16_CURRENT } from '$lib/rules/book16-current';
import { BOOK16_DRAFTS } from '$lib/rules/book16-drafts';
import { MECHANICS } from '$lib/rules/parma-library';
import { MECHANICS_INTRODUCTION } from '$lib/ui/reference-order';
</script>
<ReferenceLibrary title="Механики" description="От первых проверок и создания героя к развитию, бою, магии и особым правилам." readingOrder="mechanics" entries={[MECHANICS_INTRODUCTION, PERSONAL_STORY, NAVI_SHADOWS_REFERENCE, ...KOSCHEI_MASKS, ...ROAD_EQUIPMENT_REFERENCE, ...BOOK16_CURRENT, ...BOOK16_DRAFTS, ...MECHANICS.filter(e=>!['Действия в бою','Формулы для прокачки классический.','Формулы для прокачки нарративный, веха.'].includes(e.title))]} />
