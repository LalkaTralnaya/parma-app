import { env } from '$env/dynamic/public';

const DEFAULT_SITE_URL = 'https://parma-app.relaxdev.ru';

function siteOrigin() {
  try {
    const url = new URL(env.PUBLIC_SITE_URL || DEFAULT_SITE_URL);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.origin;
  } catch {
    // An invalid deployment setting falls back to the current public address.
  }
  return DEFAULT_SITE_URL;
}

export const SITE_URL = siteOrigin();
export const SITE_NAME = 'Парма';
export const SHARE_IMAGE = {
  url: new URL('/parma-share.jpg', SITE_URL).href,
  width: 1200,
  height: 630,
  alt: 'Парма. Настольная ролевая игра. Лунный лес и знак компаса.'
};

export const PUBLIC_PAGES: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Парма — настольная ролевая игра в мире славянского фэнтези',
    description: 'Парма — НРИ в мире славянского фэнтези. Создайте героя, откройте правила, лор и готовые приключения. Листы персонажей и инструменты сказителя всегда под рукой.'
  },
  '/learn': {
    title: 'Как начать играть в Парму — обучение',
    description: 'Как создать героя Пармы, пользоваться листом персонажа и читать справочники мира и правил.'
  },
  '/adventures': {
    title: 'Приключения для настольной ролевой игры «Парма»',
    description: 'Готовые приключения Пармы с картами, персонажами и сценами для сказителя. Выберите историю для своей группы.'
  },
  '/lore': {
    title: 'Лор Пармы — мир, народы и легенды',
    description: 'Познакомьтесь с миром Пармы: боги и пантеон, народы, обычаи, предания и законы мира.'
  },
  '/mechanics': {
    title: 'Правила и механики НРИ «Парма»',
    description: 'Справочник по правилам Пармы: создание героя, навыки, проверки, бой, магия, состояния и развитие персонажа.'
  },
  '/gm/bestiary': {
    title: 'Бестиарий Пармы — существа и противники',
    description: 'Иллюстрированный бестиарий НРИ «Парма» с характеристиками, особенностями и действиями существ.'
  },
  '/gm/cheatsheet': {
    title: 'Шпаргалка сказителя — правила Пармы',
    description: 'Краткие правила Пармы за игровым столом: проверки, бой, состояния и другие механики.'
  },
  '/events': {
    title: 'Случайные события для приключений в Парме',
    description: 'Таблицы случайных событий для сказителя: встречи, зацепки и происшествия на дорогах и в других местах Пармы.'
  },
  '/tavern': {
    title: 'Таверна Пармы — меню и дорожная провизия',
    description: 'Меню корчмы Пармы: сезонные блюда, напитки и дорожная провизия.'
  }
};

export function isPublicPage(routeId: string | null) {
  return routeId !== null && (Object.hasOwn(PUBLIC_PAGES, routeId) || routeId === '/adventures/[slug]');
}
