-- Plate and customer-name formats in records · READ-ONLY · for the customer directory design
--
-- Run in the SQL Editor of production (owner) or staging, one query at a time.
-- Returns shapes and counts only, never a plate or a name: in a shape every Thai
-- character is ก, every digit 9 and every Latin letter A (e.g. "1กข 1234" → "9กก 9999").
-- Paste the results back; they decide the plate_key rule (docs/features/customer-directory.md).

-- 1 · Overall
select
  count(*)                                                        as records,
  count(distinct plate)                                           as plates_as_typed,
  count(distinct upper(regexp_replace(plate, '[[:space:].-]', '', 'g'))) as plate_keys,
  count(*) filter (where plate ~ '[[:space:]]')                   as with_space,
  count(*) filter (where plate ~ '-')                             as with_dash,
  count(*) filter (where plate ~ '\.')                            as with_dot,
  count(*) filter (where plate <> btrim(plate))                   as untrimmed,
  count(*) filter (where plate ~ '[a-z]')                         as lowercase_latin,
  count(*) filter (where plate !~ '[0-9]')                        as without_digits,
  min(char_length(plate))                                         as min_len,
  max(char_length(plate))                                         as max_len
from public.records;

-- 2 · Most common shapes
select shape, count(*) as records, count(distinct plate) as plates
from (
  select plate,
         regexp_replace(regexp_replace(regexp_replace(plate, '[0-9]', '9', 'g'), '[ก-๛]', 'ก', 'g'), '[A-Za-z]', 'A', 'g') as shape
  from public.records
) s
group by shape
order by records desc
limit 40;

-- 3 · Plates typed in more than one way (same key, different text)
select count(*) as keys_with_several_spellings, coalesce(max(spellings), 0) as most_spellings
from (
  select upper(regexp_replace(plate, '[[:space:].-]', '', 'g')) as plate_key, count(distinct plate) as spellings
  from public.records
  group by 1
) k
where spellings > 1;

-- 4 · Plates seen with more than one customer name (decides how debts match the directory)
select count(*) filter (where names > 1) as plates_with_several_names,
       count(*) filter (where names = 1) as plates_with_one_name,
       count(*) filter (where names = 0) as plates_without_name,
       coalesce(max(names), 0)           as most_names_on_one_plate
from (
  select upper(regexp_replace(plate, '[[:space:].-]', '', 'g')) as plate_key,
         count(distinct nullif(btrim(customer_name), '')) as names
  from public.records
  group by 1
) n;

-- 5 · Customer names
select count(distinct nullif(btrim(customer_name), ''))                              as names_trimmed,
       count(distinct lower(regexp_replace(customer_name, '[[:space:]]', '', 'g')))
         filter (where nullif(btrim(customer_name), '') is not null)                 as names_ignoring_spaces_and_case,
       count(*) filter (where customer_name <> btrim(customer_name))                 as untrimmed_names,
       coalesce(max(char_length(customer_name)), 0)                                  as longest_name
from public.records;
