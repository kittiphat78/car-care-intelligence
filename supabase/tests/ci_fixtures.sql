-- CI only: one fake signed-up account that is a shop member, so the test files
-- have a member to act as. Never run this on staging or production.

-- The token and time columns are filled rather than NULL: Supabase Auth cannot read NULLs there, and
-- one such row makes its admin user list fail for everyone (seen when the SQL tests and
-- the e2e tests share one local database).
insert into auth.users (id, instance_id, aud, role, email,
                        confirmation_token, recovery_token, email_change_token_new, email_change,
                        created_at, updated_at)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'ci-member@example.com', '', '', '', '', now(), now())
on conflict (id) do nothing;

insert into public.app_members (user_id)
values ('00000000-0000-4000-8000-0000000000a1')
on conflict (user_id) do nothing;
