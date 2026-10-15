-- Tests for M008 (data rules) and M009 (daily sequence number).
-- Runs on STAGING or in CI; everything is rolled back. Result must be
-- "ALL DATA RULE / SEQUENCE TESTS PASSED". Needs at least one member.

do $$
declare
  member_id uuid := (select user_id from public.app_members limit 1);
  a uuid; b uuid; c uuid; d uuid; e uuid;
  bad text;
begin
  assert member_id is not null, 'setup: app_members is empty';

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', member_id, 'role', 'authenticated')::text, true);
    set local role authenticated;

    -- M008: every rule refuses a bad value
    foreach bad in array array[
      'insert into public.records (type, plate, price) values (''wash'', ''   '', 100)',
      'insert into public.records (type, plate, price) values (''wash'', repeat(''x'', 21), 100)',
      'insert into public.records (type, plate, price) values (''wash'', ''OK'', -1)',
      'insert into public.records (type, plate, price, customer_name) values (''wash'', ''OK'', 1, repeat(''x'', 51))',
      'insert into public.records (type, plate, price, services) values (''wash'', ''OK'', 1, array[''a'', ''b'', repeat(''x'', 201)])',
      'insert into public.expenses (title, amount) values (''x'', 0)',
      'insert into public.expenses (title, amount) values (''  '', 1)',
      'insert into public.expenses (title, amount) values (repeat(''x'', 101), 1)',
      'insert into public.expenses (title, amount, note) values (''x'', 1, repeat(''x'', 201))'
    ] loop
      begin
        execute bad;
        raise exception 'accepted: %', bad;
      exception when check_violation then null;
      end;
    end loop;

    -- ... and allows the edge values
    insert into public.records (type, plate, price, customer_name, services)
    values ('wash', repeat('x', 20), 0, repeat('x', 50), array['a', 'b', repeat('x', 200)]);
    insert into public.records (type, plate, price, customer_name, services) values ('wash', 'OK', 1, null, null);
    insert into public.expenses (title, amount, note) values (repeat('x', 100), 1, null);

    -- M009: numbers per Bangkok day, ignoring what the client sends
    insert into public.records (type, plate, price, seq_number, created_at) values ('wash', 'S1', 1, 99, '2030-01-01 00:30+07') returning id into a;
    insert into public.records (type, plate, price, seq_number, created_at) values ('wash', 'S2', 1, 99, '2030-01-01 12:00+07') returning id into b;
    insert into public.records (type, plate, price, seq_number, created_at) values ('wash', 'S3', 1, 99, '2030-01-01 23:59+07') returning id into c;
    assert (select array_agg(seq_number order by created_at) from public.records where id in (a, b, c)) = array[1, 2, 3],
      'records on one Bangkok day should be numbered 1, 2, 3';

    -- 2030-01-01 06:59 Bangkok is still 2029-12-31 in UTC but belongs to the 1st
    insert into public.records (type, plate, price, created_at) values ('wash', 'S4', 1, '2030-01-01 06:59+07') returning id into d;
    assert (select seq_number from public.records where id = d) = 4, 'an early-morning record should continue the same Bangkok day';

    -- After a delete the next number is still highest + 1, never a repeat
    delete from public.records where id = b;
    insert into public.records (type, plate, price, created_at) values ('wash', 'S5', 1, '2030-01-01 18:00+07') returning id into e;
    assert (select seq_number from public.records where id = e) = 5, 'after a delete the next number must not repeat';

    -- Another day starts again at 1
    insert into public.records (type, plate, price, created_at) values ('wash', 'S6', 1, '2030-01-02 00:00+07') returning id into a;
    assert (select seq_number from public.records where id = a) = 1, 'a new day should start at 1';

    -- Editing keeps the number (only inserts are numbered)
    update public.records set created_at = '2030-01-01 08:00+07' where id = a;
    assert (select seq_number from public.records where id = a) = 1, 'an edit must not renumber';

    reset role;

    raise exception 'rls_test_rollback';
  exception
    when others then
      if sqlerrm <> 'rls_test_rollback' then raise; end if;
  end;
end $$;

-- Reached only if every check above passed
select 'ALL DATA RULE / SEQUENCE TESTS PASSED' as result;
