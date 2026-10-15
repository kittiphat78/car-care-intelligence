-- M004 · client_request_id: one id per "save" so a retried save cannot create a duplicate (ADR-07)
--
-- Purpose:  the app will send a fresh uuid per save and re-send the same one on
--           retry (B5); a second insert with the same id then fails as a duplicate
--           instead of adding a second row.
-- Down:     supabase/rollback/20261015120100_client_request_id.down.sql
-- Compatible with client v1.0.x: yes (nullable column the old client never sends;
--           the unique index ignores NULLs).

begin;

alter table public.records  add column if not exists client_request_id uuid;
alter table public.expenses add column if not exists client_request_id uuid;

create unique index if not exists records_client_request_id_key
  on public.records (client_request_id)
  where client_request_id is not null;

create unique index if not exists expenses_client_request_id_key
  on public.expenses (client_request_id)
  where client_request_id is not null;

commit;
