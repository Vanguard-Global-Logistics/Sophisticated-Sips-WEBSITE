-- ============================================================
-- Ownership layer: settings, transfer workflow, audit trail
-- ============================================================

-- Single-row business settings (wizard-managed)
create table if not exists business_settings (
  id int primary key default 1 check (id = 1),
  business_name text default 'Sophisticated Sips',
  owner_name text default 'Amy Lavold',
  phone text,
  mailing_address text,
  service_area text default 'Florida',
  domain text,
  deposit_percent int default 25 check (deposit_percent between 5 and 100),
  quote_rules text,
  cancellation_policy text,
  wizard jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);
insert into business_settings (id) values (1) on conflict do nothing;

-- Ownership transfer requests
create table if not exists owner_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  current_owner_email text not null,
  new_owner_email text not null,
  status text default 'pending', -- pending | confirmed | completed | canceled
  created_at timestamptz default now(),
  confirmed_at timestamptz,
  completed_at timestamptz
);

-- Audit trail for sensitive admin actions
create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  action text not null,
  details text,
  created_at timestamptz default now()
);

alter table business_settings enable row level security;
alter table owner_transfer_requests enable row level security;
alter table admin_audit_log enable row level security;
create policy "owner all settings" on business_settings for all using (is_owner()) with check (is_owner());
create policy "owner read transfers" on owner_transfer_requests for select using (is_owner());
create policy "owner read audit" on admin_audit_log for select using (is_owner());
-- Writes to transfers/audit go through server routes (service role) only.

-- HARD GUARANTEE: the system can never have zero owners.
create or replace function prevent_zero_owners() returns trigger
language plpgsql security definer as $$
begin
  if (select count(*) from owners) <= 1 then
    raise exception 'Cannot remove the last owner — add a new owner first.';
  end if;
  return old;
end; $$;
drop trigger if exists owners_min on owners;
create trigger owners_min before delete on owners
  for each row execute function prevent_zero_owners();
