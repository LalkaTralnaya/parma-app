begin;

create table public.adventure_report_drafts (
    user_id uuid not null references auth.users (id) on delete cascade,
    adventure_slug text not null check (adventure_slug in ('doroga-v-gardariki', 'karngorn')),
    payload jsonb not null check (
        jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 200000
    ),
    revision uuid not null default gen_random_uuid(),
    updated_at timestamptz not null default now(),
    primary key (user_id, adventure_slug)
);

alter table public.adventure_report_drafts enable row level security;
revoke all on public.adventure_report_drafts from public, anon, authenticated;
grant select on public.adventure_report_drafts to authenticated;
grant insert (user_id, adventure_slug, payload) on public.adventure_report_drafts to authenticated;
grant update (payload) on public.adventure_report_drafts to authenticated;

create policy adventure_report_drafts_permanent_account
    on public.adventure_report_drafts as restrictive for all to authenticated
    using (((select auth.jwt()) ->> 'is_anonymous') = 'false')
    with check (((select auth.jwt()) ->> 'is_anonymous') = 'false');

create policy adventure_report_drafts_read_owner
    on public.adventure_report_drafts for select to authenticated
    using (user_id = (select auth.uid()));

create policy adventure_report_drafts_insert_owner
    on public.adventure_report_drafts for insert to authenticated
    with check (user_id = (select auth.uid()));

create policy adventure_report_drafts_update_owner
    on public.adventure_report_drafts for update to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

create function app_private.touch_adventure_report_draft()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.revision := gen_random_uuid();
    new.updated_at := now();
    return new;
end;
$$;

revoke all on function app_private.touch_adventure_report_draft() from public, anon, authenticated;
create trigger adventure_report_drafts_touch
    before update on public.adventure_report_drafts
    for each row execute function app_private.touch_adventure_report_draft();

commit;
