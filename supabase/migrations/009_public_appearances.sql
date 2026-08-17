-- 009_public_appearances.sql
-- Public walk-up appearances (farmers markets, festivals, pop-ups), separate
-- from private catered bookings. Amy manages these from the Owner Dashboard;
-- Kai references upcoming ones when a visitor asks where to find the truck.

create table if not exists public_appearances (
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

alter table public_appearances enable row level security;
create policy "public read appearances" on public_appearances for select using (active = true or is_owner());
create policy "owner write appearances" on public_appearances for all using (is_owner()) with check (is_owner());

create index if not exists idx_appearances_date on public_appearances(event_date);
