import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('export API refuses missing identity and disables caching',async({request})=>{
 const response=await request.get('/gm/adventure-report/export/data');
 expect(response.status()).toBe(401);
 expect(response.headers()['cache-control']).toBe('no-store');
});
test('export UI downloads one snapshot with filters and structured data',async({page})=>{
 const user={id:'71a2cb16-5291-4e34-9743-967d621018ac',aud:'authenticated',role:'authenticated',is_anonymous:false,app_metadata:{},user_metadata:{}};
 await page.addInitScript(user=>localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:'test-access',refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,user})),user);
 await page.route('**/api/supabase/auth/v1/user',route=>route.fulfill({json:user}));
 let requests=0;
 const payload={group:'=TEST()',canonBranch:'test-main',canonVersion:'v1',reviewStatus:'disputed',extra:{keep:true},answers:{fixture:{decision:'other',observed:'Наблюдение',knowledge:'Сведения',pending:'Вопрос'}}};
 await page.route('**/gm/adventure-report/export/data?*',route=>{
  const url=new URL(route.request().url());
  expect(route.request().headers()['authorization']).toBe('Bearer test-access');
  expect(url.searchParams.get('branch')).toBe('test-main');
  expect(url.searchParams.get('reviewStatus')).toBe('disputed');
  requests++;
  return route.fulfill({json:{format_version:1,exported_at:'2026-11-17T12:00:00Z',scope:'own-drafts',source_count:1,filters:Object.fromEntries(url.searchParams),report_count:1,warnings:[],reports:[{report_key:'fixture/karngorn',adventure_slug:'karngorn',region:'fixture',saved_revision:'r1',updated_at:'2026-11-17T12:00:00Z',payload}]}});
 });
 await page.goto('/gm/adventure-report/export');
 await page.getByRole('button',{name:'Закрыть обновления'}).click();
 await page.getByLabel('Ветвь канона').fill('test-main');
 await page.getByLabel('Статус проверки').selectOption('disputed');
 await page.getByRole('button',{name:'Подготовить выгрузку',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Отчётов в выгрузке: 1'})).toBeVisible();
 async function download(name:string) {
  const pending=page.waitForEvent('download');
  await page.getByRole('button',{name,exact:true}).click();
  const result=await pending;
  return readFile((await result.path())!,'utf8');
 }
 const json=JSON.parse(await download('Скачать JSON'));
 expect(json.reports[0].payload).toEqual(payload);
 const reports=await download('Скачать reports.csv');
 const decisions=await download('Скачать decisions.csv');
 expect(reports).toContain('"\'=TEST()"');
 expect(reports).toContain('fixture/karngorn');
 expect(decisions).toContain('fixture/karngorn');
 expect(decisions).toContain('Наблюдение');
 expect(requests).toBe(1);
});
test('export shows an access error without offering downloads',async({page})=>{
 await page.goto('/gm/adventure-report/export');
 await page.getByRole('button',{name:'Закрыть обновления'}).click();
 await page.getByRole('button',{name:'Подготовить выгрузку',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Войдите в аккаунт');
 await expect(page.getByRole('button',{name:'Скачать JSON'})).toHaveCount(0);
});

test('all-report view displays a read-only report and handles denial',async({page})=>{
 const user={id:'71a2cb16-5291-4e34-9743-967d621018ac',aud:'authenticated',role:'authenticated',is_anonymous:false,app_metadata:{},user_metadata:{}};
 await page.addInitScript(user=>localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:'test-access',refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,user})),user);
 await page.route('**/api/supabase/auth/v1/user',route=>route.fulfill({json:user}));
 let allowed=true;
 await page.route('**/gm/adventure-report/export/data?*',route=>{
  expect(new URL(route.request().url()).searchParams.get('scope')).toBe('all-drafts');
  if(!allowed) return route.fulfill({status:403,json:{error:'Нет прав администратора'}});
  return route.fulfill({json:{format_version:1,exported_at:'2026-11-18T00:00:00Z',scope:'all-drafts',source_count:1,filters:{},report_count:1,warnings:[],reports:[{report_key:'fixture/karngorn',adventure_slug:'karngorn',region:'fixture',saved_revision:'r1',updated_at:'2026-11-18T00:00:00Z',payload:{group:'Пробная группа',answers:{fixture:{observed:'<script>window.fixture=true</script>'}}}}]}});
 });
 await page.goto('/gm/adventure-report/export');
 await page.getByRole('button',{name:'Закрыть обновления'}).click();
 await page.getByLabel('Область просмотра').selectOption('all-drafts');
 await page.getByRole('button',{name:'Подготовить выгрузку',exact:true}).click();
 await expect(page.getByText('Режим администратора: все доступные отчёты')).toBeVisible();
 await page.getByText('Карнгорн · Пробная группа',{exact:true}).click();
 await expect(page.locator('pre')).toContainText('<script>');
 await expect(page.locator('details input,details textarea,details button')).toHaveCount(0);
 allowed=false;
 await page.getByRole('button',{name:'Подготовить выгрузку',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Нет прав администратора');
 await expect(page.getByRole('button',{name:'Скачать JSON'})).toHaveCount(0);
});
