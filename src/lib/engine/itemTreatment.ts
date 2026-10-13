import type { Character } from '$lib/type';
import type { CombatParticipant, CombatState } from '../sync/combat';
import { getItem } from '../rules/items';
import { adjustItemQuantity } from './inventory';
export function applyItemTreatments(character: Character, participant: CombatParticipant): Character {
 const pending = (participant.itemTreatments ?? []).filter(t => !(character.appliedItemTreatments ?? []).includes(t.id));
 if (!pending.length) return character;
 return { ...character, conditions: (character.conditions ?? []).filter(c => !pending.some(t => t.conditionId === c.id)), appliedItemTreatments: [...(character.appliedItemTreatments ?? []), ...pending.map(t => t.id)] };
}
export function treatWithItem(actor: Character, instanceId: string, recipient: Character | null, encounter: CombatState | null, participantId: string | null, treatmentId: string) {
 const entry = actor.inventory.find(i => i.instanceId === instanceId && i.quantity > 0);
 const item = entry && getItem(entry.itemId);
 if (!entry || !item?.curesCondition) throw new Error('Предмет для лечения не найден.');
 const conditionId = item.curesCondition;
 const participant = encounter?.participants.find(p => p.id === participantId);
 const target = recipient ?? participant?.characterSnapshot ?? null;
 if (!target && !participant) throw new Error('Выберите цель.');
 const affected = (target?.conditions ?? []).some(c => c.id === conditionId) || (participant?.effects ?? []).some(e => e.conditionId === conditionId);
 if (!affected) throw new Error('У выбранной цели нет этого состояния. Предмет не израсходован.');
 const treatment = { id: treatmentId, conditionId };
 const healed = target ? { ...target, conditions: (target.conditions ?? []).filter(c => c.id !== conditionId), appliedItemTreatments: [...(target.appliedItemTreatments ?? []), treatmentId] } : null;
 const self = target?.id === actor.id;
 const updatedActor = item.consumable ? adjustItemQuantity(self ? healed! : actor, instanceId, -1) : (self ? healed! : actor);
 const updatedRecipient = self ? updatedActor : healed;
 const state = encounter && participant ? { ...encounter, participants: encounter.participants.map(p => p.id !== participant.id ? p : { ...p, effects: (p.effects ?? []).filter(e => e.conditionId !== conditionId), itemTreatments: [...(p.itemTreatments ?? []), treatment], ...(updatedRecipient ? { characterSnapshot: updatedRecipient } : {}) }) } : null;
 return { actor: updatedActor, recipient: updatedRecipient, state, conditionId };
}
