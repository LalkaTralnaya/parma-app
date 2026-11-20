import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';
import { readReportExport } from '$lib/server/reportExport';
import { ReportExportError } from '$lib/reports/export';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url, fetch }) => {
 const headers = {
  'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff'
 };
 const bearer = request.headers.get('authorization');
 if (!bearer?.startsWith('Bearer ') || bearer.length > 16384) {
  return new Response(JSON.stringify({ error: 'Войдите в аккаунт, чтобы выгрузить отчёты.' }), { status: 401, headers });
 }
 const token = bearer.slice(7);
 try {
  if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_ANON_KEY) throw new ReportExportError('Подключение к базе не настроено.', 503);
  const client = createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
   auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
   global: { fetch, headers: { Authorization: bearer } }
  });
  const bundle = await readReportExport(client, token, url.searchParams);
  return new Response(JSON.stringify(bundle), { headers });
 } catch (error) {
  const expected = error instanceof ReportExportError;
  return new Response(JSON.stringify({ error: expected ? error.message : 'Не удалось сформировать выгрузку.' }), {
   status: expected ? error.status : 502, headers
  });
 }
};
