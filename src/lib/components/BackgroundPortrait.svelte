<script lang="ts">
	import { backgroundIllustration } from '$lib/ui/background-illustrations';
	let { backgroundId, name }: { backgroundId: string; name: string } = $props();
	const illustration = $derived(backgroundIllustration(backgroundId));
</script>

{#if illustration}
	<div class="background-portrait" role="img" aria-label={`Иллюстрация предыстории: ${name}`}>
		<img
			src={illustration.image}
			alt=""
			aria-hidden="true"
			class:panel-one={illustration.panel === 0}
			class:panel-two={illustration.panel === 1}
			class:panel-three={illustration.panel === 2}
			loading="lazy"
			decoding="async"
			width="1536"
			height="1024"
		/>
	</div>
{/if}

<style>
	.background-portrait { position: relative; width: min(100%, var(--panel-width, 150px)); aspect-ratio: 1 / 2; flex-shrink: 0; overflow: hidden; border: 1px solid #8e795b; border-radius: 80px 80px 3px 3px; background: #aaa293; }
	img { position: absolute; top: 0; left: 0; display: block; width: 300%; max-width: none; height: 100%; object-fit: fill; }
	.panel-two { transform: translateX(-33.333333%); }
	.panel-three { transform: translateX(-66.666667%); }
	@media print { .background-portrait { break-inside: avoid; } }
</style>
