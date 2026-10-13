import test from 'node:test';
import assert from 'node:assert/strict';
import { playerText,playerTable } from '../src/lib/ui/player-copy.ts';
test('editorial notes disappear while game rules and markdown stay intact',()=>{
 assert.equal(playerText('Предлагаемая двухручная версия: 6 Живы до скидки, до 2 минут.'),'двухручная версия: 6 Живы до скидки, до 2 минут.');
 assert.equal(playerText('Основание: книга + предложение.\nТребуются две свободные руки.'),'Требуются две свободные руки.');
 assert.equal(playerText('Состояние: союз. Основание: книга.'),'Состояние: союз.');
 const conditions='**−10 к скорости, минимум до 0; −5 к атакам и проверкам Ловкости**, 3 раунда.';
 assert.equal(playerText('Для рабочей редакции принимается подробная карточка состояния как единый источник: '+conditions+' Это предлагаемое разрешение расхождения, требующее авторской проверки; общая книга ещё не исправлена.'),'Обморожение: '+conditions);
 assert.equal(playerText('При провале цель теряет 1к4 Здравия. Нежить не получает лечения.'),'При провале цель теряет 1к4 Здравия. Нежить не получает лечения.');
});
test('remove editorial columns, preserve in-world proposals and game statuses',()=>{
 assert.deepEqual(playerTable([['Умение','Цена','Статус'],['Лечение','2 Живы','Записано в общий черновик']]),[['Умение','Цена'],['Лечение','2 Живы']]);
 assert.deepEqual(playerTable([['Имя','Статус'],['Воин','Оцепенение']]),[['Имя','Статус'],['Воин','Оцепенение']]);
 assert.equal(playerText('Проверить предложение Подковы купить весь будущий урожай за аванс.'),'Проверить предложение Подковы купить весь будущий урожай за аванс.');
});
