import { helpContent, helpPractice, type HelpContent, type HelpTopicId } from './help-content';
export type TourStep = HelpContent & { id: string; topicId: HelpTopicId; target: string };
function tourStep(topicId: HelpTopicId, target: string): TourStep { return { ...helpContent(topicId), id: topicId, topicId, target }; }
export const CREATION_TOUR: TourStep[] = [
 tourStep("character-concept", "#character-name"),
 tourStep("character-origin", "#raceId"),
 tourStep("character-background", "#backgroundId"),
 tourStep("character-skills", "#creation-skills h2"),
 tourStep("starting-abilities", "#creation-abilities"),
 tourStep("character-save", "#create-character"),
];
export const SHEET_TOUR: TourStep[] = [
 tourStep("sheet-navigation", ".sheet-nav"),
 tourStep("roll-mode", "[aria-label=\"Режим бросков\"]"),
 tourStep("characteristics", "#characteristics"),
 tourStep("resources", "#resources"),
 tourStep("weapon-combat", "#battle"),
 tourStep("skill-check", "#skills"),
 tourStep("ability-trees", "#abilities"),
 tourStep("spellcasting", "#spells"),
 tourStep("inventory", "#inventory"),
 tourStep("player-tavern", "a[href^=\"/tavern?character=\"]"),
 tourStep("player-relationships", "#relationships"),
 tourStep("personality", "#personality"),
 tourStep("conditions", "#conditions"),
 tourStep("decay", "#decay"),
 tourStep("rest-and-growth", "#rest"),
];
export const READING_ROUTE = [
 { ...helpContent("reading-welcome"), topicId: "reading-welcome", number: "01", label: "Лор · начало" },
 { ...helpContent("reading-world"), topicId: "reading-world", number: "02", label: "Лор · главы по порядку" },
 { ...helpContent("reading-character"), topicId: "reading-character", number: "03", label: "Механики · начало" },
 { ...helpContent("reading-action"), topicId: "reading-action", number: "04", label: "Механики · подробности" },
];

export type PlayerDestination = 'sheet' | 'growth' | 'tavern' | 'home' | 'room';
const playerSteps: { topicId: HelpTopicId; destination: PlayerDestination; section?: string }[] = [
 { topicId: 'ability-trees', destination: 'sheet', section: 'abilities' },
 { topicId: 'skill-check', destination: 'sheet', section: 'skills' },
 { topicId: 'resources', destination: 'sheet', section: 'resources' },
 { topicId: 'inventory', destination: 'sheet', section: 'inventory' },
 { topicId: 'spellcasting', destination: 'sheet', section: 'spells' },
 { topicId: 'rest-and-growth', destination: 'sheet', section: 'rest' },
 { topicId: 'character-growth', destination: 'growth' },
 { topicId: 'player-relationships', destination: 'sheet', section: 'relationships' },
 { topicId: 'player-tavern', destination: 'tavern' },
 { topicId: 'room-session', destination: 'room' },
 { topicId: 'character-backup', destination: 'home' }
];
export const PLAYER_LESSONS = playerSteps.map(step => {
 const practice = helpPractice(step.topicId);
 if (!practice) throw new Error('Missing player lesson: ' + step.topicId);
 return { ...step, ...helpContent(step.topicId), practice };
});
export function playerLessonHref(lesson: typeof PLAYER_LESSONS[number], characterId: string): string | null {
 if (lesson.destination === 'home') return '/characters';
 if (lesson.destination === 'room') return '/room';
 if (!characterId) return null;
 const id = encodeURIComponent(characterId);
 if (lesson.destination === 'growth') return '/char/' + id + '/levelup';
 if (lesson.destination === 'tavern') return '/tavern?character=' + id;
 return '/char/' + id + '#' + lesson.section;
}

export const STORYTELLER_PHASES = [
 { id: "prepare", title: "Подготовка встречи" },
 { id: "play", title: "Проведение игры" },
 { id: "finish", title: "Итоги и сохранение" }
] as const;
export const STORYTELLER_LESSONS = [
  {
    "topicId": "gm-orientation",
    "phase": "prepare",
    "action": "Открыть пульт"
  },
  {
    "topicId": "adventure-preparation",
    "phase": "prepare",
    "action": "Открыть приключения"
  },
  {
    "topicId": "gm-adventure-edit",
    "phase": "prepare",
    "action": "Открыть список и редактор"
  },
  {
    "topicId": "gm-session-notes",
    "phase": "prepare",
    "action": "Открыть заметки"
  },
  {
    "topicId": "room-start",
    "phase": "prepare",
    "action": "Открыть комнаты"
  },
  {
    "topicId": "gm-players",
    "phase": "prepare",
    "action": "Открыть пульт и доступ к связям"
  },
  {
    "topicId": "gm-checks",
    "phase": "play",
    "action": "Открыть запросы"
  },
  {
    "topicId": "encounter-setup",
    "phase": "play",
    "action": "Открыть боевой трекер"
  },
  {
    "topicId": "gm-combat-actions",
    "phase": "play",
    "action": "Открыть действия боя"
  },
  {
    "topicId": "gm-effects",
    "phase": "play",
    "action": "Открыть эффекты боя"
  },
  {
    "topicId": "gm-media",
    "phase": "play",
    "action": "Открыть материалы приключений"
  },
  {
    "topicId": "gm-season",
    "phase": "play",
    "action": "Открыть настройку сезона"
  },
  {
    "topicId": "gm-relationships",
    "phase": "play",
    "action": "Открыть паутину отношений"
  },
  {
    "topicId": "gm-storyplot",
    "phase": "play",
    "action": "Открыть сюжетную паутину"
  },
  {
    "topicId": "random-events",
    "phase": "play",
    "action": "Открыть таблицы событий"
  },
  {
    "topicId": "gm-finish",
    "phase": "finish",
    "action": "Открыть завершение боя"
  },
  {
    "topicId": "gm-report",
    "phase": "finish",
    "action": "Открыть отчёт"
  },
  {
    "topicId": "gm-report-export",
    "phase": "finish",
    "action": "Открыть экспорт"
  },
  {
    "topicId": "gm-archive",
    "phase": "finish",
    "action": "Открыть свои комнаты"
  },
  {
    "topicId": "gm-recovery",
    "phase": "finish",
    "action": "Открыть аккаунт"
  }
] satisfies { topicId: HelpTopicId; phase: typeof STORYTELLER_PHASES[number]["id"]; action: string }[];
export const STORYTELLER_ROUTE = STORYTELLER_LESSONS.map(step => {
 const practice = helpPractice(step.topicId);
 const content = helpContent(step.topicId);
 if (!practice || !content.href) throw new Error("Missing storyteller lesson: " + step.topicId);
 return { ...step, ...content, href: content.href, practice };
});
export const STORYTELLER_TOUR: TourStep[] = [
 tourStep("gm-orientation", "#storyteller-console-title"),
 tourStep("gm-session-notes", "#storyteller-notes-title"),
 tourStep("gm-checks", "#gm-requests-title"),
 tourStep("encounter-setup", "a[href=\"/gm/combat\"]"),
 tourStep("gm-relationships", "#relationship-web-title"),
 tourStep("gm-season", "#tavern-season-title"),
 tourStep("gm-report", "a[href=\"/gm/adventure-report\"]")
];
