begin;

-- A player's editable character snapshot is not proof of ownership.
create table if not exists app_private.room_relationship_access (
    participant_id uuid primary key references public.room_participants(id) on delete cascade,
    character_id text not null check (length(character_id) between 1 and 128)
);
alter table app_private.room_relationship_access enable row level security;
revoke all on app_private.room_relationship_access from public, anon, authenticated;

drop policy if exists room_relationship_member_read on public.room_relationships;
drop policy if exists room_relationship_master_read on public.room_relationships;
create policy room_relationship_master_read on public.room_relationships
for select to authenticated
using (app_private.is_room_master(room_id, auth.uid()));

create or replace function public.set_room_relationship_access(p_room_id uuid, p_participant_id uuid, p_expected_character_id text)
returns void
language plpgsql security definer
set search_path = pg_catalog
set row_security = off
as $$
declare selected_character text;
begin
    if not app_private.is_room_master(p_room_id, auth.uid()) then
        raise exception 'Only the storyteller can manage relationship access' using errcode = '42501';
    end if;

    select character_snapshot->>'id' into selected_character
    from public.room_participants
    where room_id = p_room_id and id = p_participant_id and role = 'player'
    for update;
    if not found then
        raise exception 'Player not found in this room';
    end if;

    if p_expected_character_id is not null then
        if nullif(selected_character, '') is null then
            raise exception 'The player must select a character first';
        end if;
        if selected_character is distinct from p_expected_character_id then
            raise exception 'The selected character changed; refresh the player list';
        end if;
        insert into app_private.room_relationship_access (participant_id, character_id)
        values (p_participant_id, selected_character)
        on conflict (participant_id) do update set character_id = excluded.character_id;
    else
        delete from app_private.room_relationship_access where participant_id = p_participant_id;
    end if;
end;
$$;

create or replace function public.get_room_relationship_access(p_room_id uuid)
returns table (participant_id uuid, character_id text)
language sql stable security definer
set search_path = pg_catalog
set row_security = off
as $$
    select access.participant_id, access.character_id
    from app_private.room_relationship_access access
    join public.room_participants participant on participant.id = access.participant_id
    where participant.room_id = p_room_id and app_private.is_room_master(p_room_id, auth.uid())
$$;

create or replace function public.get_personal_room_relationships(p_room_id uuid, p_character_id text)
returns jsonb
language sql stable security definer
set search_path = pg_catalog
set row_security = off
as $$
    select jsonb_agg(link.value order by link.position)
    from public.room_relationships graph
    cross join lateral jsonb_array_elements(
        case when jsonb_typeof(graph.data->'links') = 'array' then graph.data->'links' else '[]'::jsonb end
    ) with ordinality as link(value, position)
    where graph.room_id = p_room_id
      and (
          app_private.is_room_master(p_room_id, auth.uid())
          or exists (
              select 1 from public.room_participants participant
              join app_private.room_relationship_access access on access.participant_id = participant.id
              where participant.room_id = p_room_id and participant.auth_user_id = auth.uid()
                and access.character_id = p_character_id
                and participant.character_snapshot->>'id' = p_character_id
          )
      )
      and (
          (coalesce(link.value->>'sourceType', 'character') = 'character' and link.value->>'characterId' = p_character_id)
          or (link.value->>'targetType' = 'character' and link.value->>'targetId' = p_character_id)
      )
$$;

revoke all on function public.set_room_relationship_access(uuid, uuid, text) from public, anon;
revoke all on function public.get_room_relationship_access(uuid) from public, anon;
revoke all on function public.get_personal_room_relationships(uuid, text) from public, anon;
grant execute on function public.set_room_relationship_access(uuid, uuid, text) to authenticated;
grant execute on function public.get_room_relationship_access(uuid) to authenticated;
grant execute on function public.get_personal_room_relationships(uuid, text) to authenticated;

create or replace function app_private.revoke_relationship_access_on_character_change()
returns trigger
language plpgsql security definer
set search_path = pg_catalog
as $$
begin
    delete from app_private.room_relationship_access where participant_id = new.id;
    return new;
end;
$$;
revoke all on function app_private.revoke_relationship_access_on_character_change() from public, anon, authenticated;

drop trigger if exists revoke_relationship_access_on_character_change on public.room_participants;
create trigger revoke_relationship_access_on_character_change after update of character_snapshot on public.room_participants
for each row when ((old.character_snapshot->>'id') is distinct from (new.character_snapshot->>'id'))
execute function app_private.revoke_relationship_access_on_character_change();

-- Earlier versions stored the full graph in the member-readable combat row.
-- Preserve any graph still present only in that location before removing it.
insert into public.room_relationships (room_id, data)
select room_id, jsonb_build_object('version', 1, 'links', state->'relationshipWeb', 'npcs', '[]'::jsonb)
from public.room_combat
where jsonb_typeof(state->'relationshipWeb') = 'array'
on conflict (room_id) do nothing;

create or replace function app_private.strip_legacy_combat_relationships()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
    if jsonb_typeof(new.state) = 'object' then
        new.state := new.state - 'relationshipWeb';
    end if;
    return new;
end;
$$;
revoke all on function app_private.strip_legacy_combat_relationships() from public, anon, authenticated;

drop trigger if exists strip_legacy_combat_relationships on public.room_combat;
create trigger strip_legacy_combat_relationships before insert or update of state on public.room_combat
for each row execute function app_private.strip_legacy_combat_relationships();

update public.room_combat set state = state - 'relationshipWeb' where state ? 'relationshipWeb';

commit;
