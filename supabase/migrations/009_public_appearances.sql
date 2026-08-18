-- 009_public_appearances.sql
-- Public walk-up appearances (farmers markets, festivals, pop-ups), separate
-- from private catered bookings. Amy manages these from the Owner Dashboard;
-- Kai references upcoming ones when a visitor asks where to find the truck.

create table if not exists public.public_appearances (
  id uuid primary key default gen_random_uuid(),
  location_name text not null,
  address text,
  event_date date not null,
  start_time text,
  end_time text,
  notes text,
  active boolean default true,
  sort int default 100
);

alter table public.public_appearances enable row level security;

-- Projects created after Supabase's 2026 Data API hardening no longer expose
-- new public tables automatically. Grant only the access this feature needs;
-- RLS below still decides which rows each caller may use.
revoke all privileges on table public.public_appearances from anon, authenticated, service_role;
grant select on table public.public_appearances to anon;
grant select, insert, update, delete on table public.public_appearances to authenticated;
grant select, insert, update, delete on table public.public_appearances to service_role;

drop policy if exists "public read appearances" on public.public_appearances;
create policy "public read appearances"
  on public.public_appearances
  for select
  to anon, authenticated
  using (active = true or (select public.is_owner()));

drop policy if exists "owner write appearances" on public.public_appearances;
create policy "owner write appearances"
  on public.public_appearances
  for all
  to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()));

create index if not exists idx_appearances_date on public.public_appearances(event_date);
