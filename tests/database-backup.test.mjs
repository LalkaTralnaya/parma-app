import {test} from 'node:test';
import assert from 'node:assert/strict';
import {backupPlan,runBackup} from '../scripts/backup-database.mjs';
const env={PGSERVICE:'test',PGSERVICEFILE:'external'};
const recipient='age1'+'a'.repeat(58);
test('backup requires explicit mode, external target and public encryption recipient',()=>{
 assert.throws(()=>backupPlan([],env));
 assert.throws(()=>backupPlan(['--run','--output','relative','--recipient',recipient],env));
 assert.throws(()=>backupPlan(['--run','--output',process.cwd(),'--recipient',recipient],{}));
 const args=['--plan','--output',process.cwd(),'--recipient',recipient];
 assert.equal(backupPlan(args,env).run,false);
 assert.throws(()=>backupPlan([...args,'--run'],env));
 assert.throws(()=>backupPlan([...args,'--connection','secret'],env));
});

test('backup refuses the repository before creating files or running tools',async()=>{
 await assert.rejects(runBackup({output:process.cwd(),recipient}),/outside the repository/);
});