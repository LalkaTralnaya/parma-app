import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { LATEST_RELEASE } from '../../src/lib/releases';

const guestId = '3d20259c-f1be-44a3-aaf8-02dd44cbca73';
const roomId = '9988dc26-84bb-46ca-8071-28927bd46c7e';
const invite = 'a'.repeat(64);
const otherInvite = 'b'.repeat(64);
const room = { id: roomId, code: invite, name: 'Дорожный дозор', master_auth_id: 'another-user' };
const otherRoom = { ...room, id: '2d2608f3-0ec4-412a-a563-10d813fa06f0', code: otherInvite, name: 'Северный дозор' };
const characterName = 'Радомир';
const serverRoll = 'Прыть: к20 = 13 · серверный бросок';

function gate() {
 let open!: () => void;
 const promise = new Promise<void>(resolve => { open = resolve; });
 return { promise, open };
}

async function mockRooms(context: BrowserContext, beforeLookup?: () => Promise<number | void>) {
 const calls = new Map<string, number>();
 const subscriptions: string[][] = [];
 const user = { id: guestId, aud: 'authenticated', role: 'authenticated', is_anonymous: true };
 const tokenPart = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
 const token = `${tokenPart({ alg: 'HS256', typ: 'JWT' })}.${tokenPart({ sub: guestId, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture`;
 const guest = { id: 'participant', room_id: roomId, auth_user_id: guestId, device_id: guestId, role: 'player', display_name: characterName };
 const history = [{
  id: 'roll-1', room_id: roomId, device_id: guestId, character_name: characterName, roll_type: 'server_dice',
  server_roll_id: 'roll-request', created_at: new Date().toISOString(),
  roll_data: { label: 'Прыть', sides: [20], values: [13] }
 }];

 await context.addInitScript(release => localStorage.setItem('parma.release-notes.seen', release), LATEST_RELEASE.id);
 await context.route('**/api/supabase/**', async route => {
  const path = new URL(route.request().url()).pathname.replace('/api/supabase', '');
  calls.set(path, (calls.get(path) ?? 0) + 1);
  if (path === '/rest/v1/rpc/lookup_room_by_invite') {
   const status = (await beforeLookup?.()) ?? 200;
   const { p_code } = route.request().postDataJSON();
   expect([invite, otherInvite]).toContain(p_code);
   if (status !== 200) return route.fulfill({ status, json: { message: 'History lookup interrupted' } });
   await route.fulfill({ json: p_code === invite ? room : otherRoom });
   return;
  }
  const responses: Record<string, unknown> = {
   '/auth/v1/signup': { user, access_token: token, token_type: 'bearer', refresh_token: 'fixture', expires_in: 3600 },
   '/rest/v1/rooms': [],
   '/rest/v1/rpc/join_secure_room': guest,
   '/rest/v1/room_combat': { state: {} },
   '/rest/v1/room_participants': [guest],
   '/rest/v1/room_rolls': history
  };
  if (!(path in responses)) return route.fulfill({ status: 501, json: { message: 'Unknown request in the browser test' } });
  await route.fulfill({ json: responses[path] });
 });

 await context.routeWebSocket(/\/api\/supabase\/realtime\/v1\/websocket/, socket => {
  socket.onMessage(message => {
   if (typeof message !== 'string') return;
   const data = JSON.parse(message);
   const event = Array.isArray(data) ? data[3] : data.event;
   const payload = Array.isArray(data) ? data[4] : data.payload;
   if (event === 'phx_join') {
    subscriptions.push(payload.config.postgres_changes.map((entry: { table: string }) => entry.table));
   }
  });
 });
 return { calls, subscriptions };
}

async function joinFromForm(page: Page, code: string) {
 await page.goto('/room');
 await page.getByRole('button', { name: /Я игрок/ }).click();
 await page.getByRole('textbox', { name: 'Ваше имя' }).fill(characterName);
 await page.getByRole('textbox', { name: 'Секрет приглашения' }).fill(code.toUpperCase());
 await page.getByRole('button', { name: 'Войти', exact: true }).click();
}

test('room and global chat share lookups, history, and the room subscription', async ({ context, page }) => {
 const { calls, subscriptions } = await mockRooms(context);
 await joinFromForm(page, invite);
 await expect(page.getByRole('heading', { name: room.name })).toBeVisible();
 await expect(page.getByText('Вы — игрок', { exact: true })).toBeVisible();
 await expect(page.getByText(serverRoll, { exact: true })).toBeVisible();
 await expect(page.getByRole('button', { name: 'Удалить комнату' })).toBeHidden();
 await page.getByRole('button', { name: 'Броски комнаты' }).click();
 const chat = page.getByRole('dialog', { name: 'Броски комнаты' });
 await expect(chat.getByText(serverRoll, { exact: true })).toBeVisible();

 expect(calls.get('/rest/v1/rpc/lookup_room_by_invite')).toBe(1);
 expect(calls.get('/rest/v1/room_rolls')).toBe(1);
 expect([...calls.values()].reduce((sum, count) => sum + count, 0)).toBe(7);
 await expect.poll(() => subscriptions).toHaveLength(2);
 expect(subscriptions.filter(tables => tables.includes('room_rolls'))).toHaveLength(1);
});

test('leaving a room page before the lookup completes does not join or subscribe', async ({ context, page }) => {
 const lookup = gate();
 const requested = gate();
 const { calls, subscriptions } = await mockRooms(context, async () => {
  requested.open();
  await lookup.promise;
 });
 try {
  await page.goto('/room/' + invite);
  await requested.promise;
  await page.getByRole('link', { name: 'Парма — главная' }).click();
  await expect(page).toHaveURL(/\/$/);
 } finally {
  lookup.open();
 }
 const chat = page.getByRole('button', { name: 'Броски комнаты' });
 await chat.click();
 await expect(page.getByRole('dialog', { name: 'Броски комнаты' }).getByRole('link', { name: /Войти|Создать/ }).first()).toBeVisible();
 expect(await page.evaluate(() => localStorage.getItem('parma_current_room_code'))).toBeNull();
 expect(calls.has('/rest/v1/rpc/join_secure_room')).toBe(false);
 expect(subscriptions).toEqual([]);
});

test('a different tab joining a room updates the open chat', async ({ context, page }) => {
 await mockRooms(context);
 await page.goto('/');
 await page.getByRole('button', { name: 'Броски комнаты' }).click();
 const observer = page.getByRole('dialog', { name: 'Броски комнаты' });
 const joiningTab = await context.newPage();
 await joinFromForm(joiningTab, invite);
 await expect(joiningTab.getByRole('heading', { name: room.name })).toBeVisible();
 await expect(observer.getByText(room.name, { exact: true })).toBeVisible();
 await joinFromForm(joiningTab, otherInvite);
 await expect(joiningTab.getByRole('heading', { name: otherRoom.name })).toBeVisible();
 await expect(observer.getByText(otherRoom.name, { exact: true })).toBeVisible();
});

test('reconnecting retries chat loading after an interrupted lookup', async ({ context, page }) => {
 let failing = true;
 await mockRooms(context, async () => failing ? 503 : 200);
 // Pick an existing room without mounting its detail page.
 await context.addInitScript(code => localStorage.setItem('parma_current_room_code', code), invite.toUpperCase());
 await page.goto('/');
 await page.getByRole('button', { name: 'Броски комнаты' }).click();
 const chat = page.getByRole('dialog', { name: 'Броски комнаты' });
 await expect(chat.getByText(/Ошибка поиска/)).toBeVisible();
 failing = false;
 await page.evaluate(() => window.dispatchEvent(new Event('online')));
 await expect(chat.getByText(serverRoll, { exact: true })).toBeVisible();
});

test('the invitation field accepts a complete link and explains the separate guest session', async ({ context, page }) => {
 const { calls } = await mockRooms(context);
 await page.goto('/room');
 await page.getByRole('button', { name: /Я игрок/ }).click();
 const field = page.getByRole('textbox', { name: 'Секрет приглашения' });
 await expect(field).toHaveAccessibleDescription(/полную ссылку/);
 await expect(page.getByText(/Для комнаты используется отдельная гостевая сессия/)).toBeVisible();
 await page.getByRole('textbox', { name: 'Ваше имя' }).fill(characterName);
 const invitation = 'https://parma-app.relaxdev.ru/room/' + invite;
 await field.pressSequentially(invitation);
 await expect(field).toHaveValue(invitation);
 await page.getByRole('button', { name: 'Войти', exact: true }).click();
 await expect(page.getByRole('heading', { name: room.name })).toBeVisible();
 expect(calls.get('/rest/v1/rpc/lookup_room_by_invite')).toBe(1);
});
