import { expect, test } from '@playwright/test';

test('release notes open once and are available from the footer', async ({ page }) => {
 await page.goto('/');
 const notes = page.getByRole('dialog', { name: 'Что нового в Парме' });
 await expect(notes).toBeVisible();
 await notes.getByRole('button', { name: 'Понятно' }).click();
 await page.reload();
 const history = page.getByRole('button', { name: 'История обновлений' });
 await expect(history).toBeVisible();
 await expect(notes).toBeHidden();
 await history.click();
 await expect(notes).toBeVisible();
});

test('a new character and an edited name survive reopening the sheet', async ({ page }) => {
 const browserErrors: string[] = [];
 page.on('pageerror', error => browserErrors.push(error.message));
 await page.route('**/api/supabase/auth/v1/signup', route => route.fulfill({
  status: 400,
  json: { code: 'anonymous_provider_disabled', msg: 'Anonymous sign-ins are disabled in this test' }
 }));
 await page.goto('/new');
 await page.getByRole('button', { name: 'Закрыть обновления' }).click();

 const name = page.getByRole('textbox', { name: 'Имя персонажа' });
 await name.fill('Мира');
 await page.getByRole('button', { name: 'Сохранить персонажа' }).click();
 await expect(page).toHaveURL(/\/char\/[\da-f-]+$/);
 await expect(name).toHaveValue('Мира');

 await name.fill('Мира Сиверская');
 await name.press('Enter');
 await expect(page.getByText('Имя сохранено', { exact: true })).toBeVisible();
 await page.reload();
 await expect(name).toHaveValue('Мира Сиверская');
 await expect(page.getByRole('navigation', { name: 'Разделы листа персонажа' })).toBeVisible();
 expect(browserErrors).toEqual([]);
});

test('production serves compiled pages and the world map', async ({ request, page }) => {
 const pageFailures: string[] = [];
 page.on('pageerror', error => pageFailures.push(error.message));
 page.on('response', response => {
  if (response.url().includes('/_app/') && response.status() >= 400) pageFailures.push(response.url());
 });

 const document = await request.get('/', { headers: { Accept: 'text/html' } });
 expect(document.ok()).toBe(true);
 expect(document.headers()['cache-control']).toBe('no-store');

 await page.goto('/lore/map');
 await page.getByRole('button', { name: 'Закрыть обновления' }).click();
 await expect(page.getByRole('heading', { name: 'Карта и стяги земель' })).toBeVisible();
 const map = page.getByRole('img', { name: 'Иллюстрированная карта Пармы с землями и поселениями' });
 await map.scrollIntoViewIfNeeded();
 await expect.poll(() => map.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
 expect(pageFailures).toEqual([]);
});


test('public document compression negotiates gzip and preserves the cache policy', async ({ request }) => {
 const headers = { Accept: 'text/html', 'Accept-Encoding': 'gzip' };
 const publicPage = await request.get('/mechanics', { headers });
 expect(publicPage.ok()).toBe(true);
 expect(publicPage.headers()['content-encoding']).toBe('gzip');
 expect(publicPage.headers().vary.toLowerCase()).toContain('accept-encoding');
 expect(publicPage.headers()['cache-control']).toBe('no-store');
 expect(await publicPage.text()).toContain('Правила и механики');

 const identity = await request.get('/mechanics', { headers: { ...headers, 'Accept-Encoding': '*;q=1, gzip;q=0' } });
 expect(identity.ok()).toBe(true);
 expect(identity.headers()['content-encoding']).toBeUndefined();
 expect(identity.headers().vary.toLowerCase()).toContain('accept-encoding');
 expect(await identity.text()).toContain('Правила и механики');

 const account = await request.get('/account', { headers });
 expect(account.ok()).toBe(true);
 expect(account.headers()['content-encoding']).toBeUndefined();
 const head = await request.head('/mechanics', { headers });
 expect(head.ok()).toBe(true);
 expect((await head.body()).length).toBe(0);
});

test('the preloaded world map can be retried and its flags can be selected', async ({ page, request }) => {
 const response = await request.get('/lore/map', { headers: { Accept: 'text/html' } });
 expect(response.headers().link).toContain('</heraldry/parma-map.jpg>; rel=preload; as=image');
 await page.route(url => url.pathname === '/heraldry/parma-map.jpg' && !url.search, route => route.fulfill({ status: 503 }));
 await page.goto('/lore/map');
 await page.getByRole('button', { name: 'Закрыть обновления' }).click();

 await page.getByRole('button', { name: 'Загрузить карту повторно' }).click();
 const flag = page.getByRole('button', { name: 'Показать стяги: Асгард' });
 await flag.click();
 await expect(flag).toHaveAttribute('aria-pressed', 'true');
 await expect(page.getByRole('button', { name: 'Асгард Ирийский', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('the compressed adventure page still supports secret markers and the map viewer', async ({ page }) => {
 await page.goto('/adventures/chernaya-khvor');
 await page.getByRole('button', { name: 'Закрыть обновления' }).click();
 const map = page.locator('.map-canvas img');
 await map.scrollIntoViewIfNeeded();
 await expect.poll(() => map.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
 const source = await map.getAttribute('src');
 const secretMarkers = page.locator('.map-marker.secret-marker');
 await expect(secretMarkers).toHaveCount(0);
 await page.getByRole('button', { name: 'Показать точки сказителя', exact: true }).click();
 await expect(secretMarkers.first()).toBeVisible();
 await page.getByRole('button', { name: 'Открыть карту крупнее' }).click();
 const viewer = page.getByRole('dialog', { name: 'Кривцы и Чёрные топи' });
 await expect(viewer.getByRole('img')).toHaveAttribute('src', source ?? '');
 await expect(viewer.getByRole('button', { name: /Показать в чате/ })).toBeVisible();
});

test('mechanics search keeps chapter filtering and direct links', async ({ page }) => {
 await page.goto('/mechanics');
 await page.getByRole('button', { name: 'Закрыть обновления' }).click();
 const query = page.getByRole('searchbox', { name: 'Поиск по разделам и тексту' });
 const chapter = page.getByLabel('Показать главу');
 const entries = page.locator('details.reference-entry');
 const count = await entries.count();

 await query.fill('  С ЧЕГО НАЧАТЬ ИГРУ  ');
 const introduction = page.locator('#mechanics-introduction');
 await expect(introduction).toHaveAttribute('open', '');
 await chapter.selectOption('Магия и заклинания');
 await expect(entries).toHaveCount(0);
 await chapter.selectOption('Начало игры и основные проверки');
 await expect(introduction).toHaveAttribute('open', '');

 const shortcut = page.getByRole('navigation', { name: 'Быстрый переход к новым разделам' })
  .locator('a[href="#book16-skill-growth-story"]');
 await shortcut.click();
 await expect(page).toHaveURL(/#book16-skill-growth-story$/);
 await expect(page.locator('#book16-skill-growth-story')).toHaveAttribute('open', '');
 await expect(query).toHaveValue('');
 await expect(chapter).toHaveValue('Все');
 await expect(entries).toHaveCount(count);
});

test('ability search preserves description matches and learned nodes', async ({ page }) => {
 await page.route('**/api/supabase/auth/v1/signup', route => route.fulfill({
  status: 400,
  json: { code: 'anonymous_provider_disabled', msg: 'Anonymous sign-ins are disabled in this test' }
 }));
 await page.goto('/new');
 await page.getByRole('button', { name: 'Закрыть обновления' }).click();
 await page.getByRole('textbox', { name: 'Имя персонажа' }).fill('Мира');
 await page.getByRole('button', { name: 'Сохранить персонажа' }).click();
 await expect(page).toHaveURL(/\/char\/[\da-f-]+$/);
 await page.getByRole('link', { name: 'Умения', exact: true }).click();

 const query = page.getByRole('searchbox', { name: 'Поиск по деревьям и умениям' });
 const trees = page.locator('details.ability-tree');
 const count = await trees.count();
 await query.fill('НЕИЗВЕСТНОЕ УСТРОЙСТВО');
 await expect(trees).toHaveCount(1);
 await expect(trees).toHaveAttribute('open', '');
 await expect(trees.getByRole('button', { name: 'Описание: Начала взлома', exact: true })).toBeVisible();

 const root = page.getByRole('button', { name: 'Изучить Начала взлома · 1 очко', exact: true });
 await root.click();
 const learned = page.getByRole('button', { name: 'Начала взлома. Изучено', exact: true });
 await expect(learned).toBeVisible();

 await query.fill('мощь');
 await expect(trees).toHaveCount(0);
 await query.fill('');
 await expect(trees).toHaveCount(count);
 await page.reload();
 await query.fill('неизвестное устройство');
 await expect(learned).toBeVisible();
});

test('the spell resource switch updates casting, combination and school trees', async ({ page }) => {
 await page.route('**/api/supabase/auth/v1/signup', route => route.fulfill({
  status: 400,
  json: { code: 'anonymous_provider_disabled', msg: 'Anonymous sign-ins are disabled in this test' }
 }));
 await page.goto('/new');
 await page.getByRole('button', { name: 'Закрыть обновления' }).click();
 await page.getByRole('textbox', { name: 'Имя персонажа' }).fill('Мира');
 await page.getByRole('button', { name: 'Сохранить персонажа' }).click();
 await expect(page).toHaveURL(/\/char\/[\da-f-]+$/);
 const id = new URL(page.url()).pathname.split('/').at(-1)!;
 await page.getByRole('navigation', { name: 'Разделы листа персонажа' }).waitFor();
 await page.evaluate(id => new Promise<void>((resolve, reject) => {
  const request = indexedDB.open('parma');
  request.onerror = () => reject(request.error);
  request.onsuccess = () => {
   const db = request.result;
   const transaction = db.transaction('characters', 'readwrite');
   const store = transaction.objectStore('characters');
   const record = store.get(id);
   record.onsuccess = () => {
    const character = record.result;
    store.put({
     ...character,
     raceChoice: 'strength',
     backgroundId: undefined,
     characteristics: { ...character.characteristics, intelligence: { levelUpBonus: 12 }, religion: { levelUpBonus: 24 } },
     skillPoints: { restoration: 8 },
     spells: ['heal', 'fast_heal'],
     currentResources: { ...character.currentResources, hp: 10, mana: 10, grace: 10 },
     heldSpell: { spellId: 'heal', round: 1, useTwoHands: false, useGrace: false }
    });
   };
   transaction.oncomplete = () => { db.close(); resolve(); };
   transaction.onabort = () => { db.close(); reject(transaction.error); };
  };
 }), id);
 await page.reload();
 await page.getByRole('button', { name: 'Офлайн · физические кубики' }).click();

 const toggle = page.getByRole('switch', { name: 'Творить Благодатью' });
 const magic = page.locator('section:has(> div > h2#spells)');
 const school = magic.locator('summary').filter({ has: page.getByText('Восстановление', { exact: true }) });
 const healing = magic.locator('li').filter({ has: page.getByText('Быстрое восстановление', { exact: true }) });
 const tree = page.locator('details.ability-tree > summary').filter({ hasText: 'Восстановление' });
 await school.click();
 await expect(healing.getByText('Проверка сотворения · Интеллект · к100 ≤ 64')).toBeVisible();
 await expect(tree).toHaveText('Восстановление Интеллект');
 await toggle.click();
 await expect(healing.getByText('Проверка сотворения · Религия · к100 ≤ 78')).toBeVisible();
 await expect(tree).toHaveText('Восстановление Религия');
 await expect(page.locator('details.ability-tree > summary').filter({ hasText: 'Наблюдательность' })).toHaveText('Наблюдательность Интеллект');

 await healing.getByRole('button', { name: 'Магическая атака (к100)', exact: true }).click();
 const die = page.getByRole('dialog', { name: 'Ввод физического броска' });
 await expect(die.getByText('Цель с бонусами и сложностью: ≤ 78')).toBeVisible();
 await die.getByLabel('Что выпало на кубике?').fill('99');
 await die.getByRole('button', { name: 'Ввод', exact: true }).click();
 await expect(die.getByText('Быстрое восстановление: совмещение с Лечение')).toBeVisible();
 await expect(die.getByText('Цель с бонусами и сложностью: ≤ 78')).toBeVisible();
 await die.getByLabel('Что выпало на кубике?').fill('99');
 await die.getByRole('button', { name: 'Ввод', exact: true }).click();
 await expect(page.getByText('Последняя магическая атака')).toBeVisible();
 await expect(page.getByText(/Выпало 99, цель ≤ 78/)).toBeVisible();

 await page.reload();
 await expect(toggle).toBeChecked();
 await expect(tree).toHaveText('Восстановление Религия');
 await toggle.click();
 await expect(tree).toHaveText('Восстановление Интеллект');
});
