-- Down for M010. Run M011's down first, and deploy an app version without the
-- customer directory before that.
--
-- Dropping these tables deletes the directory. It therefore REFUSES while any
-- customer exists: export the data first (Table Editor → Export), then delete the
-- rows on purpose (with the owner's approval) and run this again. No other table
-- is touched; records and expenses keep their plates and names.

begin;

do $$
begin
  if to_regclass('public.customers') is not null and exists (select 1 from public.customers) then
    raise exception using errcode = 'P0001',
      message = 'customers still has rows: export them and delete them on purpose before dropping the tables';
  end if;
end $$;

drop table if exists public.customer_vehicles;
drop table if exists public.customer_phones;
drop table if exists public.customers;

commit;
