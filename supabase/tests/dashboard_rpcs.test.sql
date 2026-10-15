-- Tests for M006 (dashboard_today, daily_series, customer_breakdown).
--
-- Runs in the SQL Editor of STAGING or in CI. Inside an inner block that is always
-- rolled back it empties records/expenses, inserts a fixed set of rows around
-- Wednesday 2026-10-14 (Bangkok) and checks every total against values worked out
-- by hand with the previous browser logic. Nothing is left behind.
-- Result must be "ALL DASHBOARD RPC TESTS PASSED". Needs at least one member.

do $$
declare
  member_id uuid := (select user_id from public.app_members limit 1);
  t record;
  c record;
  s text;
begin
  assert member_id is not null, 'setup: app_members is empty';

  begin
    delete from public.records;
    delete from public.expenses;

    -- Bangkok wall-clock times; 2026-10-14 is a Wednesday, so the week starts on the 12th
    insert into public.records (created_at, type, plate, price, customer_name, payment_status) values
      ('2026-10-14 00:30+07', 'wash',    'T1',  200, '',    'paid'),
      ('2026-10-14 10:00+07', 'polish',  'T2', 1500, ' ก ', 'unpaid'),
      ('2026-10-14 23:59+07', 'wash',    'T3',  300, 'ก',   'paid'),
      ('2026-10-13 06:59+07', 'wash',    'T4',  100, null,  'paid'),
      ('2026-10-13 23:59+07', 'polish',  'T5', 2000, 'ข',   'paid'),
      ('2026-10-12 12:00+07', 'wash',    'T6',  150, 'ก',   'paid'),
      ('2026-10-11 12:00+07', 'wash',    'T7',  120, 'ก',   'paid'),
      ('2026-09-30 12:00+07', 'polish',  'T8', 1000, 'ข',   'paid'),
      ('2025-12-31 23:00+07', 'wash',    'T9',  999, 'ก',   'paid'),
      ('2026-10-15 09:00+07', 'wash',    'TA',   50, '',    'paid');
    insert into public.expenses (created_at, title, amount) values
      ('2026-10-14 00:10+07', 'x', 70),
      ('2026-10-13 23:00+07', 'x', 40),
      ('2026-10-15 08:00+07', 'x',  5),
      ('2026-10-08 12:00+07', 'x', 11);

    -- As a member
    perform set_config('request.jwt.claims', json_build_object('sub', member_id, 'role', 'authenticated')::text, true);
    set local role authenticated;

    select * into t from public.dashboard_today('2026-10-14');
    assert t.total_income = 2050,     format('dashboard_today.total_income = %s, expected 2050', t.total_income);
    assert t.paid_income = 550,       format('dashboard_today.paid_income = %s, expected 550', t.paid_income);
    assert t.unpaid_income = 1500,    format('dashboard_today.unpaid_income = %s, expected 1500', t.unpaid_income);
    assert t.expense = 75,            format('dashboard_today.expense = %s, expected 75', t.expense);
    assert t.wash_count = 3,          format('dashboard_today.wash_count = %s, expected 3', t.wash_count);
    assert t.polish_count = 1,        format('dashboard_today.polish_count = %s, expected 1', t.polish_count);
    assert t.yesterday_income = 2100, format('dashboard_today.yesterday_income = %s, expected 2100', t.yesterday_income);

    select string_agg(format('%s:%s:%s', day, income, expense), ' ' order by day) into s
      from public.daily_series('2026-10-08', '2026-10-14');
    assert s = '2026-10-08:0:11 2026-10-09:0:0 2026-10-10:0:0 2026-10-11:120:0 2026-10-12:150:0 2026-10-13:2100:40 2026-10-14:2000:70',
      'daily_series = ' || s;

    assert (select count(*) from public.customer_breakdown('2026-10-14')) = 3, 'customer_breakdown should return 3 customers';

    select * into c from public.customer_breakdown('2026-10-14') where customer_key = '';
    assert (c.week_wash_count, c.week_wash_amount, c.month_wash_amount, c.year_wash_count, c.year_polish_count)
         = (3::bigint, 350::bigint, 350::bigint, 3::bigint, 0::bigint), 'customer_breakdown for the general customer is wrong';

    select * into c from public.customer_breakdown('2026-10-14') where customer_key = 'ก';
    assert (c.week_wash_count, c.week_wash_amount, c.week_polish_count, c.week_polish_amount) = (2::bigint, 450::bigint, 1::bigint, 1500::bigint),
      'customer_breakdown week for ก is wrong';
    assert (c.month_wash_count, c.month_wash_amount, c.year_wash_amount) = (3::bigint, 570::bigint, 570::bigint),
      'customer_breakdown month/year for ก is wrong (last year''s row must be excluded)';

    select * into c from public.customer_breakdown('2026-10-14') where customer_key = 'ข';
    assert (c.week_polish_amount, c.month_polish_amount, c.year_polish_count, c.year_polish_amount) = (2000::bigint, 2000::bigint, 2::bigint, 3000::bigint),
      'customer_breakdown for ข is wrong';

    reset role;

    -- A signed-in non-member sees zeros
    perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    set local role authenticated;
    select * into t from public.dashboard_today('2026-10-14');
    assert t.total_income = 0 and t.expense = 0, 'a non-member sees dashboard totals';
    assert (select count(*) from public.customer_breakdown('2026-10-14')) = 0, 'a non-member sees customer totals';
    reset role;

    -- Not signed in: cannot call them at all
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    set local role anon;
    begin
      perform public.dashboard_today('2026-10-14');
      raise exception 'anon can call dashboard_today';
    exception when insufficient_privilege then null;
    end;
    reset role;

    raise exception 'rls_test_rollback';
  exception
    when others then
      if sqlerrm <> 'rls_test_rollback' then raise; end if;
  end;
end $$;

-- Reached only if every check above passed
select 'ALL DASHBOARD RPC TESTS PASSED' as result;
