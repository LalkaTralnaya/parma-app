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
