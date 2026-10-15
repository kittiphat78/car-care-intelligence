-- M007 · settle_records: "เคลียร์ยอด" for exactly the rows the user confirmed (ER-03)
--
-- Purpose:  the app cleared a customer's debt with
--             update records set paid where unpaid and customer_name = '<name>'
--           which missed rows whose name is NULL or has extra spaces (they are
--           grouped under the same card on screen) and could clear rows added on
--           another device after the user looked. The app now sends the ids it
--           showed; this function marks only those that are still unpaid and
--           returns how many it changed and their total, so the app can say so
--           when the numbers differ.
-- Down:     supabase/rollback/20261016120100_settle_records.down.sql
-- Compatible with client v1.x: yes (new function; the old client keeps its own update).
-- SECURITY INVOKER: row level security applies, so a non-member changes nothing.
-- updated_at / updated_by_email are set by the audit trigger (M005).

begin;

create or replace function public.settle_records(p_ids uuid[])
  returns table (updated_count integer, total bigint)
  language plpgsql
  volatile
  security invoker
  set search_path = ''
as $$
begin
  if coalesce(cardinality(p_ids), 0) > 500 then
    raise exception using errcode = '22023', message = 'settle_records accepts at most 500 ids';
  end if;

  return query
    with updated as (
      update public.records r
         set payment_status = 'paid'
       where r.id = any (p_ids)
         and r.payment_status = 'unpaid'
      returning r.price
    )
    select count(*)::integer, coalesce(sum(u.price), 0)::bigint
    from updated u;
end;
$$;

revoke all on function public.settle_records(uuid[]) from public, anon;
grant execute on function public.settle_records(uuid[]) to authenticated;

commit;
