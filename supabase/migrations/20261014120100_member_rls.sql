-- M002 · Records and expenses for shop members only (ADR-04)
--
-- Purpose: replace the temporary "any signed-in user" policies from the 2026-10-14
--          incident fix with policies that also require membership (M001).
-- Down:    supabase/rollback/20261014120100_member_rls.down.sql
-- Requires: M001 applied and its verification query returning 0 rows. An account
--          missing from app_members sees empty lists and cannot save after this.
-- Compatible with client v1.0.x: yes for members (same queries, same results).

begin;

alter table public.records  enable row level security;
alter table public.expenses enable row level security;

revoke all on table public.records, public.expenses from anon;
revoke truncate, references, trigger on table public.records, public.expenses from authenticated;

-- Permissive policies are OR-ed, so the old ones must go or they would keep
-- allowing every signed-in user.
drop policy if exists records_authenticated_all  on public.records;
drop policy if exists expenses_authenticated_all on public.expenses;

drop policy if exists records_member_all  on public.records;
drop policy if exists expenses_member_all on public.expenses;

create policy records_member_all on public.records
  for all to authenticated
  using ((select public.is_app_member()))
  with check ((select public.is_app_member()));

create policy expenses_member_all on public.expenses
  for all to authenticated
  using ((select public.is_app_member()))
  with check ((select public.is_app_member()));

commit;

-- Verification (run separately): supabase/tests/member_rls.test.sql
-- must end with "ALL MEMBER RLS TESTS PASSED".
