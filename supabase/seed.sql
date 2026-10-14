-- Fake data for staging / local development. NEVER run on production.
--
-- Refuses to run unless both tables are empty. Every value is invented:
-- plates start with "ทดสอบ", customers are "เต็นท์ทดสอบ …", e-mail is example.com.
--
-- What it covers:
--   * 3 income records a day for the last 420 Bangkok days (~1,263 rows), so the
--     "last year" and "whole year" lists pass 1,000 rows (ER-02 pagination)
--   * early-morning records at 00:30 (Mondays) and 06:45 (Fridays) (ER-01, ER-10)
--   * unpaid records for two named customers and the unnamed general customer
--     over the last 20 days (debts / "เคลียร์ยอด")
--   * repeated plates (visit count) and one expense every 3 days

begin;

do $$
begin
  if exists (select 1 from public.records) or exists (select 1 from public.expenses) then
    raise exception 'seed.sql: records/expenses are not empty, refusing to add fake data';
  end if;
end
$$;

with today as (
  select (now() at time zone 'Asia/Bangkok')::date as d
),
slots as (
  select
    day::date as day,
    n,
    (t.d - day::date) as age,
    extract(isodow from day)::int as dow
  from today t,
       generate_series(t.d - 420, t.d, interval '1 day') as day,
       generate_series(1, 3) as n
)
insert into public.records (
  created_at, type, plate, services, price, seq_number,
  customer_name, payment_status, job_status, payment_method, created_by_email
)
select
  ((day + case
            when n = 1 and dow = 1 then time '00:30'
            when n = 1 and dow = 5 then time '06:45'
            else time '08:00' + make_interval(hours => n * 3, mins => (age * 7 + n * 13) % 60)
          end) at time zone 'Asia/Bangkok'),
  case when (age + n) % 5 = 0 then 'polish' else 'wash' end,
  'ทดสอบ ' || lpad(((age * 3 + n) % 150 + 1)::text, 4, '0'),
  array[
    (array['รถเก๋ง', 'SUV / MPV', 'รถกระบะ', 'รถตู้ / VIP', 'มอเตอร์ไซค์'])[(age + n) % 5 + 1],
    (array['TOYOTA', 'HONDA', 'ISUZU', ''])[(age + n) % 4 + 1],
    ''
  ],
  case when (age + n) % 5 = 0 then (array[1500, 2500, 3500])[n] else (array[150, 200, 250])[n] end,
  n,
  case n when 1 then '' when 2 then 'เต็นท์ทดสอบ ก' else case when age % 2 = 0 then 'เต็นท์ทดสอบ ข' else '' end end,
  case when age < 20 and (n = 2 or (n = 3 and age % 2 = 0) or (n = 1 and age % 4 = 0)) then 'unpaid' else 'paid' end,
  'done',
  'cash',
  'seed@example.com'
from slots;

with today as (
  select (now() at time zone 'Asia/Bangkok')::date as d
)
insert into public.expenses (created_at, title, amount, note, created_by_email)
select
  ((day::date + time '18:00') at time zone 'Asia/Bangkok'),
  (array['น้ำยาล้างรถ (ทดสอบ)', 'ค่าไฟ (ทดสอบ)', 'ผ้าไมโครไฟเบอร์ (ทดสอบ)', 'ค่าน้ำ (ทดสอบ)'])[(t.d - day::date) % 4 + 1],
  (array[350, 1200, 480, 600])[(t.d - day::date) % 4 + 1],
  '',
  'seed@example.com'
from today t,
     generate_series(t.d - 420, t.d, interval '3 days') as day;

commit;

-- Check: expected about 1263 records, 141 expenses, and unpaid rows for 3 customers
select
  (select count(*) from public.records)                                  as records,
  (select count(*) from public.expenses)                                 as expenses,
  (select count(*) from public.records where payment_status = 'unpaid') as unpaid,
  (select count(distinct customer_name) from public.records where payment_status = 'unpaid') as unpaid_customers;
