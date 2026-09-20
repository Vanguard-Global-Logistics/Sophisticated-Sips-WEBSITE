-- 012_event_ledger.sql
-- What each appearance actually earned, and which markets to chase next.
--
-- Why this exists: Square only ever sees card payments. Roughly a quarter of
-- takings are cash, and every market fee Amy pays is invisible to it entirely
-- ($1,785 across the last twelve months). Until now those numbers lived in a
-- spreadsheet on an external drive, so nobody could answer "which venues are
-- actually worth the Saturday?" This puts the whole picture in one place:
-- event_results is what happened, event_pipeline is what to book next.
--
-- Owner-only. Unlike public_appearances, none of this is ever shown publicly —
-- it is the business's own takings — so `anon` gets no access at all.

-- ---------------------------------------------------------------------------
-- event_results — one row per trading day
-- ---------------------------------------------------------------------------
create table if not exists public.event_results (
  id uuid primary key default gen_random_uuid(),
  -- Optional link to the scheduled appearance this settles. Kept nullable and
  -- ON DELETE SET NULL so deleting an old appearance never destroys takings.
  appearance_id uuid references public.public_appearances(id) on delete set null,
  venue_name text not null,
  event_date date not null,
  -- Money is integer cents everywhere in this codebase.
  card_cents int not null default 0,
  cash_cents int not null default 0,
  gift_card_cents int not null default 0,
  fee_cents int not null default 0,
  tips_cents int not null default 0,
  -- Context that explains a good or bad day. drink_vendors matters: Starkey's
  -- takings fell 36% in the months other drink vendors were admitted.
  drink_vendors int,
  weather text,
  notes text,
  source text not null default 'manual' check (source in ('manual', 'import', 'square')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Derived so every reader agrees on the arithmetic.
  gross_cents int generated always as (card_cents + cash_cents + gift_card_cents) stored,
  net_cents int generated always as (card_cents + cash_cents + gift_card_cents - fee_cents) stored,
  constraint event_results_unique_day unique (venue_name, event_date)
);

alter table public.event_results enable row level security;

revoke all privileges on table public.event_results from anon, authenticated, service_role;
grant select, insert, update, delete on table public.event_results to authenticated;
grant select, insert, update, delete on table public.event_results to service_role;

drop policy if exists "owner all event results" on public.event_results;
create policy "owner all event results"
  on public.event_results
  for all
  to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()));

create index if not exists idx_event_results_date on public.event_results(event_date desc);
create index if not exists idx_event_results_venue on public.event_results(venue_name);

-- ---------------------------------------------------------------------------
-- event_pipeline — markets worth chasing, and where each conversation stands
-- ---------------------------------------------------------------------------
create table if not exists public.event_pipeline (
  id uuid primary key default gen_random_uuid(),
  market_name text not null,
  organizer_name text,
  contact_email text,
  contact_phone text,
  website text,
  location text,
  next_date date,
  application_deadline date,
  fee_cents int,
  expected_attendance int,
  -- Worth more than the fee: at Starkey, sharing the park with three or four
  -- other drink vendors cost more than any fee ever did.
  drink_exclusivity boolean,
  status text not null default 'researching'
    check (status in ('researching', 'contacted', 'applied', 'accepted', 'declined', 'booked', 'passed')),
  priority int not null default 100,
  last_contact date,
  next_action text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.event_pipeline enable row level security;

revoke all privileges on table public.event_pipeline from anon, authenticated, service_role;
grant select, insert, update, delete on table public.event_pipeline to authenticated;
grant select, insert, update, delete on table public.event_pipeline to service_role;

drop policy if exists "owner all event pipeline" on public.event_pipeline;
create policy "owner all event pipeline"
  on public.event_pipeline
  for all
  to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()));

create index if not exists idx_event_pipeline_status on public.event_pipeline(status);
create index if not exists idx_event_pipeline_next_date on public.event_pipeline(next_date);
