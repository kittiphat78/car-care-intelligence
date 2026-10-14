-- Member RLS tests for M001/M002 (database-migration-plan.md §4.3).
--
-- Run the whole file in the SQL Editor of STAGING. Everything happens inside one
-- transaction that is rolled back, so no data is changed. The last result must be
-- "ALL MEMBER RLS TESTS PASSED"; any failure stops the script with its message.
-- Needs at least one member in public.app_members.

begin;

create temp table rls_ctx on commit drop as
select (select user_id from public.app_members limit 1) as member_id,
       gen_random_uuid()                                  as stranger_id;
grant select on rls_ctx to authenticated, anon;

do $$
begin
  assert (select member_id from rls_ctx) is not null, 'setup: app_members is empty';
  assert not exists (
    select 1 from pg_policies
    where schemaname = 'public' and policyname in ('records_authenticated_all', 'expenses_authenticated_all')
  ), 'old "any signed-in user" policies are still present';
end $$;

-- 1. Signed in but not a member: sees nothing and cannot write
select set_config('request.jwt.claims', json_build_object('sub', stranger_id, 'role', 'authenticated')::text, true) from rls_ctx;
set local role authenticated;
do $$
declare n int;
begin
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
end $$;
reset role;

-- 2. Member: full CRUD, sees only their own membership, cannot add members
select set_config('request.jwt.claims', json_build_object('sub', member_id, 'role', 'authenticated')::text, true) from rls_ctx;
set local role authenticated;
do $$
declare n int;
begin
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
end $$;
reset role;

-- 3. Not signed in (anon key only): no access at all
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
do $$
begin
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
end $$;
reset role;

rollback;

-- Reached only if every block above passed
select 'ALL MEMBER RLS TESTS PASSED' as result;
