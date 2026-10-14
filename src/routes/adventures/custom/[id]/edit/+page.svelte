<script lang="ts">import { page } from '$app/state';import AdventureEditor from '$lib/components/AdventureEditor.svelte';</script>
{#key page.params.id}<AdventureEditor id={page.params.id}/>{/key}
