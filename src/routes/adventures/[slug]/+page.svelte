<script lang="ts">import AdventureContent from "$lib/components/AdventureContent.svelte";import type { PageData } from "./$types";let { data }: { data:PageData }=$props();</script>
{#key data.adventure.slug}<AdventureContent adventure={data.adventure}/>{/key}
