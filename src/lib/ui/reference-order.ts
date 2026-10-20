import type { LibraryEntry } from '$lib/rules/parma-library';

export type ReadingOrder = 'lore' | 'mechanics';
export type ReadingChapter = { id: string; title: string; description: string };
export const READING_CHAPTERS: Record<ReadingOrder, ReadingChapter[]> = {
  lore: [
    { id: 'welcome', title: 'Добро пожаловать в Парму', description: 'О чём этот мир и какие истории здесь рождаются.' },
    { id: 'world-laws', title: 'Жива и законы мира', description: 'Что связывает мир и как действует Кон.' },
    { id: 'peoples', title: 'Народы Пармы', description: 'Происхождение, облик и обычаи народов.' },
    { id: 'gods', title: 'Боги и почитание', description: 'Пантеон, дары и слабости богов.' },
    { id: 'daily-life', title: 'Жизнь и обычаи', description: 'Поселения, семья, праздники, дороги и повседневные дела.' },
    { id: 'society', title: 'Власть и отношения', description: 'Правители, окружение, связи и общие дела.' },
    { id: 'languages', title: 'Знаки и письменности', description: 'Родовые знаки, языки и способы хранить знание.' },
    { id: 'other-worlds', title: 'Иные миры и Предтечи', description: 'Что лежит за привычными границами Яви.' },
    { id: 'legends', title: 'Кощей и его маски', description: 'Легенды, личности и силы разделённой души.' }
  ],
  mechanics: [
    { id: 'basics', title: 'Начало игры и основные проверки', description: 'Характеристики, навыки, броски и определение исхода.' },
    { id: 'hero', title: 'Происхождение и личность героя', description: 'Предыстория, характер, идеал, привязанность, слабость и цель.' },
    { id: 'growth', title: 'Развитие и деревья умений', description: 'Как читать ветви, изучать умения и развивать героя.' },
    { id: 'combat', title: 'Бой и приёмы', description: 'Атаки, сопротивление, положение и рукопашные связки.' },
    { id: 'magic', title: 'Магия и заклинания', description: 'Сотворение, школы, удержание и применение чар.' },
    { id: 'conditions', title: 'Состояния, Грань и Тлен', description: 'Избавление, травмы и последствия опасных встреч.' },
    { id: 'journey', title: 'Передвижение, отдых и путешествия', description: 'Дистанции, восстановление сил и дорога.' },
    { id: 'equipment', title: 'Снаряжение', description: 'Оружие, доспехи, инструменты и полезные дорожные вещи.' },
    { id: 'craft', title: 'Хозяйство, ремесло и цены', description: 'Торговля, ресурсы, изготовление вещей и готовка.' },
    { id: 'storyteller', title: 'Ведение игры и особые правила', description: 'Личная история, судебные обряды и правила существ.' },
    { id: 'masks', title: 'Правила масок Кощея', description: 'Особые силы и условия их применения.' }
  ]
};

function chapterFor(entry: Pick<LibraryEntry, 'id' | 'category'>, order: ReadingOrder): string {
  const { id, category } = entry;
  if (order === 'lore') {
    if (category === 'Мир Пармы') return 'welcome';
    if (['Жива', 'Кон'].includes(category)) return 'world-laws';
    if (category === 'Народы') return 'peoples';
    if (category === 'Боги') return 'gods';
    if (['Жизнь и обычаи Пармы', 'Ремёсла, обычаи и повседневные дела'].includes(category)) return 'daily-life';
    if (['Лор', 'Лор и развитие персонажа', 'Связи, отношения и поручения Пармы'].includes(category)) return 'society';
    if (category === 'Письменности Пармы' || category.startsWith('Знаки,')) return 'languages';
    if (category === 'Иные миры и наследие Предтечи') return 'other-worlds';
    if (category === 'Тринадцать масок Кощея' || category === 'Личности и силы масок') return 'legends';
  } else {
    if (id === 'mechanics-introduction') return 'basics';
    if (['mechanics-42', 'mechanics-234', 'mechanics-47', 'book16-47', 'book16-48'].includes(id)) return 'journey';
    if (category === 'Основные правила') return 'basics';
    if (category === 'Механики развития персонажа') return 'growth';
    if (['Предыстории Пармы', 'Аспекты личности Пармы'].includes(category)) return 'hero';
    if (category === 'Атаки и развитие') return Number(id.replace('book16-current-', '')) >= 41 ? 'combat' : 'growth';
    if (category === 'Ратная рукопашная' || category === 'Новая редакция') return 'combat';
    if (category === 'Магия') return 'magic';
    if (['Состояния', 'Грань и Тлен', 'Травмы'].includes(category)) return 'conditions';
    if (category === 'Снаряжение') return 'equipment';
    if (['Экономика и ремесло', 'Готовка', 'Расценки и пути Пармы'].includes(category)) return 'craft';
    if (['Руководство Сказителя', 'Бестиарий и правила боя', 'Судебное понуждение'].includes(category)) return 'storyteller';
    if (category === 'Тринадцать масок Кощея' || category === 'Личности и силы масок') return 'masks';
  }
  return 'other';
}

const firstEntries: Record<string, string[]> = {
  basics: ['mechanics-introduction', 'mechanics-29', 'mechanics-222', 'mechanics-50', 'mechanics-59'],
  magic: ['mechanics-328', 'mechanics-345'],
  combat: ['draft-current-rules', 'martial-draft-2', 'book16-current-42', 'book16-current-43', 'book16-current-44'],
  equipment: ['book16-equipment'],
  journey: ['mechanics-42', 'mechanics-234', 'mechanics-47', 'book16-48', 'book16-47']
};

export function arrangeReference<T extends Pick<LibraryEntry, 'id' | 'category'>>(entries: T[], order: ReadingOrder) {
  const chapters = [...READING_CHAPTERS[order], { id: 'other', title: 'Другие разделы', description: 'Дополнительные сведения и правила.' }];
  return chapters.map((chapter, index) => {
    const preferred = firstEntries[chapter.id] ?? [];
    const members = entries.filter(entry => chapterFor(entry, order) === chapter.id);
    members.sort((a, b) => {
      const rank = (id: string) => preferred.includes(id) ? preferred.indexOf(id) : preferred.length;
      return rank(a.id) - rank(b.id);
    });
    return { ...chapter, number: index + 1, entries: members };
  }).filter(chapter => chapter.entries.length > 0);
}

export const MECHANICS_INTRODUCTION: LibraryEntry = {
  id: 'mechanics-introduction', title: 'С чего начать игру', category: 'Основные правила', blocks: [
    { kind: 'paragraph', text: 'Игра начинается с задумки: кем вы хотите быть в мире Пармы и что хотите в нём делать?' },
    { kind: 'paragraph', text: 'Странствующим кузнецом, который мечтает выковать необычный клинок? Следопытом, ищущим пропавшего близкого? Целителем, помогающим людям в далёких селениях? Подумайте, чью историю вам интересно прожить и к чему будет стремиться ваш герой.' },
    { kind: 'paragraph', text: 'Для начала достаточно нескольких слов об образе героя и его желании. Раздел «Лор» поможет найти ему место в мире. Затем выберите подходящие расу и предысторию, опишите личность и цель. Навыки и умения помогут воплотить вашу задумку.' }
  ]
};
