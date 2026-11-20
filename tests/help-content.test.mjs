import test from 'node:test';
import assert from 'node:assert/strict';
import {HELP_CONTENT_VERSION,HELP_TOPICS,helpContent,helpPractice} from '../src/lib/ui/help-content.ts';
import {CREATION_TOUR,SHEET_TOUR,READING_ROUTE,PLAYER_LESSONS,playerLessonHref,STORYTELLER_ROUTE,STORYTELLER_TOUR,STORYTELLER_PHASES} from '../src/lib/ui/learning-tours.ts';
import {contextHelp,helpHistory,helpWindow} from '../src/lib/ui/novice-help.ts';

test('help topics have stable unique identifiers and explicit editorial metadata',()=>{
 assert.equal(HELP_CONTENT_VERSION,2);
 const ids=Object.keys(HELP_TOPICS);
 assert.equal(new Set(ids).size,ids.length);
 for(const [id,topic] of Object.entries(HELP_TOPICS)){
  assert.match(id,/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
  assert.equal(topic.id,id);
  assert.ok(['player','storyteller','all'].includes(topic.audience));
  assert.ok(Number.isInteger(topic.revision)&&topic.revision>0);
  assert.match(topic.reviewedFor,/^\d+\.\d+\.\d+$/);
  for(const content of [topic,topic.short].filter(Boolean)){
   assert.ok(content.title.trim()&&content.text.trim(),id);
   if(content.href)assert.ok(content.href.startsWith('/')&&!content.href.startsWith('//'),id);
   if(content.link)assert.ok(content.href,id);
  }
 }
});
test('tours, reading route and context cards resolve their content from registered topics',()=>{
 const used=new Set([...PLAYER_LESSONS,...STORYTELLER_ROUTE].map(lesson=>lesson.topicId));
 for(const steps of [CREATION_TOUR,SHEET_TOUR,STORYTELLER_TOUR]){
  const ids=new Set();
  for(const step of steps){
   used.add(step.topicId);
   assert.ok(!ids.has(step.id));ids.add(step.id);
   assert.ok(step.target.trim());
   assert.deepEqual({title:step.title,text:step.text,href:step.href,link:step.link},
    {title:HELP_TOPICS[step.topicId].title,text:HELP_TOPICS[step.topicId].text,href:HELP_TOPICS[step.topicId].href,link:HELP_TOPICS[step.topicId].link});
  }
 }
 for(const item of READING_ROUTE){used.add(item.topicId);assert.equal(item.text,HELP_TOPICS[item.topicId].text);}
 const contexts=['/','/new','/char/id','/lore','/mechanics','/adventures','/gm','/room','/gm/combat','/gm/bestiary','/account','/lavka','/events'];
 const cards=[...contexts.map(path=>contextHelp(path)),...['resources','battle','skills','abilities','spells','inventory','personality','conditions','decay','rest'].map(section=>contextHelp('/char/id','#'+section))];
 for(const context of cards)for(const card of context.tips){
  used.add(card.id);
  assert.deepEqual(card,{id:card.id,...helpContent(card.id,'short')});
 }
 assert.deepEqual([...used].sort(),Object.keys(HELP_TOPICS).sort(),'No unused help topics');
 // Readers receive a copy; editing one rendered variant cannot mutate the shared registry.
 const copy=helpContent('character-concept');copy.text='changed';
 assert.notEqual(copy.text,HELP_TOPICS['character-concept'].text);
});
test('content identifiers do not replace legacy context dismissal identifiers',()=>{
 const cases=[['/','', 'home'],['/new','', 'creation'],['/char/id','', 'sheet-overview'],['/char/id','#abilities','sheet-abilities'],['/char/id','#spells','sheet-spells'],['/adventures/custom/id','', 'adventures'],['/room/secret','','room']];
 const created='2026-11-20T00:00:00Z',now=Date.parse(created);
 const until=helpWindow(created,helpHistory(null),now).until;
 for(const [path,hash,id]of cases){
  assert.equal(contextHelp(path,hash).id,id);
  const saved=helpHistory({dismissed:[until+':'+id]});
  assert.ok(saved.dismissed.includes(until+':'+contextHelp(path,hash).id));
 }
});

test('player lessons provide instructions, outcomes and safe selected-character destinations',()=>{
 for(const lesson of PLAYER_LESSONS){
  assert.ok(lesson.practice.steps.length>=2,lesson.topicId);
  assert.ok(lesson.practice.result.trim());
  assert.ok(lesson.practice.caution?.trim());
  assert.deepEqual(lesson.practice,helpPractice(lesson.topicId));
  const url=playerLessonHref(lesson,'hero/?#');
  assert.ok(url.startsWith('/')&&!url.startsWith('//'));
  if(['sheet','growth','tavern'].includes(lesson.destination)){
   assert.equal(playerLessonHref(lesson,''),null);
   assert.ok(url.includes('hero%2F%3F%23'));
  }
 }
 const copy=helpPractice('ability-trees');
 copy.steps[0]='changed';
 assert.notEqual(helpPractice('ability-trees').steps[0],'changed');
 assert.equal(contextHelp('/char/id/levelup').id,'levelup');
 assert.equal(contextHelp('/char/id/levelup').tips[0].id,'character-growth');
 assert.equal(contextHelp('/char/id','#relationships').tips[0].id,'player-relationships');
 assert.equal(contextHelp('/tavern').tips[0].id,'player-tavern');
});

test("storyteller route covers preparation, play and closing with registered practical guidance",()=>{
 assert.equal(STORYTELLER_ROUTE.length,20);
 assert.equal(new Set(STORYTELLER_ROUTE.map(l=>l.topicId)).size,20);
 assert.deepEqual([...new Set(STORYTELLER_ROUTE.map(l=>l.phase))],STORYTELLER_PHASES.map(p=>p.id));
 for(const lesson of STORYTELLER_ROUTE){
  assert.ok(lesson.practice.steps.length>=2,lesson.topicId);
  assert.ok(lesson.practice.result.trim()&&lesson.practice.caution.trim());
  assert.equal(HELP_TOPICS[lesson.topicId].audience,"storyteller");
  assert.deepEqual(lesson.practice,helpPractice(lesson.topicId));
  assert.match(lesson.href,/^\/(?!\/)/);
  assert.ok(lesson.action.trim());
 }
 assert.equal(contextHelp("/gm/adventure-report").tips[0].id,"gm-report");
 assert.equal(contextHelp("/gm/adventure-report/export").tips[0].id,"gm-report-export");
 assert.match(HELP_TOPICS["gm-report"].practice.caution,/test=1/);
 assert.match(HELP_TOPICS["gm-archive"].practice.caution,/не реализован/);
});

test("character backup links target the separate character page",()=>{
 const backup=PLAYER_LESSONS.find(l=>l.topicId==="character-backup");
 assert.equal(playerLessonHref(backup,""),"/characters");
 assert.equal(helpContent("character-backup","short").href,"/characters");
 assert.equal(contextHelp("/characters").id,"characters");
 assert.equal(contextHelp("/").id,"home");
});
