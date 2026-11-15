begin;

-- Clients may still publish manual rolls and summaries, but cannot mark them as server rolls.
alter table public.room_rolls add column if not exists server_roll_id uuid;
create unique index if not exists room_rolls_server_request_idx
    on public.room_rolls (server_roll_id) where server_roll_id is not null;
revoke insert on public.room_rolls from public, anon, authenticated;
revoke insert (server_roll_id) on public.room_rolls from public, anon, authenticated;
grant insert (room_id, device_id, character_name, roll_type, roll_data) on public.room_rolls to authenticated;

create or replace function public.roll_room_dice(
    p_room_id uuid, p_request_id uuid, p_sides integer[], p_label text
)
returns jsonb language plpgsql security definer
set search_path = pg_catalog set row_security = off as $$
declare
    member public.room_participants;
    previous public.room_rolls;
    results integer[] := '{}';
    side_count integer;
    sample integer;
    bytes bytea;
    label text := btrim(coalesce(p_label, ''));
begin
    select * into member from public.room_participants
    where room_id = p_room_id and auth_user_id = auth.uid();
    if not found then raise exception 'Room membership required' using errcode = '42501'; end if;
    if p_request_id is null or coalesce(array_ndims(p_sides), 0) <> 1
       or cardinality(p_sides) not between 1 and 50
       or exists (select 1 from unnest(p_sides) side where side is null or side not between 2 and 1000)
       or length(label) not between 1 and 160 then
        raise exception 'Invalid dice request' using errcode = '22023';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
    select * into previous from public.room_rolls where server_roll_id = p_request_id;
    if found then
        if previous.room_id is distinct from p_room_id or previous.device_id is distinct from member.device_id
           or previous.roll_data->'sides' is distinct from to_jsonb(p_sides)
           or previous.roll_data->>'label' is distinct from label then
            raise exception 'Dice request ID already in use' using errcode = '22023';
        end if;
        return previous.roll_data;
    end if;

    foreach side_count in array p_sides loop
        -- The leading 16 bits of a v4 UUID are random. Reject the incomplete interval.
        loop
            bytes := decode(substr(gen_random_uuid()::text, 1, 4), 'hex');
            sample := get_byte(bytes, 0) * 256 + get_byte(bytes, 1);
            exit when sample < 65536 - (65536 % side_count);
        end loop;
        results := array_append(results, (sample % side_count) + 1);
    end loop;

    insert into public.room_rolls (room_id, device_id, character_name, roll_type, roll_data, server_roll_id)
    values (p_room_id, member.device_id,
        left(coalesce(nullif(member.character_snapshot->>'name', ''), member.display_name, 'Игрок'), 80),
        'server_dice', jsonb_build_object('label', label, 'sides', p_sides, 'values', results), p_request_id)
    returning * into previous;
    return previous.roll_data;
end;
$$;

revoke all on function public.roll_room_dice(uuid, uuid, integer[], text) from public, anon;
grant execute on function public.roll_room_dice(uuid, uuid, integer[], text) to authenticated;

commit;
