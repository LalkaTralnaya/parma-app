import type { Adventure } from './adventures';

const aliases: Record<string, string[]> = {
  'Мать Игната и Ярослава': ['Мать'],
  'Деревенская знахарка': ['Знахарка'],
  'Пятеро мужчин': ['Пленник', 'Пленник, освобождённый от контроля'],
  'Гаврила Златобород': ['Гаврила'],
  'Охрана обоза': ['Наёмник'],
  'Дорожная дружина': ['Дружинник'],
  'Дарёна Мерная': ['Дарёна'],
  'Федот Ось': ['Федот'],
  'Волхвиня Ведана': ['Ведана'],
  'Халмири (Лесовик)': ['Халмири', 'Лесовик'],
  'Мирон Вяз': ['Мирон'],
  'Рада Щепа': ['Рада'],
  'Сотник Гордей': ['Гордей']
};

// В этих сценах подпись обозначает тему реплики, а говорящий известен из контекста.
const sceneSpeakers: Record<string, Record<string, string>> = {
  forest: { 'О клыке': 'Данила', 'О кинжале': 'Данила' },
  forge: { 'На предложение остаться': 'Данила', 'На обещание помощи': 'Данила' },
  'siver-parley': { 'О больных': 'Сивер' },
  'road-gavrila': { 'О грузе': 'Гаврила Златобород' }
};

const extraLines: Record<string, string> = {
  'Пётр': '«Данила… клыки…»',
  'Даурин': '«Я помню, как это прозвучало. Могу повторить, только сам не знаю, что сказал».',
  'Отец Игната и Ярослава': '«Игнат… отойди. Я не могу остановить руки».',
  'Гъарнок': '«Кто принимал груз? Мне нужны опись и имя того, кто её подписал».',
  'Тверд': '«Я стоял у него за плечом. Перед нами был голый берег».',
  'Сотник Гордей': '«Назовите время и того, кто может подтвердить ваши слова».',
  'Халмири (Лесовик)': '«Дорогу до переправы я помню. А что было после спуска, уже не поручусь».'
};

export interface NpcLine {
  text: string;
  context?: string;
}

function spokenLine(line: string) {
  const source = line.trim().replace(/^>\s*/, '');
  const start = source.indexOf('«');
  if (start < 0) return null;
  return {
    speaker: source.slice(0, start).trim().replace(/[.:]\s*$/, ''),
    text: source.slice(start).trim()
  };
}

export function adventureNpcLines(adventure: Adventure, npc: Adventure['npcs'][number]): NpcLine[] {
  const names = [npc.name, ...(aliases[npc.name] ?? [])];
  const lines = new Map<string, NpcLine>();
  const add = (text: string, context?: string) => {
    const key = text.replace(/[«»]/g, '').trim().replace(/[.!?]+$/, '').trim();
    if (!lines.has(key)) lines.set(key, { text, context });
  };

  const voice = spokenLine(npc.voice ?? '');
  if (voice && !voice.speaker) add(voice.text);

  function addDialogue(line: string, context: string, sceneId?: string) {
    const spoken = spokenLine(line);
    if (!spoken?.speaker) return;
    const { speaker, text } = spoken;
    const name = speaker.replace(/^Если .+? — /, '');
    const explicit = sceneId ? sceneSpeakers[sceneId]?.[speaker] : undefined;
    const matches = names.some(candidate => name === candidate || [' о ', ' при ', ' у ', ', если ']
      .some(suffix => name.startsWith(candidate + suffix)));
    if (explicit ? explicit === npc.name : matches) add(text, speaker === name && names.includes(name) ? context : context + ' · ' + speaker);
  }

  for (const scene of adventure.scenes) {
    for (const line of scene.dialogue ?? []) addDialogue(line, scene.title, scene.id);
  }
  for (const entry of adventure.guide ?? []) {
    for (const block of entry.blocks) {
      if (block.kind === 'paragraph' && block.text.startsWith('> ')) addDialogue(block.text, entry.title);
    }
  }
  if (!lines.size && adventure.guide?.length && extraLines[npc.name]) add(extraLines[npc.name]);
  return [...lines.values()];
}
