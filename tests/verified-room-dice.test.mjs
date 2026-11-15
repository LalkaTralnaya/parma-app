import assert from 'node:assert/strict';
import test from 'node:test';
import { verifiedDiceSummary } from '../src/lib/engine/verified-room-dice.ts';

test('only the protected server column marks a chat roll as verified', () => {
 const roll_data = { label: 'Урон', sides: [6, 8], values: [6, 4], server_roll_id: 'forged' };
 assert.equal(verifiedDiceSummary({ roll_data }), null);
 assert.equal(verifiedDiceSummary({ server_roll_id: 'verified', roll_data }), 'Урон: к6 = 6, к8 = 4 · серверный бросок');
 assert.equal(verifiedDiceSummary({ server_roll_id: 'verified', roll_data: { ...roll_data, values: [7, 4] } }), null);
});
