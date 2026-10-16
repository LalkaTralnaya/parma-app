<script lang="ts">
  let { scene, label, width = 168 }: {
    scene: 'forge' | 'road' | 'spirit';
    label: string;
    width?: number;
  } = $props();
</script>

<div class="story-panel" data-scene={scene} role="img" aria-label={label} style={`--panel-width: ${width}px`}>
  <img src="/art/story-panels.jpg" alt="" aria-hidden="true" loading="lazy" decoding="async" width="1536" height="1024" />
</div>

<style>
  .story-panel { position: relative; width: min(100%, var(--panel-width)); aspect-ratio: 1 / 2; flex-shrink: 0; overflow: hidden; border-radius: 100px 100px 3px 3px; background: #aaa293; border: 1px solid #8e795b; }
  img { position: absolute; left: 0; top: 0; display: block; width: 300%; max-width: none; height: 100%; object-fit: fill; }
  [data-scene='road'] img { transform: translateX(-33.333333%); }
  [data-scene='spirit'] img { transform: translateX(-66.666667%); }
  @media print { .story-panel { break-inside: avoid; } }
</style>
