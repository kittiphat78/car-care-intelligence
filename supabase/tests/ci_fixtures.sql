-- CI only: one fake signed-up account that is a shop member, so the test files
-- have a member to act as. Never run this on staging or production.

insert into auth.users (id, instance_id, aud, role, email)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'ci-member@example.com')
on conflict (id) do nothing;

insert into public.app_members (user_id)
values ('00000000-0000-4000-8000-0000000000a1')
on conflict (user_id) do nothing;
