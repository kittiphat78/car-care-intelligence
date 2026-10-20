-- M014 · Customer history: the records of a customer's cars and name
--
-- Purpose:  the customer page shows how often a customer came, when last, how much in
--           total and still unpaid, and the latest records (US-12). Records keep the
--           plate and the name as typed and have no customer id (ADR-21), so they are
--           matched like the app does (features/customers/logic.ts matchDebtGroup):
--             * sure:   the same full plate (plate_core of M012: no spaces, dots,
--                       dashes or province), or the same name (spaces and case ignored)
--             * digits: only the numbers agree (at least 3 digits) — a record typed
--                       "1234" and the car "กข 1234", or two digits-only plates. Counted,
--                       and reported as `digits_only`, because it may be another car.
-- Data:     none changed. A new read-only function; no index: the shop has a few
--           thousand records, which a scan reads in milliseconds (review at ~50,000).
-- Down:     supabase/rollback/20261020150000_customer_history.down.sql
-- Compatible with client v2.1.x: yes (new function only).
-- SECURITY INVOKER: row level security applies, so a non-member gets zeros.

begin;

create or replace function public.customer_history(
  p_customer_id uuid,
  p_limit       integer default 10
)
  returns table (
    visits       bigint,
    last_visit   timestamptz,
    total        bigint,
    unpaid_total bigint,
    unpaid_count bigint,
    digits_only  bigint,
    recent       jsonb
  )
  language sql
  stable
  security invoker
  set search_path = ''
as $$
  with car as (
    select v.plate_core                                          as core,
           v.plate_core ~ '^[0-9]?[ก-ฮ]{1,3}[0-9]{1,4}$'          as full_plate,
           -- The numbers of the plate: of a full plate, or a digits-only plate itself
           coalesce(substring(v.plate_core from '^[0-9]?[ก-ฮ]{1,3}([0-9]{1,4})$'),
                    case when v.plate_core ~ '^[0-9]+$' then v.plate_core end) as digits
      from public.customer_vehicles v
     where v.customer_id = p_customer_id
  ),
  me as (
    select lower(regexp_replace(c.name, '[[:space:]]', '', 'g')) as name_key
      from public.customers c
     where c.id = p_customer_id
  ),
  rec as (
    select r.*,
           -- Same expression as customer_vehicles.plate_core (M012)
           coalesce(substring(upper(regexp_replace(r.plate, '[[:space:].-]', '', 'g')) from '^[0-9]?[ก-ฮ]{1,3}[0-9]{1,4}(?=[^0-9]|$)'),
                    upper(regexp_replace(r.plate, '[[:space:].-]', '', 'g'))) as core,
           lower(regexp_replace(coalesce(r.customer_name, ''), '[[:space:]]', '', 'g')) as name_key
      from public.records r
  ),
  matched as (
    select r.*,
           (exists (select 1 from car where car.full_plate and car.core = r.core)
            or r.name_key = (select me.name_key from me)) as sure
      from rec r
     where exists (select 1 from car where car.full_plate and car.core = r.core)
        or (r.name_key <> '' and r.name_key = (select me.name_key from me))
        -- A digits-only record and a car with the same numbers
        or (r.core ~ '^[0-9]{3,}$' and r.core in (select car.digits from car where length(car.digits) >= 3))
        -- A full-plate record and a digits-only car with the same numbers
        or (r.core ~ '^[0-9]?[ก-ฮ]{1,3}[0-9]{3,4}$'
            and substring(r.core from '^[0-9]?[ก-ฮ]{1,3}([0-9]{1,4})$') in (select car.core from car where car.core ~ '^[0-9]{3,}$'))
  )
  select count(*)::bigint,
         max(m.created_at),
         coalesce(sum(m.price), 0)::bigint,
         coalesce(sum(m.price) filter (where m.payment_status = 'unpaid'), 0)::bigint,
         count(*) filter (where m.payment_status = 'unpaid'),
         count(*) filter (where not m.sure),
         coalesce((
           select jsonb_agg(to_jsonb(x) - 'core' - 'name_key' order by x.created_at desc, x.id desc)
             from (select * from matched order by created_at desc, id desc
                    limit greatest(1, least(coalesce(p_limit, 10), 50))) x
         ), '[]'::jsonb)
    from matched m;
$$;

revoke all on function public.customer_history(uuid, integer) from public, anon;
grant execute on function public.customer_history(uuid, integer) to authenticated;

commit;

-- Verification (run separately): supabase/tests/customers.test.sql
