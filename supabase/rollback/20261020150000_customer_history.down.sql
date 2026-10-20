-- Down for M014: remove customer_history. Safe: a read-only function, no data.

begin;

drop function if exists public.customer_history(uuid, integer);

commit;
