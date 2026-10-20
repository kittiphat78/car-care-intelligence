-- Tests for M010 (customer tables, RLS), M011/M012 (save_customer, plate_core), M013 (vehicle model)
-- and M014 (customer_history).
-- Runs in CI, locally or in the SQL Editor of STAGING; every change is rolled back.
-- Result must be "ALL CUSTOMER TESTS PASSED". Needs at least one member (ci_fixtures.sql).
-- Test data: names start with "ทดสอบ", phone numbers 080-000-00xx.

do $$
declare
  member_id uuid := (select user_id from public.app_members limit 1);
  a uuid; b uuid; c uuid; again uuid;
  a_updated timestamptz; b_updated timestamptz;
  records_before bigint := (select count(*) from public.records);
  res record;
  n bigint;
  h uuid; h0 record; h1 record;
begin
  assert member_id is not null, 'setup: app_members is empty';

  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', member_id, 'role', 'authenticated', 'email', 'customers@example.com')::text, true);
    set local role authenticated;

    -- 1 · A new customer with 2 phones and 2 vehicles, saved at once
    select * into res from public.save_customer(
      null, null, '  ทดสอบ เต็นท์ A  ', '  ส่งรถวันจันทร์ ',
      '[{"number":"0800000001","label":"เจ้าของ"},{"number":"0800000002","label":"เซลส์ พี่เอ","is_primary":true}]',
      '[{"plate":" 1กข 1234 ","car_type":"pickup","brand":"toyota","model":" Hilux Revo ","color":"ขาว"},{"plate":"2ขค-5678"}]',
      '{}', '00000000-0000-4000-8000-00000000c001');
    a := res.id;
    assert a is not null, 'save_customer returned no id';
    assert res.updated_at is null, 'a new customer already has updated_at';
    assert (select name from public.customers where id = a) = 'ทดสอบ เต็นท์ A', 'name was not trimmed';
    assert (select note from public.customers where id = a) = 'ส่งรถวันจันทร์', 'note was not trimmed';
    assert (select created_by_email from public.customers where id = a) = 'customers@example.com', 'created_by_email is not from the session';
    assert (select count(*) from public.customer_phones where customer_id = a) = 2, 'phones were not saved';
    assert (select number from public.customer_phones where customer_id = a and is_primary) = '0800000002', 'the marked main number was not kept';
    assert (select string_agg(plate || '=' || plate_key || '=' || plate_core, ',' order by position) from public.customer_vehicles where customer_id = a)
           = '1กข 1234=1กข1234=1กข1234,2ขค-5678=2ขค5678=2ขค5678', 'plate, plate_key or plate_core is wrong';
    assert (select car_type || '/' || brand || '/' || model || '/' || color from public.customer_vehicles where customer_id = a and position = 0) = 'pickup/toyota/Hilux Revo/ขาว', 'vehicle details (model trimmed) were not saved';
    assert (select model from public.customer_vehicles where customer_id = a and position = 1) is null, 'an empty model is not null';

    -- 2 · Saving again with the same request id returns the same customer (no duplicate)
    select id into again from public.save_customer(null, null, 'ทดสอบ เต็นท์ A', null, '[]', '[]', '{}', '00000000-0000-4000-8000-00000000c001');
    assert again = a, 'a retried save made a second customer';
    assert (select count(*) from public.customers where name = 'ทดสอบ เต็นท์ A') = 1, 'a retried save made a second customer';
    assert (select count(*) from public.customer_phones where customer_id = a) = 2, 'a retried save changed the phones';

    -- 3 · Main number: the first one when none is marked; only the first when several are
    select id into b from public.save_customer(null, null, 'ทดสอบ คุณบี', null,
      '[{"number":"0800000011"},{"number":"053123456"}]', '[{"plate":"3คง 9999"}]');
    assert (select number from public.customer_phones where customer_id = b and is_primary) = '0800000011', 'no main number was chosen';
    begin
      insert into public.customer_phones (customer_id, number, is_primary) values (b, '0800000012', true);
      raise exception 'a second main number was accepted';
    exception when unique_violation then null;
    end;

    -- 4 · Rules of M010
    begin
      perform public.save_customer(null, null, '   ', null, '[]', '[]');
      raise exception 'an empty name was accepted';
    exception when check_violation then null;
    end;
    begin
      perform public.save_customer(null, null, repeat('ก', 51), null, '[]', '[]');
      raise exception 'a 51-character name was accepted';
    exception when check_violation then null;
    end;
    begin
      perform public.save_customer(null, null, 'ทดสอบ', repeat('ก', 201), '[]', '[]');
      raise exception 'a 201-character note was accepted';
    exception when check_violation then null;
    end;
    declare bad text;
    begin
      foreach bad in array array['12345', '0812345678 ', '1812345678', '081234567', '08123456789', '0612-34567', '0112345678'] loop
        begin
          perform public.save_customer(null, null, 'ทดสอบ เบอร์ผิด', null, jsonb_build_array(jsonb_build_object('number', bad)), '[]');
          raise exception 'phone % was accepted', bad;
        exception when check_violation then null;
        end;
      end loop;
    end;
    begin
      perform public.save_customer(null, null, 'ทดสอบ', null, jsonb_build_array(jsonb_build_object('number', '0800000021', 'label', repeat('ก', 31))), '[]');
      raise exception 'a 31-character phone label was accepted';
    exception when check_violation then null;
    end;
    begin
      perform public.save_customer(null, null, 'ทดสอบ', null, '[]', jsonb_build_array(jsonb_build_object('plate', repeat('ก', 21))));
      raise exception 'a 21-character plate was accepted';
    exception when check_violation then null;
    end;
    begin
      perform public.save_customer(null, null, 'ทดสอบ', null, '[]', jsonb_build_array(jsonb_build_object('plate', '9ฮฮ 9999', 'model', repeat('ก', 31))));
      raise exception 'a 31-character model was accepted';
    exception when check_violation then null;
    end;
    begin
      perform public.save_customer(null, null, 'ทดสอบ', null, '[]', '[{"plate":"   "}]');
      raise exception 'an empty plate was accepted';
    exception when check_violation then null;
    end;

    -- 5 · The same number or plate twice in one save (plates compared without spaces/dashes/dots)
    begin
      perform public.save_customer(null, null, 'ทดสอบ ซ้ำ', null, '[{"number":"0800000031"},{"number":"0800000031"}]', '[]');
      raise exception 'the same number twice was accepted';
    exception when sqlstate 'CC422' then null;
    end;
    begin
      perform public.save_customer(null, null, 'ทดสอบ ซ้ำ', null, '[]', '[{"plate":"4จฉ 1111"},{"plate":"4จฉ-1111"}]');
      raise exception 'the same plate twice was accepted';
    exception when sqlstate 'CC422' then null;
    end;
    begin
      -- The same plate with and without the province at the end
      perform public.save_customer(null, null, 'ทดสอบ ซ้ำ', null, '[]', '[{"plate":"4จฉ 1111"},{"plate":"4จฉ1111ชร."}]');
      raise exception 'the same plate with a province was accepted twice';
    exception when sqlstate 'CC422' then null;
    end;
    begin
      perform public.save_customer(null, null, 'ทดสอบ', null, '{"number":"0800000041"}', '[]');
      raise exception 'phones as an object was accepted';
    exception when sqlstate 'CC422' then null;
    end;

    -- 6 · A full plate of another customer (also when typed with its province):
    --     refused, then moved when the user agrees
    begin
      perform public.save_customer(null, null, 'ทดสอบ คุณซี', null, '[]', '[{"plate":"2ขค 5678"}]');
      raise exception 'a plate of another customer was accepted';
    exception when sqlstate 'CCPLT' then null;
    end;
    begin
      perform public.save_customer(null, null, 'ทดสอบ คุณซี', null, '[]', '[{"plate":"2ขค5678 เชียงราย"}]');
      raise exception 'a plate of another customer with a province was accepted';
    exception when sqlstate 'CCPLT' then null;
    end;
    assert not exists (select 1 from public.customers where name = 'ทดสอบ คุณซี'), 'a refused save left a customer behind';
    -- A move list naming a plate that is not in the save moves nothing
    select id into c from public.save_customer(null, null, 'ทดสอบ คุณดี', null, '[]', '[{"plate":"6ฌญ 3333"}]', array['1กข1234']);
    assert (select count(*) from public.customer_vehicles where customer_id = a) = 2, 'a plate not in the save was moved';
    delete from public.customers where id = c;
    select id into c from public.save_customer(null, null, 'ทดสอบ คุณซี', null, '[]', '[{"plate":"2ขค.5678ชร."}]', array['2ขค5678']);
    assert (select customer_id from public.customer_vehicles where plate_core = '2ขค5678') = c, 'the plate was not moved';
    assert (select count(*) from public.customer_vehicles where customer_id = a) = 1, 'the plate is still with its previous customer';
    assert (select updated_at from public.customers where id = a) is not null, 'the previous customer was not marked as changed';

    -- 6b · A plate typed as digits only may belong to several customers (different cars, same number)
    perform public.save_customer(null, null, 'ทดสอบ เลขล้วน 1', null, '[]', '[{"plate":"7777"}]');
    perform public.save_customer(null, null, 'ทดสอบ เลขล้วน 2', null, '[]', '[{"plate":"7777"}]');
    assert (select count(*) from public.customer_vehicles where plate_core = '7777') = 2, 'a digits-only plate was limited to one customer';

    -- 7 · Editing checks updated_at (ADR-07)
    a_updated := (select updated_at from public.customers where id = a);
    select * into res from public.save_customer(a, a_updated, 'ทดสอบ เต็นท์ A (แก้)', null,
      '[{"number":"0800000001","label":"เจ้าของ","is_primary":true}]', '[{"plate":"1กข 1234"}]');
    assert res.id = a and res.updated_at is not null and res.updated_at >= a_updated, 'the edit did not save';
    assert (select count(*) from public.customer_phones where customer_id = a) = 1, 'the edit did not replace the phones';
    assert (select updated_by_email from public.customers where id = a) = 'customers@example.com', 'updated_by_email is not from the session';
    begin
      perform public.save_customer(a, a_updated - interval '1 minute', 'ทดสอบ เก่า', null, '[]', '[]');
      raise exception 'an edit based on an old copy was accepted';
    exception when sqlstate 'CC409' then null;
    end;
    begin
      perform public.save_customer(gen_random_uuid(), null, 'ทดสอบ ไม่มี', null, '[]', '[]');
      raise exception 'an edit of a missing customer was accepted';
    exception when sqlstate 'CC404' then null;
    end;

    -- 8 · A save that fails part-way leaves nothing behind
    begin
      perform public.save_customer(null, null, 'ทดสอบ ครึ่งทาง', null,
        '[{"number":"0800000051"},{"number":"999"}]', '[{"plate":"5ชซ 2222"}]');
      raise exception 'an invalid second phone was accepted';
    exception when check_violation then null;
    end;
    assert not exists (select 1 from public.customers where name = 'ทดสอบ ครึ่งทาง'), 'a failed save left the customer behind';
    assert not exists (select 1 from public.customer_phones where number = '0800000051'), 'a failed save left a phone behind';
    assert not exists (select 1 from public.customer_vehicles where plate_key = '5ชซ2222'), 'a failed save left a vehicle behind';

    -- 9 · Delete removes phones and vehicles, and nothing in records
    delete from public.customers where id = b;
    assert not exists (select 1 from public.customer_phones where customer_id = b), 'phones of a deleted customer remain';
    assert not exists (select 1 from public.customer_vehicles where customer_id = b), 'vehicles of a deleted customer remain';
    assert (select count(*) from public.records) = records_before, 'deleting a customer changed records';

    -- 9b · customer_history (M014): the records of the customer's cars and name. Compared
    -- with the result before adding records, so records already in the database (seed,
    -- staging) do not matter; the new ones are dated far ahead so they are the latest.
    select id into h from public.save_customer(null, null, 'ทดสอบ ประวัติ M014', null, '[]', '[{"plate":"ฮฮ 4321"},{"plate":"8765"}]');
    select * into h0 from public.customer_history(h, 10);
    insert into public.records (type, plate, price, payment_status, job_status, customer_name, created_at) values
      ('wash', 'ฮฮ-4321 ชร.', 100, 'paid',   'done', '',                      now() + interval '100 years'),          -- same full plate, with a province
      ('wash', '4321',        200, 'unpaid', 'done', '',                      now() + interval '100 years 1 day'),    -- digits only: the numbers of ฮฮ 4321
      ('wash', 'กข 8765',     300, 'paid',   'done', '',                      now() + interval '100 years 2 days'),   -- a full plate; the car 8765 is digits only
      ('wash', 'ZZ1',          50, 'unpaid', 'done', ' ทดสอบ  ประวัติ m014 ', now() + interval '100 years 3 days'),  -- the same name
      ('wash', '1ฮฮ 4321',    999, 'paid',   'done', '',                      now() + interval '100 years 4 days'),   -- another full plate with the same numbers
      ('wash', '21',          999, 'paid',   'done', '',                      now() + interval '100 years 5 days');   -- too few digits to match
    select * into h1 from public.customer_history(h, 2);
    assert h1.visits - h0.visits = 4, format('customer_history counted %s new records, not 4', h1.visits - h0.visits);
    assert h1.total - h0.total = 650, 'customer_history total is wrong';
    assert h1.unpaid_total - h0.unpaid_total = 250 and h1.unpaid_count - h0.unpaid_count = 2, 'customer_history unpaid is wrong';
    assert h1.digits_only - h0.digits_only = 2, 'matches by digits only are not reported';
    assert jsonb_array_length(h1.recent) = 2, 'p_limit is not applied';
    assert h1.recent -> 0 ->> 'plate' = 'ZZ1' and h1.recent -> 1 ->> 'plate' = 'กข 8765', 'recent records are not newest first';
    assert (h1.recent -> 0 ->> 'sure')::boolean and not (h1.recent -> 1 ->> 'sure')::boolean, 'the sure flag is wrong';
    assert not (h1.recent -> 0 ? 'core') and not (h1.recent -> 0 ? 'name_key'), 'helper columns are returned';
    assert h1.last_visit = (h1.recent -> 0 ->> 'created_at')::timestamptz, 'last_visit is not the newest record';
    reset role;

    -- 10 · A signed-in non-member sees and changes nothing
    perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    set local role authenticated;
    assert (select visits from public.customer_history(h)) = 0, 'a non-member sees the history of a customer';
    assert (select count(*) from public.customers) = 0, 'a non-member can see customers';
    assert (select count(*) from public.customer_phones) = 0, 'a non-member can see phone numbers';
    assert (select count(*) from public.customer_vehicles) = 0, 'a non-member can see vehicles';
    begin
      perform public.save_customer(null, null, 'ทดสอบ คนนอก', null, '[]', '[]');
      raise exception 'a non-member saved a customer';
    exception when insufficient_privilege then null;
    end;
    update public.customers set name = 'ทดสอบ แก้โดยคนนอก' where id = a;
    get diagnostics n = row_count;
    assert n = 0, 'a non-member changed a customer';
    delete from public.customer_phones where customer_id = a;
    get diagnostics n = row_count;
    assert n = 0, 'a non-member deleted a phone';
    reset role;
    assert (select count(*) from public.customer_phones where customer_id = a) = 1, 'a non-member deleted a phone';

    -- 11 · Not signed in: no access at all
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    set local role anon;
    begin
      perform 1 from public.customers;
      raise exception 'anon can read customers';
    exception when insufficient_privilege then null;
    end;
    begin
      perform 1 from public.customer_phones;
      raise exception 'anon can read phone numbers';
    exception when insufficient_privilege then null;
    end;
    begin
      perform public.save_customer(null, null, 'ทดสอบ anon', null, '[]', '[]');
      raise exception 'anon can call save_customer';
    exception when insufficient_privilege then null;
    end;
    begin
      perform public.customer_history(h);
      raise exception 'anon can call customer_history';
    exception when insufficient_privilege then null;
    end;
    reset role;

    raise exception 'customers_test_rollback';
  exception
    when others then
      if sqlerrm <> 'customers_test_rollback' then raise; end if;
  end;
end $$;

-- Reached only if every check above passed
select 'ALL CUSTOMER TESTS PASSED' as result;
