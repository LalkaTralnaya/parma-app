-- Room requests are used by the current device-id room flow (the client role is anon).
-- Bind REST writes to the caller's local room participant; only the room master may create requests.
create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to anon, authenticated;

create or replace function app_private.current_device_id()
returns text
language sql stable
set search_path = pg_catalog
as $$
    select nullif((coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'x-device-id'), '')
$$;
revoke all on function app_private.current_device_id() from public;
grant execute on function app_private.current_device_id() to anon, authenticated;

alter table public.room_requests enable row level security;
grant select, insert, update on public.room_requests to anon, authenticated;

-- Replace legacy policies so an old permissive policy cannot bypass these checks.
do $$
declare p record;
begin
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'room_requests'
    loop
        execute format('drop policy %I on public.room_requests', p.policyname);
    end loop;
end;
$$;

create policy room_requests_read_for_room_members
    on public.room_requests for select to anon, authenticated
    using (exists (
        select 1 from public.room_participants p
        where p.room_id = room_requests.room_id
          and p.device_id = app_private.current_device_id()
    ));

create policy room_requests_create_for_room_master
    on public.room_requests for insert to anon, authenticated
    with check (exists (
        select 1 from public.rooms r
        where r.id = room_requests.room_id
          and r.master_device_id = app_private.current_device_id()
    ));

create policy room_requests_update_for_room_members
    on public.room_requests for update to anon, authenticated
    using (exists (
        select 1 from public.room_participants p
        where p.room_id = room_requests.room_id
          and p.device_id = app_private.current_device_id()
    ))
    with check (exists (
        select 1 from public.room_participants p
        where p.room_id = room_requests.room_id
          and p.device_id = app_private.current_device_id()
    ));

-- RLS policies control rows, so this trigger also protects role-specific fields.
create or replace function app_private.guard_room_request_changes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
    caller_device text := app_private.current_device_id();
    master_device text;
    is_member boolean;
begin
    select r.master_device_id into master_device from public.rooms r where r.id = new.room_id;
    if master_device is null then raise exception 'Room does not exist'; end if;
    select exists (
        select 1 from public.room_participants p
        where p.room_id = new.room_id and p.device_id = caller_device
    ) into is_member;
    if tg_op = 'INSERT' then
        if caller_device is distinct from master_device then
            raise exception 'Only the room master can create a request';
        end if;
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
    if new.closed is distinct from old.closed and caller_device is distinct from master_device then
        raise exception 'Only the room master can close a request';
    end if;
    if new.results is distinct from old.results and not is_member then
        raise exception 'Only a room member can submit a result';
    end if;
    return new;
end;
$$;
revoke all on function app_private.guard_room_request_changes() from public;
drop trigger if exists guard_room_request_changes on public.room_requests;
create trigger guard_room_request_changes
    before insert or update on public.room_requests
    for each row execute function app_private.guard_room_request_changes();

-- Atomic JSONB update prevents simultaneous player responses from overwriting each other.
create or replace function public.submit_room_request_result(
    p_request_id uuid,
    p_character_id text,
    p_result jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
    request_room uuid;
    master_device text;
begin
    select rr.room_id into request_room
    from public.room_requests rr
    where rr.id = p_request_id and rr.closed = false;
    if request_room is null then raise exception 'Request is missing or closed'; end if;
    select r.master_device_id into master_device from public.rooms r where r.id = request_room;
    if app_private.current_device_id() is distinct from master_device and not exists (
        select 1 from public.room_participants p
        where p.room_id = request_room
          and p.device_id = app_private.current_device_id()
          and p.character_snapshot ->> 'id' = p_character_id
    ) then
        raise exception 'This device is not allowed to submit that character result';
    end if;
    update public.room_requests
    set results = jsonb_set(coalesce(results, '{}'::jsonb), array[p_character_id], p_result, true)
    where id = p_request_id;
end;
$$;
revoke all on function public.submit_room_request_result(uuid, text, jsonb) from public;
grant execute on function public.submit_room_request_result(uuid, text, jsonb) to anon, authenticated;

do $$
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (
           select 1 from pg_publication_tables
           where pubname = 'supabase_realtime'
             and schemaname = 'public'
             and tablename = 'room_requests'
       ) then
        alter publication supabase_realtime add table public.room_requests;
    end if;
end;
$$;
