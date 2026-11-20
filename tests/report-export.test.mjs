import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReportExport, emptyExportFilters, parseExportFilters, exportReportCsv, csvText, reportSignals } from '../src/lib/reports/export.ts';
import { readReportExport } from '../src/lib/server/reportExport.ts';
const row = (extra = {}) => ({ adventure_slug:'karngorn', revision:'r1', updated_at:'2026-11-17T23:59:59Z', payload:{
 group:'=TEST()', canonBranch:'test-main', canonVersion:'v1', reviewStatus:'disputed',
 answers:{unknown:{decision:'other',decisionNote:'Текст, "кавычки"\nстрока',outcome:'unknown',observed:'Факт',knowledge:'Сведения',pending:'Вопрос',future:7}}, extra:{keep:true}
}, ...extra });
const bundle = (rows=[row()], filters={}) => buildReportExport(rows,{...emptyExportFilters,...filters},'account',new Date('2026-11-18T00:00:00Z'));
test('JSON preserves unknown data, revisions and stable keys', () => {
 const result=JSON.parse(JSON.stringify(bundle()));
 assert.deepEqual(result.reports[0].payload,row().payload);
 assert.equal(result.reports[0].report_key,'account/karngorn');
 assert.equal(result.reports[0].saved_revision,'r1');
 assert.ok(result.warnings.length);
 assert.equal(bundle([row({adventure_slug:'future'})]).reports[0].region,null);
});
test('all filters and inclusive final UTC day', () => {
 assert.equal(bundle(undefined,{adventure:'karngorn',branch:'test-main',canonVersion:'v1',reviewStatus:'disputed',from:'2026-11-17',to:'2026-11-17'}).report_count,1);
 for(const name of ['adventure','region','branch','canonVersion','reviewStatus']) assert.equal(bundle(undefined,{[name]:'absent'}).report_count,0);
 assert.equal(bundle(undefined,{from:'2026-11-18'}).report_count,0);
 assert.equal(bundle(undefined,{to:'2026-11-16'}).report_count,0);
});
test('invalid dates, repeated filters and reversed range', () => {
 for(const value of ['2026-13-01','2026-02-30','bad']) assert.throws(()=>parseExportFilters(new URLSearchParams({from:value})),{status:400});
 assert.throws(()=>parseExportFilters(new URLSearchParams('from=2026-01-01&from=2026-01-02')),{status:400});
 assert.throws(()=>parseExportFilters(new URLSearchParams('from=2026-02-01&to=2026-01-01')),{status:400});
});
test('duplicate or incomplete records stop export', () => {
 assert.throws(()=>bundle([row(),row()]),{status:502});
 for(const bad of [{updated_at:'bad'},{payload:null},{revision:''}]) assert.throws(()=>bundle([row(bad)]),{status:502});
});
test('CSV quotes multiline text, preserves raw fields and protects formulas', () => {
 const csv=exportReportCsv(bundle());
 assert.ok(csv.reports.startsWith('\uFEFF'));
 assert.ok(csv.reports.includes('"\'=TEST()"'));
 assert.ok(csv.decisions.includes('Текст, ""кавычки""\nстрока'));
 assert.ok(csv.decisions.includes('"account/karngorn","unknown"'));
 assert.ok(csv.reports.includes('""extra"":{'));
 assert.ok(csv.decisions.includes('""future"":7'));
 for(const input of ['=1',' +1','-2','@x','\tdata','\ntext']) assert.ok(csvText([[input]]).startsWith('\uFEFF"\''));
 assert.equal(row().payload.group,'=TEST()');
});
test('notification signals have deterministic revision keys, without sending',()=>{
 const report=bundle().reports[0];
 assert.deepEqual(reportSignals(report).map(e=>e.kind),['unusual-outcome','disputed-report']);
 assert.deepEqual(reportSignals(report),reportSignals(report));
 assert.notEqual(reportSignals(report)[0].event_key,reportSignals({...report,saved_revision:'r2'})[0].event_key);
});
function client({user={id:'account-a',is_anonymous:false},error=null,data=[row()],count=data?.length,authError=null,admin=false,rpcError=null}={}) {
 const calls=[]; data=data?.map(row=>({user_id:user?.id,...row}));
 const query={select(...args){calls.push(['select',...args]);return this;},eq(...args){calls.push(['eq',...args]);return this;},order(){return this;},async limit(){return {data,count,error};}};
 return {calls,async rpc(name){calls.push(['rpc',name]);return {data:admin,error:rpcError};},auth:{async getUser(token){calls.push(['auth',token]);return {data:{user},error:authError};}},from(table){calls.push(['from',table]);return query;}};
}
test('server validates caller and ignores forged user_id',async()=>{
 const c=client();const result=await readReportExport(c,'caller-token',new URLSearchParams('user_id=other'));
 assert.ok(c.calls.some(call=>call[0]==='eq'&&call[1]==='user_id'&&call[2]==='account-a'));
 assert.equal(result.report_count,1);
 assert.ok(!JSON.stringify(result).includes('account-a'));
 const other=await readReportExport(client({user:{id:'account-b'}}),'token',new URLSearchParams());
 assert.notEqual(result.reports[0].report_key,other.reports[0].report_key);
});
test('guest and expired sessions cannot read reports',async()=>{
 for(const [options,status] of [[{user:null},401],[{authError:{message:'expired'}},401],[{user:{id:'guest',is_anonymous:true}},403]]) {
 const c=client(options);await assert.rejects(readReportExport(c,'token',new URLSearchParams()),{status});
 assert.ok(!c.calls.some(call=>call[0]==='from'));
 }
});
test('server rejects truncated responses and absent table',async()=>{
 await assert.rejects(readReportExport(client({count:2}),'token',new URLSearchParams()),{status:502});
 await assert.rejects(readReportExport(client({count:null}),'token',new URLSearchParams()),{status:502});
 await assert.rejects(readReportExport(client({error:{code:'PGRST205'}}),'token',new URLSearchParams()),{status:503});
});

test('administrator can read two owners without merging their reports',async()=>{
 const c=client({admin:true,data:[row({user_id:'account-a'}),row({user_id:'account-b'})]});
 const result=await readReportExport(c,'token',new URLSearchParams('scope=all-drafts'));
 assert.equal(result.scope,'all-drafts');
 assert.equal(result.report_count,2);
 assert.notEqual(result.reports[0].report_key,result.reports[1].report_key);
 assert.ok(!c.calls.some(call=>call[0]==='eq'));
 assert.ok(c.calls.some(call=>call[0]==='rpc'&&call[1]==='is_adventure_report_admin'));
 assert.ok(!JSON.stringify(result).includes('account-b'));
 const own=await readReportExport(client(),'token',new URLSearchParams());
 assert.equal(own.reports[0].report_key,result.reports[0].report_key);
});
test('forged profile admin flag cannot grant report access; missing migration fails closed',async()=>{
 const c=client({user:{id:'account-a',is_anonymous:false,user_metadata:{admin:true},app_metadata:{admin:true}}});
 await assert.rejects(readReportExport(c,'token',new URLSearchParams('scope=all-drafts')),{status:403});
 assert.ok(!c.calls.some(call=>call[0]==='from'));
 await assert.rejects(readReportExport(client({rpcError:{code:'PGRST202'}}),'token',new URLSearchParams('scope=all-drafts')),{status:503});
});
test('guests never reach admin membership lookup',async()=>{
 const c=client({admin:true,user:{id:'guest',is_anonymous:true}});
 await assert.rejects(readReportExport(c,'token',new URLSearchParams('scope=all-drafts')),{status:403});
 assert.ok(!c.calls.some(call=>call[0]==='rpc'));
});
test('invalid scopes and wrong owners fail closed',async()=>{
 for(const scope of ['scope=all','scope=own-drafts&scope=all-drafts']) await assert.rejects(readReportExport(client(),'token',new URLSearchParams(scope)),{status:400});
 await assert.rejects(readReportExport(client({data:[row({user_id:'account-b'})]}),'token',new URLSearchParams()),{status:502});
});
