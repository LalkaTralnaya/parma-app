begin;

-- Read-only report access, membership managed by the database administrator.
create table app_private.adventure_report_admins (
    user_id uuid primary key references auth.users (id) on delete cascade,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);
alter table app_private.adventure_report_admins enable row level security;
revoke all on app_private.adventure_report_admins from public, anon, authenticated;

create function public.is_adventure_report_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
    select coalesce(((select auth.jwt()) ->> 'is_anonymous') = 'false', false)
       and exists (
           select 1 from app_private.adventure_report_admins as a
           where a.user_id = (select auth.uid()) and a.expires_at > now()
       );
$$;
revoke all on function public.is_adventure_report_admin() from public, anon, authenticated;
grant execute on function public.is_adventure_report_admin() to authenticated;

-- The restrictive permanent-account policy continues to apply.
create policy adventure_report_drafts_read_admin
    on public.adventure_report_drafts for select to authenticated
    using ((select public.is_adventure_report_admin()));

commit;
