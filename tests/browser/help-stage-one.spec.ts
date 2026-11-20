import {expect,test} from '@playwright/test';
import {LATEST_RELEASE} from '../../src/lib/releases';

test.beforeEach(async({page})=>{
 await page.addInitScript(release=>localStorage.setItem('parma.release-notes.seen',release),LATEST_RELEASE.id);
});

test('empty exports distinguish missing cloud drafts from excluded records',async({page})=>{
 const user={id:'71a2cb16-5291-4e34-9743-967d621018ac',aud:'authenticated',role:'authenticated',is_anonymous:false,app_metadata:{},user_metadata:{}};
 await page.addInitScript(user=>localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:'test-access',refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,user})),user);
 await page.route('**/api/supabase/auth/v1/user',route=>route.fulfill({json:user}));
 let count=0;
 await page.route('**/gm/adventure-report/export/data?*',route=>route.fulfill({json:{format_version:1,exported_at:'2026-11-20T00:00:00Z',scope:'own-drafts',source_count:count,filters:{},report_count:0,warnings:[],reports:[]}}));
 await page.goto('/gm/adventure-report/export');
 await page.getByRole('button',{name:'Подготовить выгрузку',exact:true}).click();
 const note=page.getByRole('note',{name:'Почему выгрузка пуста'});
 await expect(note).toContainText('В облаке нет сохранённых отчётов');
 await expect(note).toContainText('?test=1');
 await expect(note.getByRole('link',{name:'Открыть облачную форму отчёта'})).toHaveAttribute('href','/gm/adventure-report');
 count=2;
 await page.getByLabel('Ветвь канона').fill('another-branch');
 await page.getByRole('button',{name:'Подготовить выгрузку',exact:true}).click();
 await expect(note).toContainText('Ни один из 2 доступных облачных отчётов');
 await expect(note).not.toContainText('В облаке нет сохранённых отчётов');
 // Notes and action remain usable without horizontal overflow on a phone.
 await page.setViewportSize({width:390,height:844});
 await expect(note).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('a characteristic tooltip matches the actual difficulty-adjusted check',async({page})=>{
 await page.route('**/api/supabase/auth/v1/signup',route=>route.fulfill({status:400,json:{code:'anonymous_provider_disabled',msg:'Guest sessions disabled in this test'}}));
 await page.goto('/new');
 await page.getByRole('textbox',{name:'Имя персонажа'}).fill('Проверка подсказки');
 await page.getByRole('button',{name:'Сохранить персонажа',exact:true}).click();
 await expect(page).toHaveURL(/\/char\/[\da-f-]+$/);
 const id=new URL(page.url()).pathname.split('/').at(-1)!;
 await page.getByRole('navigation',{name:'Разделы листа персонажа'}).waitFor();
 for(const difficulty of [-10,95]) {
  await page.evaluate(({id,difficulty})=>new Promise<void>((resolve,reject)=>{
   const request=indexedDB.open('parma');
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{
    const db=request.result,tx=db.transaction('characters','readwrite'),store=tx.objectStore('characters'),record=store.get(id);
    record.onsuccess=()=>store.put({...record.result,checkDifficulty:difficulty});
    tx.oncomplete=()=>{db.close();resolve();};
    tx.onabort=()=>{db.close();reject(tx.error);};
   };
  }),{id,difficulty});
  await page.reload();
  await page.getByRole('button',{name:'Офлайн · физические кубики'}).click();
  const characteristic=page.locator('button[title^="Бросить проверку характеристики"]').first();
  const value=Number(await characteristic.locator('.text-2xl').innerText());
  const target=Math.min(95,Math.max(0,value+difficulty));
  await expect(characteristic).toHaveAttribute('title','Бросить проверку характеристики: к100 ≤ '+target);
  await characteristic.click();
  const dialog=page.getByRole('dialog',{name:'Ввод физического броска'});
  await expect(dialog).toContainText('Цель с бонусами и сложностью: ≤ '+target);
  await dialog.getByRole('button',{name:'Отмена',exact:true}).click();
 }
});
