import test from 'node:test';
import assert from 'node:assert/strict';
import { trackNoviceHelp } from '../src/lib/ui/novice-help-tracker.ts';
import { HELP_METADATA_KEY, HELP_ABSENCE, HELP_WEEK, shouldShowHelp } from '../src/lib/ui/novice-help.ts';

const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setTimeout(resolve, 0)); };
function fixture() {
  const values = new Map();
  const originals = Object.fromEntries(['window','document','localStorage','navigator'].map(name => [name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  for (const [name,value] of Object.entries({ window:new EventTarget(), document:Object.assign(new EventTarget(),{visibilityState:'visible'}), navigator:{onLine:true}, localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)} })) Object.defineProperty(globalThis,name,{configurable:true,value});
  let callback, current, pending;
  const saves = [];
  let offline = false;
  const client = {auth:{
    onAuthStateChange(cb) { callback=cb; return {data:{subscription:{unsubscribe(){}}}}; },
    async getUser() { return {data:{user:current},error:null}; },
    async updateUser({data}) {
      const id=current.id; saves.push({id,data:structuredClone(data)});
      if (pending) await pending;
      if (offline) return {data:{user:null},error:new Error('offline')};
      return {data:{user:{...current,user_metadata:{...current.user_metadata,...data}}},error:null};
    }
  }};
  let displayed;
  const tracker=trackNoviceHelp(client,value=>{displayed=value;});
  return {
    tracker, saves, values,
    get displayed(){return displayed;},
    login(user){current=user; callback('SIGNED_IN',{user});},
    logout(){current=null;callback('SIGNED_OUT',null);},
    fail(){offline=true;},
    delay(promise){pending=promise;},
    cleanup(){tracker.stop();for(const [name,descriptor] of Object.entries(originals))if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
  };
}
const user=(id,history={})=>({id,created_at:new Date(Date.now()-100*86_400_000).toISOString(),is_anonymous:false,user_metadata:{[HELP_METADATA_KEY]:history}});

test('tracker uses account history across devices, excludes room guests and clears on signout', async()=>{
  const f=fixture();
  try {
    f.login({...user('guest'),is_anonymous:true}); await flush();
    assert.equal(f.displayed,null); assert.equal(f.saves.length,0);
    f.login(user('returning',{lastActive:Date.now()-HELP_ABSENCE-1000})); await flush();
    assert.equal(f.displayed.id,'returning');
    assert.equal(shouldShowHelp(f.displayed.createdAt,f.displayed.history,Date.now()),true);
    assert.ok(f.saves[0].data[HELP_METADATA_KEY].returnUntil>Date.now()+HELP_WEEK-5000);
    f.tracker.dismiss('adventures',true); await flush();
    assert.equal(shouldShowHelp(f.displayed.createdAt,f.displayed.history,Date.now()),false);
    f.logout(); assert.equal(f.displayed,null);
    f.login(user('other',{lastActive:Date.now()-1000})); await flush();
    assert.equal(f.displayed.history.returnUntil,0);
    assert.equal(f.displayed.history.hiddenUntil,0);
    assert.ok(f.saves.every(entry=>entry.id!=='guest'));
  } finally { f.cleanup(); }
});

test('closing help while initial save is in flight is saved afterwards',async()=>{
  const f=fixture(); let release;
  try {
    f.delay(new Promise(resolve=>{release=resolve;}));
    f.login(user('slow',{lastActive:Date.now()-HELP_ABSENCE-1000})); await flush();
    f.tracker.dismiss('adventures',true);
    release(); await flush();
    assert.equal(f.saves.length,2);
    const saved=f.saves.at(-1).data[HELP_METADATA_KEY];
    assert.equal(saved.hiddenUntil,saved.returnUntil);
  } finally { release?.(); f.cleanup(); }
});

test('failed network save keeps a per-account local copy without losing dismissal',async()=>{
  const f=fixture();
  try {
    f.fail(); f.login(user('offline',{lastActive:Date.now()-HELP_ABSENCE-1000})); await flush();
    f.tracker.dismiss('adventures'); await flush();
    const cached=JSON.parse(f.values.get('parma.help.v1:offline'));
    assert.ok(cached.dismissed.some(id=>id.endsWith(':adventures')));
    assert.ok(cached.returnUntil>Date.now());
    assert.ok(f.saves.length<=2);
  } finally { f.cleanup(); }
});
