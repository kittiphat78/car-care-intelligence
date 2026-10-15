-- Down for M008: removes the rules; no data changes.

begin;

alter table public.records
  drop constraint if exists records_plate_len_chk,
  drop constraint if exists records_price_chk,
  drop constraint if exists records_customer_len_chk,
  drop constraint if exists records_note_len_chk;

alter table public.expenses
  drop constraint if exists expenses_amount_chk,
  drop constraint if exists expenses_title_len_chk,
  drop constraint if exists expenses_note_len_chk;

commit;
