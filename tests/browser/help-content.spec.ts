import {expect,test} from '@playwright/test';
import {CREATION_TOUR} from '../../src/lib/ui/learning-tours';
import {LATEST_RELEASE} from '../../src/lib/releases';

test('creation guide and all tour steps use the same topics and can be reopened',async({page})=>{
 await page.addInitScript(release=>localStorage.setItem('parma.release-notes.seen',release),LATEST_RELEASE.id);
 // This tour must never save a character or call cloud mutations.
 const writes:string[]=[];
 await page.route('**/api/supabase/**',route=>{
  if(!['GET','HEAD','OPTIONS'].includes(route.request().method()))writes.push(route.request().method());
  return route.abort();
 });
 await page.goto('/learn');
 for(const step of CREATION_TOUR)await expect(page.locator('#help-'+step.topicId)).toContainText(step.text);
 await page.getByRole('link',{name:'Создать героя с подсказками',exact:true}).click();
 const tour=page.getByRole('region',{name:'Обучение: Создание персонажа'});
 await expect(tour).toBeVisible();
 for(let i=0;i<CREATION_TOUR.length;i++){
  const step=CREATION_TOUR[i];
  await expect(tour.getByRole('heading',{name:step.title,exact:true})).toBeVisible();
  await expect(tour).toContainText(step.text);
  await expect(page.locator(step.target)).toHaveAttribute('data-tour-current','true');
  await tour.getByRole('button',{name:i===CREATION_TOUR.length-1?'Завершить':'Далее',exact:true}).click();
 }
 await expect(tour).toHaveCount(0);
 await expect(page).toHaveURL(/\/new\?learn=1$/);
 await page.getByRole('button',{name:'Обучение',exact:true}).click();
 await expect(tour.getByRole('heading',{name:CREATION_TOUR[0].title,exact:true})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(tour).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Обучение',exact:true})).toBeFocused();
 expect(writes).toEqual([]);
});
