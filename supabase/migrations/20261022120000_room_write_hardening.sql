create schema if not exists app_private;

revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;

-- Bound write volume and payload sizes for guest rooms and saved characters.
-- Authenticated includes Supabase anonymous users, so limits are keyed to auth.uid().

create table if not exists app_private.room_action_limits (
    user_id uuid not null,
    action text not null check (action in ('room_create', 'room_join', 'room_roll')),
    window_started_at timestamptz not null,
    request_count integer not null check (request_count > 0),
    primary key (user_id, action)
);

revoke all on app_private.room_action_limits from public, anon, authenticated;

create or replace function app_private.consume_room_action_limit(
    p_action text,
    p_max_requests integer,
    p_window_seconds integer
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
declare
    current_user_id uuid := auth.uid();
    current_count integer;
    request_time timestamptz := clock_timestamp();
begin
    if current_user_id is null then raise exception 'Guest session required'; end if;
    if p_action not in ('room_create', 'room_join', 'room_roll')
       or p_max_requests < 1 or p_window_seconds < 1 then
        raise exception 'Invalid rate limit';
    end if;

    insert into app_private.room_action_limits as current_limit (user_id, action, window_started_at, request_count)
    values (current_user_id, p_action, request_time, 1)
    on conflict (user_id, action) do update set
        window_started_at = case
            when current_limit.window_started_at <= request_time - make_interval(secs => p_window_seconds)
                then request_time
            else current_limit.window_started_at
        end,
        request_count = case
            when current_limit.window_started_at <= request_time - make_interval(secs => p_window_seconds)
                then 1
            else current_limit.request_count + 1
        end
    returning request_count into current_count;

    if current_count > p_max_requests then
        raise exception 'Too many requests; try again later' using errcode = 'P0001';
    end if;
end;
$$;
revoke all on function app_private.consume_room_action_limit(text, integer, integer) from public, anon, authenticated;

create or replace function app_private.guard_room_create_volume()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
begin
    if auth.uid() is null or new.master_auth_id is distinct from auth.uid() then
        raise exception 'Authenticated storyteller required';
    end if;
    perform app_private.consume_room_action_limit('room_create', 10, 3600);
    return new;
end;
$$;
revoke all on function app_private.guard_room_create_volume() from public, anon, authenticated;
drop trigger if exists guard_room_create_volume on public.rooms;
create trigger guard_room_create_volume before insert on public.rooms
for each row execute function app_private.guard_room_create_volume();

create or replace function app_private.guard_room_join_volume()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
begin
    if auth.uid() is null or new.auth_user_id is distinct from auth.uid() then
        raise exception 'Authenticated guest required';
    end if;
    perform app_private.consume_room_action_limit('room_join', 30, 60);
    return new;
end;
$$;
revoke all on function app_private.guard_room_join_volume() from public, anon, authenticated;
drop trigger if exists guard_room_join_volume on public.room_participants;
create trigger guard_room_join_volume before insert on public.room_participants
for each row execute function app_private.guard_room_join_volume();

create or replace function app_private.guard_room_roll_volume()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth, app_private
set row_security = off
as $$
begin
    if auth.uid() is null then raise exception 'Authenticated guest required'; end if;
    if new.roll_data is null or jsonb_typeof(new.roll_data) <> 'object'
       or octet_length(new.roll_data::text) > 16384 then
        raise exception 'Roll data must be an object no larger than 16 KiB';
    end if;
    if length(coalesce(new.character_name, '')) > 80
       or length(coalesce(new.roll_type, '')) > 80 then
        raise exception 'Roll metadata is too long';
    end if;
    perform app_private.consume_room_action_limit('room_roll', 60, 60);
    return new;
end;
$$;
revoke all on function app_private.guard_room_roll_volume() from public, anon, authenticated;
drop trigger if exists guard_room_roll_volume on public.room_rolls;
create trigger guard_room_roll_volume before insert on public.room_rolls
for each row execute function app_private.guard_room_roll_volume();

-- RLS helpers may only answer questions about the caller, never an arbitrary supplied user ID.
create or replace function app_private.is_room_member(p_room_id uuid, p_user_id uuid default auth.uid())
returns boolean
language plpgsql stable security definer
set search_path = pg_catalog, public, auth
set row_security = off
as $$
begin
    if auth.uid() is null or p_user_id is distinct from auth.uid() then return false; end if;
    return exists (
        select 1 from public.room_participants p
        where p.room_id = p_room_id and p.auth_user_id = auth.uid()
    );
end;
$$;

create or replace function app_private.is_room_master(p_room_id uuid, p_user_id uuid default auth.uid())
returns boolean
language plpgsql stable security definer
set search_path = pg_catalog, public, auth
set row_security = off
as $$
begin
    if auth.uid() is null or p_user_id is distinct from auth.uid() then return false; end if;
    return exists (
        select 1 from public.rooms r
        where r.id = p_room_id and r.master_auth_id = auth.uid()
    );
end;
$$;
revoke all on function app_private.is_room_member(uuid, uuid) from public, anon;
revoke all on function app_private.is_room_master(uuid, uuid) from public, anon;
grant execute on function app_private.is_room_member(uuid, uuid) to authenticated;
grant execute on function app_private.is_room_master(uuid, uuid) to authenticated;
-- NOT VALID avoids blocking deployment on historical rows; PostgreSQL still checks all new/updated rows.
do $$
begin
    if not exists (select 1 from pg_constraint where conrelid = 'public.room_participants'::regclass and conname = 'room_participant_snapshots_size') then
        alter table public.room_participants add constraint room_participant_snapshots_size check (
            (character_snapshot is null or (jsonb_typeof(character_snapshot) = 'object' and octet_length(character_snapshot::text) <= 262144))
            and (pending_character is null or (jsonb_typeof(pending_character) = 'object' and octet_length(pending_character::text) <= 262144))
        ) not valid;
    end if;
    if not exists (select 1 from pg_constraint where conrelid = 'public.room_combat'::regclass and conname = 'room_combat_state_size') then
        alter table public.room_combat add constraint room_combat_state_size check (
            state is null or (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 262144)
        ) not valid;
    end if;
    if not exists (select 1 from pg_constraint where conrelid = 'public.room_rolls'::regclass and conname = 'room_roll_data_size') then
        alter table public.room_rolls add constraint room_roll_data_size check (
            roll_data is not null and jsonb_typeof(roll_data) = 'object' and octet_length(roll_data::text) <= 16384
        ) not valid;
    end if;
    if not exists (select 1 from pg_constraint where conrelid = 'public.room_requests'::regclass and conname = 'room_request_results_size') then
        alter table public.room_requests add constraint room_request_results_size check (
            results is null or (jsonb_typeof(results) = 'object' and octet_length(results::text) <= 65536)
        ) not valid;
    end if;
    if not exists (select 1 from pg_constraint where conrelid = 'public.room_participants'::regclass and conname = 'room_participant_name_size') then
        alter table public.room_participants add constraint room_participant_name_size check (
            display_name is null or length(display_name) <= 80
        ) not valid;
    end if;
    if to_regclass('public.user_characters') is not null
       and not exists (select 1 from pg_constraint where conrelid = 'public.user_characters'::regclass and conname = 'user_character_payload_size') then
        alter table public.user_characters add constraint user_character_payload_size check (
            payload is null or (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 262144)
        ) not valid;
    end if;
end;
$$;

-- Rate-limit state is tiny per active anonymous identity and is periodically pruned.
do $$
begin
    if to_regclass('cron.job') is not null then
        if exists (select 1 from cron.job where jobname = 'purge-room-action-limits') then
            perform cron.unschedule('purge-room-action-limits');
        end if;
        perform cron.schedule(
            'purge-room-action-limits',
            '17 3 * * *',
            $job$delete from app_private.room_action_limits where window_started_at < now() - interval '7 days'$job$
        );
    end if;
end;
$$;






