-- M006 · Dashboard totals computed in the database (ADR-05)
--
-- Purpose:  the dashboard downloaded every record of the last year (~1,000+ rows)
--           and every record/expense of the last 30 days on each load just to add
--           them up in the browser. These functions return the totals instead.
--           Results equal the previous browser logic (dashboard tests compare both).
-- Down:     supabase/rollback/20261016120000_dashboard_rpcs.down.sql
-- Compatible with client v1.x: yes (new functions only; old clients never call them).
--
-- All days are Asia/Bangkok calendar days. Like the previous logic, "today" and
-- "this week/month/year" have no upper bound, so a record dated in the future
-- still counts in the current period.
-- SECURITY INVOKER: row level security applies, so a non-member gets zeros.

begin;

-- Today's money for the hero card and stat row
create or replace function public.dashboard_today(
  p_day date default (now() at time zone 'Asia/Bangkok')::date
)
  returns table (
    total_income     bigint,
    paid_income      bigint,
    unpaid_income    bigint,
    expense          bigint,
    wash_count       bigint,
    polish_count     bigint,
    yesterday_income bigint
  )
  language sql
  stable
  security invoker
  set search_path = ''
as $$
  with bounds as (
    select (p_day::timestamp at time zone 'Asia/Bangkok')       as day_start,
           ((p_day - 1)::timestamp at time zone 'Asia/Bangkok') as yesterday_start
  )
  select
    coalesce(sum(r.price) filter (where r.created_at >= b.day_start), 0)::bigint,
    coalesce(sum(r.price) filter (where r.created_at >= b.day_start and r.payment_status = 'paid'), 0)::bigint,
    coalesce(sum(r.price) filter (where r.created_at >= b.day_start and r.payment_status = 'unpaid'), 0)::bigint,
    (select coalesce(sum(e.amount), 0) from public.expenses e where e.created_at >= b.day_start)::bigint,
    count(*) filter (where r.created_at >= b.day_start and r.type = 'wash'),
    count(*) filter (where r.created_at >= b.day_start and r.type = 'polish'),
    coalesce(sum(r.price) filter (where r.created_at < b.day_start), 0)::bigint
  from bounds b
  left join public.records r on r.created_at >= b.yesterday_start
  group by b.day_start;
$$;

-- Income and expense per Bangkok day, one row for every day in [p_from, p_to]
create or replace function public.daily_series(p_from date, p_to date)
  returns table (day date, income bigint, expense bigint)
  language sql
  stable
  security invoker
  set search_path = ''
as $$
  with days as (
    select d::date as day
    from generate_series(p_from, least(p_to, p_from + 366), interval '1 day') as d
  ),
  bounds as (
    select (p_from::timestamp at time zone 'Asia/Bangkok')                        as range_start,
           ((least(p_to, p_from + 366) + 1)::timestamp at time zone 'Asia/Bangkok') as range_end
  ),
  income as (
    select (r.created_at at time zone 'Asia/Bangkok')::date as day, sum(r.price) as total
    from public.records r, bounds b
    where r.created_at >= b.range_start and r.created_at < b.range_end
    group by 1
  ),
  spent as (
    select (e.created_at at time zone 'Asia/Bangkok')::date as day, sum(e.amount) as total
    from public.expenses e, bounds b
    where e.created_at >= b.range_start and e.created_at < b.range_end
    group by 1
  )
  select d.day, coalesce(i.total, 0)::bigint, coalesce(s.total, 0)::bigint
  from days d
  left join income i on i.day = d.day
  left join spent  s on s.day = d.day
  order by d.day;
$$;

-- Income per customer this week (from Monday), month and year.
-- customer_key is the trimmed name; '' is the unnamed general customer.
create or replace function public.customer_breakdown(
  p_day date default (now() at time zone 'Asia/Bangkok')::date
)
  returns table (
    customer_key        text,
    week_wash_count     bigint, week_wash_amount   bigint, week_polish_count  bigint, week_polish_amount  bigint,
    month_wash_count    bigint, month_wash_amount  bigint, month_polish_count bigint, month_polish_amount bigint,
    year_wash_count     bigint, year_wash_amount   bigint, year_polish_count  bigint, year_polish_amount  bigint
  )
  language sql
  stable
  security invoker
  set search_path = ''
as $$
  with bounds as (
    select (date_trunc('week',  p_day)::date::timestamp at time zone 'Asia/Bangkok') as week_start,
           (date_trunc('month', p_day)::date::timestamp at time zone 'Asia/Bangkok') as month_start,
           (date_trunc('year',  p_day)::date::timestamp at time zone 'Asia/Bangkok') as year_start
  ),
  rows as (
    select btrim(coalesce(r.customer_name, '')) as customer_key,
           r.type = 'wash' as is_wash,
           r.price,
           r.created_at >= b.week_start  as in_week,
           r.created_at >= b.month_start as in_month
    from public.records r, bounds b
    where r.created_at >= b.year_start
  )
  select customer_key,
    count(*)     filter (where in_week and is_wash),                          coalesce(sum(price) filter (where in_week and is_wash), 0)::bigint,
    count(*)     filter (where in_week and not is_wash),                      coalesce(sum(price) filter (where in_week and not is_wash), 0)::bigint,
    count(*)     filter (where in_month and is_wash),                         coalesce(sum(price) filter (where in_month and is_wash), 0)::bigint,
    count(*)     filter (where in_month and not is_wash),                     coalesce(sum(price) filter (where in_month and not is_wash), 0)::bigint,
    count(*)     filter (where is_wash),                                      coalesce(sum(price) filter (where is_wash), 0)::bigint,
    count(*)     filter (where not is_wash),                                  coalesce(sum(price) filter (where not is_wash), 0)::bigint
  from rows
  group by customer_key;
$$;

revoke all on function public.dashboard_today(date)          from public, anon;
revoke all on function public.daily_series(date, date)       from public, anon;
revoke all on function public.customer_breakdown(date)       from public, anon;
grant execute on function public.dashboard_today(date)       to authenticated;
grant execute on function public.daily_series(date, date)    to authenticated;
grant execute on function public.customer_breakdown(date)    to authenticated;

commit;
