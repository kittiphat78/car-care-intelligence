-- Tests for M007 (settle_records). Runs on STAGING or in CI; all changes are rolled back.
-- Result must be "ALL SETTLE TESTS PASSED". Needs at least one member.

do $$
declare
  member_id uuid := (select user_id from public.app_members limit 1);
  a uuid; b uuid; c uuid; other uuid;
  res record;
begin
  assert member_id is not null, 'setup: app_members is empty';

  begin
    insert into public.records (type, plate, price, customer_name, payment_status) values ('wash', 'S1', 200, null, 'unpaid') returning id into a;
    insert into public.records (type, plate, price, customer_name, payment_status) values ('polish', 'S2', 1500, ' ', 'unpaid') returning id into b;
    insert into public.records (type, plate, price, customer_name, payment_status) values ('wash', 'S3', 300, '', 'paid') returning id into c;
    insert into public.records (type, plate, price, customer_name, payment_status) values ('wash', 'S4', 999, '', 'unpaid') returning id into other;

    perform set_config('request.jwt.claims',
      json_build_object('sub', member_id, 'role', 'authenticated', 'email', 'settle@example.com')::text, true);
    set local role authenticated;

    -- Only the listed rows that are still unpaid change; NULL and blank names are included
    select * into res from public.settle_records(array[a, b, c, gen_random_uuid()]);
    assert res.updated_count = 2 and res.total = 1700, format('first settle returned %s / %s, expected 2 / 1700', res.updated_count, res.total);
    assert (select count(*) from public.records where id in (a, b) and payment_status = 'paid') = 2, 'listed rows were not marked paid';
    assert (select payment_status from public.records where id = other) = 'unpaid', 'a row that was not listed was cleared';
    assert (select updated_by_email from public.records where id = a) = 'settle@example.com', 'the audit trigger did not record who cleared it';

    -- Settling again changes nothing
    select * into res from public.settle_records(array[a, b]);
    assert res.updated_count = 0 and res.total = 0, 'a second settle changed rows';

    -- Empty list is fine; more than 500 ids is refused
    select * into res from public.settle_records(array[]::uuid[]);
    assert res.updated_count = 0, 'empty list changed rows';
    begin
      perform public.settle_records(array(select gen_random_uuid() from generate_series(1, 501)));
      raise exception 'settle_records accepted 501 ids';
    exception when invalid_parameter_value then null;
    end;
    reset role;

    -- A signed-in non-member changes nothing
    perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    set local role authenticated;
    select * into res from public.settle_records(array[other]);
    assert res.updated_count = 0, 'a non-member cleared a debt';
    reset role;
    assert (select payment_status from public.records where id = other) = 'unpaid', 'a non-member cleared a debt';

    -- Not signed in: cannot call it
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    set local role anon;
    begin
      perform public.settle_records(array[other]);
      raise exception 'anon can call settle_records';
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
select 'ALL SETTLE TESTS PASSED' as result;
