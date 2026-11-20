import {expect,test,type Page} from '@playwright/test';
import {SHEET_TOUR} from '../../src/lib/ui/learning-tours';
import {LATEST_RELEASE} from '../../src/lib/releases';

test.beforeEach(async({page})=>{
 await page.addInitScript(release=>localStorage.setItem('parma.release-notes.seen',release),LATEST_RELEASE.id);
});
async function gameData(page:Page,id:string){
 return page.evaluate(id=>new Promise((resolve,reject)=>{
  const request=indexedDB.open('parma');
  request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{
   const db=request.result,tx=db.transaction('characters','readonly'),record=tx.objectStore('characters').get(id);
   record.onsuccess=()=>{const c=record.result;resolve({level:c.level,abilityPoints:c.abilityPoints,inventory:c.inventory,resources:c.currentResources,spells:c.spells});};
   tx.oncomplete=()=>db.close();
   tx.onabort=()=>{db.close();reject(tx.error);};
  };
 }),id);
}
test('player guide is readable without a hero, with deep links and mobile layout',async({page})=>{
 const writes:string[]=[];
 await page.route('**/api/supabase/**',route=>{if(!['GET','HEAD','OPTIONS'].includes(route.request().method()))writes.push(route.request().method());return route.abort();});
 await page.setViewportSize({width:390,height:844});
 await page.goto('/learn?topic=play#help-character-growth');
 await expect(page.getByRole('heading',{name:'От первого действия к продолжению истории'})).toBeVisible();
 const growth=page.locator('#help-character-growth');
 await expect(growth).toHaveAttribute('open','');
 await expect(growth).toContainText('Только подтверждение повышает уровень');
 await expect(growth.getByRole('link',{name:'Открыть рост героя'})).toHaveCount(0);
 await expect(page.getByText('Инструкции доступны без героя.',{exact:false})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 expect(writes).toEqual([]);
});
test('guide targets the selected hero and the full sheet tour leaves game data intact',async({page})=>{
 test.setTimeout(60000);
 await page.route('**/api/supabase/auth/v1/signup',route=>route.fulfill({status:400,json:{code:'anonymous_provider_disabled',msg:'Guest sessions disabled in this test'}}));
 await page.goto('/new');
 await page.getByRole('textbox',{name:'Имя персонажа'}).fill('Учебный герой');
 await page.getByRole('button',{name:'Сохранить персонажа',exact:true}).click();
 await expect(page).toHaveURL(/\/char\/[\da-f-]+$/);
 const id=new URL(page.url()).pathname.split('/').at(-1)!;
 await page.getByRole('navigation',{name:'Разделы листа персонажа'}).waitFor();
 const before=await gameData(page,id);
 expect(before).toMatchObject({level:1,abilityPoints:4});
 await page.getByRole('link',{name:'Гайд игрока',exact:true}).click();
 await page.getByRole('combobox',{name:'Персонаж для переходов'}).selectOption(id);
 const skill=page.locator('#help-skill-check');
 await skill.locator('summary').click();
 const skillLink=skill.getByRole('link',{name:'Открыть раздел листа'});
 await expect(skillLink).toHaveAttribute('href','/char/'+id+'#skills');
 const tavern=page.locator('#help-player-tavern');
 await tavern.locator('summary').click();
 await expect(tavern.getByRole('link',{name:'Открыть таверну для героя'})).toHaveAttribute('href','/tavern?character='+id);
 const growth=page.locator('#help-character-growth');
 await growth.locator('summary').click();
 await expect(growth.getByRole('link',{name:'Открыть рост героя'})).toHaveAttribute('href','/char/'+id+'/levelup');
 await skillLink.click();
 await page.getByRole('button',{name:'Обучение',exact:true}).click();
 const tour=page.getByRole('region',{name:'Обучение: Лист персонажа'});
 for(let i=0;i<SHEET_TOUR.length;i++){
  const step=SHEET_TOUR[i];
  await expect(tour.getByRole('heading',{name:step.title,exact:true})).toBeVisible();
  await expect(page.locator(step.target).first()).toHaveAttribute('data-tour-current','true');
  await tour.getByRole('button',{name:i===SHEET_TOUR.length-1?'Завершить':'Далее',exact:true}).click();
 }
 await expect(tour).toHaveCount(0);
 expect(await gameData(page,id)).toEqual(before);
});
