-- Down for M003.

begin;

drop index if exists public.records_created_at_idx;
drop index if exists public.records_unpaid_created_at_idx;
drop index if exists public.records_plate_idx;
drop index if exists public.expenses_created_at_idx;

commit;
