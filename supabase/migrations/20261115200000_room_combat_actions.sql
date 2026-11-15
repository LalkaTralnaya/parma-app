begin;

create table if not exists public.room_combat_actions (
    id uuid primary key,
    room_id uuid not null references public.rooms(id) on delete cascade,
    participant_id uuid not null references public.room_participants(id) on delete cascade,
    actor_id text not null,
    actor_name text not null,
    phase jsonb not null,
    changes jsonb not null,
    status text not null default 'pending' check (status in ('pending', 'applied', 'rejected', 'stale')),
    created_at timestamptz not null default now()
);
create index if not exists room_combat_actions_room_created_idx on public.room_combat_actions (room_id, created_at desc);
alter table public.room_combat_actions enable row level security;
revoke all on public.room_combat_actions from public, anon, authenticated;
grant select on public.room_combat_actions to authenticated;
drop policy if exists room_combat_actions_read on public.room_combat_actions;
create policy room_combat_actions_read on public.room_combat_actions for select to authenticated using (
    app_private.is_room_master(room_id, auth.uid())
    or exists (select 1 from public.room_participants p
        where p.id = room_combat_actions.participant_id and p.room_id = room_combat_actions.room_id and p.auth_user_id = auth.uid())
);

-- Lock the encounter while comparing the previous values and applying only the changed fields.
create or replace function app_private.apply_room_combat_action(p_room_id uuid, p_actor_id text, p_phase jsonb, p_changes jsonb, p_write boolean)
returns boolean language plpgsql security definer
set search_path = pg_catalog set row_security = off as $$
declare
    combat jsonb;
    participants jsonb;
    participant_index integer;
    target jsonb;
    change jsonb;
    field text;
begin
    select state into combat from public.room_combat where room_id = p_room_id for update;
    participants := combat->'participants';
    if jsonb_typeof(participants) is distinct from 'array' then return false; end if;
    if jsonb_build_array(combat->'active', combat->'round', combat->'currentTurnIndex') is distinct from p_phase
       or not exists (select 1 from jsonb_array_elements(participants) p where p->>'id' = p_actor_id and p->'isPlayer' = 'true') then
        return false;
    end if;

    for change in select value from jsonb_array_elements(p_changes) loop
        select (p.ordinality - 1)::integer, p.value into participant_index, target
        from jsonb_array_elements(participants) with ordinality p(value, ordinality)
        where p.value->>'id' = change->>'id';
        if not found then return false; end if;

        for field in select jsonb_object_keys(change->'after') loop
            if coalesce(target->field, 'null'::jsonb) is distinct from change->'before'->field then
                return false;
            end if;
            if change->'after'->field = 'null'::jsonb then
                target := target - field;
            else
                target := jsonb_set(target, array[field], change->'after'->field);
            end if;
        end loop;
        participants := jsonb_set(participants, array[participant_index::text], target);
    end loop;

    if p_write then
        update public.room_combat set state = jsonb_set(combat, '{participants}', participants), updated_at = now()
        where room_id = p_room_id;
    end if;
    return true;
end;
$$;

create or replace function public.submit_room_combat_action(
    p_id uuid, p_room_id uuid, p_character_id text, p_actor_id text, p_phase jsonb, p_changes jsonb
)
returns jsonb language plpgsql security definer
set search_path = pg_catalog set row_security = off as $$
declare
    member public.room_participants;
    request public.room_combat_actions;
    change jsonb;
    field text;
    value jsonb;
    storyteller boolean;
begin
    storyteller := app_private.is_room_master(p_room_id, auth.uid());
    select * into member from public.room_participants
    where room_id = p_room_id and auth_user_id = auth.uid() for update;
    if not found or (not storyteller and member.character_snapshot->>'id' is distinct from p_character_id) then
        raise exception 'Select your character in the room first' using errcode = '42501';
    end if;

    select * into request from public.room_combat_actions where id = p_id and participant_id = member.id and room_id = p_room_id;
    if found then return to_jsonb(request); end if;

    if jsonb_typeof(p_changes) is distinct from 'array' or octet_length(p_changes::text) > 32768 then
        raise exception 'Invalid combat changes';
    end if;
    if jsonb_array_length(p_changes) not between 1 and 25
       or (select count(distinct x->>'id') from jsonb_array_elements(p_changes) x) <> jsonb_array_length(p_changes) then
        raise exception 'Invalid combat targets';
    end if;

    for change in select item from jsonb_array_elements(p_changes) as changes(item) loop
        if jsonb_typeof(change->'before') is distinct from 'object'
           or jsonb_typeof(change->'after') is distinct from 'object'
           or change->'after' = '{}'::jsonb then raise exception 'Invalid combat patch'; end if;
        for field, value in select key, j.value from jsonb_each(change->'after') j loop
            if not ((change->'before') ? field) or field not in ('currentHp', 'effects', 'itemTreatments', 'prone', 'grapple') then
                raise exception 'Invalid combat field';
            end if;
            if field = 'currentHp' then
                if jsonb_typeof(value) is distinct from 'number' or value::text !~ '^[0-9]{1,7}$' then
                    raise exception 'Invalid combat health';
                end if;
            elsif value <> 'null'::jsonb and (
                (field = 'prone' and jsonb_typeof(value) <> 'boolean')
                or (field in ('effects', 'itemTreatments') and jsonb_typeof(value) <> 'array')
                or (field = 'grapple' and jsonb_typeof(value) <> 'object')
            ) then
                raise exception 'Invalid combat value';
            end if;
            if field in ('effects', 'itemTreatments') and jsonb_typeof(value) = 'array' then
                if exists (select 1 from jsonb_array_elements(value) item
                    where jsonb_typeof(item) is distinct from 'object'
                       or jsonb_typeof(item->'id') is distinct from 'string'
                       or (field = 'itemTreatments' and jsonb_typeof(item->'conditionId') is distinct from 'string')
                       or (field = 'effects' and (
                           jsonb_typeof(item->'name') is distinct from 'string'
                           or jsonb_typeof(item->'description') is distinct from 'string'
                           or jsonb_typeof(item->'sourceId') is distinct from 'string'
                           or jsonb_typeof(item->'sourceName') is distinct from 'string'
                           or jsonb_typeof(item->'modifiers') is distinct from 'object'
                           or jsonb_typeof(item->'roundsLeft') is null
                           or jsonb_typeof(item->'roundsLeft') not in ('number', 'null')
                           or jsonb_typeof(item->'penalty') is distinct from 'number'
                       ))) then raise exception 'Invalid combat effect'; end if;
            end if;
            if field = 'grapple' and jsonb_typeof(value) = 'object' and (
                jsonb_typeof(value->'sourceId') is distinct from 'string'
                or jsonb_typeof(value->'round') is distinct from 'number'
                or coalesce(value->>'kind', '') not in ('grab', 'clinch', 'hold')
            ) then raise exception 'Invalid grapple'; end if;
        end loop;
    end loop;

    if not exists (
        select 1 from public.room_combat c
        cross join lateral jsonb_array_elements(
            case when jsonb_typeof(c.state->'participants') = 'array' then c.state->'participants' else '[]'::jsonb end
        ) p
        where c.room_id = p_room_id and p->>'id' = p_actor_id and p->'isPlayer' = 'true'
          and coalesce(p->>'sourceId', p->>'id') = p_character_id
    ) then raise exception 'Your character is not in the encounter'; end if;

    delete from public.room_combat_actions where room_id = p_room_id and participant_id = member.id
        and created_at < now() - interval '7 days';
    if (select count(*) from public.room_combat_actions
        where room_id = p_room_id and participant_id = member.id and created_at > now() - interval '1 minute') >= 20
       or (select count(*) from public.room_combat_actions
        where room_id = p_room_id and participant_id = member.id and status = 'pending') >= 12 then
        raise exception 'Too many combat actions';
    end if;

    if not app_private.apply_room_combat_action(p_room_id, p_actor_id, p_phase, p_changes, storyteller) then
        raise exception 'The encounter changed; refresh the combat before acting';
    end if;

    insert into public.room_combat_actions (id, room_id, participant_id, actor_id, actor_name, phase, changes, status)
    values (p_id, p_room_id, member.id, p_actor_id, coalesce(member.display_name, 'Игрок'), p_phase, p_changes,
        case when storyteller then 'applied' else 'pending' end)
    returning * into request;
    return to_jsonb(request);
end;
$$;

create or replace function public.review_room_combat_action(p_room_id uuid, p_id uuid, p_apply boolean)
returns jsonb language plpgsql security definer
set search_path = pg_catalog set row_security = off as $$
declare
    request public.room_combat_actions;
    result_status text := 'rejected';
begin
    if not app_private.is_room_master(p_room_id, auth.uid()) then
        raise exception 'Only the storyteller can review combat actions' using errcode = '42501';
    end if;
    select * into request from public.room_combat_actions where room_id = p_room_id and id = p_id for update;
    if not found then raise exception 'Combat action not found'; end if;
    if request.status <> 'pending' then return to_jsonb(request); end if;
    if p_apply then
        if app_private.apply_room_combat_action(p_room_id, request.actor_id, request.phase, request.changes, true) then
            result_status := 'applied';
        else
            result_status := 'stale';
        end if;
    end if;
    update public.room_combat_actions set status = result_status where id = p_id returning * into request;
    return to_jsonb(request);
end;
$$;

revoke all on function app_private.apply_room_combat_action(uuid, text, jsonb, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.submit_room_combat_action(uuid, uuid, text, text, jsonb, jsonb) from public, anon;
revoke all on function public.review_room_combat_action(uuid, uuid, boolean) from public, anon;
grant execute on function public.submit_room_combat_action(uuid, uuid, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.review_room_combat_action(uuid, uuid, boolean) to authenticated;

do $$
begin
    if exists(select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime'
           and schemaname = 'public' and tablename = 'room_combat_actions') then
        alter publication supabase_realtime add table public.room_combat_actions;
    end if;
end;
$$;
commit;
