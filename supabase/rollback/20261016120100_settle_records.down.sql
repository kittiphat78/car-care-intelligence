-- Down for M007. Deploy the previous app version first: it does not call this function.

begin;

drop function if exists public.settle_records(uuid[]);

commit;
