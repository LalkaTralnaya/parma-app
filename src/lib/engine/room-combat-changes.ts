import type { CombatParticipant, CombatState } from '../sync/combat';

const combatFields = ['currentHp', 'effects', 'itemTreatments', 'prone', 'grapple'] as const;
type CombatField = typeof combatFields[number];
type CombatValues = Partial<Record<CombatField, CombatParticipant[CombatField] | null>>;

export interface RoomCombatChange {
 id: string;
 before: CombatValues;
 after: CombatValues;
}

export function roomCombatChanges(previous: CombatState, next: CombatState): RoomCombatChange[] {
 const previousById = new Map(previous.participants.map((participant) => [participant.id, participant]));
 return next.participants.flatMap((participant) => {
  const existing = previousById.get(participant.id);
  if (!existing) return [];
  const before: CombatValues = {};
  const after: CombatValues = {};
  for (const field of combatFields) {
   const oldValue = existing[field] ?? null;
   const newValue = participant[field] ?? null;
   if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
   before[field] = oldValue;
   after[field] = newValue;
  }
  return Object.keys(after).length ? [{ id: participant.id, before, after }] : [];
 });
}

export function roomCombatPhase(state: CombatState): [boolean, number, number] {
 return [state.active, state.round, state.currentTurnIndex];
}

export function prepareRoomCombatAction(before: CombatState, next: CombatState, characterId: string) {
	const changes = roomCombatChanges(before, next);
	if (!changes.length) return null;
	const actor = before.participants.find(participant =>
		participant.isPlayer && (participant.sourceId ?? participant.id) === characterId
	);
	if (!actor) throw new Error('Сказитель должен добавить персонажа в бой.');
	return { actorId: actor.id, phase: roomCombatPhase(before), changes };
}
