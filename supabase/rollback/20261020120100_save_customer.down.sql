-- Down for M011. Deploy an app version that does not save customers first.

begin;

drop function if exists public.save_customer(uuid, timestamptz, text, text, jsonb, jsonb, text[], uuid);

commit;
