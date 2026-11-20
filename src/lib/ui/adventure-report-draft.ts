import { PILOT_ADVENTURES, type PilotDecisionId, type PilotSlug } from '../rules/adventure-report-pilot';

export const reportDraftPrefix = 'parma.test.adventure-report.v1.';

export const CITY_CONTEXTS = [
 { id: 'delivered', label: 'Передача состоялась' },
 { id: 'interrupted', label: 'Передачу задержали или сорвали' },
 { id: 'skipped', label: 'Главу Вышгорода пропустили' },
 { id: 'unknown', label: 'Неизвестно' }
] as const;

export const REVIEW_STATUSES = [
 { id: 'draft', label: 'Черновик' },
 { id: 'needs-review', label: 'Требует проверки' },
 { id: 'disputed', label: 'Спорный' }
] as const;

export const SCENARIO_REVISIONS = [
 { id: 'app-reference', label: 'Редакция приложения' },
 { id: 'book-reference', label: 'Книжная редакция «Сюжета Сивера»' }
] as const;

export type ReportAnswer = {
 decision: string;
 decisionNote: string;
 outcome: string;
 observed: string;
 knowledge: string;
 pending: string;
};

type DraftMetadata = {
 group: string;
 campaign: string;
 revision: string;
 canonBranch: string;
 canonVersion: string;
 runStatus: string;
 reviewStatus: string;
 reviewReason: string;
 cityContext: string;
};

export type ReportDraft = DraftMetadata & { answers: Record<PilotDecisionId, ReportAnswer> };

function blankAnswer(): ReportAnswer {
 return { decision: '', decisionNote: '', outcome: '', observed: '', knowledge: '', pending: '' };
}

function record(value: unknown): Record<string, unknown> {
 return value && typeof value === 'object' && !Array.isArray(value)
  ? value as Record<string, unknown>
  : {};
}

function readText(value: unknown): string {
 return typeof value === 'string' ? value : '';
}

function knownValue(value: unknown, choices: readonly string[]): string {
 return typeof value === 'string' && choices.includes(value) ? value : '';
}

export function reportDraftKey(slug: PilotSlug): string {
 return reportDraftPrefix + slug;
}

export function readReportDraft(slug: PilotSlug, value?: unknown): ReportDraft {
 const saved = record(value);
 const savedAnswers = record(saved.answers);
 const pilot = PILOT_ADVENTURES.find(adventure => adventure.slug === slug)!;
 const answers = {} as Record<PilotDecisionId, ReportAnswer>;
 for (const card of pilot.cards) {
  const answer = record(savedAnswers[card.id]);
  const decision = knownValue(answer.decision, ['scene-not-played', 'undecided', 'other', ...card.decisions.map(option => option.id)]);
  answers[card.id] = decision === 'scene-not-played' ? { ...blankAnswer(), decision } : {
   decision,
   decisionNote: decision === 'other' ? readText(answer.decisionNote) : '',
   outcome: knownValue(answer.outcome, ['unknown', 'other', ...card.outcomes.map(option => option.id)]),
   observed: readText(answer.observed),
   knowledge: readText(answer.knowledge),
   pending: readText(answer.pending)
  };
 }
 const reviewStatus = knownValue(saved.reviewStatus, REVIEW_STATUSES.map(status => status.id)) || 'draft';
 return {
  group: readText(saved.group),
  campaign: readText(saved.campaign),
  revision: knownValue(saved.revision, SCENARIO_REVISIONS.map(revision => revision.id)),
  canonBranch: readText(saved.canonBranch),
  canonVersion: readText(saved.canonVersion),
  runStatus: knownValue(saved.runStatus, ['completed', 'paused', 'stopped']),
  reviewStatus,
  reviewReason: reviewStatus === 'draft' ? '' : readText(saved.reviewReason),
  cityContext: slug === 'karngorn' ? knownValue(saved.cityContext, CITY_CONTEXTS.map(option => option.id)) : '',
  answers
 };
}
