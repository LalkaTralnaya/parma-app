begin;

-- A private plot graph for each storyteller. Room participants never receive this data.
create table if not exists public.story_plot_templates (
	owner_id uuid primary key references auth.users(id) on delete cascade,
	data jsonb not null default '{"version":1,"nodes":[],"edges":[]}'::jsonb
		check (jsonb_typeof(data) = 'object' and data @> '{"version":1}'::jsonb
			and jsonb_typeof(data->'nodes') = 'array' and jsonb_typeof(data->'edges') = 'array'),
	updated_at timestamptz not null default now(),
	check (octet_length(data::text) <= 2097152)
);

alter table public.story_plot_templates enable row level security;
revoke all on public.story_plot_templates from public, anon, authenticated;
grant select, insert on public.story_plot_templates to authenticated;
grant update(data, updated_at) on public.story_plot_templates to authenticated;

drop policy if exists story_plot_owner_read on public.story_plot_templates;
create policy story_plot_owner_read on public.story_plot_templates for select to authenticated using (owner_id = auth.uid());
drop policy if exists story_plot_owner_create on public.story_plot_templates;
create policy story_plot_owner_create on public.story_plot_templates for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists story_plot_owner_update on public.story_plot_templates;
create policy story_plot_owner_update on public.story_plot_templates for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

commit;
