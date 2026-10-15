-- Down for M006. Deploy the previous app version first: it does not call these functions.

begin;

drop function if exists public.dashboard_today(date);
drop function if exists public.daily_series(date, date);
drop function if exists public.customer_breakdown(date);

commit;
