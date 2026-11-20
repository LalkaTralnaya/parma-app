import { PILOT_ADVENTURES } from '../rules/adventure-report-pilot';

export type ExportFilters = {
 adventure: string; region: string; branch: string; canonVersion: string;
 from: string; to: string; reviewStatus: string;
};
export type ReportExportRow = {
 adventure_slug: string; payload: unknown; revision: string; updated_at: string; user_id?: string;
};
export type ExportReport = {
 report_key: string; adventure_slug: string; region: string | null;
 saved_revision: string; updated_at: string; payload: Record<string, unknown>;
};
export type ReportExport = {
 format_version: 1; exported_at: string; scope: 'own-drafts' | 'all-drafts'; source_count: number;
 filters: ExportFilters; report_count: number; warnings: string[]; reports: ExportReport[];
};

export const emptyExportFilters: ExportFilters = {
 adventure: '', region: '', branch: '', canonVersion: '', from: '', to: '', reviewStatus: ''
};

export class ReportExportError extends Error {
 status: number; constructor(message: string, status = 400) { super(message); this.status = status; }
}

export function objectValue(value: unknown): Record<string, unknown> {
 return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function cellValue(value: unknown): string {
 if (value === null || value === undefined) return '';
 return typeof value === 'string' ? value : JSON.stringify(value);
}

export function parseExportFilters(params: URLSearchParams): ExportFilters {
 const filters = { ...emptyExportFilters };
 for (const name of Object.keys(filters) as (keyof ExportFilters)[]) {
  const values = params.getAll(name);
  if (values.length > 1 || (values[0]?.length ?? 0) > 120) throw new ReportExportError('Некорректный фильтр.');
  filters[name] = values[0] ?? '';
 }
 for (const date of [filters.from, filters.to]) {
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) {
   throw new ReportExportError('Укажите корректные даты.');
  }
 }
 if (filters.from && filters.to && filters.from > filters.to) throw new ReportExportError('Начало периода позже окончания.');
 return filters;
}

export function buildReportExport(rows: ReportExportRow[], filters: ExportFilters, accountKey: string | ((row: ReportExportRow) => string), now = new Date()): ReportExport {
 const keys = new Set<string>();
 const warnings = new Set<string>();
 const reports: ExportReport[] = [];
 for (const row of rows) {
  if (!row || typeof row.adventure_slug !== 'string' || !row.adventure_slug || typeof row.revision !== 'string' || !row.revision
   || typeof row.updated_at !== 'string' || !Number.isFinite(Date.parse(row.updated_at))
   || !row.payload || typeof row.payload !== 'object' || Array.isArray(row.payload)) {
   throw new ReportExportError('Получена неполная запись. Выгрузка остановлена.', 502);
  }
  const key = (typeof accountKey === 'function' ? accountKey(row) : accountKey) + '/' + encodeURIComponent(row.adventure_slug);
  if (keys.has(key)) throw new ReportExportError('В ответе найдены повторяющиеся записи. Выгрузка остановлена.', 502);
  keys.add(key);
  const payload = row.payload as Record<string, unknown>;
  const pilot = PILOT_ADVENTURES.find(adventure => adventure.slug === row.adventure_slug);
  const region = pilot?.region ?? null;
  if (filters.adventure && filters.adventure !== row.adventure_slug
   || filters.region && filters.region !== region
   || filters.branch && filters.branch !== payload.canonBranch
   || filters.canonVersion && filters.canonVersion !== payload.canonVersion
   || filters.reviewStatus && filters.reviewStatus !== payload.reviewStatus
   || filters.from && Date.parse(row.updated_at) < Date.parse(filters.from + 'T00:00:00Z')
   || filters.to && Date.parse(row.updated_at) >= Date.parse(filters.to + 'T00:00:00Z') + 86400000) continue;

  if (!pilot) warnings.add('Есть приключения вне текущего реестра. Их исходные данные сохранены.');
  if (Object.keys(objectValue(payload.answers)).some(id => !pilot?.cards.some(card => card.id === id))) {
   warnings.add('Есть карточки вне текущего реестра. Их исходные данные сохранены.');
  }
  reports.push({
   report_key: key, adventure_slug: row.adventure_slug, region,
   saved_revision: row.revision, updated_at: row.updated_at, payload
  });
 }
 return {
  format_version: 1, exported_at: now.toISOString(), scope: 'own-drafts', source_count: rows.length,
  filters: { ...filters }, report_count: reports.length, warnings: [...warnings], reports
 };
}

export function csvText(rows: unknown[][]): string {
 return '\uFEFF' + rows.map(row => row.map(value => {
  const text = cellValue(value);
  // Formula-like text remains literal when opened in a spreadsheet.
  const safe = /^[\s\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
 }).join(',')).join('\r\n') + '\r\n';
}

export function exportReportCsv(bundle: ReportExport): { reports: string; decisions: string } {
 const reports: unknown[][] = [[
  'report_key','adventure_slug','region','saved_revision','updated_at','group','campaign',
  'scenario_revision','canon_branch','canon_version','run_status','review_status','review_reason','city_context','payload_json'
 ]];
 const decisions: unknown[][] = [[
  'report_key','decision_id','decision','decision_note','outcome','observed','knowledge','pending','answer_json'
 ]];
 for (const report of bundle.reports) {
  const p = report.payload;
  reports.push([
   report.report_key, report.adventure_slug, report.region, report.saved_revision, report.updated_at,
   p.group,p.campaign,p.revision,p.canonBranch,p.canonVersion,p.runStatus,p.reviewStatus,p.reviewReason,p.cityContext,p
  ]);
  for (const [id, raw] of Object.entries(objectValue(p.answers))) {
   const a = objectValue(raw);
   decisions.push([report.report_key,id,a.decision,a.decisionNote,a.outcome,a.observed,a.knowledge,a.pending,raw]);
  }
 }
 return { reports: csvText(reports), decisions: csvText(decisions) };
}

// A future queue can use this key to send at most one notification per saved revision.
export function reportSignals(report: ExportReport) {
 const kinds: ('unusual-outcome' | 'disputed-report')[] = [];
 if (Object.values(objectValue(report.payload.answers)).some(raw => {
  const answer = objectValue(raw);
  return answer.decision === 'other' || answer.outcome === 'other';
 })) kinds.push('unusual-outcome');
 if (report.payload.reviewStatus === 'disputed') kinds.push('disputed-report');
 return kinds.map(kind => ({
  event_key: report.report_key + '/' + report.saved_revision + '/' + kind,
  kind, report_key: report.report_key, revision: report.saved_revision
 }));
}
