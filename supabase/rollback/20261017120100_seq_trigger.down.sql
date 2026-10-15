-- Down for M009: the app's own number is stored again. Numbers already given stay.

begin;

drop trigger if exists records_seq on public.records;
drop function if exists public.tg_set_seq_number();

commit;
