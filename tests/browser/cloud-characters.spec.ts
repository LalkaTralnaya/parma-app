import { expect, test } from '@playwright/test';

test('guest character transfer is batched and preserves local originals on failure', async ({ page }) => {
 const user = {
  id: '71a2cb16-5291-4e34-9743-967d621018ac',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'fixture@example.invalid',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z'
 };
 type CloudRow = {
  user_id: string;
  character_id: string;
  payload: { id: string; name: string; updatedAt: number } | null;
  client_updated_at: number;
  is_deleted: boolean;
 };
 const cloud = new Map<string, CloudRow>();
 const requests: string[] = [];
 let rejectUpload = false;
 let rejectAuth = false;

 await page.route('**/api/supabase/**', route => route.fulfill({
  status: 400,
  json: { code: 'anonymous_provider_disabled', msg: 'Unavailable in the test fixture' }
 }));
 await page.routeWebSocket('**/api/supabase/realtime/v1/websocket?*', () => {});

 await page.route('**/api/supabase/auth/v1/token?*', route => route.fulfill({
  json: { access_token: 'test-access', refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user }
 }));
 await page.route('**/api/supabase/auth/v1/user', route => {
  requests.push('GET auth/user');
  if (rejectAuth) return route.fulfill({ status: 400, json: { code: 'test_auth_failure', msg: 'Сбой проверки аккаунта' } });
  return route.fulfill({ json: user });
 });
 await page.route('**/api/supabase/rest/v1/user_characters?*', async route => {
  const request = route.request();
  if (request.method() === 'GET') {
   requests.push('GET user_characters');
   await route.fulfill({ json: [...cloud.values()] });
   return;
  }
  requests.push('POST user_characters');
  if (rejectUpload) {
   await route.fulfill({ status: 400, json: { code: 'test_upload_failure', message: 'Сбой записи' } });
   return;
  }
  const body = request.postDataJSON() as CloudRow | CloudRow[];
  for (const row of Array.isArray(body) ? body : [body]) cloud.set(row.character_id, row);
  await route.fulfill({ status: 201 });
 });

 for (const [index, name] of ['Мира', 'Лада', 'Велимир'].entries()) {
  await page.goto('/new');
  if (index === 0) await page.getByRole('button', { name: 'Закрыть обновления' }).click();
  await page.getByRole('textbox', { name: 'Имя персонажа' }).fill(name);
  await page.getByRole('button', { name: 'Сохранить персонажа' }).click();
  await expect(page).toHaveURL(/\/char\/[\da-f-]+$/);
 }

 await page.goto('/account');
 await page.getByLabel('Логин или прежний email').fill('fixture');
 await page.getByLabel('Пароль', { exact: true }).fill('fixture-password');
 await page.locator('form').filter({ has: page.locator('#cloud-login') }).getByRole('button', { name: 'Войти' }).click();
 const move = page.getByRole('button', { name: 'Перенести локальных персонажей' });
 await expect(move).toBeEnabled();

 // An explicit sync waits for the initial background reconciliation, if it is still running.
 await page.getByRole('button', { name: 'Синхронизировать' }).click();
 await expect(page.getByText('Персонажи синхронизированы.', { exact: true })).toBeVisible();
 rejectAuth = true;
 await move.click();
 await expect(page.getByText(/Сбой проверки аккаунта.*Локальные оригиналы сохранены/)).toBeVisible();
 await expect(page.getByText(/В этом браузере есть 3 персонажей/)).toBeVisible();
 expect(cloud.size).toBe(0);
 rejectAuth = false;

 rejectUpload = true;
 await move.click();
 await expect(page.getByText(/Сбой записи.*Локальные оригиналы сохранены/)).toBeVisible();
 await expect(page.getByText(/В этом браузере есть 3 персонажей/)).toBeVisible();
 expect(cloud.size).toBe(0);

 rejectUpload = false;
 requests.length = 0;
 await move.click();
 await expect(page.getByText(/Локальные персонажи перенесены в аккаунт/)).toBeVisible();
 await expect(move).toHaveCount(0);
 expect([...cloud.values()].map(row => row.payload?.name).sort()).toEqual(['Велимир', 'Лада', 'Мира']);
 expect(requests).toEqual(['GET auth/user', 'GET user_characters', 'POST user_characters']);

 const mira = [...cloud.values()].find(row => row.payload?.name === 'Мира')!;
 await page.goto('/char/' + mira.character_id);
 const name = page.getByRole('textbox', { name: 'Имя персонажа' });
 await expect(name).toHaveValue('Мира');
 requests.length = 0;
 await name.fill('Мира Сиверская');
 await name.press('Enter');
 await expect.poll(() => cloud.get(mira.character_id)?.payload?.name).toBe('Мира Сиверская');
 expect(requests).toEqual(['GET auth/user', 'POST user_characters']);

 const lada = [...cloud.values()].find(row => row.payload?.name === 'Лада')!;
 cloud.set(lada.character_id, { ...lada, is_deleted: true, payload: null, client_updated_at: lada.client_updated_at + 1 });
 await page.goto('/');
 await expect(page.getByRole('link', { name: /Мира Сиверская/ })).toBeVisible();
 await expect(page.getByRole('link', { name: /Лада/ })).toHaveCount(0);
 expect(cloud.get(lada.character_id)?.is_deleted).toBe(true);
});
