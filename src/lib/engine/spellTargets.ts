import type { Spell } from '../rules/spells';
import type { CombatParticipant } from '../sync/combat';
import { effectSaveTarget, type CombatEffect } from './combatEffects';

export function spellDamageSaveTarget(target:CombatParticipant,spell:Spell):number|null {
 if(!spell.damageSave)return null;
 const effect:CombatEffect={id:'spell-damage-save',name:spell.name,sourceId:'',sourceName:'',description:'',modifiers:{},save:spell.damageSave,penalty:0,roundsLeft:null};
 return effectSaveTarget(target,effect);
}
export function spellDamageAfterSave(damage:number,roll:number|null,target:number|null):number {
 if(roll===null||target===null)return damage;
 if(!Number.isInteger(roll)||roll<1||roll>100)throw new Error('К100 должен быть от 1 до 100.');
 return roll===1||(roll!==100&&roll<=target)?Math.floor(damage/2):damage;
}
