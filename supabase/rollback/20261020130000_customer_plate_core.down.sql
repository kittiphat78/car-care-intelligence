-- Down for M012: back to M010/M011 (whole plate_key unique, save_customer of M011).
-- REFUSES while two vehicles share a plate_key (e.g. "1234" on two customers): the
-- unique index of M010 could not be created again. Fix or remove those rows on purpose
-- first (with the owner's approval).

begin;

do $$
begin
  if exists (select 1 from public.customer_vehicles group by plate_key having count(*) > 1) then
    raise exception using errcode = 'P0001',
      message = 'two vehicles share a plate_key: resolve them before going back to a unique plate_key';
  end if;
end $$;

create or replace function public.save_customer(
  p_id                  uuid,
  p_expected_updated_at timestamptz,
  p_name                text,
  p_note                text,
  p_phones              jsonb,
  p_vehicles            jsonb,
  p_move_plates         text[] default '{}',
  p_client_request_id   uuid   default null
)
  returns table (id uuid, updated_at timestamptz)
  language plpgsql
  volatile
  security invoker
  set search_path = ''
as $$
declare
  v_id      uuid;
  v_phones  jsonb := coalesce(p_phones, '[]'::jsonb);
  v_cars    jsonb := coalesce(p_vehicles, '[]'::jsonb);
  v_moves   text[] := coalesce(p_move_plates, '{}');
begin
  if jsonb_typeof(v_phones) <> 'array' or jsonb_typeof(v_cars) <> 'array' then
    raise exception using errcode = 'CC422', message = 'phones and vehicles must be arrays';
  end if;
  if jsonb_array_length(v_phones) > 20 or jsonb_array_length(v_cars) > 50 then
    raise exception using errcode = 'CC422', message = 'too many phones or vehicles';
  end if;

  -- The same number or plate twice in one save
  -- (count(expr) skips nulls: a missing value is left to the NOT NULL / CHECK rules)
  if (select count(x.value ->> 'number') <> count(distinct x.value ->> 'number') from jsonb_array_elements(v_phones) x) then
    raise exception using errcode = 'CC422', message = 'a phone number appears twice';
  end if;
  if (select count(x.value ->> 'plate') <> count(distinct upper(regexp_replace(upper(btrim(x.value ->> 'plate')), '[[:space:].-]', '', 'g')))
        from jsonb_array_elements(v_cars) x) then
    raise exception using errcode = 'CC422', message = 'a plate appears twice';
  end if;

  -- 1 · The customer row
  if p_id is null then
    if p_client_request_id is not null then
      select c.id into v_id from public.customers c where c.client_request_id = p_client_request_id;
      if v_id is not null then
        -- Saved already by an earlier attempt with the same request id
        return query select c.id, c.updated_at from public.customers c where c.id = v_id;
        return;
      end if;
    end if;
    insert into public.customers (name, note, client_request_id)
    values (btrim(coalesce(p_name, '')), nullif(btrim(coalesce(p_note, '')), ''), p_client_request_id)
    returning customers.id into v_id;
  else
    update public.customers c
       set name = btrim(coalesce(p_name, '')),
           note = nullif(btrim(coalesce(p_note, '')), '')
     where c.id = p_id
       and c.updated_at is not distinct from p_expected_updated_at
    returning c.id into v_id;
    if v_id is null then
      if exists (select 1 from public.customers c where c.id = p_id) then
        raise exception using errcode = 'CC409', message = 'customer changed since it was loaded';
      end if;
      raise exception using errcode = 'CC404', message = 'customer not found';
    end if;
  end if;

  -- 2 · Plates that belong to someone else: refused unless the user agreed to move them
  if exists (
    select 1
      from jsonb_array_elements(v_cars) x
      join public.customer_vehicles v
        on v.plate_key = upper(regexp_replace(upper(btrim(x.value ->> 'plate')), '[[:space:].-]', '', 'g'))
     where v.customer_id <> v_id
       and not (v.plate_key = any (v_moves))
  ) then
    raise exception using errcode = 'CCPLT', message = 'a plate belongs to another customer';
  end if;

  -- Moved plates leave their previous customer, whose updated_at then changes too
  update public.customers c
     set name = c.name
   where c.id <> v_id
     and c.id in (select v.customer_id from public.customer_vehicles v where v.plate_key = any (v_moves));
  delete from public.customer_vehicles v
   where v.plate_key = any (v_moves)
     and v.customer_id <> v_id;

  -- 3 · Phones and vehicles: the saved list replaces the old one
  delete from public.customer_phones   p where p.customer_id = v_id;
  delete from public.customer_vehicles v where v.customer_id = v_id;

  insert into public.customer_phones (customer_id, number, label, is_primary, position)
  select v_id,
         x.value ->> 'number',
         nullif(btrim(coalesce(x.value ->> 'label', '')), ''),
         -- One main number: the one marked, or the first when none is marked
         case
           when exists (select 1 from jsonb_array_elements(v_phones) y where (y.value ->> 'is_primary')::boolean)
             then x.ordinality = (select min(z.ordinality) from jsonb_array_elements(v_phones) with ordinality z
                                   where (z.value ->> 'is_primary')::boolean)
           else x.ordinality = 1
         end,
         (x.ordinality - 1)::smallint
    from jsonb_array_elements(v_phones) with ordinality x;

  insert into public.customer_vehicles (customer_id, plate, car_type, brand, color, note, position)
  select v_id,
         upper(btrim(coalesce(x.value ->> 'plate', ''))),
         nullif(btrim(coalesce(x.value ->> 'car_type', '')), ''),
         nullif(btrim(coalesce(x.value ->> 'brand', '')), ''),
         nullif(btrim(coalesce(x.value ->> 'color', '')), ''),
         nullif(btrim(coalesce(x.value ->> 'note', '')), ''),
         (x.ordinality - 1)::smallint
    from jsonb_array_elements(v_cars) with ordinality x;

  return query select c.id, c.updated_at from public.customers c where c.id = v_id;
end;
$$;

revoke all on function public.save_customer(uuid, timestamptz, text, text, jsonb, jsonb, text[], uuid) from public, anon;
grant execute on function public.save_customer(uuid, timestamptz, text, text, jsonb, jsonb, text[], uuid) to authenticated;

drop index if exists public.customer_vehicles_plate_key_idx;
drop index if exists public.customer_vehicles_plate_core_idx;
drop index if exists public.customer_vehicles_plate_core_key;
alter table public.customer_vehicles drop column if exists plate_core;
create unique index if not exists customer_vehicles_plate_key_key on public.customer_vehicles (plate_key);

commit;
