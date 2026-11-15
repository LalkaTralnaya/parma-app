import { expect, test } from '@playwright/test';

test('a guest opens the invited room and can read its server roll', async ({ page }) => {
 const guestId = '3d20259c-f1be-44a3-aaf8-02dd44cbca73';
 const roomId = '9988dc26-84bb-46ca-8071-28927bd46c7e';
 const invite = 'a'.repeat(64);
 const user = { id: guestId, aud: 'authenticated', role: 'authenticated', is_anonymous: true };
 const tokenPart = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
 const token = `${tokenPart({ alg: 'HS256', typ: 'JWT' })}.${tokenPart({ sub: guestId, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture`;
 const room = { id: roomId, code: invite, name: 'Дорожный дозор', master_auth_id: 'another-user' };
 const guest = { id: 'participant', room_id: roomId, auth_user_id: guestId, device_id: guestId, role: 'player', display_name: 'Радомир' };
 const history = [{
  id: 'roll-1', room_id: roomId, device_id: guestId, character_name: 'Радомир', roll_type: 'server_dice',
  server_roll_id: 'roll-request', created_at: new Date().toISOString(),
  roll_data: { label: 'Прыть', sides: [20], values: [13] }
 }];

 await page.route('**/api/supabase/**', async route => {
  const path = new URL(route.request().url()).pathname.replace('/api/supabase', '');
  const responses: Record<string, unknown> = {
   '/auth/v1/signup': { user, access_token: token, token_type: 'bearer', refresh_token: 'fixture', expires_in: 3600 },
   '/rest/v1/rooms': [],
   '/rest/v1/rpc/lookup_room_by_invite': room,
   '/rest/v1/rpc/join_secure_room': guest,
   '/rest/v1/room_combat': { state: {} },
   '/rest/v1/room_participants': [guest],
   '/rest/v1/room_rolls': history
  };
  if (!(path in responses)) return route.fulfill({ status: 501, json: { message: 'Unknown request in the browser test' } });
  if (path === '/rest/v1/rpc/lookup_room_by_invite') expect(route.request().postDataJSON()).toEqual({ p_code: invite });
  await route.fulfill({ json: responses[path] });
 });
 await page.routeWebSocket(/\/api\/supabase\/realtime\/v1\/websocket/, () => {});

 await page.goto('/room');
 await page.getByRole('button', { name: 'Закрыть обновления' }).click();
 await page.getByRole('button', { name: /Я игрок/ }).click();
 await page.getByRole('textbox', { name: 'Ваше имя' }).fill('Радомир');
 await page.getByRole('textbox', { name: 'Секрет приглашения' }).fill(invite.toUpperCase());
 await page.getByRole('button', { name: 'Войти', exact: true }).click();
 await expect(page.getByRole('heading', { name: 'Дорожный дозор' })).toBeVisible();
 await expect(page.getByText('Вы — игрок', { exact: true })).toBeVisible();
 await expect(page.getByText('Прыть: к20 = 13 · серверный бросок', { exact: true })).toBeVisible();
 await expect(page.getByRole('button', { name: 'Удалить комнату' })).toBeHidden();
});
