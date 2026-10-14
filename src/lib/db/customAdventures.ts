import Dexie, { type Table } from 'dexie';
import { validateCustomAdventure, type CustomAdventure } from '../engine/customAdventures';
class AdventureDB extends Dexie {
 adventures!:Table<CustomAdventure,string>;
 constructor(name:string){super(name);this.version(1).stores({adventures:'id,updatedAt'});}
}
const databases=new Map<string,AdventureDB>();
async function activeDb(){const {supabase}=await import('../supabase/client');const {data:{session},error}=await supabase.auth.getSession();if(error)throw error;const name=`parma-adventures-${session?.user.id??'guest'}`;let db=databases.get(name);if(!db){db=new AdventureDB(name);databases.set(name,db);}return db;}
export async function listCustomAdventures(){return (await activeDb()).adventures.orderBy('updatedAt').reverse().toArray();}
export async function getCustomAdventure(id:string){return (await activeDb()).adventures.get(id);}
export async function saveCustomAdventure(record:CustomAdventure){const snapshot=JSON.parse(JSON.stringify(record)) as CustomAdventure;validateCustomAdventure(snapshot);snapshot.updatedAt=Date.now();await (await activeDb()).adventures.put(snapshot);record.updatedAt=snapshot.updatedAt;}
