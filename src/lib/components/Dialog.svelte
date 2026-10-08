<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  let { label, onclose, children, wide = false }: { wide?: boolean; label: string; onclose: () => void; children: Snippet } = $props();
  let dialog: HTMLDialogElement;
  onMount(() => {
    dialog.showModal();
    return () => dialog.close();
  });
</script>
<dialog class:wide bind:this={dialog} aria-label={label} {onclose}>
  {@render children()}
</dialog>
<style>
  dialog { margin: auto; width: min(540px, calc(100% - 32px)); max-height: calc(100svh - 40px); overflow-y: auto; padding: 24px; border: 1px solid #bdc8ae; border-radius: 12px; background: #fffef8; color: #24392d; box-shadow: 0 20px 80px #102f2640; }
  dialog.wide { width: min(900px, calc(100% - 32px)); }
  dialog::backdrop { background: #102f2699; }
</style>
