-- Keep the room roll log for seven days, then remove old rows hourly.
create extension if not exists pg_cron;

create index if not exists room_rolls_created_at_idx
  on public.room_rolls (created_at);

delete from public.room_rolls
where created_at < now() - interval '7 days';

do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-expired-room-rolls') then
    perform cron.unschedule('purge-expired-room-rolls');
  end if;

  perform cron.schedule(
    'purge-expired-room-rolls',
    '0 * * * *',
    $job$delete from public.room_rolls where created_at < now() - interval '7 days'$job$
  );
end;
$$;
