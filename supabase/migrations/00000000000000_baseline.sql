-- M000 · Baseline schema of the production `public` schema (2026-10-14), schema only, no data.
--
-- Source: read-only catalog query (columns, constraints, indexes, RLS, policies,
-- triggers, functions) run by the owner on production during Step 07.
-- Grants are not in that query; they mirror the access mitigation of 2026-10-14
-- (anon: none · authenticated: select/insert/update/delete).
--
-- Apply only to an EMPTY database (staging or local). Production already has this
-- schema: never run this file there (it would fail on the existing tables).
--
-- Not included on purpose:
--   * public.rls_auto_enable() and its event trigger: created by the Supabase
--     platform on new projects, not by this app.
--   * realtime publication: production publishes no tables (realtime is off).

begin;

create table public.records (
  id               uuid        not null default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  type             text        not null,
  plate            text        not null,
  services         text[]               default '{}'::text[],
  price            integer     not null,
  seq_number       integer,
  customer_name    text                 default ''::text,
  payment_status   text                 default 'paid'::text,
  job_status       text                 default 'done'::text,
  payment_method   text                 default 'cash'::text,
  created_by       uuid,
  created_by_email text,
  updated_by_email text,
  updated_at       timestamptz,
  constraint records_pkey primary key (id),
  constraint records_created_by_fkey foreign key (created_by) references auth.users (id),
  constraint records_job_status_check check (job_status = any (array['pending'::text, 'done'::text])),
  constraint records_payment_status_check check (payment_status = any (array['paid'::text, 'unpaid'::text])),
  constraint records_type_check check (type = any (array['wash'::text, 'polish'::text]))
);

create table public.expenses (
  id               uuid        not null default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  title            text        not null,
  amount           integer     not null,
  note             text                 default ''::text,
  created_by       uuid,
  created_by_email text,
  updated_by_email text,
  updated_at       timestamptz,
  constraint expenses_pkey primary key (id),
  constraint expenses_created_by_fkey foreign key (created_by) references auth.users (id)
);

-- Row Level Security: any signed-in user, nobody else (replaced by app_members in M001/M002)
alter table public.records  enable row level security;
alter table public.expenses enable row level security;

create policy records_authenticated_all  on public.records  for all to authenticated using (true) with check (true);
create policy expenses_authenticated_all on public.expenses for all to authenticated using (true) with check (true);

revoke all on table public.records, public.expenses from anon;
revoke all on table public.records, public.expenses from authenticated;
grant select, insert, update, delete on table public.records, public.expenses to authenticated;

commit;
