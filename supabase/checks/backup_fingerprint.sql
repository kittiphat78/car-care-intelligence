-- Backup fingerprint · READ-ONLY · run in the SQL Editor of PRODUCTION
--
-- Totals and a hash of every id. Run it again on the restored copy in staging
-- (supabase/checks/restore_drill.sql, step 3) and every column must be equal.
-- No customer data in the result.

select
  (select count(*)                                       from public.records)  as records,
  (select coalesce(sum(price), 0)                        from public.records)  as records_price_sum,
  (select count(*) filter (where payment_status = 'unpaid') from public.records) as records_unpaid,
  (select min(created_at)::date || ' … ' || max(created_at)::date from public.records) as records_dates,
  (select md5(string_agg(id::text, ',' order by id))     from public.records)  as records_id_hash,
  (select count(*)                                       from public.expenses) as expenses,
  (select coalesce(sum(amount), 0)                       from public.expenses) as expenses_amount_sum,
  (select md5(string_agg(id::text, ',' order by id))     from public.expenses) as expenses_id_hash;
