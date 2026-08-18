-- ============================================================
-- SOPHISTICATED SIPS — Supabase / Postgres schema
-- Run in the Supabase SQL editor. Then set Amy's email below.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- owner allow-list (drives RLS) ----------
create table if not exists owners ( email text primary key );
insert into owners (email) values ('sophisticatedsnacksfl@gmail.com')
  on conflict do nothing; -- <-- CHANGE to Amy's real login email

create or replace function is_owner() returns boolean
language sql stable security definer as $$
  select exists (select 1 from owners where email = auth.jwt() ->> 'email');
$$;

-- ---------- booking_requests (public form submissions) ----------
create table if not exists booking_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  company text,
  email text not null,
  phone text,
  event_type text,
  event_date date,
  event_time text,
  location text,
  guest_count int,
  budget_range text,
  package_interest text,
  drink_preferences text,
  addons text,
  notes text,
  status text default 'new' -- new | quoted | confirmed | declined
);

-- ---------- leads (pipeline; each booking auto-creates one) ----------
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  booking_request_id uuid references booking_requests(id),
  name text not null,
  contact_email text,
  contact_phone text,
  event_type text,
  event_date date,
  guest_count int,
  score int default 50,
  est_value_cents int default 0,
  source text default 'website',  -- website | public_listing | referral
  status text default 'new',      -- new | hot | contacted | quoted | confirmed | declined
  follow_up_count int default 0
);

-- ---------- menu_items ----------
create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  price_label text not null,
  description text,
  is_signature boolean default false,
  sort int default 100,
  active boolean default true,
  sold_out boolean default false,
  photo_url text
);

-- ---------- catering_packages ----------
create table if not exists catering_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text,
  description text,
  bullet_points text[],
  base_price_cents int,
  active boolean default true,
  sort int default 100
);

-- ---------- email_drafts (approval workflow) ----------
create table if not exists email_drafts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  lead_id uuid references leads(id),
  to_email text not null,
  to_name text,
  subject text not null,
  body text not null,
  is_follow_up boolean default false,
  status text default 'pending', -- pending | approved | sent | declined | blocked
  decided_at timestamptz,
  sent_at timestamptz
);

-- ---------- outreach_logs ----------
create table if not exists outreach_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  lead_id uuid references leads(id),
  draft_id uuid references email_drafts(id),
  to_email text,
  action text, -- sent | declined | unsubscribed | blocked_suppressed | blocked_max_followups
  detail text
);

-- ---------- suppression_list (opt-outs; never emailed again) ----------
create table if not exists suppression_list (
  email text primary key,
  reason text default 'unsubscribed',
  created_at timestamptz default now()
);

-- ---------- public_appearances (walk-up locations, separate from private bookings) ----------
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

-- ---------- events (confirmed bookings) ----------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  lead_id uuid references leads(id),
  title text not null,
  event_date date,
  event_time text,
  location text,
  guest_count int,
  quote_total_cents int default 0,
  deposit_cents int default 0,
  deposit_paid boolean default false,
  balance_paid boolean default false,
  status text default 'scheduled' -- scheduled | completed | canceled
);

-- ---------- payments (Square) ----------
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  event_id uuid references events(id),
  square_payment_link_id text,
  square_order_id text unique,
  square_invoice_id text unique,
  kind text default 'deposit', -- deposit | balance | invoice
  amount_cents int not null,
  status text default 'pending', -- pending | paid | failed | refunded
  paid_at timestamptz
);

-- ============================================================
-- Row Level Security: the public can only READ the menu and
-- packages. Everything else is owner-only. Server API routes
-- use the service-role key (bypasses RLS) with validation.
-- ============================================================
alter table booking_requests enable row level security;
alter table leads enable row level security;
alter table menu_items enable row level security;
alter table catering_packages enable row level security;
alter table email_drafts enable row level security;
alter table outreach_logs enable row level security;
alter table suppression_list enable row level security;
alter table events enable row level security;
alter table payments enable row level security;
alter table owners enable row level security;
alter table public_appearances enable row level security;

create policy "public read menu" on menu_items for select using (active = true or is_owner());
create policy "public read packages" on catering_packages for select using (active = true or is_owner());
create policy "public read appearances" on public_appearances for select using (active = true or is_owner());
create policy "owner write appearances" on public_appearances for all using (is_owner()) with check (is_owner());

create policy "owner all bookings" on booking_requests for all using (is_owner()) with check (is_owner());
create policy "owner all leads" on leads for all using (is_owner()) with check (is_owner());
create policy "owner write menu" on menu_items for all using (is_owner()) with check (is_owner());
create policy "owner write packages" on catering_packages for all using (is_owner()) with check (is_owner());
create policy "owner all drafts" on email_drafts for all using (is_owner()) with check (is_owner());
create policy "owner read logs" on outreach_logs for select using (is_owner());
create policy "owner all suppression" on suppression_list for all using (is_owner()) with check (is_owner());
create policy "owner all events" on events for all using (is_owner()) with check (is_owner());
create policy "owner read payments" on payments for select using (is_owner());
create policy "owner read owners" on owners for select using (is_owner());

-- ============================================================
-- Seed data
-- ============================================================
insert into menu_items (category, name, price_label, description, is_signature, sort) values
('Iced Espresso','Shaken Espresso','16 oz $5 · 24 oz $6','Your refreshing pick-me-up, similar to a crisp iced coffee.',false,10),
('Iced Espresso','Iced Latte','16 oz $6 · 24 oz $7','Smooth espresso perfectly blended with chilled milk.',false,20),
('Iced Espresso','Iced Macchiato','16 oz $6 · 24 oz $7','A beautifully layered iced latte—a true work of art in a cup.',false,30),
('Hot Espresso','Americano','12 oz $4 · 16 oz $4.50','A bold and invigorating classic, just like a traditional coffee.',false,10),
('Hot Espresso','Café Latte','12 oz $5.50 · 16 oz $6','Rich espresso harmoniously combined with velvety steamed milk.',false,20),
('Hot Espresso','Espresso Shot','1 shot $2 · 2 shots $3','Pure, concentrated perfection.',false,30),
('Non-Espresso','Red Bull Italian Cream Soda','20 oz $7','The ultimate energy boost meets a sweet, creamy fizz.',false,10),
('Non-Espresso','Italian Soda','16 oz $4','Club soda, your favorite flavor, cream, and a swirl of whipped cream.',false,20),
('Non-Espresso','Hot Chocolate','12 oz $4','Warm milk, fluffy marshmallows, peppermint, and whipped cream.',false,30),
('Non-Espresso','Hot Tea','12 oz $2','A soothing, aromatic selection of available flavors.',false,40),
('Non-Espresso','Red Bull','$4','A chilled 8.4 oz can.',false,50),
('Non-Espresso','Water','$1','Crisp, refreshing hydration.',false,60),
('Crepes','Nutella Crepe','$7','The classic, simply irresistible.',false,10),
('Crepes','Banana Nutella Crepe','$8','Sweet bananas and rich Nutella.',false,20),
('Crepes','Strawberry Nutella Crepe','$9','Fresh strawberries paired with creamy Nutella.',false,30),
('Crepes','Strawberry-Banana Crepe','$10','A fresh, flavorful fruit duo.',false,40),
('Crepes','Banana Cheesecake Crepe','$8','Bananas blended with creamy cheesecake filling.',false,50),
('Crepes','Strawberry Cheesecake Crepe','$9','Juicy strawberries meet decadent cheesecake.',false,60),
('Signature','Lavender Honey Latte','Small $7 · Medium $8','Lavender, honey, and soft cinnamon over espresso and milk. Served iced or hot.',true,10),
('Signature','Biscoff Latte','Small $7 · Medium $8','Espresso, milk, Biscoff cookie butter, and whipped cream. Served iced or hot.',true,20),
('Signature','S’more Latte','Small $7 · Medium $8','Chocolate, toasted marshmallow, cold foam, and graham cracker. Served iced or hot.',true,30);

insert into catering_packages (name, tag, description, bullet_points, base_price_cents, sort) values
('The Signature Bar','Up to 50 guests','A luxury coffee experience with unlimited handcrafted drinks and a professional espresso bar.', array['Fresh roasted espresso','Hot & iced beverages','Premium syrups and milk choices','Setup and breakdown'], 49900, 10),
('The Paris Experience','Up to 100 guests','Everything in The Signature Bar, plus a live gourmet crepe station made fresh for every guest.', array['Unlimited handcrafted drinks','Unlimited fresh crepes','Elegant menu displays','Luxury presentation'], 99900, 20),
('The Grand Experience','Up to 200 guests','The flagship experience with Amy’s signature latte collection and the highest level of presentation.', array['Luxury coffee cart','Premium décor and floral accents','Personalized drink names','Priority staffing and professional setup'], 199900, 30);
-- Query-path indexes (dashboard + webhook lookups). Safe to run anytime.
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_contact_email on leads(contact_email);
create index if not exists idx_leads_created_at on leads(created_at desc);
create index if not exists idx_drafts_status on email_drafts(status);
create index if not exists idx_drafts_lead on email_drafts(lead_id);
create index if not exists idx_payments_event on payments(event_id);
create index if not exists idx_payments_status_paid_at on payments(status, paid_at desc);
create index if not exists idx_events_date on events(event_date);
create index if not exists idx_bookings_created_at on booking_requests(created_at desc);
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

-- ---------- Menu Studio: version history, inventory, scheduled changes ----------
create table if not exists menu_versions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  label text,
  author_email text,
  snapshot jsonb not null
);
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text default 'unit',
  on_hand numeric default 0,
  par_level numeric default 0,
  sort int default 100,
  updated_at timestamptz default now()
);
create table if not exists scheduled_menu_changes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  effective_at timestamptz not null,
  action text not null,
  payload jsonb not null,
  status text default 'pending',
  applied_at timestamptz
);
alter table menu_versions enable row level security;
alter table inventory_items enable row level security;
alter table scheduled_menu_changes enable row level security;
create policy "owner read menu_versions" on menu_versions for select using (is_owner());
create policy "owner all inventory" on inventory_items for all using (is_owner()) with check (is_owner());
create policy "owner read scheduled_changes" on scheduled_menu_changes for select using (is_owner());
create index if not exists idx_menu_versions_created on menu_versions(created_at desc);
create index if not exists idx_inventory_sort on inventory_items(sort);
create index if not exists idx_scheduled_effective on scheduled_menu_changes(status, effective_at);

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

-- ============================================================
-- Role grants (Supabase model: broad table grants, RLS is the gate)
-- Hosted Supabase applies these via default privileges; a fresh/self-hosted
-- database needs them explicitly, or PostgREST returns "permission denied".
-- Every table above has RLS enabled, so anon/authenticated still only see
-- what a policy allows; service_role bypasses RLS by design.
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
