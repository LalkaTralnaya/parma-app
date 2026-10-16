import test from 'node:test';
import assert from 'node:assert/strict';
import { KOSCHEI_MASKS, PERSONAL_STORY, WELL_BOOK_GUIDE } from '../src/lib/rules/book16-additions.ts';
import { ADVENTURES, getAdventure } from '../src/lib/rules/adventures.ts';

const text = value => JSON.stringify(value);
const masks = KOSCHEI_MASKS.filter(entry => entry.category === 'Личности и силы масок');

test('all thirteen mask personalities retain their powers and released memories', () => {
 assert.deepEqual(masks.map(mask => mask.title), ['Аргот — Воин','Лориен — Мудрец','Велана','Скит — Шут','Малгор — Кудесник','Борас — Отшельник','Казимир — Правитель','Морвен','Торин — Творец','Элдан — Странник','Ульфгар — Зверь','Астра — Судья','Маска Тени']);
 assert.equal(new Set(KOSCHEI_MASKS.map(mask => mask.id)).size, KOSCHEI_MASKS.length);
 for (const mask of masks) {
  assert.match(text(mask.blocks), /Память/);
  assert.match(text(mask.blocks), /После/);
 }
 assert.match(text(masks.at(-1)), /штрафом -20/);
 assert.match(text(masks.at(-1)), /При успехе Тлен не начисляется/);
 assert.match(text(masks.at(-1)), /4 Живы/);
 assert.match(text(masks.at(-1)), /3 раунда/);
});

test('mask rules distinguish wearing, possession, the hall and freeing the soul', () => {
 const rules = text(KOSCHEI_MASKS.filter(entry => entry.category === 'Тринадцать масок Кощея'));
 assert.match(rules, /штрафом -10/);
 assert.match(rules, /штрафом -15/);
 assert.match(rules, /штрафом -40/);
 assert.match(rules, /1к4 часа/);
 assert.match(rules, /60:1/);
 assert.match(rules, /Возможности вести учёбу здесь нет/);
 assert.match(rules, /Единого правила/);
 assert.match(rules, /Серп Морены/);
 const table = KOSCHEI_MASKS.flatMap(entry => entry.blocks).find(block => block.kind === 'table');
 assert.deepEqual(table.rows.slice(1).map(row => row[1]), ['50', '70', '80']);
});

test('personal story preserves player agency and rewards every participating character', () => {
 const story = text(PERSONAL_STORY);
 assert.match(story, /согласовываются с игроком/);
 assert.match(story, /Игрок определяет поступки/);
 assert.match(story, /Все персонажи, участвовавшие/);
 assert.match(story, /\+1 к характеристике и 1 очко умения/);
 assert.match(story, /очко можно сохранить/);
 assert.equal(PERSONAL_STORY.blocks.filter(block => block.kind === 'paragraph' && block.level === 2).length, 10);
});

test('well revision keeps saved scene ids while fixing the ritual deadline and location', () => {
 const well = getAdventure('proklyatie-starogo-kolodtsa');
 assert.ok(ADVENTURES.includes(well));
 assert.equal(well.region, 'Гардарика · Заречье');
 for (const id of ['arrival','well','house','forest','mire','dusk','farewell','forge']) assert.ok(well.scenes.some(scene => scene.id === id));
 assert.equal(new Set(well.scenes.map(scene => scene.id)).size, well.scenes.length);
 assert.match(well.opening, /утром или днём/);
 assert.doesNotMatch(text([well.pacing,well.clues,well.scenes,well.handouts]), /На следующий день герои|две недели|Только у тела Петра можно|принеси оба к колодцу/);
 assert.match(text(well.clues), /Ждать вечера или оставаться у колодца не нужно/);
 assert.match(text(well.handouts), /Место не важно/);
 assert.match(text(well.rewards), /При бегстве с незавершённым делом полной платы нет/);
 assert.match(text(well.endings), /останки для погребения/);
});

test('full well guide preserves the farewell, Danila secret and optional continuation', () => {
 const well = getAdventure('proklyatie-starogo-kolodtsa');
 assert.equal(well.guide, WELL_BOOK_GUIDE);
 const guide = text(WELL_BOOK_GUIDE);
 assert.match(guide, /Тайна Данилы/);
 assert.match(guide, /Ты ещё можешь услышать его/);
 assert.match(guide, /не доказывает участия Чернобога/);
 assert.match(guide, /После боя с вервольфом или при отсутствии Данилы выберите только подходящие детали/);
});
