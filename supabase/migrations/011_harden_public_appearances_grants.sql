-- 011_harden_public_appearances_grants.sql
-- Supabase projects with legacy default privileges may grant every table
-- privilege at CREATE TABLE time. RLS still protects rows, but least privilege
-- should be explicit: visitors only read; signed-in owners and service routes
-- may perform the CRUD operations required by the appearances editor.

revoke all privileges on table public.public_appearances from anon, authenticated, service_role;
grant select on table public.public_appearances to anon;
grant select, insert, update, delete on table public.public_appearances to authenticated;
grant select, insert, update, delete on table public.public_appearances to service_role;
