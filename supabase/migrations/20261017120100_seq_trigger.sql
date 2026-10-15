-- M009 · Daily sequence number set by the database (ER-04, owner decision 2026-10-15: option ก)
--
-- Purpose:  the app numbered a new record as "records on that day + 1", counted in
--           the browser. Two devices saving at once, or a deleted record, gave
--           repeated numbers (10 days on production) or gaps (8 days).
--           A new record now gets "highest number on its Bangkok day + 1", worked
--           out in the database under a per-day lock, so two saves cannot get the
--           same number.
-- Scope:    new records only. Existing numbers are not changed (owner chose ก).
--           Editing a record's date keeps its number.
-- Down:     supabase/rollback/20261017120100_seq_trigger.down.sql
-- Compatible with client v1.x: yes. The app still sends its own guess, which the
--           trigger replaces.

begin;

create or replace function public.tg_set_seq_number()
  returns trigger
  language plpgsql
  security invoker
  set search_path = ''
as $$
declare
  shop_day date := (new.created_at at time zone 'Asia/Bangkok')::date;
begin
  -- Serialise inserts for the same day until this transaction ends
  perform pg_advisory_xact_lock(hashtext('records_seq_' || shop_day::text));

  select coalesce(max(r.seq_number), 0) + 1
    into new.seq_number
    from public.records r
   where r.created_at >= (shop_day::timestamp at time zone 'Asia/Bangkok')
     and r.created_at <  ((shop_day + 1)::timestamp at time zone 'Asia/Bangkok');

  return new;
end;
$$;

drop trigger if exists records_seq on public.records;

create trigger records_seq
  before insert on public.records
  for each row execute function public.tg_set_seq_number();

commit;
