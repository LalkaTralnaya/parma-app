import type { SupabaseClient, User } from '@supabase/supabase-js';
import { HELP_METADATA_KEY, helpWindow, mergeHelpHistory, recordHelpActivity, type HelpHistory } from './novice-help';

export interface HelpAccount { id: string; createdAt: string; history: HelpHistory }
const SAVE_INTERVAL = 15 * 60_000;

/** One tracker for the ordinary account; the separate room guest identity is never used. */
export function trackNoviceHelp(client: SupabaseClient, changed: (account: HelpAccount | null) => void) {
  let user: User | null = null;
  let account: HelpAccount | null = null;
  let stopped = false;
  let busy = false;
  let lastAttempt = 0;
  let lastSaved = 0;
  let dirty = false;
  let revision = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const key = (id: string) => `parma.help.v1:${id}`;

  function read(id: string): unknown {
    try { return JSON.parse(localStorage.getItem(key(id)) ?? 'null'); } catch { return null; }
  }
  function publish() {
    if (stopped) return;
    if (account) try { localStorage.setItem(key(account.id), JSON.stringify(account.history)); } catch { /* Online account storage still works. */ }
    changed(account ? { ...account, history: { ...account.history, dismissed: [...account.history.dismissed] } } : null);
  }
  function adopt(next: User | null) {
    if (!next || next.is_anonymous) {
      user = null; account = null; lastSaved = 0; lastAttempt = 0; dirty = false; revision++; publish(); return;
    }
    const different = user?.id !== next.id;
    if (different) { lastSaved = 0; lastAttempt = 0; dirty = false; revision++; }
    user = next;
    account = { id: next.id, createdAt: next.created_at, history: mergeHelpHistory(next.user_metadata[HELP_METADATA_KEY], read(next.id)) };
    publish();
  }
  async function save() {
    if (stopped || busy || !user || !account || !dirty || !navigator.onLine) return;
    busy = true;
    lastAttempt = Date.now();
    const id = user.id, version = revision;
    let saved = false;
    const snapshot = { ...account.history, dismissed: [...account.history.dismissed] };
    try {
      const { data, error } = await client.auth.updateUser({ data: { [HELP_METADATA_KEY]: snapshot } });
      if (stopped || user?.id !== id) return;
      if (!error && data.user) {
        user = data.user;
        lastSaved = Date.now();
        saved = true;
        dirty = version !== revision;
      }
    } catch { /* Keep the account-specific local copy and retry during actual activity. */ }
    finally {
      busy = false;
      if (!stopped && dirty && (saved || user?.id !== id)) void save();
    }
  }
  function activity() {
    if (stopped || document.visibilityState !== 'visible' || !account) return;
    const now = Date.now();
    account.history = recordHelpActivity(account.createdAt, mergeHelpHistory(account.history, read(account.id)), now);
    dirty = true; revision++; publish();
    if (now - lastSaved >= SAVE_INTERVAL && now - lastAttempt >= 60_000) void save();
  }
  async function refresh() {
    if (stopped || document.visibilityState !== 'visible') return;
    const expected = user?.id;
    try {
      const { data, error } = await client.auth.getUser();
      if (stopped || (expected && user?.id !== expected)) return;
      if (!error) adopt(data.user);
    } catch { /* Cached session can still show help offline. */ }
    activity();
  }
  function later(callback: () => void) {
    // Auth calls must run after the auth callback releases its internal lock.
    const timer = setTimeout(() => { timers.delete(timer); if (!stopped) callback(); }, 0);
    timers.add(timer);
  }
  const { data: subscription } = client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') { adopt(null); return; }
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
      // Repeated SIGNED_IN notifications on tab focus must not overwrite newer local activity.
      const different = user?.id !== session?.user.id;
      adopt(session?.user ?? null);
      if (different || !lastSaved) later(() => { void refresh(); });
    }
  });
  let lastInteraction = 0;
  const interact = (event: Event) => {
    if (!event.isTrusted || Date.now() - lastInteraction < 60_000) return;
    lastInteraction = Date.now(); activity();
  };
  const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
  window.addEventListener('pointerdown', interact, { passive: true });
  window.addEventListener('keydown', interact);
  window.addEventListener('scroll', interact, { passive: true });
  window.addEventListener('online', visible);
  document.addEventListener('visibilitychange', visible);

  return {
    dismiss(section: string, hideAll = false) {
      if (!account) return;
      const { until } = helpWindow(account.createdAt, account.history, Date.now());
      if (hideAll) account.history.hiddenUntil = until;
      else account.history.dismissed = [...new Set([...account.history.dismissed, `${until}:${section}`])].slice(-100);
      dirty = true; revision++; publish(); void save();
    },
    stop() {
      stopped = true;
      subscription.subscription.unsubscribe();
      for (const timer of timers) clearTimeout(timer);
      window.removeEventListener('pointerdown', interact);
      window.removeEventListener('keydown', interact);
      window.removeEventListener('scroll', interact);
      window.removeEventListener('online', visible);
      document.removeEventListener('visibilitychange', visible);
    }
  };
}
