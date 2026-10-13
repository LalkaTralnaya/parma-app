import test from 'node:test';
import assert from 'node:assert/strict';
import { characterSnapshot } from '../src/lib/db/characterSnapshot.ts';
import { learnAbility } from '../src/lib/engine/character.ts';

// A shallow spread leaves nested Svelte proxies in the learned character.
const reactive = value => value && typeof value === 'object'
  ? new Proxy(value, { get: (target, key) => reactive(Reflect.get(target, key)) }) : value;

test('learning an ability produces an IndexedDB-cloneable snapshot without losing nested character data', () => {
  const original = reactive({ id: 'save-regression', abilities: [], abilityPoints: 2,
    characteristics: { intelligence: { levelUpBonus: 1 } }, skillPoints: {},
    inventory: [{ instanceId: 'bag', itemId: 'rope', quantity: 2 }],
    currentResources: { hp: 20, mana: 15 }, bio: { backstory: 'История' } });
  const updated = learnAbility(original, 'RE.base1');
  assert.ok(updated);
  assert.throws(() => structuredClone(updated), { name: 'DataCloneError' });
  const record = characterSnapshot(updated);
  const persisted = structuredClone(record);
  assert.deepEqual(persisted.abilities, ['RE.base1']);
  assert.equal(persisted.abilityPoints, 1);
  assert.deepEqual(persisted.inventory, [{ instanceId: 'bag', itemId: 'rope', quantity: 2 }]);
  assert.equal(persisted.bio.backstory, 'История');
  assert.deepEqual(persisted.currentResources, { hp: 20, mana: 15 });
  original.currentResources.hp = 3;
  assert.equal(record.currentResources.hp, 20);
  assert.equal(original.abilityPoints, 2);
});
