<script lang="ts">
 import type { Character } from '$lib/type';
 import type { CombatState } from '$lib/sync/combat';
 import { MARTIAL_ACTIONS, martialCost, martialTarget, martialBlockReason, resolveMartialAction, UNARMED, type MartialAction } from '$lib/engine/martial';
 import { getMaxAttackCount } from '$lib/engine/combat';
 import { getSkillCheckTarget } from '$lib/engine/character';
 import { participantCharacter } from '$lib/engine/combatEffects';
 let { character, encounter, onchange, oncombat, requestDie }: {character:Character;encounter:CombatState|null;onchange:(c:Character)=>Promise<void>;oncombat:(c:CombatState)=>Promise<void>;requestDie:(s:number,label:string,target?:number)=>Promise<number|null>}=$props();
 let action=$state<MartialAction>('hand'),count=$state(1),targetId=$state(''),defenseSkill=$state('athletics'),manualArmor=$state(0),manualDefense=$state(42),ready=$state(false),busy=$state(false),notice=$state('');
 let freeHands=$state(2);
 let last=$state<ReturnType<typeof resolveMartialAction>|null>(null);
 const actor=$derived(encounter?.participants.find(p=>p.sourceId===character.id||p.id===character.id));
 const target=$derived(encounter?.participants.find(p=>p.id===targetId));
 const targets=$derived(encounter?.participants.filter(p=>p.id!==actor?.id)??[]);
 const strike=$derived(['hand','kick','hand-kick','counter'].includes(action));
 const chosen=$derived(MARTIAL_ACTIONS.find(a=>a.id===action)!);
 const reason=$derived(martialBlockReason(character,action,count,target,actor?.id));
 const check=$derived(martialTarget(character,action,count,target?.armor??manualArmor,0,freeHands));
 const defender=$derived.by(()=>{if(!target)return manualDefense;try{return getSkillCheckTarget(participantCharacter(target), action==='escape'?'martial':['pain','choke'].includes(action)?'fortitude':defenseSkill);}catch{return manualDefense;}});
 async function apply() {
  if(busy||reason||!ready)return;busy=true;notice='';
  try {
   const roll=action==='maintain'?1:await requestDie(100,chosen.name,check);if(roll===null)return;
   const defense=!strike&&action!=='maintain'?await requestDie(100,'Сопротивление: '+(target?.name??'цель'),defender):50;if(defense===null)return;
   const plan=resolveMartialAction(character,encounter,actor?.id??character.id,targetId,action,count,roll,defense,defender,()=>1,defenseSkill,freeHands);
   const dice:number[]=[];for(let i=0;i<plan.dice.length;i++){const size=action==='hand-kick'?(i===0?4:6):['kick','throw','trip'].includes(action)?6:4; const value=strike&&roll===1?size:await requestDie(size,chosen.name+': урон '+(i+1));if(value===null)return;dice.push(value);}
   let index=0;const result=resolveMartialAction(character,encounter,actor?.id??character.id,targetId,action,count,roll,defense,defender,()=>dice[index++],defenseSkill,freeHands);
   await onchange(result.character);if(result.encounter&&target&&actor)await oncombat(result.encounter);last=result;
  }catch(e){notice=e instanceof Error?e.message:'Не удалось выполнить приём.';}finally{busy=false;}
 }
</script>
<details class="border rounded bg-white p-3 mb-3">
 <summary class="font-semibold cursor-pointer">Ратная рукопашная · удары и борьба</summary>
 <div class="space-y-3 mt-3">
  <label class="block">Приём<select class="block border rounded p-2 w-full" bind:value={action}>{#each MARTIAL_ACTIONS as a}<option value={a.id}>{a.name}</option>{/each}</select></label>
  <p class="text-sm">{chosen.description}</p><label>Руки без предметов <select class="border rounded p-1" bind:value={freeHands}><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option></select></label>
  {#if action==='hand'||action==='kick'}<label>Ударов <select class="border rounded p-1" bind:value={count}><option value={1}>1</option><option value={2} disabled={getMaxAttackCount(character,UNARMED)<2}>2</option><option value={3} disabled={getMaxAttackCount(character,UNARMED)<3}>3</option></select></label>{/if}
  <label class="block">Цель<select class="block border rounded p-2 w-full" bind:value={targetId}><option value="">Вне отслеживаемого боя</option>{#each targets as p}<option value={p.id}>{p.name} · Здравие {p.currentHp}</option>{/each}</select></label>
  {#if !target}<label>Броня <input class="border rounded p-1 w-20" type="number" bind:value={manualArmor}/></label><label class="ml-3">Проверка цели <input class="border rounded p-1 w-20" type="number" min="0" max="95" bind:value={manualDefense}/></label>{/if}
  {#if !strike}<label class="block">Навык сопротивления<select class="border rounded p-1 ml-2" bind:value={defenseSkill}><option value="athletics">Атлетика</option><option value="evasion">Уклонение</option><option value="fortitude">Стойкость</option><option value="martial">Ратная рукопашная</option></select></label>{/if}
  {#if target?.grapple}<p class="text-sm">Контроль: {target.grapple.kind}; этапов удушения: {target.grapple.chokeSuccesses??0}.</p>{/if}
  {#if target?.prone}<p class="text-sm">Цель повалена. <button class="border rounded px-2" onclick={async()=>{if(!encounter||!target||target.grapple?.kind==='hold')return;await oncombat({...encounter,participants:encounter.participants.map(p=>p.id===target!.id?{...p,prone:false}:p)});}}>Встать · действие</button></p>{/if}
  {#if target?.grapple?.sourceId===actor?.id}<button class="border rounded px-2" onclick={async()=>{if(!encounter||!target)return;await oncombat({...encounter,participants:encounter.participants.map(p=>p.id===target!.id?{...p,grapple:undefined}:p)});}}>Отпустить цель</button>{/if}
  <p>Проверка: {check}. Цена: {martialCost(character,action,count)} Бодрости.</p>
  <label class="block text-sm"><input type="checkbox" bind:checked={ready}/> Условия приёма выполнены: контакт, свободные руки, положение, анатомия; нужное действие/реакция доступны.</label>
  <p class="text-xs text-gray-500">Серии ударов — один к100. Борьба — встречные проверки без вычитания Брони. Цена тратится и при провале. Если персонаж добавлен в бой, урон и контроль сохраняются в нём.</p>
  <button class="border rounded px-3 py-2 bg-green-800 text-white disabled:opacity-50" disabled={busy||!ready||reason!==null} onclick={apply}>Применить</button>{#if reason}<p class="text-sm">{reason}</p>{/if}
  {#if notice}<p role="alert">{notice}</p>{/if}
  {#if last}<div class="border rounded p-3" role="status">{last.message}. К100: {last.roll} ≤ {last.target}{#if !strike}; сопротивление {last.defenseRoll} ≤ {last.defenseTarget}{/if}. Потрачено {last.cost} Бодрости.{#if last.damage} Урон: {last.damage} (кубики: {last.dice.join(', ')}).{/if}</div>{/if}
 </div>
</details>
