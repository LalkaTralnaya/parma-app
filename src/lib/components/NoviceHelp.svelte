<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { supabase } from '$lib/supabase/client';
  import { contextHelp, helpWindow, shouldShowHelp } from '$lib/ui/novice-help';
  import { trackNoviceHelp, type HelpAccount } from '$lib/ui/novice-help-tracker';
  import NoviceHelpCard from './NoviceHelpCard.svelte';
  let account = $state<HelpAccount | null>(null);
  let now = $state(Date.now());
  let tracker: ReturnType<typeof trackNoviceHelp> | undefined;
  const context = $derived(contextHelp(page.url.pathname, page.url.hash));
  const window = $derived(account ? helpWindow(account.createdAt, account.history, now) : null);
  const visible = $derived(Boolean(account && window && context && shouldShowHelp(account.createdAt, account.history, now)
    && !account.history.dismissed.includes(`${window.until}:${context.id}`)));
  onMount(() => {
    tracker = trackNoviceHelp(supabase, value => { now = Date.now(); account = value; });
    const clock = setInterval(() => { now = Date.now(); }, 60_000);
    return () => { tracker?.stop(); clearInterval(clock); };
  });
</script>

{#if visible && context && account}
  {#key `${account.id}:${context.id}`}
    <NoviceHelpCard tips={context.tips} returning={window?.returning} onClose={() => tracker?.dismiss(context!.id)} onHide={() => tracker?.dismiss(context!.id, true)} />
  {/key}
{/if}
