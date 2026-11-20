import { supabase } from '$lib/supabase/client';
import { PILOT_ADVENTURES, type PilotSlug } from '$lib/rules/adventure-report-pilot';
import { readReportDraft, type ReportDraft } from '$lib/ui/adventure-report-draft';

type DraftRow = { adventure_slug: string; payload: unknown; revision: string };
const columns = 'adventure_slug,payload,revision';
const table = 'adventure_report_drafts';

export class AdventureReportConflict extends Error {
 constructor() {
  super('В облаке уже сохранена другая версия отчёта. Ваши правки остались в форме.');
 }
}

function storageError(error: { code?: string }) {
 return ['PGRST205', '42P01'].includes(error.code ?? '')
  ? new Error('Облачное хранилище отчётов ещё не подключено.')
  : new Error('Supabase не подтвердил операцию с отчётом. Попробуйте ещё раз.');
}

export async function listAdventureReports(userId: string) {
 const { data, error } = await supabase.from(table).select(columns).eq('user_id', userId);
 if (error) throw storageError(error);
 return (data as DraftRow[] ?? []).flatMap(row => {
  const pilot = PILOT_ADVENTURES.find(adventure => adventure.slug === row.adventure_slug);
  return pilot ? [{ slug: pilot.slug, draft: readReportDraft(pilot.slug, row.payload), revision: row.revision }] : [];
 });
}

export async function saveAdventureReport(userId: string, slug: PilotSlug, draft: ReportDraft, revision?: string) {
 const query = revision
  ? supabase.from(table).update({ payload: draft }).eq('user_id', userId).eq('adventure_slug', slug).eq('revision', revision)
  : supabase.from(table).insert({ user_id: userId, adventure_slug: slug, payload: draft });
 const { data, error } = await query.select(columns).maybeSingle();
 if (error?.code === '23505' || (!data && !error)) throw new AdventureReportConflict();
 if (error) throw storageError(error);
 const row = data as DraftRow;
 return { draft: readReportDraft(slug, row.payload), revision: row.revision };
}
