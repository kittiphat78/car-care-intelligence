-- Down for M004. Drops the column and any ids already saved in it.

begin;

drop index if exists public.records_client_request_id_key;
drop index if exists public.expenses_client_request_id_key;

alter table public.records  drop column if exists client_request_id;
alter table public.expenses drop column if exists client_request_id;

commit;
