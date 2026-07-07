-- Adds phone to leads so Amy can tap-to-call from the dashboard.
alter table leads add column if not exists contact_phone text;
-- Backfill from linked booking requests.
update leads l set contact_phone = b.phone
from booking_requests b
where l.booking_request_id = b.id and l.contact_phone is null and b.phone is not null and b.phone <> '';
