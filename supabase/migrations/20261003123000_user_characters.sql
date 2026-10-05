create table if not exists public.user_characters (
    user_id uuid not null references auth.users (id) on delete cascade,
    character_id text not null,
    payload jsonb,
    client_updated_at bigint not null default 0,
    is_deleted boolean not null default false,
    updated_at timestamptz not null default now(),
    primary key (user_id, character_id),
    constraint user_characters_payload_state check (
        (is_deleted and payload is null) or
        (not is_deleted and payload is not null and jsonb_typeof(payload) = 'object')
    )
);

alter table public.user_characters enable row level security;
revoke all on table public.user_characters from anon, public;
grant select, insert, update to authenticated;

drop policy if exists "Users can read their own characters" on public.user_characters;
create policy "Users can read their own characters"
    on public.user_characters for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own characters" on public.user_characters;
create policy "Users can create their own characters"
    on public.user_characters for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own characters" on public.user_characters;
create policy "Users can update their own characters"
    on public.user_characters for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create or replace function public.set_user_character_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists user_characters_updated_at on public.user_characters;
create trigger user_characters_updated_at
    before update on public.user_characters
    for each row execute function public.set_user_character_updated_at();

do $$
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (
           select 1 from pg_publication_tables
           where pubname = 'supabase_realtime'
             and schemaname = 'public'
             and tablename = 'user_characters'
       ) then
        alter publication supabase_realtime add table public.user_characters;
    end if;
end;
$$;
