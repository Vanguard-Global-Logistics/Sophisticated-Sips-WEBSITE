-- 007_studio_inventory.sql — Menu Studio version history, inventory, and
-- scheduled menu changes. Additive only; safe to re-run. RLS owner-only.

-- Point-in-time snapshots of the whole menu, for version history + one-click restore.
create table if not exists menu_versions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  label text,
  author_email text,
  snapshot jsonb not null            -- array of menu_items rows at capture time
);

-- Real inventory the owner maintains by hand (forecast tab estimates consumption).
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text default 'unit',          -- lb | gal | cups | each …
  on_hand numeric default 0,
  par_level numeric default 0,        -- reorder threshold
  sort int default 100,
  updated_at timestamptz default now()
);

-- Scheduled menu changes. The table + adapter exist now; a cron executor is Sprint 2.
create table if not exists scheduled_menu_changes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  effective_at timestamptz not null,
  action text not null,               -- apply_version | set_price | toggle_sold_out | toggle_active
  payload jsonb not null,
  status text default 'pending',      -- pending | applied | canceled
  applied_at timestamptz
);

alter table menu_versions enable row level security;
alter table inventory_items enable row level security;
alter table scheduled_menu_changes enable row level security;

-- Versions/schedule are written by service-role server routes only (SELECT for owner UI).
create policy "owner read menu_versions" on menu_versions for select using (is_owner());
create policy "owner all inventory" on inventory_items for all using (is_owner()) with check (is_owner());
create policy "owner read scheduled_changes" on scheduled_menu_changes for select using (is_owner());

create index if not exists idx_menu_versions_created on menu_versions(created_at desc);
create index if not exists idx_inventory_sort on inventory_items(sort);
create index if not exists idx_scheduled_effective on scheduled_menu_changes(status, effective_at);

-- Role grants for the new tables (RLS still gates rows; service_role bypasses).
grant all on menu_versions, inventory_items, scheduled_menu_changes
  to anon, authenticated, service_role;
