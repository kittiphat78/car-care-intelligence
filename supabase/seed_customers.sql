-- Fake customer directory for LOCAL development / staging. NEVER run on production.
--
-- Not part of config.toml (CI does not load it), so the rollback test in CI still
-- runs on empty tables. Run it by hand after `supabase db reset`:
--   docker exec -i supabase_db_car-care-intelligence psql -U postgres -v ON_ERROR_STOP=1 < supabase/seed_customers.sql
--
-- Refuses unless the fake records of supabase/seed.sql are there (plates "ทดสอบ 0001"…),
-- which a production database never has, and unless the directory is empty.
-- Every name contains "ทดสอบ"; phone numbers are 080-000-00xx / 053-000-00x.
--
-- What it covers (docs/features/customer-directory.md):
--   * a dealer whose vehicles are the plates of its unpaid seed records (match by plate)
--   * a dealer with no vehicle whose name equals a seed customer_name (match by name)
--   * a landline number, a customer without any number, one with three numbers

do $$
declare
  dealer_a uuid := '00000000-0000-4000-8000-0000000c0001';
  dealer_b uuid := '00000000-0000-4000-8000-0000000c0002';
  person_c uuid := '00000000-0000-4000-8000-0000000c0003';
  no_phone uuid := '00000000-0000-4000-8000-0000000c0004';
  many     uuid := '00000000-0000-4000-8000-0000000c0005';
begin
  if (select count(*) from public.records where plate like 'ทดสอบ %') < 1000 then
    raise exception 'seed_customers.sql: the fake records of seed.sql are missing. Is this really a local or staging database?';
  end if;
  if exists (select 1 from public.customers) then
    raise exception 'seed_customers.sql: customers is not empty; run supabase db reset first';
  end if;

  insert into public.customers (id, name, note, created_by_email) values
    (dealer_a, 'ทดสอบ เต็นท์ ก', 'ข้อมูลทดสอบ · รถค้างชำระของเต็นท์ทดสอบ ก', 'seed@example.com'),
    (dealer_b, 'เต็นท์ทดสอบ ข', 'ข้อมูลทดสอบ · ชื่อตรงกับรายการ ไม่มีรถในสมุด', 'seed@example.com'),
    (person_c, 'ทดสอบ คุณซี', 'ข้อมูลทดสอบ · เบอร์บ้าน', 'seed@example.com'),
    (no_phone, 'ทดสอบ ไม่มีเบอร์', null, 'seed@example.com'),
    (many,     'ทดสอบ หลายเบอร์', null, 'seed@example.com');

  insert into public.customer_phones (customer_id, number, label, is_primary, position) values
    (dealer_a, '0800000001', 'เจ้าของ',     true,  0),
    (dealer_a, '0800000002', 'เซลส์ พี่เอ', false, 1),
    (dealer_b, '0800000003', null,          true,  0),
    (person_c, '053000001',  'บ้าน',        true,  0),
    (many,     '0800000004', 'มือถือ',      true,  0),
    (many,     '0800000005', 'ร้าน',        false, 1),
    (many,     '0800000006', null,          false, 2);

  -- Dealer A: up to 3 plates of its unpaid seed records
  insert into public.customer_vehicles (customer_id, plate, car_type, brand, position)
  select dealer_a, p.plate, 'pickup', 'toyota', (row_number() over (order by p.plate) - 1)::smallint
    from (select distinct r.plate
            from public.records r
           where r.customer_name = 'เต็นท์ทดสอบ ก' and r.payment_status = 'unpaid'
           order by r.plate
           limit 3) p;

  insert into public.customer_vehicles (customer_id, plate, car_type, brand, color, position) values
    (person_c, 'ทดสอบ 0150', 'sedan', 'honda', 'ขาว', 0),
    (no_phone, '9กข 9999',   null,    null,    null,  0);
end $$;

select (select count(*) from public.customers)         as customers,
       (select count(*) from public.customer_phones)   as phones,
       (select count(*) from public.customer_vehicles) as vehicles;
