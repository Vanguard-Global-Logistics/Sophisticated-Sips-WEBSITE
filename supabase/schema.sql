-- ============================================================
-- SOPHISTICATED SIPS — Supabase / Postgres schema
-- Run in the Supabase SQL editor. Then set Amy's email below.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- owner allow-list (drives RLS) ----------
create table if not exists owners ( email text primary key );
insert into owners (email) values ('amy@sophisticatedsips.com')
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
  active boolean default true
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

-- ---------- payments (Stripe) ----------
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

create policy "public read menu" on menu_items for select using (active = true or is_owner());
create policy "public read packages" on catering_packages for select using (active = true or is_owner());

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
('Iced Espresso','Shaken Espresso','16 oz $6 · 24 oz $7','Double shots shaken over ice until silky and frothed.',false,10),
('Iced Espresso','Iced Latte','16 oz $7 · 24 oz $8','Espresso and cold milk over ice, finished your way.',false,20),
('Iced Espresso','Iced Macchiato','16 oz $7 · 24 oz $8','Layered espresso poured slow over vanilla milk.',false,30),
('Hot Espresso','Americano','12 oz $4 · 16 oz $5','Rich espresso lengthened with hot water.',false,10),
('Hot Espresso','Café Latte','12 oz $6 · 16 oz $7','Velvet-steamed milk over a double shot.',false,20),
('Hot Espresso','Espresso Shot','1 shot $2 · 2 shots $3','Pulled fresh, crema-crowned.',false,30),
('Non-Espresso','Red Bull Italian Cream Soda','$7','Sparkling energy with sweet cream and syrup.',false,10),
('Non-Espresso','Italian Soda','$5','Sparkling water with artisan flavor syrups.',false,20),
('Non-Espresso','Dirty Soda','$6','Soda, cream, and flavor — the fun one.',false,30),
('Non-Espresso','Hot Chocolate','$5','Real cocoa, steamed milk, whipped topping.',false,40),
('Non-Espresso','Hot Tea','$3','A curated selection of premium teas.',false,50),
('Non-Espresso','Red Bull','$4','Chilled, classic or sugar-free.',false,60),
('Non-Espresso','Soda Pop Can','$3','Assorted favorites, ice cold.',false,70),
('Non-Espresso','Water','$2','Bottled and chilled.',false,80),
('Signature','Golden Pulse Latte','$7.50','Our house latte with a champagne-gold turmeric-honey finish.',true,10),
('Signature','Golden Pulse Crepe','$12','Warm crepe, caramelized honey butter, gold dusting.',true,20),
('Signature','Oreo Artisan Cheesecake','$11','Hand-finished cheesecake on a dark cookie crust.',true,30),
('Signature','Peppermint Pulse Cheesecake','$11','Cool peppermint over velvet cheesecake.',true,40);

insert into catering_packages (name, tag, description, bullet_points, base_price_cents, sort) values
('The Espresso Hour','Most booked','Full espresso bar service for up to 50 guests. Iced and hot menu, two baristas, styled trailer setup.', array['2 hours of service','Full espresso + non-espresso menu','Custom cup sleeves available'], 45000, 10),
('The Golden Event','Weddings & galas','Our signature luxury experience: espresso bar, signature Golden Pulse menu, dessert display, and crepe station.', array['3–4 hours of service','Signature drinks + dessert bar','Crepe add-on station','Champagne-gold styling'], 95000, 20),
('Corporate Perk','Offices & appreciation days','Turn a Tuesday into the best day of the quarter. Branded menu boards, fast lines, invoice-friendly billing.', array['Per-cup or flat-rate billing','Company-branded menu option','Recurring visit scheduling'], 60000, 30);
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
