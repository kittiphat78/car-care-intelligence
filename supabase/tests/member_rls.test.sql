-- Member RLS tests for M001/M002 (database-migration-plan.md §4.3).
--
-- Run the whole file in the SQL Editor of STAGING. The tests are one DO block whose
-- work happens in an inner block that is always rolled back, so no data, role or
-- setting is left behind, even when the editor runs each statement in its own
-- transaction. The result must be "ALL MEMBER RLS TESTS PASSED"; a failure stops
-- with its message instead. Needs at least one member in public.app_members.

do $$
declare
  member_id   uuid := (select user_id from public.app_members limit 1);
  stranger_id uuid := gen_random_uuid();
  n           int;
begin
  assert member_id is not null, 'setup: app_members is empty';
  assert not exists (
    select 1 from pg_policies
    where schemaname = 'public' and policyname in ('records_authenticated_all', 'expenses_authenticated_all')
  ), 'old "any signed-in user" policies are still present';

  begin
    -- 1. Signed in but not a member: sees nothing and cannot write
    perform set_config('request.jwt.claims', json_build_object('sub', stranger_id, 'role', 'authenticated')::text, true);
    set local role authenticated;

    assert (select count(*) from public.records) = 0, 'non-member can read records';
    assert (select count(*) from public.expenses) = 0, 'non-member can read expenses';
    assert (select count(*) from public.app_members) = 0, 'non-member can read app_members';
    assert not public.is_app_member(), 'is_app_member() is true for a non-member';

    begin
      insert into public.expenses (title, amount) values ('rls test', 1);
      raise exception 'non-member could insert an expense';
    exception when insufficient_privilege then null;
    end;

    begin
      insert into public.records (type, plate, price) values ('wash', 'RLS TEST', 1);
      raise exception 'non-member could insert a record';
    exception when insufficient_privilege then null;
    end;

    update public.records set price = price;
    get diagnostics n = row_count;
    assert n = 0, 'non-member could update records';

    delete from public.expenses;
    get diagnostics n = row_count;
    assert n = 0, 'non-member could delete expenses';

    reset role;

    -- 2. Member: full CRUD, sees only their own membership, cannot add members
    perform set_config('request.jwt.claims', json_build_object('sub', member_id, 'role', 'authenticated')::text, true);
    set local role authenticated;

    assert public.is_app_member(), 'is_app_member() is false for a member';
    assert (select count(*) from public.records) > 0, 'member cannot read records (is staging seeded?)';
    assert (select count(*) from public.app_members) = 1, 'member should see exactly their own membership row';

    insert into public.expenses (title, amount, note) values ('rls test', 1, '');
    update public.expenses set amount = 2 where title = 'rls test';
    get diagnostics n = row_count;
    assert n = 1, 'member could not update their expense';
    delete from public.expenses where title = 'rls test';
    get diagnostics n = row_count;
    assert n = 1, 'member could not delete their expense';

    insert into public.records (type, plate, price) values ('wash', 'RLS TEST', 1);
    delete from public.records where plate = 'RLS TEST';
    get diagnostics n = row_count;
    assert n = 1, 'member could not insert and delete a record';

    begin
      insert into public.app_members (user_id) values (gen_random_uuid());
      raise exception 'member could add a member';
    exception when insufficient_privilege then null;
    end;

    reset role;

    -- 3. Not signed in (anon key only): no access at all
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    set local role anon;

    begin
      perform 1 from public.records limit 1;
      raise exception 'anon can read records';
    exception when insufficient_privilege then null;
    end;

    begin
      perform 1 from public.expenses limit 1;
      raise exception 'anon can read expenses';
    exception when insufficient_privilege then null;
    end;

    begin
      perform 1 from public.app_members limit 1;
      raise exception 'anon can read app_members';
    exception when insufficient_privilege then null;
    end;

    begin
      perform public.is_app_member();
      raise exception 'anon can call is_app_member()';
    exception when insufficient_privilege then null;
    end;

    -- Undo everything above (rows, role, settings) by aborting this inner block
    raise exception 'rls_test_rollback';
  exception
    -- OTHERS does not catch failed ASSERTs, so those still stop the script
    when others then
      if sqlerrm <> 'rls_test_rollback' then raise; end if;
  end;
end $$;

-- Reached only if every check above passed
select 'ALL MEMBER RLS TESTS PASSED' as result;
