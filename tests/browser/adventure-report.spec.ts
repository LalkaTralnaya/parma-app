import { expect, test } from '@playwright/test';

test('the local test mode requires a loopback host and an explicit test flag', async ({ request }) => {
 expect((await request.get('/gm/adventure-report')).status()).toBe(200);
 expect((await request.get('/gm/adventure-report?test=1')).status()).toBe(200);
 expect((await request.get('/gm/adventure-report?test=1', { headers: { host: 'parma.example.invalid' } })).status()).toBe(404);
});

test('the storyteller saves separate local drafts including an unusual outcome after skipping the city', async ({ page }) => {
 const writes: string[] = [];
 await page.route('**/api/supabase/**', route => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) writes.push(route.request().method());
  return route.abort();
 });
 await page.goto('/gm/adventure-report?test=1');
 await page.getByRole('button', { name: 'Закрыть обновления' }).click();
 await expect(page.getByRole('note', { name: 'Где сохраняется тестовый отчёт' })).toContainText('в облачный экспорт не попадёт');
 const adventure = page.getByRole('combobox', { name: 'Приключение', exact: true });
 const save = page.getByRole('button', { name: 'Сохранить тестовый черновик' });
 const view = page.getByRole('button', { name: 'Посмотреть отчёт' });
 await expect(view).toHaveCount(0);
 await expect(page.getByRole('heading', { name: 'Расхождения между редакциями' })).toHaveCount(0);
 await expect(page.getByRole('textbox', { name: 'Код группы', exact: true })).toHaveAccessibleDescription(/gruppa-07/);
 await expect(page.getByRole('textbox', { name: 'Код кампании', exact: true })).toHaveAccessibleDescription(/siver-01/);
 await expect(page.getByRole('textbox', { name: 'Ветвь канона', exact: true })).toHaveAccessibleDescription(/test-main/);
 await expect(page.getByRole('textbox', { name: 'Версия канона', exact: true })).toHaveAccessibleDescription(/test-v1/);
 await expect(page.getByRole('combobox', { name: 'Передача свёртка в Вышгороде', exact: true })).toHaveCount(0);
 const wagon = page.getByRole('group', { name: 'Осмотр первой телеги' });
 await wagon.getByRole('combobox', { name: 'Решение', exact: true }).selectOption({ label: 'Сцену не играли' });
 await expect(wagon.getByRole('combobox', { name: 'Исход', exact: true })).toBeDisabled();
 const observer = page.getByRole('group', { name: 'Ночной наблюдатель' });
 await observer.getByRole('combobox', { name: 'Решение', exact: true }).selectOption({ label: 'Решение не принято' });
 await observer.getByRole('combobox', { name: 'Исход', exact: true }).selectOption({ label: 'Исход неизвестен' });
 await page.getByLabel('Код группы').fill('Тест-Дорога');
 await save.click();

 await adventure.selectOption({ label: 'Карнгорн' });
 await expect(page.getByLabel('Код группы')).toHaveValue('');
 await page.getByRole('combobox', { name: 'Передача свёртка в Вышгороде', exact: true }).selectOption({ label: 'Главу Вышгорода пропустили' });
 await page.getByLabel('Код группы').fill('Тест-Карнгорн');
 await page.getByRole('combobox', { name: 'Редакция приключения', exact: true }).selectOption('book-reference');
 await page.getByLabel('Ветвь канона').fill('Тестовая ветвь');
 await page.getByLabel('Версия канона').fill('test-1');
 const evidence = page.getByRole('group', { name: 'Улики у пустого основания' });
 await evidence.getByRole('combobox', { name: 'Решение', exact: true }).selectOption({ label: 'Другое' });
 await evidence.getByLabel('Другое решение').fill('Вымышленное действие для теста');
 await evidence.getByRole('combobox', { name: 'Исход', exact: true }).selectOption({ label: 'Другое' });
 await evidence.getByLabel('Наблюдаемый результат').fill('Вымышленный результат для теста');
 await evidence.getByLabel('Сведения героев').fill('Тестовое свидетельство');
 await evidence.getByLabel('Открытые последствия').fill('Тестовый открытый вопрос');
 await page.getByRole('combobox', { name: 'Статус проверки', exact: true }).selectOption({ label: 'Спорный' });
 await page.getByLabel('Причина отметки').fill('Свидетельства требуют сверки');
 await save.click();
 await expect(page.getByText('Черновик сохранён в этом браузере.')).toBeVisible();
 await evidence.getByLabel('Наблюдаемый результат').fill('Несохранённая правка');
 await view.click();
 const preview = page.getByRole('dialog', { name: 'Сохранённый отчёт' });
 await expect(preview.getByRole('heading', { name: 'Карнгорн' })).toBeVisible();
 await expect(preview.getByText('Вымышленный результат для теста')).toBeVisible();
 await expect(preview.getByText('Несохранённая правка')).toHaveCount(0);
 await expect(preview.getByRole('textbox')).toHaveCount(0);
 await preview.getByRole('button', { name: 'Закрыть' }).click();
 await expect(preview).toBeHidden();
 await page.reload();
 await expect(page.getByLabel('Код группы')).toHaveValue('Тест-Дорога');
 await expect(observer.getByRole('combobox', { name: 'Исход', exact: true })).toHaveValue('unknown');
 await adventure.selectOption({ label: 'Карнгорн' });
 await expect(page.getByLabel('Код группы')).toHaveValue('Тест-Карнгорн');
 await expect(page.getByRole('combobox', { name: 'Передача свёртка в Вышгороде', exact: true })).toHaveValue('skipped');
 await expect(page.getByLabel('Ветвь канона')).toHaveValue('Тестовая ветвь');
 await expect(page.getByLabel('Версия канона')).toHaveValue('test-1');
 await expect(evidence.getByRole('combobox', { name: 'Исход', exact: true })).toHaveValue('other');
 await expect(evidence.getByLabel('Другое решение')).toHaveValue('Вымышленное действие для теста');
 await expect(evidence.getByLabel('Наблюдаемый результат')).toHaveValue('Вымышленный результат для теста');
 await expect(evidence.getByLabel('Сведения героев')).toHaveValue('Тестовое свидетельство');
 await expect(evidence.getByLabel('Открытые последствия')).toHaveValue('Тестовый открытый вопрос');
 await expect(page.getByLabel('Причина отметки')).toHaveValue('Свидетельства требуют сверки');
 await view.click();
 await expect(preview.getByText('Главу Вышгорода пропустили')).toBeVisible();
 await expect(preview.getByText('Вымышленное действие для теста')).toBeVisible();
 await expect(preview.getByText('Свидетельства требуют сверки')).toBeVisible();
 expect(writes).toEqual([]);
});

test('cloud mode asks for a permanent account', async ({ page }) => {
 await page.goto('/gm/adventure-report');
 await page.getByRole('button', { name: 'Закрыть обновления' }).click();
 await expect(page.getByRole('link', { name: 'Войти в аккаунт, чтобы открыть отчёты' })).toBeVisible();
 await expect(page.getByRole('button', { name: 'Сохранить черновик', exact: true })).toHaveCount(0);
});

test('cloud drafts are scoped to the account and a stale save leaves the edits intact', async ({ page }) => {
 const user = {
  id: '71a2cb16-5291-4e34-9743-967d621018ac', aud: 'authenticated', role: 'authenticated',
  email: 'fixture@example.invalid', is_anonymous: false, app_metadata: {}, user_metadata: {}
 };
 await page.addInitScript(user => {
  localStorage.setItem('sb-127-auth-token', JSON.stringify({
   access_token: 'test-access', refresh_token: 'test-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, user
  }));
 }, user);
 await page.route('**/api/supabase/auth/v1/user', route => route.fulfill({ json: user }));

 type Row = { adventure_slug: string; revision: string; payload: Record<string, unknown> };
 let row: Row | null = null;
 const methods: string[] = [];
 await page.route('**/api/supabase/rest/v1/adventure_report_drafts?*', async route => {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method();
  methods.push(method);
  if (method === 'GET') {
   expect(url.searchParams.get('user_id')).toBe('eq.' + user.id);
   return route.fulfill({ json: row ? [row] : [] });
  }
  const body = request.postDataJSON();
  if (method === 'POST') {
   expect(body.user_id).toBe(user.id);
   expect(body.adventure_slug).toBe('doroga-v-gardariki');
   row = { adventure_slug: body.adventure_slug, payload: body.payload, revision: 'revision-1' };
   return route.fulfill({ status: 201, json: [row] });
  }
  expect(method).toBe('PATCH');
  expect(url.searchParams.get('user_id')).toBe('eq.' + user.id);
  expect(url.searchParams.get('adventure_slug')).toBe('eq.doroga-v-gardariki');
  if (!row || url.searchParams.get('revision') !== 'eq.' + row.revision) return route.fulfill({ json: [] });
  row = { ...row, payload: body.payload, revision: 'revision-2' };
  return route.fulfill({ json: [row] });
 });

 await page.goto('/gm/adventure-report');
 await page.getByRole('button', { name: 'Закрыть обновления' }).click();
 const group = page.getByRole('textbox', { name: 'Код группы', exact: true });
 const save = page.getByRole('button', { name: 'Сохранить черновик', exact: true });
 await group.fill('Облачная группа');
 await save.click();
 await expect(page.getByText('Черновик сохранён в Supabase.')).toBeVisible();
 expect(methods).toContain('POST');
 await page.reload();
 await expect(group).toHaveValue('Облачная группа');
 await page.getByRole('button', { name: 'Посмотреть отчёт' }).click();
 const preview = page.getByRole('dialog', { name: 'Сохранённый отчёт' });
 await expect(preview.getByText('Облачная группа')).toBeVisible();
 await preview.getByRole('button', { name: 'Закрыть' }).click();
 await group.fill('Сохранённая правка');
 await save.click();
 await expect(page.getByText('Черновик сохранён в Supabase.')).toBeVisible();
 expect(row!.payload.group).toBe('Сохранённая правка');
 expect(methods).toContain('PATCH');

 row = { ...row!, revision: 'revision-from-another-tab', payload: { group: 'Правка на другом устройстве' } };
 await group.fill('Мои несохранённые правки');
 await save.click();
 await expect(page.getByText(/В облаке уже сохранена другая версия отчёта/)).toBeVisible();
 await expect(group).toHaveValue('Мои несохранённые правки');
 await expect(save).toBeDisabled();
 expect(row.payload.group).toBe('Правка на другом устройстве');
 await page.getByRole('button', { name: 'Заменить правки версией из облака' }).click();
 await expect(group).toHaveValue('Правка на другом устройстве');
 await expect(save).toBeEnabled();
 expect(await page.evaluate(() => localStorage.getItem('parma.test.adventure-report.v1.doroga-v-gardariki'))).toBeNull();
});
