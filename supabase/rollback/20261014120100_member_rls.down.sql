-- Down for M002: back to the 2026-10-14 mitigation (any signed-in user, never anon).
-- Run this BEFORE the M001 down file.

begin;

drop policy if exists records_member_all  on public.records;
drop policy if exists expenses_member_all on public.expenses;

drop policy if exists records_authenticated_all  on public.records;
drop policy if exists expenses_authenticated_all on public.expenses;

create policy records_authenticated_all  on public.records  for all to authenticated using (true) with check (true);
create policy expenses_authenticated_all on public.expenses for all to authenticated using (true) with check (true);

commit;
