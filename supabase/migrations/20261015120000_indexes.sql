-- M003 · Indexes for the app's date, debt and plate lookups
--
-- Purpose:  every screen filters records/expenses by created_at; the debt book
--           filters unpaid records; the visit counter looks up a plate.
-- Down:     supabase/rollback/20261015120000_indexes.down.sql
-- Compatible with client v1.0.x: yes (read paths only get faster).
-- Tables hold a few thousand rows, so a normal (locking) create is a sub-second
-- operation; CONCURRENTLY is not allowed inside a migration transaction.

begin;

create index if not exists records_created_at_idx
  on public.records (created_at);

create index if not exists records_unpaid_created_at_idx
  on public.records (created_at)
  where payment_status = 'unpaid';

create index if not exists records_plate_idx
  on public.records (plate);

create index if not exists expenses_created_at_idx
  on public.expenses (created_at);

commit;
