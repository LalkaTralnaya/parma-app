type PilotChoice = { id: string; label: string };
type PilotDecision = {
 id: `siver.${'road' | 'karngorn'}.${string}`;
 title: string;
 sceneIds: readonly string[];
 entityIds: readonly `siver:${string}`[];
 decisions: readonly PilotChoice[];
 outcomes: readonly PilotChoice[];
};

type PilotAdventure = {
 slug: 'doroga-v-gardariki' | 'karngorn';
 adventureId: `siver:${string}`;
 title: string;
 region: string;
 cards: readonly PilotDecision[];
};

export const PILOT_ADVENTURES = [
 {
  slug: 'doroga-v-gardariki',
  adventureId: 'siver:road-chapter',
  title: 'Дорога в Вышгород',
  region: 'Тракт от Кривцов до Вышгорода',
  cards: [
   {
    id: 'siver.road.inspect-wagon',
    title: 'Осмотр первой телеги',
    sceneIds: ['road-gavrila'],
    entityIds: ['siver:gavrila', 'siver:caravan-guards', 'siver:wagon-cache', 'siver:vessel'],
    decisions: [
     { id: 'talk', label: 'Ограничились разговором' },
     { id: 'inspect', label: 'Осмотрели телегу' }
    ],
    outcomes: [
     { id: 'cache-not-found', label: 'Тайник не нашли' },
     { id: 'cache-found', label: 'Нашли двойное дно' },
     { id: 'vessel-found', label: 'Обнаружили Сосуд' }
    ]
   },
   {
    id: 'siver.road.follow-observer',
    title: 'Ночной наблюдатель',
    sceneIds: ['road-first-watch'],
    entityIds: ['siver:ambush'],
    decisions: [
     { id: 'leave', label: 'Оставили след без расследования' },
     { id: 'check', label: 'Проверили шум' },
     { id: 'pursue', label: 'Организовали поиск или погоню' }
    ],
    outcomes: [
     { id: 'tracks-only', label: 'Остались только следы' },
     { id: 'observer-caught', label: 'Догнали наблюдателя (вариант книжной редакции)' }
    ]
   },
   {
    id: 'siver.road.inspect-ambush',
    title: 'Осмотр места нападения',
    sceneIds: ['road-ambush-site', 'road-bandit-camp'],
    entityIds: ['siver:ambush', 'siver:blade'],
    decisions: [
     { id: 'pass', label: 'Продолжили путь' },
     { id: 'roadside', label: 'Осмотрели обочину' },
     { id: 'follow-tracks', label: 'Пошли по следам в лес' }
    ],
    outcomes: [
     { id: 'camp-found', label: 'Нашли стоянку' },
     { id: 'blade-recovered', label: 'Забрали обломок кинжала' }
    ]
   },
   {
    id: 'siver.road.deal-with-patrol',
    title: 'Разговор с дорожной дружиной',
    sceneIds: ['road-patrol'],
    entityIds: ['siver:road-patrol', 'siver:gordey', 'siver:blade'],
    decisions: [
     { id: 'disclose', label: 'Сообщили сведения' },
     { id: 'withhold', label: 'Скрыли часть сведений' },
     { id: 'flee', label: 'Бежали' },
     { id: 'resist', label: 'Сопротивлялись' }
    ],
    outcomes: [
     { id: 'released', label: 'Продолжили путь' },
     { id: 'detained', label: 'Были задержаны' },
     { id: 'guardhouse-entry', label: 'Вошли в город через караульню' }
    ]
   }
  ]
 },
 {
  slug: 'karngorn',
  adventureId: 'siver:karngorn-chapter',
  title: 'Карнгорн',
  region: 'Северные горы Гардарики',
  cards: [
   {
    id: 'siver.karngorn.search-for-ryzh',
    title: 'Поиск Рыжа',
    sceneIds: ['karngorn-crossing'],
    entityIds: ['siver:ryzh', 'siver:lesovik'],
    decisions: [
     { id: 'search', label: 'Потратили время на поиск' },
     { id: 'continue', label: 'Продолжили путь' }
    ],
    outcomes: [
     { id: 'leash-found', label: 'Обнаружили обрывок поводка' },
     { id: 'trail-lost', label: 'Потеряли след' }
    ]
   },
   {
    id: 'siver.karngorn.deal-with-rival',
    title: 'Встреча с Сивером',
    sceneIds: ['karngorn-crossing', 'karngorn-city'],
    entityIds: ['siver:siver', 'siver:black-field'],
    decisions: [
     { id: 'parley', label: 'Пошли на контакт или обмен' },
     { id: 'avoid', label: 'Уклонились от встречи' },
     { id: 'fight', label: 'Вступили в столкновение' }
    ],
    outcomes: [
     { id: 'behind', label: 'Сивер отставал' },
     { id: 'nearby', label: 'Сивер был поблизости' },
     { id: 'ahead', label: 'Сивер опережал группу' }
    ]
   },
   {
    id: 'siver.karngorn.cross-ward',
    title: 'Проход через защиту',
    sceneIds: ['karngorn-ruins'],
    entityIds: ['siver:ward'],
    decisions: [
     { id: 'power-passage', label: 'Открыли проход питанием' },
     { id: 'enter-unpowered', label: 'Вошли без действующего питания' },
     { id: 'defer', label: 'Отложили вход' }
    ],
    outcomes: [
     { id: 'passed-safely', label: 'Прошли безопасно' },
     { id: 'discharge', label: 'Произошёл разряд' },
     { id: 'memory-loss', label: 'Отмечена потеря памяти' }
    ]
   },
   {
    id: 'siver.karngorn.compare-evidence',
    title: 'Улики у пустого основания',
    sceneIds: ['karngorn-empty-foundation'],
    entityIds: ['siver:empty-base', 'siver:vessel', 'siver:borivoy', 'siver:borivoy-drawing', 'siver:packing-mark'],
    decisions: [
     { id: 'compare', label: 'Сопоставили улики' },
     { id: 'keep', label: 'Забрали улики на потом' },
     { id: 'leave', label: 'Ушли без сопоставления' }
    ],
    outcomes: [
     { id: 'empty-base-seen', label: 'Видели пустое основание' },
     { id: 'expedition-linked', label: 'Связали экспедицию с залом по уликам' }
    ]
   }
  ]
 }
] as const satisfies readonly PilotAdventure[];

export type PilotSlug = (typeof PILOT_ADVENTURES)[number]['slug'];
export type PilotDecisionId = (typeof PILOT_ADVENTURES)[number]['cards'][number]['id'];
