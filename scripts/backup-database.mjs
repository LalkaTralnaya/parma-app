// Administrative backup only. Never invoked by the application or export route.
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, realpath, writeFile, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';

export function backupPlan(args, env=process.env) {
 const allowed=new Set(['--plan','--run','--output','--recipient']);
 for (let i=0;i<args.length;i++) {
  if (!allowed.has(args[i])) throw new Error('Unknown argument');
  if (['--output','--recipient'].includes(args[i])) {
   if (!args[i+1] || args[i+1].startsWith('--')) throw new Error('Missing argument value');
   i++;
  }
 }
 if (args.filter(x=>x==='--run'||x==='--plan').length!==1) throw new Error('Choose exactly one: --plan or --run');
 for(const flag of allowed) if(args.filter(x=>x===flag).length>1) throw new Error('Duplicate argument');
 const get=flag=>args.includes(flag)?args[args.indexOf(flag)+1]:undefined;
 const output=get('--output'),recipient=get('--recipient');
 if(!output||!isAbsolute(output)||!recipient||!/^age1[0-9a-z]{58}$/.test(recipient)) throw new Error('Absolute output directory and age public recipient required');
 if(!env.PGSERVICE || !env.PGSERVICEFILE) throw new Error('Configure PGSERVICE and PGSERVICEFILE outside the repository');
 return {run:args.includes('--run'),output:resolve(output),recipient};
}
const succeeded = child => new Promise((res,rej)=>{
 child.once('error',()=>rej(new Error('Backup tool could not start')));
 child.once('exit',(code)=>code===0?res():rej(new Error('Backup tool failed; no complete backup was produced')));
});
async function encryptedDump(command,args,destination,recipient) {
 // The database stream goes directly to encryption. No plaintext file is created.
 const source=spawn(command,args,{shell:false,stdio:['ignore','pipe','ignore'],windowsHide:true});
 const encrypt=spawn('age',['--encrypt','--recipient',recipient],{shell:false,stdio:['pipe','pipe','ignore'],windowsHide:true});
 const sourceDone=succeeded(source), encryptDone=succeeded(encrypt);
 try {
  await Promise.all([sourceDone,encryptDone,
   pipeline(source.stdout,encrypt.stdin),
   pipeline(encrypt.stdout,createWriteStream(destination,{flags:'wx',mode:0o600}))]);
 } catch(error) {source.kill();encrypt.kill();throw error;}
}
async function digest(path) {
 const hash=createHash('sha256');
 for await (const chunk of createReadStream(path)) hash.update(chunk);
 return hash.digest('hex');
}
export async function runBackup(plan) {
 const root=await realpath(resolve(import.meta.dirname,'..'));
 const external=await realpath(plan.output); // Must already exist; resolves directory symlinks.
 const rel=relative(root,external);
 if(rel==='' || (rel!=='..'&&!rel.startsWith('..'+sep)&&!isAbsolute(rel))) throw new Error('Backup destination must be outside the repository');
 const directory=resolve(external,'parma-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID());
 await mkdir(directory,{mode:0o700});
 const files=[
  {name:'database.dump.age',command:'pg_dump',args:['--format=custom','--no-password']},
  {name:'roles.sql.age',command:'pg_dumpall',args:['--roles-only','--no-role-passwords','--no-password']}
 ];
 for(const file of files) {
  const path=resolve(directory,file.name);
  await encryptedDump(file.command,file.args,path,plan.recipient);
  file.sha256=await digest(path);
  file.bytes=(await stat(path)).size;
 }
 await writeFile(resolve(directory,'manifest.json'),JSON.stringify({
  format_version:1,completed_at:new Date().toISOString(),files:files.map(({name,sha256,bytes})=>({name,sha256,bytes})),
  excludes:['Storage object files','Auth/project settings','secrets','role passwords'],
  restore_verified:false
 },null,2),{flag:'wx',mode:0o600});
 return directory;
}
if(process.argv[1] && resolve(process.argv[1])===resolve(import.meta.filename)) {
 try {
  const plan=backupPlan(process.argv.slice(2));
  if(!plan.run) console.log('Plan: pg_dump + pg_dumpall -> age encryption -> external directory. Requires installed pg_dump, pg_dumpall and age. No backup executed.');
  else {await runBackup(plan);console.log('Encrypted database backup completed. Restore verification and platform assets remain required.');}
 } catch {console.error('Backup stopped. Check arguments, external destination, PostgreSQL service configuration, permissions and installed tools. A directory without manifest.json is incomplete.');process.exitCode=1;}
}
