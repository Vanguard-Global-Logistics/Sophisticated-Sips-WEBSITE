-- Migration for databases created before the Square switch (Stripe → Square).
alter table payments drop column if exists stripe_session_id;
alter table payments drop column if exists stripe_payment_intent;
alter table payments add column if not exists square_payment_link_id text;
alter table payments add column if not exists square_order_id text unique;
alter table payments add column if not exists square_invoice_id text unique;
