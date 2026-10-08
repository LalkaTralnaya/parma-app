import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_TABLES } from '../src/lib/rules/random-events.ts';
import { resolveEvent, rollEvent } from '../src/lib/engine/random-events.ts';
test('every event table covers every die face exactly once',()=>{
assert.equal(EVENT_TABLES.length,14);
for(const table of EVENT_TABLES)for(let value=1;value<=table.sides;value++){assert.equal(table.rows.filter(row=>value>=row.min&&value<=row.max).length,1,table.id+' '+value);assert.equal(resolveEvent(table,value).value,value);}
});
test('00 on a percentile table means 100; range boundaries select the correct row',()=>{
const weather=EVENT_TABLES.find(x=>x.id==='event-5507');
assert.equal(resolveEvent(weather,5).row,0);assert.equal(resolveEvent(weather,6).row,1);assert.equal(resolveEvent(weather,100).row,weather.rows.length-1);
assert.deepEqual(rollEvent(weather,()=>100),resolveEvent(weather,100));
});
test('invalid physical dice are rejected',()=>{for(const value of [0,-1,101,1.5,undefined,NaN])assert.throws(()=>resolveEvent(EVENT_TABLES[0],value));});
