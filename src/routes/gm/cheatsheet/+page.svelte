<script lang="ts">
	let openSection = $state<string | null>('checks');

	function toggle(id: string) {
		openSection = openSection === id ? null : id;
	}
</script>

<main class="max-w-4xl mx-auto p-6">
	<header class="flex justify-between items-center mb-6 flex-wrap gap-3">
		<div>
			<h1 class="text-3xl font-bold">Шпаргалка мастера</h1>
			<p class="text-sm text-gray-500">Быстрая справка по правилам «Пармы»</p>
		</div>
		<a href="/gm" class="px-3 py-2 border rounded hover:bg-gray-50">← К мастеру</a>
	</header>

	<div class="space-y-2">
		<!-- ═══════ ПРОВЕРКИ ═══════ -->
		<div class="border rounded-lg bg-white">
			<button class="w-full text-left px-4 py-3 font-semibold flex justify-between items-center hover:bg-gray-50"
				onclick={() => toggle('checks')}>
				<span>🎲 Основные проверки</span>
				<span class="text-gray-400">{openSection === 'checks' ? '−' : '+'}</span>
			</button>
			{#if openSection === 'checks'}
				<div class="border-t px-4 py-3 space-y-4 text-sm">
					<div>
						<div class="font-semibold mb-1">Базовая формула</div>
						<div class="bg-blue-50 p-2 rounded font-mono text-xs">
							Целевое число = Характеристика + Мод. навыка + Значение навыка + Модификатор обстоятельств
						</div>
						<div class="text-xs text-gray-600 mt-1">
							Успех: к100 ≤ цель · Провал: к100 &gt; цель
						</div>
					</div>

					<div>
						<div class="font-semibold mb-1">Модификаторы обстоятельств</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1 font-mono">+20</td><td>Легче лёгкого</td><td class="text-gray-500">Известный яд с антидотом</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">+10</td><td>Легко</td><td class="text-gray-500">Цель близка, страж пьян</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">0</td><td>Стандартно</td><td class="text-gray-500">Обычные условия</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">−10</td><td>Трудно</td><td class="text-gray-500">Цель далеко, замок с секретом</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">−20</td><td>Экстремально</td><td class="text-gray-500">Почти невозможно</td></tr>
								<tr><td class="py-1 font-mono">−40</td><td>Невозможно</td><td class="text-gray-500">Проклятие Чернобога</td></tr>
							</tbody>
						</table>
					</div>

					<div>
						<div class="font-semibold mb-1">Виды проверок</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1 font-semibold">Навык</td><td>Хар-ка + мод. + очки</td><td class="text-gray-500">Взлом: 36+6+2 = 44</td></tr>
								<tr class="border-b"><td class="py-1 font-semibold">Избавление</td><td>Хар-ка + бонус навыка</td><td class="text-gray-500">Стойкость: 42+8 = 50</td></tr>
								<tr><td class="py-1 font-semibold">Атака</td><td>30 + мод. + бонус − Броня</td><td class="text-gray-500">Меч: 30+8−5 = 23</td></tr>
							</tbody>
						</table>
					</div>

					<div>
						<div class="font-semibold mb-1">Критические значения</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1 font-mono">«1»</td><td class="font-semibold text-green-700">Правь</td><td class="text-gray-500">Успех + доп. эффект</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">11,22…99</td><td class="font-semibold text-blue-700">Явь</td><td class="text-gray-500">Успех ≤ + необычный эффект</td></tr>
								<tr><td class="py-1 font-mono">«100»</td><td class="font-semibold text-red-700">Навь</td><td class="text-gray-500">Провал + неприятность</td></tr>
							</tbody>
						</table>
					</div>

					<div>
						<div class="font-semibold mb-1">Встречная проверка</div>
						<div class="text-xs space-y-1">
							<div>• Оба успешны → побеждает большая <strong>маржа</strong> (цель − бросок)</div>
							<div>• Один успешен → побеждает успешный</div>
							<div>• Оба провалились → ничья</div>
							<div>• Крит «1» → автоуспех · «100» → автопровал</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- ═══════ БОЙ ═══════ -->
		<div class="border rounded-lg bg-white">
			<button class="w-full text-left px-4 py-3 font-semibold flex justify-between items-center hover:bg-gray-50"
				onclick={() => toggle('combat')}>
				<span>⚔ Бой</span>
				<span class="text-gray-400">{openSection === 'combat' ? '−' : '+'}</span>
			</button>
			{#if openSection === 'combat'}
				<div class="border-t px-4 py-3 space-y-4 text-sm">
					<div>
						<div class="font-semibold mb-1">Порядок ходов (Прыть)</div>
						<div class="text-xs">к20 + мод. Ловкости, от большего к меньшему.</div>
					</div>

					<div>
						<div class="font-semibold mb-1">Что можно сделать за ход</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1 font-semibold">Обычная атака</td><td>+0 к попаданию</td></tr>
								<tr class="border-b"><td class="py-1 font-semibold">Сильная атака</td><td>+10 к попаданию, +1 куб урона. Весь ход.</td></tr>
								<tr class="border-b"><td class="py-1 font-semibold">Быстрая атака</td><td>два удара с −5 к попаданию</td></tr>
								<tr><td class="py-1 font-semibold">Использовать предмет</td><td>зелье, свиток и т.п.</td></tr>
							</tbody>
						</table>
					</div>

					<div>
						<div class="font-semibold mb-1">Перемещение</div>
						<div class="text-xs space-y-1">
							<div>• Обычное: 8 саженей</div>
							<div>• Бег: +4 сажени за 2 Бдр (всего 12)</div>
							<div>• Лазанье / плавание: 4 сажени, 2 Бдр, проверка Атлетики</div>
							<div>• Падение: до 4 саж. — 1к6; 5–10 саж. — 2к8; &gt;10 — 4к10+</div>
						</div>
					</div>

					<div>
						<div class="font-semibold mb-1">Реакции</div>
						<div class="text-xs space-y-1">
							<div>• Провокационная атака при отходе противника</div>
							<div>• Блок щитом: помеха −5 к атаке по союзнику, 2 Бдр</div>
						</div>
					</div>

					<div>
						<div class="font-semibold mb-1">Критические удары в бою</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1 font-mono">«1»</td><td class="font-semibold">Правь</td><td>макс. урон + к12 по Таблице 1</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">дубль</td><td class="font-semibold">Явь</td><td>обычный + к10 по Таблице 2</td></tr>
								<tr><td class="py-1 font-mono">«100»</td><td class="font-semibold">Навь</td><td>промах + к12 по Таблице 3</td></tr>
							</tbody>
						</table>
					</div>

					<div>
						<div class="font-semibold mb-1">Таблица 1. Правь (к12)</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1 font-mono">1–2</td><td>Сокрушительный удар: +1к6 (+1к8 двуручное)</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">3–4</td><td>Отсечение конечности</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">5–6</td><td>Слом щита/доспеха (или перелом ребра → Изнеможение)</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">7–8</td><td>Руда (1к4 Жвч/раунд, 3 раунда)</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">9–10</td><td>Оглушение: пропуск хода, −10 Броня до конца раунда</td></tr>
								<tr><td class="py-1 font-mono">11–12</td><td>Отбрасывание на 2 сажени + падение</td></tr>
							</tbody>
						</table>
					</div>

					<div>
						<div class="font-semibold mb-1">Таблица 2. Явь (к10)</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1 font-mono">1–2</td><td>+1к4 (+1к6 двуручное)</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">3–4</td><td>Выбивание оружия</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">5–6</td><td>1 Очко Резонанса оружию</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">7–8</td><td>+5 Броня до конца следующего раунда</td></tr>
								<tr><td class="py-1 font-mono">9–10</td><td>Знамение: −5 к Наблюдательности врага</td></tr>
							</tbody>
						</table>
					</div>

					<div>
						<div class="font-semibold mb-1">Таблица 3. Навь (к12)</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1 font-mono">1–2</td><td>Потеря оружия</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">3–4</td><td>Потеря равновесия (падение)</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">5–6</td><td>Застревание оружия</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">7–8</td><td>Удар по союзнику (половина урона)</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">9–10</td><td>Трещина в оружии (−2 ПР)</td></tr>
								<tr><td class="py-1 font-mono">11–12</td><td>Растяжение (Изнеможение 1 раунд)</td></tr>
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>

		<!-- ═══════ МАГИЯ ═══════ -->
		<div class="border rounded-lg bg-white">
			<button class="w-full text-left px-4 py-3 font-semibold flex justify-between items-center hover:bg-gray-50"
				onclick={() => toggle('magic')}>
				<span>✨ Магия</span>
				<span class="text-gray-400">{openSection === 'magic' ? '−' : '+'}</span>
			</button>
			{#if openSection === 'magic'}
				<div class="border-t px-4 py-3 space-y-4 text-sm">
					<div>
						<div class="font-semibold mb-1">Проверка сотворения</div>
						<div class="bg-purple-50 p-2 rounded font-mono text-xs">
							Успех: к100 ≤ Характеристика + Значение навыка школы
						</div>
						<table class="w-full text-xs mt-2">
							<tbody>
								<tr class="border-b"><td class="py-1 font-semibold">Крит «1»</td><td>Эффект максимален, ресурсы не тратятся</td></tr>
								<tr class="border-b"><td class="py-1 font-semibold">Успех</td><td>Заклинание срабатывает</td></tr>
								<tr class="border-b"><td class="py-1 font-semibold">Провал</td><td>Не срабатывает, ресурсы потрачены</td></tr>
								<tr><td class="py-1 font-semibold">Крит «100»</td><td>1к4 Жв/Блг урона, школа недоступна 1 раунд</td></tr>
							</tbody>
						</table>
					</div>

					<div>
						<div class="font-semibold mb-1">Пороги стабильности школ</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1">Разрушение</td><td class="font-mono">36</td><td class="text-gray-500">целевое число проверки</td></tr>
								<tr class="border-b"><td class="py-1">Изменение</td><td class="font-mono">42</td><td class="text-gray-500"></td></tr>
								<tr class="border-b"><td class="py-1">Колдовство</td><td class="font-mono">42</td><td class="text-gray-500"></td></tr>
								<tr class="border-b"><td class="py-1">Иллюзия</td><td class="font-mono">36</td><td class="text-gray-500"></td></tr>
								<tr class="border-b"><td class="py-1">Восстановление</td><td class="font-mono">36</td><td class="text-gray-500"></td></tr>
								<tr class="border-b"><td class="py-1">Зачарование</td><td class="font-mono">42</td><td class="text-gray-500"></td></tr>
								<tr><td class="py-1">Молитва / Сила высших</td><td class="font-mono">36</td><td class="text-gray-500"></td></tr>
							</tbody>
						</table>
						<div class="text-xs text-gray-500 mt-1">
							Если ниже порога: стоимость ×2, эффект ×½, при провале — осечка 1к4.
						</div>
					</div>

					<div>
						<div class="font-semibold mb-1">Пороги уровней заклинаний</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1 font-mono">0 ур.</td><td>по порогу стабильности школы</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">1 ур.</td><td>характеристика 42+</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">2 ур.</td><td>характеристика 54+</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">3 ур.</td><td>характеристика 72+</td></tr>
								<tr><td class="py-1 font-mono">4 ур.</td><td>характеристика 84+</td></tr>
							</tbody>
						</table>
					</div>

					<div>
						<div class="font-semibold mb-1">Таблица 1. Сбой (к10)</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1 font-mono">1–2</td><td>Малая утечка: 1к4 Жв/Блг сверх</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">3–4</td><td>Ослабление: эффект вдвое слабее</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">5–6</td><td>Задержка: сработает в конце следующего хода</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">7–8</td><td>Откат: не сработало, ресурсы сохранены</td></tr>
								<tr><td class="py-1 font-mono">9–10</td><td>Вспышка: −5 к атакам и проверкам до конца следующего хода</td></tr>
							</tbody>
						</table>
					</div>

					<div>
						<div class="font-semibold mb-1">Таблица 2. Явь (к10)</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1 font-mono">1–2</td><td>Экономия: −1к4 Жв/Блг (мин. 1)</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">3–4</td><td>Усиление: +1к4 урона/эффекта или +1 раунд</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">5–6</td><td>Эхо: слабый вторичный эффект</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">7–8</td><td>Озарение: +5 к проверке той же школы до конца дня</td></tr>
								<tr><td class="py-1 font-mono">9–10</td><td>Знак: +5 к следующей Религии или Молитве в час</td></tr>
							</tbody>
						</table>
					</div>

					<div>
						<div class="font-semibold mb-1">Таблица 3. Навь (к20)</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1 font-mono">1–2</td><td>Истощение: 2к4 Жвч</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">3–4</td><td>Ожог: 1к8 Жв сверх, школа недоступна 1 раунд</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">5–6</td><td>Рикошет: бьёт по случайной цели в 4 саженях</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">7–8</td><td>Гул: привлекает всех в 50 саженях</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">9–10</td><td>Холод: Обморожение 1 раунд</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">11–12</td><td>Тлен: 1 ОТ (нежива) или −5 к след. 2 проверкам</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">13–14</td><td>Дезориентация: перемещение вдвое, нет реакции</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">15–16</td><td>Блокировка: школа недоступна 1к4 раунда</td></tr>
								<tr class="border-b"><td class="py-1 font-mono">17–18</td><td>Отражение: урон бьёт по заклинателю (½)</td></tr>
								<tr><td class="py-1 font-mono">19–20</td><td>Странная аномалия (к8, таблица 4)</td></tr>
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>

		<!-- ═══════ СОСТОЯНИЯ ═══════ -->
		<div class="border rounded-lg bg-white">
			<button class="w-full text-left px-4 py-3 font-semibold flex justify-between items-center hover:bg-gray-50"
				onclick={() => toggle('states')}>
				<span>💀 Состояния</span>
				<span class="text-gray-400">{openSection === 'states' ? '−' : '+'}</span>
			</button>
			{#if openSection === 'states'}
				<div class="border-t px-4 py-3 text-sm">
					<table class="w-full text-xs">
						<thead class="bg-gray-100">
							<tr>
								<th class="text-left px-2 py-1">Состояние</th>
								<th class="text-left px-2 py-1">Эффект</th>
								<th class="text-left px-2 py-1">Снятие</th>
							</tr>
						</thead>
						<tbody>
							<tr class="border-b"><td class="px-2 py-1 font-semibold">Руда</td><td class="px-2 py-1">−1к4 Жвч/ход, 3 раунда</td><td class="px-2 py-1 text-gray-500">Лечение, перевязка</td></tr>
							<tr class="border-b"><td class="px-2 py-1 font-semibold">Отрава</td><td class="px-2 py-1">−10 к проверкам, 5 раундов</td><td class="px-2 py-1 text-gray-500">Противоядие</td></tr>
							<tr class="border-b"><td class="px-2 py-1 font-semibold">Ошеломление</td><td class="px-2 py-1">Пропуск хода, −20 Броня, 1 раунд</td><td class="px-2 py-1 text-gray-500">Ожидание</td></tr>
							<tr class="border-b"><td class="px-2 py-1 font-semibold">Тьма</td><td class="px-2 py-1">−30 к атакам, провал Скрытности, 2–5 раундов</td><td class="px-2 py-1 text-gray-500">Лечение, ожидание</td></tr>
							<tr class="border-b"><td class="px-2 py-1 font-semibold">Жуть</td><td class="px-2 py-1">Бегство, −15 Броня, 1–3 раунда</td><td class="px-2 py-1 text-gray-500">Избавление Интеллекта</td></tr>
							<tr class="border-b"><td class="px-2 py-1 font-semibold">Морок</td><td class="px-2 py-1">Видит врага как союзника, до конца боя</td><td class="px-2 py-1 text-gray-500">Урон от источника</td></tr>
							<tr class="border-b"><td class="px-2 py-1 font-semibold">Оцепенение</td><td class="px-2 py-1">Не двигается, криты авт., 1–2 раунда</td><td class="px-2 py-1 text-gray-500">Избавление Силы/Инт</td></tr>
							<tr class="border-b"><td class="px-2 py-1 font-semibold">Горение</td><td class="px-2 py-1">−1к6 Жвч/ход, 2 раунда</td><td class="px-2 py-1 text-gray-500">Тушение (действие)</td></tr>
							<tr class="border-b"><td class="px-2 py-1 font-semibold">Обморожение</td><td class="px-2 py-1">−10 скорость, −5 атаки, 3 раунда</td><td class="px-2 py-1 text-gray-500">Тепло, лечение</td></tr>
							<tr class="border-b"><td class="px-2 py-1 font-semibold">Изнеможение</td><td class="px-2 py-1">−20 к макс. Бдр</td><td class="px-2 py-1 text-gray-500">Продолж. отдых</td></tr>
							<tr class="border-b"><td class="px-2 py-1 font-semibold">Хворь</td><td class="px-2 py-1">−5 ко всем хар-кам</td><td class="px-2 py-1 text-gray-500">Зелье, заклинание, алхимия</td></tr>
							<tr class="border-b"><td class="px-2 py-1 font-semibold">Сокрытие</td><td class="px-2 py-1">+30 Скрытность, −20 к атакам по цели</td><td class="px-2 py-1 text-gray-500">Рассеивание, атака</td></tr>
							<tr><td class="px-2 py-1 font-semibold">Маг. сон</td><td class="px-2 py-1">Не действует, сложно разбудить</td><td class="px-2 py-1 text-gray-500">Избавление Инт/Рел</td></tr>
						</tbody>
					</table>
				</div>
			{/if}
		</div>

		<!-- ═══════ ГРАНЬ ═══════ -->
		<div class="border rounded-lg bg-white">
			<button class="w-full text-left px-4 py-3 font-semibold flex justify-between items-center hover:bg-gray-50"
				onclick={() => toggle('edge')}>
				<span>☠ Грань (смерть и возвращение)</span>
				<span class="text-gray-400">{openSection === 'edge' ? '−' : '+'}</span>
			</button>
			{#if openSection === 'edge'}
				<div class="border-t px-4 py-3 space-y-3 text-sm">
					<div class="text-xs">
						Жвч 0 → состояние «При смерти». В начале каждого хода выбор:
					</div>
					<table class="w-full text-xs">
						<tbody>
							<tr class="border-b">
								<td class="py-2 align-top font-semibold">Голос Крови (Предки)</td>
								<td class="py-2">Временные Жвч: 10 + мод. Силы. Приходит в сознание. После возвращения — 1 уровень Истощения.<br>
									<span class="text-gray-500">1 раз за время «при смерти»</span></td>
							</tr>
							<tr class="border-b">
								<td class="py-2 align-top font-semibold">Зов Живы (Долг)</td>
								<td class="py-2">Восстанавливает 10 + мод. Инт реальных Жвч. После боя — метка «Долг Живе» (−5 макс. Жвч за каждую).<br>
									<span class="text-gray-500">1 раз за время «при смерти»</span></td>
							</tr>
							<tr>
								<td class="py-2 align-top font-semibold">Удержаться</td>
								<td class="py-2">Избавление Стойкости: к100 ≤ Сила + Стойкость. Успех → стабилизация с 1 Жвч + 1 Истощение. Провал → −1 Жвч.<br>
									<span class="text-gray-500">многократно</span></td>
							</tr>
						</tbody>
					</table>

					<div class="bg-red-50 p-2 rounded text-xs">
						<strong>Мгновенная смерть:</strong> если урон превышает максимальный Жвч вдвое — смерть без стадий.
					</div>

					<div class="bg-blue-50 p-2 rounded text-xs">
						<strong>Помощь союзников:</strong> действие + проверка Восстановления → стабилизация без сознания.
					</div>

					<div>
						<div class="font-semibold mb-1">Метка Нави (после воскрешения)</div>
						<ul class="text-xs space-y-0.5 list-disc list-inside">
							<li>−10% к восстановлению живы</li>
							<li>Социальные штрафы с верующими</li>
							<li>Нежить не атакует первой</li>
							<li>+5 к проверке «Удержаться»</li>
						</ul>
					</div>
				</div>
			{/if}
		</div>

		<!-- ═══════ ЭКОНОМИКА ═══════ -->
		<div class="border rounded-lg bg-white">
			<button class="w-full text-left px-4 py-3 font-semibold flex justify-between items-center hover:bg-gray-50"
				onclick={() => toggle('economy')}>
				<span>💰 Экономика и снаряжение</span>
				<span class="text-gray-400">{openSection === 'economy' ? '−' : '+'}</span>
			</button>
			{#if openSection === 'economy'}
				<div class="border-t px-4 py-3 space-y-3 text-sm">
					<div>
						<div class="font-semibold mb-1">Монеты</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1 font-semibold">Медяк (м)</td><td>100 м = 1 с · «Искорка»</td></tr>
								<tr class="border-b"><td class="py-1 font-semibold">Серебряник (с)</td><td>100 с = 1 з · «Живинка»</td></tr>
								<tr><td class="py-1 font-semibold">Златник (з)</td><td>«Коло / Солнышко»</td></tr>
							</tbody>
						</table>
					</div>

					<div>
						<div class="font-semibold mb-1">Награды за задания</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1">Бытовое</td><td>5–20 м</td></tr>
								<tr class="border-b"><td class="py-1">Опасное, локальное</td><td>1–5 с</td></tr>
								<tr class="border-b"><td class="py-1">Серьёзное</td><td>10–50 с</td></tr>
								<tr class="border-b"><td class="py-1">Городское / политическое</td><td>50–200 с + земля/титул</td></tr>
								<tr><td class="py-1">Эпическое</td><td>500+ с + златники + легендарные предметы</td></tr>
							</tbody>
						</table>
					</div>

					<div>
						<div class="font-semibold mb-1">Оружие (краткая)</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1">Кинжал</td><td>5 с</td><td>1к4 колющий, лёгкое, две атаки</td></tr>
								<tr class="border-b"><td class="py-1">Короткий меч</td><td>20 с</td><td>1к6 режущий</td></tr>
								<tr class="border-b"><td class="py-1">Полуторный меч</td><td>30 с</td><td>1к6 / 1к8 (две руки)</td></tr>
								<tr class="border-b"><td class="py-1">Двуручный меч</td><td>50 с</td><td>1к10 режущий</td></tr>
								<tr class="border-b"><td class="py-1">Алебарда</td><td>60 с</td><td>1к12 рубящий, подсечка</td></tr>
								<tr class="border-b"><td class="py-1">Короткий лук</td><td>30 с</td><td>1к6 колющий</td></tr>
								<tr><td class="py-1">Длинный лук</td><td>50 с</td><td>1к8 колющий, нужна Сила 42+</td></tr>
							</tbody>
						</table>
					</div>

					<div>
						<div class="font-semibold mb-1">Доспехи</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1">Лёгкий доспех</td><td>30 с</td><td>+5 Броня</td></tr>
								<tr class="border-b"><td class="py-1">Тяжёлый доспех</td><td>200 с</td><td>+10 Броня</td></tr>
								<tr><td class="py-1">Щит деревянный</td><td>15 с</td><td>+5 Броня, нужен Блокирование</td></tr>
							</tbody>
						</table>
					</div>

					<div>
						<div class="font-semibold mb-1">Магия и алхимия</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1">Зелье здоровья</td><td>5 с</td><td>1к6+2 Жвч</td></tr>
								<tr class="border-b"><td class="py-1">Зелье лечения</td><td>30 с</td><td>2к6+4 Жвч</td></tr>
								<tr class="border-b"><td class="py-1">Свиток заклинания (1 ур.)</td><td>50 с</td><td>одноразово</td></tr>
								<tr class="border-b"><td class="py-1">Книга заклинаний (3–5 закл.)</td><td>200–500 с</td><td>—</td></tr>
								<tr class="border-b"><td class="py-1">Магический кристалл</td><td>10 с</td><td>+1к4 Искра для механизмов</td></tr>
								<tr><td class="py-1">Святая вода</td><td>5 с</td><td>1к6 урона излучением нежити</td></tr>
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>

		<!-- ═══════ ИЗНОС ═══════ -->
		<div class="border rounded-lg bg-white">
			<button class="w-full text-left px-4 py-3 font-semibold flex justify-between items-center hover:bg-gray-50"
				onclick={() => toggle('wear')}>
				<span>🔧 Износ доспехов и оружия</span>
				<span class="text-gray-400">{openSection === 'wear' ? '−' : '+'}</span>
			</button>
			{#if openSection === 'wear'}
				<div class="border-t px-4 py-3 space-y-3 text-sm">
					<div>
						<div class="font-semibold mb-1">Базовая прочность</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1">Лёгкий доспех</td><td class="font-mono">5</td></tr>
								<tr class="border-b"><td class="py-1">Тяжёлый доспех</td><td class="font-mono">7</td></tr>
								<tr class="border-b"><td class="py-1">Щит</td><td class="font-mono">5</td></tr>
								<tr class="border-b"><td class="py-1">Лёгкое оружие (кинжал)</td><td class="font-mono">4</td></tr>
								<tr class="border-b"><td class="py-1">Одноручное</td><td class="font-mono">5</td></tr>
								<tr class="border-b"><td class="py-1">Двуручное</td><td class="font-mono">6</td></tr>
								<tr><td class="py-1">Лук</td><td class="font-mono">4</td></tr>
							</tbody>
						</table>
					</div>

					<div>
						<div class="font-semibold mb-1">Когда теряется прочность</div>
						<div class="text-xs space-y-0.5">
							<div>• Крит. попадание («1» или дубль) по владельцу → доспех/щит −1</div>
							<div>• Крит. провал атаки («100») → оружие −1</div>
							<div>• Силовая атака дробящим (провал Избавления Силы) → доспех/щит −1</div>
							<div>• Промах на 20+ по твёрдой цели → оружие −1</div>
						</div>
					</div>

					<div>
						<div class="font-semibold mb-1">Эффекты износа</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1">60%+ от макс.</td><td>Без штрафа</td></tr>
								<tr class="border-b"><td class="py-1">31–60%</td><td>−1 Броня / −5 атака, −1 урон</td></tr>
								<tr class="border-b"><td class="py-1">1–30%</td><td>−2 Броня / −10 атака, −2 урон</td></tr>
								<tr><td class="py-1">0</td><td>Разрушен / сломано</td></tr>
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>

		<!-- ═══════ ОТДЫХ И РЕСУРСЫ ═══════ -->
		<div class="border rounded-lg bg-white">
			<button class="w-full text-left px-4 py-3 font-semibold flex justify-between items-center hover:bg-gray-50"
				onclick={() => toggle('rest')}>
				<span>💤 Отдых и ресурсы</span>
				<span class="text-gray-400">{openSection === 'rest' ? '−' : '+'}</span>
			</button>
			{#if openSection === 'rest'}
				<div class="border-t px-4 py-3 space-y-3 text-sm">
					<div>
						<div class="font-semibold mb-1">Ресурсы</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b"><td class="py-1 font-semibold">Жвч</td><td>Сила</td><td>20 + мод. ×1</td><td>1к6 + мод.</td></tr>
								<tr class="border-b"><td class="py-1 font-semibold">Жв</td><td>Инт</td><td>10 + мод. ×2</td><td>1к8 + мод.</td></tr>
								<tr class="border-b"><td class="py-1 font-semibold">Бдр</td><td>Лов</td><td>15 + мод. ×1</td><td>1к6 + мод.</td></tr>
								<tr class="border-b"><td class="py-1 font-semibold">Влн</td><td>Крас</td><td>15 + мод. ×1</td><td>1к6 + мод.</td></tr>
								<tr><td class="py-1 font-semibold">Блг</td><td>Рел</td><td>10 + мод. ×2</td><td>1к8 + мод.</td></tr>
							</tbody>
						</table>
					</div>

					<div>
						<div class="font-semibold mb-1">Отдых</div>
						<table class="w-full text-xs">
							<tbody>
								<tr class="border-b">
									<td class="py-2 align-top font-semibold">Короткий (1 час)</td>
									<td class="py-2">Проверка основной хар-ки: успех → ½ макс., дубль или крит «1» → ⅔. Один раз между длит. отдыхом.</td>
								</tr>
								<tr>
									<td class="py-2 align-top font-semibold">Продолжительный (8 ч)</td>
									<td class="py-2">Все ресурсы полностью. Только здесь можно повышать характеристики и навыки.</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>
	</div>
</main>