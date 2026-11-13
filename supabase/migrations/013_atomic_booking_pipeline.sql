-- 013_atomic_booking_pipeline.sql
-- Save a public booking request and its matching sales-pipeline lead in one
-- transaction. Only server routes using the service role may execute it.

create or replace function public.create_booking_with_lead(
  p_booking jsonb,
  p_lead jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_id uuid;
begin
  insert into public.booking_requests (
    name,
    company,
    email,
    phone,
    event_type,
    event_date,
    event_time,
    location,
    guest_count,
    budget_range,
    package_interest,
    drink_preferences,
    addons,
    notes
  ) values (
    p_booking ->> 'name',
    p_booking ->> 'company',
    p_booking ->> 'email',
    p_booking ->> 'phone',
    p_booking ->> 'event_type',
    (p_booking ->> 'event_date')::date,
    p_booking ->> 'event_time',
    p_booking ->> 'location',
    coalesce((p_booking ->> 'guest_count')::int, 0),
    p_booking ->> 'budget_range',
    p_booking ->> 'package_interest',
    p_booking ->> 'drink_preferences',
    p_booking ->> 'addons',
    p_booking ->> 'notes'
  )
  returning id into v_booking_id;

  insert into public.leads (
    booking_request_id,
    name,
    contact_email,
    contact_phone,
    event_type,
    event_date,
    guest_count,
    score,
    est_value_cents,
    source,
    status
  ) values (
    v_booking_id,
    p_lead ->> 'name',
    p_lead ->> 'contact_email',
    nullif(p_lead ->> 'contact_phone', ''),
    p_lead ->> 'event_type',
    (p_lead ->> 'event_date')::date,
    coalesce((p_lead ->> 'guest_count')::int, 0),
    coalesce((p_lead ->> 'score')::int, 50),
    coalesce((p_lead ->> 'est_value_cents')::int, 0),
    coalesce(p_lead ->> 'source', 'website'),
    coalesce(p_lead ->> 'status', 'new')
  );

  return v_booking_id;
end;
$$;

revoke all on function public.create_booking_with_lead(jsonb, jsonb) from public;
revoke all on function public.create_booking_with_lead(jsonb, jsonb) from anon;
revoke all on function public.create_booking_with_lead(jsonb, jsonb) from authenticated;
grant execute on function public.create_booking_with_lead(jsonb, jsonb) to service_role;
