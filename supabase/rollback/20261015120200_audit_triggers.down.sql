-- Down for M005: the client sets the audit fields again.

begin;

drop trigger if exists records_audit  on public.records;
drop trigger if exists expenses_audit on public.expenses;
drop function if exists public.tg_set_audit();

commit;
