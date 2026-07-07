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
