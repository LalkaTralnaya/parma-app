create table if not exists public.user_adventure_progress (
    user_id uuid not null references auth.users (id) on delete cascade,
    adventure_slug text not null,
    scene_ids text[] not null default '{}',
    notes text not null default '',
    completed_at timestamptz,
    updated_at timestamptz not null default now(),
    primary key (user_id, adventure_slug),
    constraint user_adventure_progress_slug_length check (char_length(adventure_slug) between 1 and 150),
    constraint user_adventure_progress_notes_length check (char_length(notes) <= 5000),
    constraint user_adventure_progress_scenes_count check (cardinality(scene_ids) <= 100)
);

alter table public.user_adventure_progress enable row level security;
revoke all on table public.user_adventure_progress from anon, public;
grant select, insert, update, delete on table public.user_adventure_progress to authenticated;

drop policy if exists "Users can read their own adventure progress" on public.user_adventure_progress;
create policy "Users can read their own adventure progress"
    on public.user_adventure_progress for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own adventure progress" on public.user_adventure_progress;
create policy "Users can create their own adventure progress"
    on public.user_adventure_progress for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own adventure progress" on public.user_adventure_progress;
create policy "Users can update their own adventure progress"
    on public.user_adventure_progress for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own adventure progress" on public.user_adventure_progress;
create policy "Users can delete their own adventure progress"
    on public.user_adventure_progress for delete to authenticated
    using ((select auth.uid()) = user_id);

create or replace function public.set_user_adventure_progress_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists user_adventure_progress_updated_at on public.user_adventure_progress;
create trigger user_adventure_progress_updated_at
    before update on public.user_adventure_progress
    for each row execute function public.set_user_adventure_progress_updated_at();
