export const HELP_DAY = 86_400_000;
export const HELP_WEEK = 7 * HELP_DAY;
export const HELP_ABSENCE = 30 * HELP_DAY;
export const HELP_METADATA_KEY = 'parma_help_v1';

export interface HelpHistory {
  lastActive: number;
  returnUntil: number;
  hiddenUntil: number;
  dismissed: string[];
}
export interface HelpWindow { until: number; returning: boolean }

export function helpHistory(value: unknown): HelpHistory {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const time = (key: string) => typeof data[key] === 'number' && Number.isFinite(data[key]) && data[key] >= 0 ? data[key] as number : 0;
  return { lastActive: time('lastActive'), returnUntil: time('returnUntil'), hiddenUntil: time('hiddenUntil'),
    dismissed: Array.isArray(data.dismissed) ? data.dismissed.filter((v): v is string => typeof v === 'string').slice(0, 100) : [] };
}

export function mergeHelpHistory(remote: unknown, local: unknown): HelpHistory {
  const a = helpHistory(remote), b = helpHistory(local);
  return { lastActive: Math.max(a.lastActive, b.lastActive), returnUntil: Math.max(a.returnUntil, b.returnUntil),
    hiddenUntil: Math.max(a.hiddenUntil, b.hiddenUntil), dismissed: [...new Set([...a.dismissed, ...b.dismissed])].slice(-100) };
}

export function helpWindow(createdAt: string, history: HelpHistory, now: number): HelpWindow {
  const created = Date.parse(createdAt);
  const initialUntil = Number.isFinite(created) && created <= now ? created + HELP_WEEK : 0;
  return { until: Math.max(initialUntil, history.returnUntil), returning: history.returnUntil > initialUntil };
}

export function recordHelpActivity(createdAt: string, value: unknown, now: number): HelpHistory {
  const history = helpHistory(value);
  // Decide from the previous visit before recording this one. An expired window
  // never restarts because of a refresh or an ordinary daily visit.
  if (history.lastActive > 0 && now - history.lastActive >= HELP_ABSENCE) {
    history.returnUntil = now + HELP_WEEK;
    history.hiddenUntil = 0;
    history.dismissed = [];
  }
  history.lastActive = Math.max(history.lastActive, now);
  const window = helpWindow(createdAt, history, now);
  if (window.until <= now) history.dismissed = [];
  return history;
}

export function shouldShowHelp(createdAt: string, history: HelpHistory, now: number): boolean {
  const { until } = helpWindow(createdAt, history, now);
  return until > now && history.hiddenUntil < until;
}

export interface ContextTip { title: string; text: string; href?: string; link?: string }
export function contextHelp(path: string, hash = ''): { id: string; tips: ContextTip[] } | null {
  const tip = (title: string, text: string, href = '/learn', link = 'Подробнее') => ({ title, text, href, link });
  if (path === '/') return { id: 'home', tips: [
    tip('Начните с образа героя', 'Кем вы хотите быть в Парме и чего хотите добиться? Затем создайте персонажа: выберите народ, предысторию и навыки.', '/new?learn=1', 'Создать героя с подсказками'),
    tip('Мир и правила всегда рядом', 'В «Лоре» собран мир Пармы, в «Механиках» — правила. Обучение поможет выбрать, что читать первым.', '/learn?topic=reading', 'Порядок знакомства с игрой'),
    tip('Сохраните запасную копию', 'Экспорт в JSON сохраняет героя в файл. Импорт позволяет восстановить его; синхронизация аккаунта помогает продолжить на другом устройстве.', '/account', 'Открыть аккаунт') ] };
  if (path === '/new') return { id: 'creation', tips: [
    tip('Не нужно знать все правила заранее', 'Начните с задумки героя. Кнопка «Обучение» проведёт по выбору расы, предыстории и распределению навыков.', '/new?learn=1', 'Пройти создание по шагам'),
    tip('Навыки под замысел героя', 'На старте доступно 10 очков навыков, не больше двух в один навык. Выбирайте занятия, в которых герой должен быть особенно хорош.', '/mechanics', 'Открыть механики') ] };
  if (path.startsWith('/char/')) {
    const section = hash.slice(1);
    const sections: Record<string, ContextTip[]> = {
      resources: [tip('Текущий запас и максимум', 'Во время игры меняйте текущие ресурсы. Максимум показывает полный запас; восстановление через отдых находится в конце листа.')],
      battle: [tip('Перед атакой', 'Проверьте оружие, тип атаки и Броню цели со Сказителем. Бросок на попадание и результат урона — разные части атаки.', '/gm/cheatsheet', 'Краткие правила боя')],
      skills: [tip('Когда бросать кубики', 'Сначала опишите действие Сказителю. Если исход рискованный и неочевидный, выберите нужный навык и выполните его проверку.', '/mechanics', 'Правила проверок')],
      abilities: [tip('Как изучить умение', 'Раскройте ветвь и нажмите на сам кружок умения. Для изучения нужны очки и связанные предшественники; описание узла объясняет его эффект.')],
      spells: [tip('Сначала условия, затем чары', 'Раскройте школу и прочитайте цель, дальность, руки и цену заклинания. Для удерживаемых чар используйте «Удержать ещё раунд» или «Прекратить».', '/mechanics#chapter-magic', 'Правила магии'), tip('Жива или Благодать', 'Переключатель над заклинаниями выбирает ресурс сотворения. Проверьте выбранный режим и доступный запас перед применением.')],
      inventory: [tip('Вещи и количество', 'Покупки добавляются из лавки. Проверяйте количество расходников и вес, а перед переносом данных сохраните героя в JSON.', '/lavka', 'Открыть лавку')],
      personality: [tip('Дайте герою направление', 'Запишите личную цель, идеал, привязанность и слабость. Предыстория и внешность помогут представить героя и объяснить его решения.')],
      conditions: [tip('Следите за длительностью', 'У состояния есть эффект и срок. Сверяйтесь со Сказителем, когда проходит раунд, доступно избавление или состояние заканчивается.', '/mechanics', 'Справочник механик')],
      decay: [tip('Изменения Тлена', 'Очки и стадия Тлена влияют на героя. Меняйте их по событиям игры вместе со Сказителем, сверяясь с таблицей стадий.', '/mechanics', 'Прочитать правила')],
      rest: [tip('Выберите подходящий отдых', 'Короткий и продолжительный отдых восстанавливают ресурсы по разным правилам. Сначала убедитесь со Сказителем, что для отдыха есть время и условия.')]
    };
    return { id: `sheet-${sections[section] ? section : 'overview'}`, tips: sections[section] ?? [
      tip('Ориентируйтесь по разделам', 'Ссылки в начале листа ведут к ресурсам, бою, навыкам, магии и истории. Кнопка «Обучение» покажет лист по шагам.'),
      tip('Кубики на экране или за столом', 'Режим «Онлайн» бросает кубики в приложении. «Офлайн» позволяет бросать свои кубики и вводить результат.') ] };
  }
  if (path === '/lore' || path === '/mechanics') return { id: path.slice(1), tips: [
    tip('Читайте по порядку или ищите нужное', 'Оглавление ведёт по главам. Поиск находит слова в заголовках и тексте, а выбор главы сокращает список.', '/learn?topic=reading', 'Что читать сначала'),
    tip('Разделы раскрываются нажатием', 'Нажмите на заголовок, чтобы прочитать раздел. Ссылка с названием главы в адресе поможет вернуться к ней позже.') ] };
  if (path.startsWith('/adventures')) return { id: 'adventures', tips: [
    tip('Игроку достаточно завязки', 'Материалы для Сказителя содержат тайны, улики и будущие сцены. Если вы играете героем, оставьте их ведущему.'),
    tip('Сказителю: подготовьте начало', 'Прочитайте завязку, действующих лиц и первые сцены. Карта и улики помогут вести историю; не обязательно читать игрокам все материалы подряд.', '/gm', 'Инструменты Сказителя') ] };
  if (path === '/gm') return { id: 'gm', tips: [
    tip('Соберите общий стол', 'Создайте комнату и передайте игрокам код. Затем можно запрашивать проверки и видеть результаты группы.', '/room', 'Открыть комнаты'),
    tip('Связи и бой — отдельные инструменты', 'Паутина помогает помнить людей и отношения. Для очередности ходов и участников сражения откройте боевой трекер.', '/gm/combat', 'Открыть бой') ] };
  if (path.startsWith('/room')) return { id: 'room', tips: [tip('Комната объединяет участников', 'Сказитель создаёт комнату, игроки присоединяются по коду. Используйте свой аккаунт, чтобы продолжать работу со своими персонажами.') ] };
  if (path === '/gm/combat') return { id: 'combat', tips: [tip('Подготовьте участников до начала боя', 'Добавьте героев и противников, задайте инициативу и начните бой. Кнопка следующего хода помогает вести очередь и раунды.', '/gm/cheatsheet', 'Правила боя') ] };
  if (path === '/gm/bestiary') return { id: 'bestiary', tips: [tip('Сверьте противника со сценой', 'Найдите существо и прочитайте его особенности. Числа в карточке помогают вести бой, а поведение и обстоятельства определяет Сказитель.') ] };
  if (path === '/account') return { id: 'account', tips: [tip('Один аккаунт на ваших устройствах', 'Синхронизация помогает продолжать историю. Для отдельной резервной копии экспортируйте персонажей в JSON с главной страницы.', '/', 'К персонажам') ] };
  if (path === '/lavka') return { id: 'shop', tips: [tip('Покупки для конкретного героя', 'Перед покупкой проверьте выбранного персонажа, цену и количество. После покупки вещи можно найти в его инвентаре.') ] };
  if (path === '/events') return { id: 'events', tips: [tip('Событие — повод для сцены', 'Выберите подходящее событие и впишите его в текущую дорогу или место. Сказитель может изменить детали под историю группы.') ] };
  return null;
}
