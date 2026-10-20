import type { LibraryBlock } from '$lib/rules/parma-library';
export type ReadingBlock = LibraryBlock | { kind: 'list'; items: string[]; ordered: boolean; start: number };
export type ReadingSection = { title?: string; blocks: ReadingBlock[] };

export function readingBlocks(blocks: LibraryBlock[]): ReadingBlock[] {
  return blocks.flatMap<ReadingBlock>(block => {
    if (block.kind !== 'paragraph' || block.level) return [block];
    if (!/^\s*(?:[-•]\s+|\d+[.)]\s+)/mu.test(block.text)) return block.text.split(/\n\s*\n/u).filter(text => text.trim()).map(text => ({ kind: 'paragraph', text: text.trim() }));
    const result: ReadingBlock[] = [];
    let paragraph: string[] = [];
    let list: Extract<ReadingBlock, { kind: 'list' }> | undefined;
    const flushParagraph = () => { if (paragraph.length) result.push({ kind: 'paragraph', text: paragraph.join(' ') }); paragraph = []; };
    const flushList = () => { if (list) result.push(list); list = undefined; };
    for (const rawLine of block.text.split('\n')) {
      const line = rawLine.trim();
      const item = line.match(/^(?:([-•])\s+|(\d+)[.)]\s+)(.+)$/u);
      if (item) {
        flushParagraph();
        const ordered = Boolean(item[2]);
        if (list && list.ordered !== ordered) flushList();
        list ??= { kind: 'list', ordered, start: Number(item[2] ?? 1), items: [] };
        list.items.push(item[3]);
      } else if (!line) { flushParagraph(); flushList(); }
      else if (list && !(/[.!?]$/u.test(list.items.at(-1) ?? '') && /^[А-ЯЁA-Z]/u.test(line))) list.items[list.items.length - 1] += ' ' + line;
      else { flushList(); paragraph.push(line); }
    }
    flushParagraph(); flushList(); return result;
  });
}

export function readingSections(blocks: ReadingBlock[], level?: number): ReadingSection[] {
  const sections: ReadingSection[] = [];
  let current: ReadingSection = { blocks: [] };
  const flush = () => { if (current.title || current.blocks.length) sections.push(current); };
  for (const block of blocks) {
    if (level && block.kind === 'paragraph' && block.level && block.level <= level) {
      flush(); current = block.level === level ? { title: block.text, blocks: [] } : { blocks: [block] };
    } else current.blocks.push(block);
  }
  flush(); return sections;
}

export const REFERENCE_SECTION_LEVELS: Record<string, number> = {
  'book16-rulers-and-circles': 2, 'book16-masters': 3, 'book16-navi-shadows': 2, 'book16-skill-growth-story': 3
};

export function readingLabel(text: string): { label: string; text: string } {
  const match = text.match(/^(Титул|Возраст|Происхождение|Резиденция|Характер|Внешность|Особенность|Слабость|Навыки?|Школа|Объединение|Порог и условие|Событие|Выбор|Развилка|Продолжение|Покровительствует|Артефакты|Жертвы и Дар|Сильные стороны|Слабые стороны|Пассивно|Активно)([.:])\s*/u);
  return match ? { label: match[1] + match[2], text: text.slice(match[0].length) } : { label: '', text };
}
