-- M010 · Customer directory: customers, their phone numbers and their vehicles
--
-- Purpose:  the shop keeps a list of customers (name, note) with several phone
--           numbers and several vehicles each, so it can call them and recognise
--           a plate (docs/features/customer-directory.md §4).
-- Data:     new, empty tables. records / expenses are not touched; records are
--           matched to customers by plate_key, never by a foreign key (ADR-21).
-- Privacy:  phone numbers are personal data (PDPA). Shop members only (RLS, as M002),
--           nothing for anon, and deleting a customer deletes its phones and
--           vehicles (on delete cascade).
-- Down:     supabase/rollback/20261020120000_customers.down.sql (refuses while any
--           customer exists, so it can never drop real data by accident)
-- Compatible with client v2.1.x: yes (new tables the current app does not use).

begin;

create table if not exists public.customers (
  id                uuid        primary key default gen_random_uuid(),
  name              text        not null,
  note              text,
  created_at        timestamptz not null default now(),
  created_by        uuid,
  created_by_email  text,
  updated_at        timestamptz,
  updated_by_email  text,
  client_request_id uuid,
  constraint customers_name_len_chk check (char_length(btrim(name)) between 1 and 50 and name = btrim(name)),
  constraint customers_note_len_chk check (note is null or char_length(note) <= 200)
);

-- One id per save from the app (as M004): a retried save returns the same customer
create unique index if not exists customers_client_request_id_key
  on public.customers (client_request_id)
  where client_request_id is not null;

create table if not exists public.customer_phones (
  id          uuid     primary key default gen_random_uuid(),
  customer_id uuid     not null references public.customers (id) on delete cascade,
  -- Digits only, Thai numbers: mobile 06/08/09 + 8 digits, landline 02-05/07 + 7 digits
  number      text     not null,
  label       text,
  is_primary  boolean  not null default false,
  position    smallint not null default 0,
  constraint customer_phones_number_chk check (number ~ '^0([689][0-9]{8}|[2-57][0-9]{7})$'),
  constraint customer_phones_label_len_chk check (label is null or char_length(label) <= 30),
  constraint customer_phones_customer_number_key unique (customer_id, number)
);

-- At most one main number per customer
create unique index if not exists customer_phones_one_primary
  on public.customer_phones (customer_id)
  where is_primary;

create table if not exists public.customer_vehicles (
  id          uuid     primary key default gen_random_uuid(),
  customer_id uuid     not null references public.customers (id) on delete cascade,
  -- As typed, trimmed and upper case (the same as records.plate)
  plate       text     not null,
  -- For search and matching: no spaces, dots or dashes. Generated, so the app cannot
  -- store a key that disagrees with the plate (ADR-22). features/customers/logic.ts
  -- plateKey() must give the same result.
  plate_key   text     generated always as (upper(regexp_replace(plate, '[[:space:].-]', '', 'g'))) stored,
  -- Ids from CAR_TYPES / CAR_BRANDS in types/index.ts (e.g. 'sedan', 'toyota')
  car_type    text,
  brand       text,
  color       text,
  note        text,
  position    smallint not null default 0,
  constraint customer_vehicles_plate_chk check (char_length(plate) between 1 and 20 and plate = upper(btrim(plate))),
  constraint customer_vehicles_plate_key_chk check (char_length(plate_key) >= 1),
  constraint customer_vehicles_car_type_len_chk check (car_type is null or char_length(car_type) <= 20),
  constraint customer_vehicles_brand_len_chk check (brand is null or char_length(brand) <= 20),
  constraint customer_vehicles_color_len_chk check (color is null or char_length(color) <= 30),
  constraint customer_vehicles_note_len_chk check (note is null or char_length(note) <= 200)
);

-- One plate belongs to one customer (a dealer's cars change hands: the app moves it)
create unique index if not exists customer_vehicles_plate_key_key
  on public.customer_vehicles (plate_key);

create index if not exists customer_phones_customer_idx   on public.customer_phones (customer_id);
create index if not exists customer_vehicles_customer_idx on public.customer_vehicles (customer_id);

-- Who added / last changed a customer comes from the session (as M005). Phones and
-- vehicles are only changed through save_customer (M011), which also updates the
-- customer row, so the customer's updated_at covers them.
drop trigger if exists customers_audit on public.customers;
create trigger customers_audit
  before insert or update on public.customers
  for each row execute function public.tg_set_audit();

-- Shop members only (as M002)
alter table public.customers         enable row level security;
alter table public.customer_phones   enable row level security;
alter table public.customer_vehicles enable row level security;

revoke all on table public.customers, public.customer_phones, public.customer_vehicles from anon;
revoke truncate, references, trigger on table public.customers, public.customer_phones, public.customer_vehicles from authenticated;
grant select, insert, update, delete on table public.customers, public.customer_phones, public.customer_vehicles to authenticated;

drop policy if exists customers_member_all         on public.customers;
drop policy if exists customer_phones_member_all   on public.customer_phones;
drop policy if exists customer_vehicles_member_all on public.customer_vehicles;

create policy customers_member_all on public.customers
  for all to authenticated
  using ((select public.is_app_member()))
  with check ((select public.is_app_member()));

create policy customer_phones_member_all on public.customer_phones
  for all to authenticated
  using ((select public.is_app_member()))
  with check ((select public.is_app_member()));

create policy customer_vehicles_member_all on public.customer_vehicles
  for all to authenticated
  using ((select public.is_app_member()))
  with check ((select public.is_app_member()));

commit;

-- Verification (run separately): supabase/tests/customers.test.sql
-- must end with "ALL CUSTOMER TESTS PASSED".
