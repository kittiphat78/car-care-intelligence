-- Tests for M003 (indexes), M004 (client_request_id) and M005 (audit triggers).
--
-- Run the whole file in the SQL Editor of STAGING (or let CI run it). Like
-- member_rls.test.sql, all work happens in an inner block that is always rolled
-- back, so nothing is left behind. The result must be
-- "ALL INDEX / IDEMPOTENCY / AUDIT TESTS PASSED". Needs at least one member.

do $$
declare
  member_id uuid := (select user_id from public.app_members limit 1);
  request   uuid := gen_random_uuid();
  row_id    uuid;
  r         record;
begin
  assert member_id is not null, 'setup: app_members is empty';

  -- M003: indexes exist
  assert (select count(*) from pg_indexes where schemaname = 'public' and indexname in (
    'records_created_at_idx', 'records_unpaid_created_at_idx', 'records_plate_idx', 'expenses_created_at_idx'
  )) = 4, 'M003 indexes are missing';

  begin
    -- Signed in as a member whose e-mail is test-member@example.com
    perform set_config('request.jwt.claims',
      json_build_object('sub', member_id, 'role', 'authenticated', 'email', 'test-member@example.com')::text, true);
    set local role authenticated;

    -- M005 insert: identity comes from the session, not from what the client sent
    insert into public.expenses (title, amount, note, created_by, created_by_email, updated_by_email, updated_at)
    values ('audit test', 1, '', gen_random_uuid(), 'fake@example.com', 'fake@example.com', now())
    returning id into row_id;

    select * into r from public.expenses where id = row_id;
    assert r.created_by = member_id, 'insert: created_by was not taken from the session';
    assert r.created_by_email = 'test-member@example.com', 'insert: created_by_email was not taken from the session';
    assert r.updated_at is null and r.updated_by_email is null, 'insert: updated_* were not cleared';

    -- M005 update: created_* cannot change, updated_* come from the session
    update public.expenses
       set amount = 2, created_by = gen_random_uuid(), created_by_email = 'fake@example.com',
           updated_by_email = 'fake@example.com', updated_at = '2000-01-01'
     where id = row_id;

    select * into r from public.expenses where id = row_id;
    assert r.amount = 2, 'update: the row was not updated';
    assert r.created_by = member_id and r.created_by_email = 'test-member@example.com', 'update: created_* changed';
    assert r.updated_by_email = 'test-member@example.com', 'update: updated_by_email was not taken from the session';
    assert r.updated_at > now() - interval '1 minute', 'update: updated_at was not set by the database';

    -- Same rules on records
    insert into public.records (type, plate, price, created_by_email) values ('wash', 'AUDIT TEST', 1, 'fake@example.com')
    returning id into row_id;
    assert (select created_by_email from public.records where id = row_id) = 'test-member@example.com',
      'records insert: created_by_email was not taken from the session';

    -- M004: the same client_request_id cannot be saved twice
    insert into public.records (type, plate, price, client_request_id) values ('wash', 'IDEMPOTENCY TEST', 1, request);
    begin
      insert into public.records (type, plate, price, client_request_id) values ('wash', 'IDEMPOTENCY TEST', 1, request);
      raise exception 'a duplicate client_request_id was accepted on records';
    exception when unique_violation then null;
    end;

    insert into public.expenses (title, amount, client_request_id) values ('idempotency test', 1, request);
    begin
      insert into public.expenses (title, amount, client_request_id) values ('idempotency test', 1, request);
      raise exception 'a duplicate client_request_id was accepted on expenses';
    exception when unique_violation then null;
    end;

    -- Rows without an id (the current client) are still accepted any number of times
    insert into public.expenses (title, amount) values ('no request id', 1), ('no request id', 1);

    reset role;

    -- M005 without a session (owner in the SQL Editor, seed): given values are kept
    perform set_config('request.jwt.claims', '', true);
    insert into public.expenses (title, amount, created_by_email) values ('admin insert', 1, 'owner@example.com')
    returning id into row_id;
    assert (select created_by_email from public.expenses where id = row_id) = 'owner@example.com',
      'insert without a session: created_by_email was overwritten';

    -- Undo everything above by aborting this inner block
    raise exception 'rls_test_rollback';
  exception
    -- OTHERS does not catch failed ASSERTs, so those still stop the script
    when others then
      if sqlerrm <> 'rls_test_rollback' then raise; end if;
  end;
end $$;

-- Reached only if every check above passed
select 'ALL INDEX / IDEMPOTENCY / AUDIT TESTS PASSED' as result;
