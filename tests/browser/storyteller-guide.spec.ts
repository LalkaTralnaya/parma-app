import {expect,test} from '@playwright/test';
import {STORYTELLER_ROUTE,STORYTELLER_TOUR} from '../../src/lib/ui/learning-tours';
import {LATEST_RELEASE} from '../../src/lib/releases';
test.beforeEach(async({page})=>{
 await page.addInitScript(release=>localStorage.setItem('parma.release-notes.seen',release),LATEST_RELEASE.id);
});
test('complete storyteller route is readable without rights, with deep links and mobile layout',async({page})=>{
 const requests:string[]=[];const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/supabase/**',route=>{requests.push(route.request().url());return route.abort();});
 await page.setViewportSize({width:390,height:844});
 await page.goto('/learn?topic=storyteller#help-gm-report');
 await expect(page.getByRole('heading',{name:'От подготовки к итогам приключения'})).toBeVisible();
 await expect(page.locator('#help-gm-report')).toHaveAttribute('open','');
 await expect(page.locator('#help-gm-report')).toContainText('?test=1');
 await expect(page.getByRole('navigation',{name:'Этапы маршрута Сказителя'}).getByRole('link')).toHaveCount(3);
 for(const lesson of STORYTELLER_ROUTE){
  const section=page.locator('#help-'+lesson.topicId);
  if(await section.getAttribute('open')===null)await section.locator('summary').click();
  await expect(section).toContainText(lesson.practice.result);
  await expect(section.getByRole('link',{name:lesson.action,exact:false})).toHaveAttribute('href',lesson.href);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(requests).toEqual([]);expect(errors).toEqual([]);
 await page.goto('/learn?topic=play');
 await page.getByRole('button',{name:'Маршрут Сказителя',exact:true}).click();
 await page.getByRole('navigation',{name:'Этапы маршрута Сказителя'}).getByRole('link',{name:'Проведение игры'}).click();
 await expect(page).toHaveURL(/topic=storyteller#storyteller-play$/);
 await expect(page.getByRole('heading',{name:'От подготовки к итогам приключения'})).toBeVisible();
});
test('storyteller console tour has all targets, can reopen, and preserves notes and local game data',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/supabase/**',route=>route.abort());
 await page.addInitScript(()=>localStorage.setItem('parma_storyteller_notes','Записи встречи: сохранить без изменений.'));
 await page.goto('/gm?learn=1');
 await expect(page.getByRole('heading',{name:'Режим сказителя',exact:true})).toBeVisible();
 const before=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([key])=>key!=='parma_help_v1')));
 await expect(page.getByRole('textbox',{name:'Заметки сказителя',exact:true})).toHaveValue('Записи встречи: сохранить без изменений.');
 const tour=page.getByRole('region',{name:'Обучение: Пульт Сказителя'});
 for(let i=0;i<STORYTELLER_TOUR.length;i++){
  const step=STORYTELLER_TOUR[i];
  await expect(tour.getByRole('heading',{name:step.title,exact:true})).toBeVisible();
  await expect(page.locator(step.target).first()).toHaveAttribute('data-tour-current','true');
  await tour.getByRole('button',{name:i===STORYTELLER_TOUR.length-1?'Завершить':'Далее',exact:true}).click();
 }
 await expect(tour).toHaveCount(0);
 await expect(page.locator('[data-tour-current]')).toHaveCount(0);
 const after=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([key])=>key!=='parma_help_v1')));
 expect(after).toEqual(before);
 await page.getByRole('button',{name:'Обучение',exact:true}).click();
 await expect(tour).toBeVisible();await page.keyboard.press('Escape');await expect(tour).toHaveCount(0);
 expect(errors).toEqual([]);
 await page.getByRole('link',{name:'Гайд Сказителя',exact:true}).click();
 await expect(page).toHaveURL(/learn\?topic=storyteller$/);
});
