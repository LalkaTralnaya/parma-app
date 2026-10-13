import type { Character } from '../type';
import type { CombatState, CombatParticipant } from '../sync/combat';
import type { Weapon } from '../rules/weapons';
import { getCharacteristicValue, getModifier, getSkillCheckTarget, getResourceMax, isAbilityLearned } from './character';
import { getMaxAttackCount, getTreeRankBonus } from './combat';
import { combatModifiers, participantCharacter } from './combatEffects';

export const UNARMED: Weapon = {id:'unarmed',name:'Удар рукой',skill:'martial',parent:'strength',category:'one_handed',damageType:'crushing',damageOneHand:'1d4'};
export type MartialAction = 'hand'|'kick'|'hand-kick'|'grab'|'clinch'|'throw'|'push'|'trip'|'hold'|'maintain'|'pain'|'choke'|'escape'|'disarm'|'counter';
export const MARTIAL_ACTIONS: Array<{id:MartialAction;name:string;cost:number;ability?:string;description:string}> = [
 {id:'hand',name:'Удар рукой',cost:0,description:'Свободная рука; 1к4, обычное попадание против Брони.'},
 {id:'kick',name:'Удар ногой',cost:1,description:'Стоишь, есть опора и место; −5, 1к6. На земле при удержании недоступен.'},
 {id:'hand-kick',name:'Рука — нога',cost:1,ability:'RU.series',description:'Два доступных удара; всего 3 Бодрости, −10, один к100, 1к4+1к6, постоянные прибавки один раз.'},
 {id:'grab',name:'Захват',cost:1,description:'Контакт и одна свободная рука. Встречная против Атлетики или Уклонения; без урона.'},
 {id:'clinch',name:'Клинч',cost:1,ability:'RU.clinch',description:'Свой захват, обе руки без предметов. Двуручные атаки и стрельба недоступны; одноручные −15.'},
 {id:'throw',name:'Бросок',cost:2,description:'Свой захват/клинч, обе руки без предметов. Повалить, 1к6+модификатор Силы без ударных бонусов; захват прекращается.'},
 {id:'push',name:'Толчок',cost:1,description:'Контакт; оттеснить на 1 сажень, без обязательного урона и падения.'},
 {id:'trip',name:'Сбить опору',cost:1,description:'Контакт со стоящей целью; повалить и 1к6 урона падения.'},
 {id:'hold',name:'Удержание',cost:2,ability:'RU.ground',description:'Поваленная цель, контакт, обе руки без предметов. Оба на земле, цель не встаёт и не перемещается.'},
 {id:'maintain',name:'Поддержать удержание',cost:1,ability:'RU.ground',description:'Всё основное действие. Контроль до начала следующего своего хода; без нового броска.'},
 {id:'pain',name:'Болевой контроль',cost:2,ability:'RU.pain',description:'Своё удержание; всё основное действие. Против Стойкости, 1к4+модификатор Силы без ударных бонусов. Поддержание включено.'},
 {id:'choke',name:'Удушающий контроль',cost:3,ability:'RU.choke',description:'Своё удержание; дышащая цель. Всё основное действие. Два успеха в последовательных ходах против Стойкости: потеря сознания, цель жива и стабильна. Провал сбрасывает этап.'},
 {id:'escape',name:'Освободиться',cost:0,description:'Одна атака; своя Атлетика или Уклонение против Ратной рукопашной борца. После удержания остаёшься на земле.'},
 {id:'disarm',name:'Обезоруживание',cost:1,description:'Контакт, свободная рука; встречная проверка. Оружие выпадает, не передаётся в инвентарь борца.'},
 {id:'counter',name:'Контрудар',cost:2,ability:'RU.counter',description:'Общая реакция после промаха ближней физической атакой: один обычный удар рукой, без штрафа серии.'}
];
/** Standard opposed checks: natural signs, success, then margin; equal margins are a tie. */
export function opposedWinner(a:number,at:number,b:number,bt:number):'actor'|'target'|'tie' {
 if (![a,b].every(n=>Number.isInteger(n)&&n>=1&&n<=100)) throw new Error('К100 должен быть от 1 до 100.');
 if(a===b&&(a===1||a===100))return 'tie';
 if(a===1||b===100)return 'actor';if(b===1||a===100)return 'target';
 const as=a<=at,bs=b<=bt;if(as!==bs)return as?'actor':'target';if(!as)return 'tie';
 return at-a===bt-b?'tie':at-a>bt-b?'actor':'target';
}
export function martialCost(char:Character,action:MartialAction,count:number):number {
 const item=MARTIAL_ACTIONS.find(a=>a.id===action)!;
 return item.cost + (action==='hand-kick'?2: ['hand','kick'].includes(action)?count===3?4:count===2?2:0:0);
}
export function martialBlockReason(char:Character,action:MartialAction,count:number,target?:CombatParticipant,actorId?:string):string|null {
 const item=MARTIAL_ACTIONS.find(a=>a.id===action);if(!item)return 'Неизвестный приём.';
 if(item.ability&&!isAbilityLearned(char,item.ability))return 'Сначала изучите соответствующее умение.';
 if(action==='kick' && count>1)return 'Иные серии ударов ногой требуют согласованных условий; используйте Рука — нога.';
 if(![1,2,3].includes(count))return 'Недопустимая длина серии.';
 if(['hand','kick'].includes(action)&&count>getMaxAttackCount(char,UNARMED))return 'Не изучено нужное умение серии.';
 if(action==='hand-kick'&&getMaxAttackCount(char,UNARMED)<2)return 'Нужна двойная серия.';
 const owned=target?.grapple?.sourceId===actorId;
 if(['clinch','throw'].includes(action)&&(!owned||!['grab','clinch'].includes(target?.grapple?.kind??'')))return 'Нужен свой действующий захват или клинч.';
 if(['maintain','pain','choke'].includes(action)&&(!owned||target?.grapple?.kind!=='hold'))return 'Нужно своё действующее удержание.';
 if(action==='trip'&&target?.prone)return 'Цель уже повалена.';
 if(action==='hold'&&!target?.prone)return 'Цель должна быть повалена.';
 if(action==='push'&&target?.grapple?.kind==='hold')return 'Удерживаемую цель нельзя толкнуть этим приёмом.';
 const current=char.currentResources?.stamina??getResourceMax(char,'stamina');
 if(current<martialCost(char,action,count))return 'Не хватает Бодрости.';
 return null;
}
export function martialTarget(char:Character,action:MartialAction,count:number,armor=0,mods=0,freeHands=2):number {
 if(!['hand','kick','hand-kick','counter'].includes(action))return getSkillCheckTarget(char,'martial')+mods+(['grab','throw'].includes(action)&&freeHands===2&&isAbilityLearned(char,'RU.wrestle')?5:0);
 const penalty=action==='hand-kick'?10:(count===3?10:count===2?5:0)+(action==='kick'?5:0);
 return getSkillCheckTarget(char,'martial')+getTreeRankBonus(char,'RU')-armor-penalty+mods;
}
export function resolveMartialAction(char:Character,state:CombatState|null,actorId:string,targetId:string,action:MartialAction,count:number,roll:number,defenseRoll:number,defenseTarget:number,die:(s:number)=>number,escapeSkill='athletics',freeHands=2) {
 const actor=state?.participants.find(p=>p.id===actorId),target=state?.participants.find(p=>p.id===targetId);
 const reason=martialBlockReason(char,action,count,target,actorId);if(reason)throw new Error(reason);
 if(['clinch','throw','hold'].includes(action)&&freeHands<2)throw new Error('Нужны две руки без предметов.');
 if(['hand','grab','disarm'].includes(action)&&freeHands<1)throw new Error('Нужна свободная рука.');
 if(!Number.isInteger(roll)||roll<1||roll>100)throw new Error('Недопустимый к100.');
 const strike=['hand','kick','hand-kick','counter'].includes(action);
 const at=action==='escape'?getSkillCheckTarget(char,escapeSkill):martialTarget(char,action,count,target?.armor??0,actor?combatModifiers(char,actor).attacks??0:0,freeHands);
 const winner=action==='maintain'?'actor':strike?(roll===1||(roll!==100&&roll<=at)?'actor':'target'):opposedWinner(roll,at,defenseRoll,defenseTarget);
 const cost=martialCost(char,action,count),current=char.currentResources?.stamina??getResourceMax(char,'stamina');
 const updated={...char,currentResources:{...char.currentResources,stamina:current-cost}};
 let damage=0;const dice:number[]=[];
 if(winner==='actor') {
  const sides=action==='hand-kick'?[4,6]:strike?Array.from({length:action==='counter'?1:count},()=>action==='kick'?6:4):action==='throw'||action==='trip'?[6]:action==='pain'?[4]:[];
  for(const size of sides)dice.push(strike&&roll===1?size:die(size));
  damage=dice.reduce((a,b)=>a+b,0);
  if(dice.length&&action!=='trip')damage+=getModifier(getCharacteristicValue(char,'strength'));
  if(strike)damage+=(char.skillPoints.martial??0)+getTreeRankBonus(char,'RU');
 }
 let next=state;let message=winner==='actor'?'Успех':winner==='tie'?'Ничья: положение сохраняется':'Приём не удался';
 if(state&&target) {
  next={...state,participants:state.participants.map(p=>{
   if(action==='escape'&&p.id===actorId&&winner==='actor')return {...p,grapple:undefined};
   if(p.id!==targetId)return p;
   let q={...p,currentHp:Math.max(0,p.currentHp-damage)};
   if(winner==='actor') {
    if(action==='grab'||action==='clinch'||action==='hold')q.grapple={sourceId:actorId,kind:action,round:state.round,chokeSuccesses:0};
    if(action==='hold'||action==='trip'||action==='throw')q.prone=true;
    if(action==='throw')q.grapple=undefined;
    if(['maintain','pain','choke'].includes(action)&&q.grapple)q.grapple={...q.grapple,round:state.round};
    if(action==='choke'&&q.grapple) {
     const stages=q.grapple.chokeRound===state.round-1? (q.grapple.chokeSuccesses??0)+1:1;
     q.grapple={...q.grapple,chokeSuccesses:stages,chokeRound:state.round};
     message=stages>=2?'Цель без сознания, жива и стабильна.':'Первый этап удушения.';
     if(stages>=2)q.effects=[...(q.effects??[]).filter(e=>e.id!=='martial-unconscious'),{id:'martial-unconscious',name:'Без сознания',description:'От удушающего контроля; жива и стабильна. Пробуждение по правилам книги.',sourceId:actorId,sourceName:char.name,modifiers:{canAct:false},penalty:0,roundsLeft:null}];
    }
    if(action==='push')message='Оттеснение на 1 сажень; положение на карте меняется сказителем.';
    if(action==='disarm')message='Оружие выпадает; отметьте его положение, предмет не уничтожен.';
   }else if(action==='choke'&&q.grapple)q.grapple={...q.grapple,chokeSuccesses:0};
   return q;
  })};
 }
 return {character:updated,encounter:next,damage,dice,cost,roll,target:at,defenseRoll,defenseTarget,message,winner};
}
