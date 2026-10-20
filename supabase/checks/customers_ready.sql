-- READ ONLY · Is this database ready for v2.2.0 (customer directory, M010-M014)?
-- Run in the SQL Editor after the migrations (production: instead of the test file,
-- which writes and rolls back). Changes nothing. Every row must say true; the last row
-- is "ALL READY" = true.

with checks(name, ok) as (
  values
    -- M010 · tables, row level security, no access for anon
    ('M010 table customers',                 to_regclass('public.customers') is not null),
    ('M010 table customer_phones',           to_regclass('public.customer_phones') is not null),
    ('M010 table customer_vehicles',         to_regclass('public.customer_vehicles') is not null),
    ('M010 RLS on all three tables',         coalesce((select bool_and(c.relrowsecurity) and count(*) = 3
                                                         from pg_class c join pg_namespace n on n.oid = c.relnamespace
                                                        where n.nspname = 'public'
                                                          and c.relname in ('customers', 'customer_phones', 'customer_vehicles')), false)),
    ('M010 a member policy on each table',   (select count(distinct tablename) = 3 from pg_policies
                                               where schemaname = 'public' and tablename in ('customers', 'customer_phones', 'customer_vehicles'))),
    ('M010 anon cannot read customers',      case when to_regclass('public.customers') is null then false
                                                  else not has_table_privilege('anon', 'public.customers', 'select') end),
    ('M010 anon cannot read phone numbers',  case when to_regclass('public.customer_phones') is null then false
                                                  else not has_table_privilege('anon', 'public.customer_phones', 'select') end),
    ('M010 audit trigger on customers',      exists (select 1 from pg_trigger t
                                                      where t.tgrelid = to_regclass('public.customers') and not t.tgisinternal)),
    -- M011/M012 · plates
    ('M012 column plate_key',                exists (select 1 from information_schema.columns
                                                      where table_schema = 'public' and table_name = 'customer_vehicles' and column_name = 'plate_key')),
    ('M012 column plate_core',               exists (select 1 from information_schema.columns
                                                      where table_schema = 'public' and table_name = 'customer_vehicles' and column_name = 'plate_core')),
    ('M012 one full plate per customer',     exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'customer_vehicles_plate_core_key')),
    ('M012 old unique plate_key index gone', not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'customer_vehicles_plate_key_key')),
    -- M013 · vehicle model
    ('M013 column model',                    exists (select 1 from information_schema.columns
                                                      where table_schema = 'public' and table_name = 'customer_vehicles' and column_name = 'model')),
    -- save_customer (latest version: M013)
    ('M011 function save_customer',          to_regprocedure('public.save_customer(uuid,timestamptz,text,text,jsonb,jsonb,text[],uuid)') is not null),
    ('M013 save_customer stores the model',  coalesce((select p.prosrc like '%''model''%' from pg_proc p
                                                        where p.oid = to_regprocedure('public.save_customer(uuid,timestamptz,text,text,jsonb,jsonb,text[],uuid)')), false)),
    ('M011 anon cannot run save_customer',   case when to_regprocedure('public.save_customer(uuid,timestamptz,text,text,jsonb,jsonb,text[],uuid)') is null then false
                                                  else not has_function_privilege('anon', 'public.save_customer(uuid,timestamptz,text,text,jsonb,jsonb,text[],uuid)', 'execute') end),
    ('M011 members can run save_customer',   case when to_regprocedure('public.save_customer(uuid,timestamptz,text,text,jsonb,jsonb,text[],uuid)') is null then false
                                                  else has_function_privilege('authenticated', 'public.save_customer(uuid,timestamptz,text,text,jsonb,jsonb,text[],uuid)', 'execute') end),
    -- M014 · customer history
    ('M014 function customer_history',       to_regprocedure('public.customer_history(uuid,integer)') is not null),
    ('M014 anon cannot run customer_history', case when to_regprocedure('public.customer_history(uuid,integer)') is null then false
                                                   else not has_function_privilege('anon', 'public.customer_history(uuid,integer)', 'execute') end),
    ('M014 members can run customer_history', case when to_regprocedure('public.customer_history(uuid,integer)') is null then false
                                                   else has_function_privilege('authenticated', 'public.customer_history(uuid,integer)', 'execute') end),
    -- Untouched by v2.2.0
    ('records still has no customer_id',     not exists (select 1 from information_schema.columns
                                                          where table_schema = 'public' and table_name = 'records' and column_name = 'customer_id'))
)
select name as check_name, ok from checks
union all
select 'ALL READY', bool_and(ok) from checks;
