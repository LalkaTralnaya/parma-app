import {roomSupabase,ensureRoomSession} from '../supabase/client';
import {normalizeRelationshipSnapshot,copyRelationshipSnapshot,type RelationshipSnapshot} from './relationship-snapshot';

function failure(message:string):Error {
 if(/PGRST|relation .*does not exist|schema cache|could not find/i.test(message))return new Error('Хранилище паутины ещё не подключено. Нужно обновить базу данных.');
 return new Error(`Не удалось сохранить или загрузить паутину: ${message}`);
}
export async function loadRelationshipTemplate(initial:RelationshipSnapshot):Promise<RelationshipSnapshot>{
 const owner=await ensureRoomSession();
 const {error}=await roomSupabase.from('relationship_templates').upsert({owner_id:owner,data:copyRelationshipSnapshot(initial)},{onConflict:'owner_id',ignoreDuplicates:true});
 if(error)throw failure(error.message);
 const result=await roomSupabase.from('relationship_templates').select('data').eq('owner_id',owner).single();
 if(result.error)throw failure(result.error.message);
 return normalizeRelationshipSnapshot(result.data.data);
}
export async function saveRelationshipTemplate(snapshot:RelationshipSnapshot):Promise<void>{
 const owner=await ensureRoomSession();
 const result=await roomSupabase.from('relationship_templates').update({data:copyRelationshipSnapshot(snapshot),updated_at:new Date().toISOString()}).eq('owner_id',owner).select('owner_id');
 if(result.error)throw failure(result.error.message);if(!result.data?.length)throw new Error('Основная паутина не найдена. Обновите страницу.');
}
export async function loadRoomRelationships(roomId:string):Promise<RelationshipSnapshot|null>{
 await ensureRoomSession();const result=await roomSupabase.from('room_relationships').select('data').eq('room_id',roomId).maybeSingle();
 if(result.error)throw failure(result.error.message);return result.data?normalizeRelationshipSnapshot(result.data.data):null;
}
export async function attachRelationshipsToRoom(roomId:string):Promise<RelationshipSnapshot>{
 await ensureRoomSession();const result=await roomSupabase.rpc('attach_room_relationships',{p_room_id:roomId});
 if(result.error)throw failure(result.error.message);return normalizeRelationshipSnapshot(result.data);
}
export async function saveRoomRelationships(roomId:string,snapshot:RelationshipSnapshot):Promise<void>{
 await ensureRoomSession();const result=await roomSupabase.from('room_relationships').update({data:copyRelationshipSnapshot(snapshot),updated_at:new Date().toISOString()}).eq('room_id',roomId).select('room_id');
 if(result.error)throw failure(result.error.message);if(!result.data?.length)throw new Error('Сначала добавьте копию основной паутины в комнату.');
}
export function subscribeRoomRelationships(roomId:string,onChange:(snapshot:RelationshipSnapshot|null)=>void):()=>void {
 const channel=roomSupabase.channel(`room-web:${roomId}:${crypto.randomUUID()}`).on('postgres_changes',{event:'*',schema:'public',table:'room_relationships',filter:`room_id=eq.${roomId}`},payload=>{
  onChange('data' in payload.new?normalizeRelationshipSnapshot(payload.new.data):null);
 }).subscribe();return()=>{void roomSupabase.removeChannel(channel);};
}
export async function exportRoomArchive(roomId:string):Promise<Record<string,unknown>>{
 await ensureRoomSession();const result=await roomSupabase.rpc('export_room_archive',{p_room_id:roomId});
 if(result.error)throw new Error(`Не удалось выгрузить комнату: ${result.error.message}`);return result.data as Record<string,unknown>;
}
