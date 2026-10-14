-- Down for M001. Run only after the M002 down file (M002's policies use is_app_member()).
-- Membership rows are lost; M001 recreates them from auth.users.

begin;

drop function if exists public.is_app_member();
drop table if exists public.app_members;

commit;
