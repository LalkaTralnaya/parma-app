import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildReportExport, parseExportFilters, ReportExportError, type ReportExportRow } from '../reports/export';

export async function readReportExport(client: SupabaseClient, token: string, params: URLSearchParams) {
 const filters = parseExportFilters(params);
 const scopes = params.getAll('scope');
 const scope = scopes[0] ?? 'own-drafts';
 if (scopes.length > 1 || !['own-drafts', 'all-drafts'].includes(scope)) throw new ReportExportError('Некорректная область выгрузки.');
 const { data: { user }, error: authError } = await client.auth.getUser(token);
 if (authError || !user) throw new ReportExportError('Войдите в аккаунт, чтобы выгрузить отчёты.', 401);
 if (user.is_anonymous) throw new ReportExportError('Для экспорта нужен постоянный аккаунт.', 403);
 if (scope === 'all-drafts') {
  // Never trust client-side roles: RPC checks private database membership.
  const { data: isAdmin, error } = await client.rpc('is_adventure_report_admin');
  if (error) {
   if (['PGRST202', '42883'].includes(error.code)) throw new ReportExportError('Доступ администратора отчётов ещё не подключён.', 503);
   throw new ReportExportError('Не удалось проверить права администратора.', 502);
  }
  if (isAdmin !== true) throw new ReportExportError('Просмотр всех отчётов доступен только администратору отчётов.', 403);
 }
 let query = client.from('adventure_report_drafts')
  .select('user_id,adventure_slug,payload,revision,updated_at', { count: 'exact' });
 if (scope === 'own-drafts') query = query.eq('user_id', user.id);
 const { data, count, error } = await query.order('user_id').order('adventure_slug').limit(1000);
 if (error) {
  if (['PGRST205','42P01'].includes(error.code)) throw new ReportExportError('Хранилище отчётов ещё не подключено.', 503);
  throw new ReportExportError('Не удалось прочитать отчёты. Повторите выгрузку.', 502);
 }
 if (!data || count === null || count !== data.length) throw new ReportExportError('Supabase вернул неполный набор. Файл не сформирован.', 502);
 const rows = data as (ReportExportRow & { user_id: string })[];
 if (rows.some(row => typeof row?.user_id !== 'string' || !row.user_id || (scope === 'own-drafts' && row.user_id !== user.id))) {
  throw new ReportExportError('Получен некорректный владелец отчёта. Выгрузка остановлена.', 502);
 }
 const result = buildReportExport(rows, filters, row =>
  createHash('sha256').update('parma-report-export-v1/' + row.user_id).digest('hex'));
 result.scope = scope as 'own-drafts' | 'all-drafts';
 return result;
}
