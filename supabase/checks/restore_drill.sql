-- Backup restore drill · run in the SQL Editor of STAGING only, one step at a time
--
-- Proves the CSV files exported from production (Table Editor → Export → CSV) can be
-- loaded back and contain exactly the same rows. Uses separate restore_* tables,
-- so the seed data in staging is not touched.
--
-- The restored rows are real shop data: drop the tables at the end (step 4).

-- ── Step 1 · create empty tables shaped like production ──────────────────────
-- services is text here because the CSV stores it as a JSON array (["รถเก๋ง","HONDA",""]);
-- step 3 checks that every value converts back to the real text[] column.
create table public.restore_records  (like public.records  including defaults);
create table public.restore_expenses (like public.expenses including defaults);
alter table public.restore_records alter column services drop default;
alter table public.restore_records alter column services type text using array_to_json(services)::text;

-- ── Step 2 · in Table Editor: restore_records → Insert → Import data from CSV ──
--    (file records_rows.csv), then restore_expenses with expenses_rows.csv.

-- ── Step 3 · fingerprint of the restored copy: must equal backup_fingerprint.sql on production
select
  (select count(*)                                       from public.restore_records)  as records,
  (select coalesce(sum(price), 0)                        from public.restore_records)  as records_price_sum,
  (select count(*) filter (where payment_status = 'unpaid') from public.restore_records) as records_unpaid,
  (select min(created_at)::date || ' … ' || max(created_at)::date from public.restore_records) as records_dates,
  (select md5(string_agg(id::text, ',' order by id))     from public.restore_records)  as records_id_hash,
  (select count(*)                                       from public.restore_expenses) as expenses,
  (select coalesce(sum(amount), 0)                       from public.restore_expenses) as expenses_amount_sum,
  (select md5(string_agg(id::text, ',' order by id))     from public.restore_expenses) as expenses_id_hash,
  -- every services value converts back to text[] (0 expected)
  (select count(*) from public.restore_records
    where services is not null
      and jsonb_typeof(services::jsonb) <> 'array') as services_not_convertible;

-- ── Step 4 · remove the restored copy ─────────────────────────────────────────
-- drop table public.restore_records;
-- drop table public.restore_expenses;
