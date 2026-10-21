-- Replace the publicly readable device-id room protocol with authenticated guest sessions.
-- Existing room state and roll history are retained. Old invite codes, devices and memberships are revoked.

alter table public.rooms add column if not exists master_auth_id uuid;
alter table public.room_participants add column if not exists auth_user_id uuid;

-- Existing room identifiers were public and cannot be trusted as ownership credentials.
-- Rotate every invite, revoke all device identities, and require hosts and players to reconnect.
drop trigger if exists guard_room_request_changes on public.room_requests;
update public.rooms
set code = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
    master_device_id = 'revoked-' || gen_random_uuid()::text,
    master_auth_id = null;
delete from public.room_participants;
update public.room_requests set closed = true where closed = false;

alter table public.room_participants
    drop constraint if exists room_participants_room_id_device_id_key;
alter table public.room_participants
    add constraint room_participants_room_id_auth_user_id_key unique (room_id, auth_user_id);

create index if not exists room_participants_room_auth_user_idx
    on public.room_participants (room_id, auth_user_id);

create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;

create or replace function app_private.is_room_member(p_room_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql stable security definer
set search_path = pg_catalog, public
set row_security = off
as $$
    select exists (
        select 1 from public.room_participants p
        where p.room_id = p_room_id and p.auth_user_id = p_user_id
    )
$$;

create or replace function app_private.is_room_master(p_room_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql stable security definer
set search_path = pg_catalog, public
set row_security = off
as $$
    select exists (
        select 1 from public.rooms r
        where r.id = p_room_id and r.master_auth_id = p_user_id
    )
$$;

revoke all on function app_private.is_room_member(uuid, uuid) from public, anon;
revoke all on function app_private.is_room_master(uuid, uuid) from public, anon;
grant execute on function app_private.is_room_member(uuid, uuid) to authenticated;
grant execute on function app_private.is_room_master(uuid, uuid) to authenticated;

-- Every room action now belongs to a Supabase Auth identity, including anonymous guests.
create or replace function public.lookup_room_by_invite(p_code text)
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public, auth
set row_security = off
as $$
declare room_row public.rooms;
begin
    if auth.uid() is null then raise exception 'Guest session required'; end if;
    select * into room_row from public.rooms where code = lower(trim(p_code));
    if not found then return null; end if;
    return to_jsonb(room_row);
end;
$$;

create or replace function public.create_secure_room(
    p_code text,
    p_name text,
    p_display_name text
)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public, auth
set row_security = off
as $$
declare room_row public.rooms;
begin
    if auth.uid() is null then raise exception 'Guest session required'; end if;
    if p_code !~ '^[0-9a-f]{64}$' then raise exception 'Invalid room invite'; end if;
    if length(trim(coalesce(p_name, ''))) > 120 then raise exception 'Room name is too long'; end if;
    if length(trim(coalesce(p_display_name, ''))) > 80 then raise exception 'Display name is too long'; end if;

    insert into public.rooms (code, name, master_device_id, master_auth_id)
    values (p_code, nullif(trim(p_name), ''), auth.uid()::text, auth.uid())
    returning * into room_row;

    insert into public.room_participants (room_id, device_id, auth_user_id, display_name, role)
    values (room_row.id, auth.uid()::text, auth.uid(), coalesce(nullif(trim(p_display_name), ''), 'Сказитель'), 'master');

    insert into public.room_combat (room_id, state) values (room_row.id, '{}'::jsonb);
    return to_jsonb(room_row);
end;
$$;

create or replace function public.join_secure_room(
    p_room_id uuid,
    p_code text,
    p_display_name text,
    p_character_snapshot jsonb
)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public, auth
set row_security = off
as $$
declare
    room_row public.rooms;
    participant_row public.room_participants;
    participant_role text;
begin
    if auth.uid() is null then raise exception 'Guest session required'; end if;
    select * into room_row from public.rooms
      where id = p_room_id and code = lower(trim(p_code)) for update;
    if not found then raise exception 'Room invitation is invalid or expired'; end if;
    if length(trim(coalesce(p_display_name, ''))) > 80 then raise exception 'Display name is too long'; end if;
    participant_role := case when room_row.master_auth_id = auth.uid() then 'master' else 'player' end;

    insert into public.room_participants (room_id, device_id, auth_user_id, display_name, character_snapshot, role, last_seen)
    values (room_row.id, auth.uid()::text, auth.uid(), coalesce(nullif(trim(p_display_name), ''), 'Гость'), p_character_snapshot, participant_role, now())
    on conflict (room_id, auth_user_id) do update set
      device_id = excluded.device_id,
      display_name = excluded.display_name,
      character_snapshot = excluded.character_snapshot,
      role = excluded.role,
      last_seen = now()
    returning * into participant_row;

    update public.rooms set updated_at = now() where id = room_row.id;
    return to_jsonb(participant_row);
end;
$$;

create or replace function public.delete_secure_room(p_room_id uuid)
returns void
language plpgsql security definer
set search_path = pg_catalog, public, auth
set row_security = off
as $$
begin
    if auth.uid() is null or not app_private.is_room_master(p_room_id, auth.uid()) then
        raise exception 'Only the room storyteller may delete it';
    end if;
    delete from public.rooms where id = p_room_id;
end;
$$;

create or replace function public.rotate_room_invite(p_room_id uuid)
returns text
language plpgsql security definer
set search_path = pg_catalog, public, auth
set row_security = off
as $$
declare new_code text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
    if auth.uid() is null or not app_private.is_room_master(p_room_id, auth.uid()) then
        raise exception 'Only the room storyteller may rotate the invitation';
    end if;
    update public.rooms set code = new_code, updated_at = now() where id = p_room_id;
    return new_code;
end;
$$;

create or replace function app_private.guard_room_participant_changes()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare is_master boolean;
begin
    is_master := app_private.is_room_master(old.room_id, auth.uid());
    if new.id is distinct from old.id
       or new.room_id is distinct from old.room_id
       or new.device_id is distinct from old.device_id
       or new.auth_user_id is distinct from old.auth_user_id
       or new.role is distinct from old.role
       or new.joined_at is distinct from old.joined_at then
        raise exception 'Participant identity fields cannot be changed';
    end if;
    if not is_master and old.auth_user_id is distinct from auth.uid() then
        raise exception 'Only the storyteller or this participant may update the record';
    end if;
    if not is_master and (
       new.pending_character is distinct from old.pending_character
       or new.character_locked is distinct from old.character_locked
    ) then
        raise exception 'Only the storyteller may change participant offers or locks';
    end if;
    return new;
end;
$$;
revoke all on function app_private.guard_room_participant_changes() from public, anon;
drop trigger if exists guard_room_participant_changes on public.room_participants;
create trigger guard_room_participant_changes before update on public.room_participants
for each row execute function app_private.guard_room_participant_changes();

create or replace function app_private.guard_room_request_changes()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare
    master_user uuid;
    is_master boolean;
    is_member boolean;
    changed_key text;
begin
    select r.master_auth_id into master_user from public.rooms r where r.id = new.room_id;
    if master_user is null then raise exception 'Room does not exist'; end if;
    is_master := master_user = auth.uid();
    is_member := app_private.is_room_member(new.room_id, auth.uid());

    if tg_op = 'INSERT' then
        if not is_master then raise exception 'Only the storyteller may create a request'; end if;
        if coalesce(new.closed, false) or coalesce(new.results, '{}'::jsonb) <> '{}'::jsonb then
            raise exception 'New requests must start open and without results';
        end if;
        return new;
    end if;

    if new.id is distinct from old.id
       or new.room_id is distinct from old.room_id
       or new.request_type is distinct from old.request_type
       or new.label is distinct from old.label
       or new.created_at is distinct from old.created_at then
        raise exception 'Request identity fields cannot be changed';
    end if;
    if new.closed is distinct from old.closed and not is_master then
        raise exception 'Only the storyteller may close a request';
    end if;
    if new.results is distinct from old.results and not is_master then
        if not is_member then raise exception 'Room member required'; end if;
        for changed_key in
            select k from (
                select jsonb_object_keys(coalesce(old.results, '{}'::jsonb)) as k
                union
                select jsonb_object_keys(coalesce(new.results, '{}'::jsonb)) as k
            ) keys
            where coalesce(old.results, '{}'::jsonb) -> k is distinct from coalesce(new.results, '{}'::jsonb) -> k
        loop
            if not exists (
                select 1 from public.room_participants p
                where p.room_id = new.room_id and p.auth_user_id = auth.uid()
                  and p.character_snapshot ->> 'id' = changed_key
            ) then raise exception 'A participant may only submit their own character result'; end if;
        end loop;
    end if;
    return new;
end;
$$;
revoke all on function app_private.guard_room_request_changes() from public, anon;
drop trigger if exists guard_room_request_changes on public.room_requests;
create trigger guard_room_request_changes before insert or update on public.room_requests
for each row execute function app_private.guard_room_request_changes();

create or replace function public.submit_room_request_result(
    p_request_id uuid,
    p_character_id text,
    p_result jsonb
)
returns void
language plpgsql security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare request_room uuid;
begin
    if auth.uid() is null or jsonb_typeof(p_result) <> 'object' then
        raise exception 'Invalid participant result';
    end if;
    select rr.room_id into request_room from public.room_requests rr
    where rr.id = p_request_id and rr.closed = false;
    if request_room is null then raise exception 'Request is missing or closed'; end if;
    if not app_private.is_room_master(request_room, auth.uid()) and not exists (
        select 1 from public.room_participants p
        where p.room_id = request_room and p.auth_user_id = auth.uid()
          and p.character_snapshot ->> 'id' = p_character_id
    ) then raise exception 'This session cannot submit that character result'; end if;
    update public.room_requests
    set results = jsonb_set(coalesce(results, '{}'::jsonb), array[p_character_id], p_result, true)
    where id = p_request_id;
end;
$$;

-- All access to the room tables is now limited to signed-in Supabase identities.
-- Anonymous Auth users receive the authenticated role, unlike requests using only the public anon key.
do $$
declare table_name text; policy record;
begin
    foreach table_name in array array['rooms','room_participants','room_rolls','room_combat','room_requests'] loop
        for policy in select policyname from pg_policies where schemaname='public' and tablename=table_name loop
            execute format('drop policy %I on public.%I', policy.policyname, table_name);
        end loop;
    end loop;
end;
$$;

revoke all on public.rooms, public.room_participants, public.room_rolls, public.room_combat, public.room_requests from public, anon, authenticated;
grant select on public.rooms to authenticated;
grant update (gifted_character_ids, updated_at) on public.rooms to authenticated;
grant select, delete on public.room_participants to authenticated;
grant update (display_name, character_snapshot, last_seen, pending_character, character_locked)
    on public.room_participants to authenticated;
grant select, insert on public.room_rolls to authenticated;
grant select on public.room_combat to authenticated;
grant update (state, updated_at) on public.room_combat to authenticated;
grant select, insert on public.room_requests to authenticated;
grant update (closed, results) on public.room_requests to authenticated;

create policy rooms_read_for_members on public.rooms for select to authenticated
using (app_private.is_room_member(id, auth.uid()));
create policy rooms_update_for_storyteller on public.rooms for update to authenticated
using (app_private.is_room_master(id, auth.uid()))
with check (app_private.is_room_master(id, auth.uid()));

create policy room_participants_read_for_members on public.room_participants for select to authenticated
using (app_private.is_room_member(room_id, auth.uid()));
create policy room_participants_update_self_or_storyteller on public.room_participants for update to authenticated
using (auth_user_id = auth.uid() or app_private.is_room_master(room_id, auth.uid()))
with check (auth_user_id = auth.uid() or app_private.is_room_master(room_id, auth.uid()));
create policy room_participants_leave_self on public.room_participants for delete to authenticated
using (auth_user_id = auth.uid());

create policy room_rolls_read_for_members on public.room_rolls for select to authenticated
using (app_private.is_room_member(room_id, auth.uid()));
create policy room_rolls_publish_for_members on public.room_rolls for insert to authenticated
with check (exists (
    select 1 from public.room_participants p
    where p.room_id = room_rolls.room_id and p.auth_user_id = auth.uid()
      and p.device_id = room_rolls.device_id
));

create policy room_combat_read_for_members on public.room_combat for select to authenticated
using (app_private.is_room_member(room_id, auth.uid()));
create policy room_combat_update_for_storyteller on public.room_combat for update to authenticated
using (app_private.is_room_master(room_id, auth.uid()))
with check (app_private.is_room_master(room_id, auth.uid()));

create policy room_requests_read_for_members on public.room_requests for select to authenticated
using (app_private.is_room_member(room_id, auth.uid()));
create policy room_requests_create_for_storyteller on public.room_requests for insert to authenticated
with check (app_private.is_room_master(room_id, auth.uid()));
create policy room_requests_update_for_members on public.room_requests for update to authenticated
using (app_private.is_room_member(room_id, auth.uid()))
with check (app_private.is_room_member(room_id, auth.uid()));

revoke all on function public.lookup_room_by_invite(text) from public, anon;
revoke all on function public.create_secure_room(text, text, text) from public, anon;
revoke all on function public.join_secure_room(uuid, text, text, jsonb) from public, anon;
revoke all on function public.delete_secure_room(uuid) from public, anon;
revoke all on function public.rotate_room_invite(uuid) from public, anon;
revoke all on function public.submit_room_request_result(uuid, text, jsonb) from public, anon;
grant execute on function public.lookup_room_by_invite(text) to authenticated;
grant execute on function public.create_secure_room(text, text, text) to authenticated;
grant execute on function public.join_secure_room(uuid, text, text, jsonb) to authenticated;
grant execute on function public.delete_secure_room(uuid) to authenticated;
grant execute on function public.rotate_room_invite(uuid) to authenticated;
grant execute on function public.submit_room_request_result(uuid, text, jsonb) to authenticated;

-- Keep room changes live for authenticated guest sessions.
do $$
begin
    if exists (select 1 from pg_publication where pubname='supabase_realtime') then
        if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='room_participants') then
            alter publication supabase_realtime add table public.room_participants;
        end if;
        if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='room_rolls') then
            alter publication supabase_realtime add table public.room_rolls;
        end if;
        if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='room_combat') then
            alter publication supabase_realtime add table public.room_combat;
        end if;
        if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='room_requests') then
            alter publication supabase_realtime add table public.room_requests;
        end if;
    end if;
end;
$$;

-- The old caller-controlled identity header is no longer an authorization mechanism.
revoke all on function app_private.current_device_id() from public, anon, authenticated;
