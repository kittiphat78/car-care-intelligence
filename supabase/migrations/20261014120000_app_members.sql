-- M001 · Shop member allowlist (ADR-04)
--
-- Purpose: only accounts listed in public.app_members may use shop data. Being signed
--          in is no longer enough (closes the gap left by the 2026-10-14 incident fix).
-- Down:    supabase/rollback/20261014120000_app_members.down.sql (after M002's down)
-- Compatible with client v1.0.x: yes. This file only adds objects; nothing reads
--          them until M002.
--
-- Backfill: the owner confirmed on 2026-10-14 that every existing account belongs to
-- the shop (production: 4 accounts = owner x2, father, mother). All accounts present
-- when this runs become members. Check the count first (verification below).

begin;

create table if not exists public.app_members (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  role       text        not null default 'staff' check (role in ('staff', 'owner')),
  created_at timestamptz not null default now()
);

alter table public.app_members enable row level security;

-- Members can see their own row only. Nobody can change membership through the API;
-- the administrator does it in the SQL Editor.
revoke all on table public.app_members from anon, authenticated;
grant select on table public.app_members to authenticated;

drop policy if exists app_members_read_self on public.app_members;
create policy app_members_read_self on public.app_members
  for select to authenticated
  using (user_id = (select auth.uid()));

-- security definer so policies on other tables can check membership without the
-- caller needing direct access to app_members
create or replace function public.is_app_member()
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select exists (select 1 from public.app_members m where m.user_id = (select auth.uid()));
$$;

revoke all on function public.is_app_member() from public, anon;
grant execute on function public.is_app_member() to authenticated;

insert into public.app_members (user_id)
select id from auth.users
on conflict (user_id) do nothing;

commit;

-- Verification (run separately after applying):
--
-- 1. Before applying on production, this must return 4:
--      select count(*) from auth.users;
--
-- 2. Every account is a member (expected: 0 rows):
--      select u.email from auth.users u
--      left join public.app_members m on m.user_id = u.id
--      where m.user_id is null;
