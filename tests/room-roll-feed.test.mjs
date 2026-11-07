import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoomRollFeed } from '../src/lib/engine/room-roll-feed.ts';

const room = (id) => ({ id, code:id, name:id });
const roll = (id, second=1) => ({ id, room_id:'a', roll_type:'skill', roll_data:{}, created_at:'2026-11-08T12:00:' + String(second).padStart(2,'0') + 'Z' });
function deferred() { let resolve; const promise = new Promise((done) => { resolve=done; }); return {promise,resolve}; }
function setup(overrides={}) {
 const states=[];
 let receive;
 let unsubscribed=0;
 const feed=createRoomRollFeed({
  findRoom:async(code)=>room(code),
  getRolls:async()=>[],
  subscribe:(_id,callback)=>{ receive=callback; return ()=>unsubscribed++; },
  onChange:(state)=>states.push(state),
  ...overrides
 });
 return {feed, states, get state(){return states.at(-1);}, send:(value)=>receive(value), get unsubscribed(){return unsubscribed;}};
}

test('no active room makes no guest or history requests',async()=>{
 let calls=0;
 const chat=setup({findRoom:async()=>{calls++;return room('a');}});
 await chat.feed.setCode(null);
 await chat.feed.retry();
 assert.equal(calls,0);
 chat.feed.dispose();
});

test('a failed room lookup is handled and the same room can be retried',async()=>{
 let calls=0;
 const chat=setup({findRoom:async(code)=>{if(calls++===0)throw new Error('Connection unavailable');return room(code);},getRolls:async()=>[roll('one')]});
 await chat.feed.setCode('a');
 assert.equal(chat.state.error,'Connection unavailable');
 assert.equal(chat.state.loading,false);
 await chat.feed.retry();
 assert.equal(chat.state.error,'');
 assert.equal(chat.state.room.id,'a');
 assert.deepEqual(chat.state.rolls.map(value=>value.id),['one']);
 chat.feed.dispose();
});

test('a late response from a previous room cannot replace the current room',async()=>{
 const pending=deferred();
 const chat=setup({findRoom:(code)=>code==='old'?pending.promise:Promise.resolve(room(code))});
 const oldRequest=chat.feed.setCode('old');
 await chat.feed.setCode('new');
 pending.resolve(room('old'));
 await oldRequest;
 assert.equal(chat.state.code,'new');
 assert.equal(chat.state.room.id,'new');
 chat.feed.dispose();
});

test('realtime rolls received during history loading survive and are deduplicated',async()=>{
 const pending=deferred();
 const subscribed=deferred();
 let receive;
 const chat=setup({getRolls:()=>pending.promise,subscribe:(_id,callback)=>{receive=callback;subscribed.resolve();return ()=>{};}});
 const request=chat.feed.setCode('a');
 await subscribed.promise;
 receive(roll('new',2));
 pending.resolve([roll('new',2),roll('old',1)]);
 await request;
 assert.deepEqual(chat.state.rolls.map(value=>value.id),['new','old']);
 chat.feed.dispose();
});

test('history errors preserve live subscription and can be retried without duplicates',async()=>{
 let attempts=0;
 const chat=setup({getRolls:async()=>{if(attempts++===0)throw new Error('History unavailable');return [];}});
 await chat.feed.setCode('a');
 assert.equal(chat.state.error,'History unavailable');
 chat.send(roll('live'));
 assert.equal(chat.state.rolls[0].id,'live');
 await chat.feed.retry();
 assert.equal(chat.unsubscribed,1);
 assert.equal(chat.state.error,'');
 chat.feed.dispose();
 assert.equal(chat.unsubscribed,2);
});

test('leaving a room and disposing stop stale async updates and subscriptions',async()=>{
 const pending=deferred();
 const subscribed=deferred();
 let receive;
 let stopped=0;
 const chat=setup({getRolls:()=>pending.promise,subscribe:(_id,callback)=>{receive=callback;subscribed.resolve();return ()=>stopped++;}});
 const request=chat.feed.setCode('a');
 await subscribed.promise;
 await chat.feed.setCode(null);
 receive(roll('late'));
 pending.resolve([roll('old')]);
 await request;
 assert.equal(stopped,1);
 assert.equal(chat.state.code,null);
 assert.deepEqual(chat.state.rolls,[]);
 const count=chat.states.length;
 chat.feed.dispose();
 await chat.feed.setCode('b');
 await chat.feed.retry();
 assert.equal(chat.states.length,count);
});

test('a stalled guest-session request times out and can be retried',async()=>{
 let attempts=0;
 const chat=setup({requestTimeoutMs:5,findRoom:()=>attempts++===0?new Promise(()=>{}):Promise.resolve(room('a'))});
 await chat.feed.setCode('a');
 assert.equal(chat.state.loading,false);
 assert.match(chat.state.error,/Нет ответа/);
 await chat.feed.retry();
 assert.equal(chat.state.room.id,'a');
 assert.equal(chat.state.error,'');
 chat.feed.dispose();
});
