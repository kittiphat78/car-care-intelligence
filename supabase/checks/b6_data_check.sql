-- B6 pre-check · READ-ONLY · run in the SQL Editor of PRODUCTION
--
-- Counts rows that would break the data rules planned for M008 (check constraints)
-- and shows how often the daily sequence number repeats today (ER-04, fixed by M009).
-- Nothing is changed. The result has only counts, no customer data, so a screenshot
-- of it is safe to share.

select rule, rows_breaking_it from (
  values
    (1,  'records: plate empty or longer than 20',      (select count(*) from public.records where plate is null or char_length(btrim(plate)) not between 1 and 20)),
    (2,  'records: price below 0',                      (select count(*) from public.records where price < 0)),
    (3,  'records: customer name longer than 50',       (select count(*) from public.records where char_length(customer_name) > 50)),
    (4,  'records: note longer than 200',               (select count(*) from public.records where char_length(services[3]) > 200)),
    (5,  'records: type not wash/polish',               (select count(*) from public.records where type not in ('wash', 'polish'))),
    (6,  'records: status not paid/unpaid',             (select count(*) from public.records where payment_status not in ('paid', 'unpaid'))),
    (7,  'expenses: amount below 1',                    (select count(*) from public.expenses where amount < 1)),
    (8,  'expenses: title empty or longer than 100',    (select count(*) from public.expenses where title is null or char_length(btrim(title)) not between 1 and 100)),
    (9,  'expenses: note longer than 200',              (select count(*) from public.expenses where char_length(note) > 200)),
    (10, 'seq: records without a sequence number',      (select count(*) from public.records where seq_number is null)),
    (11, 'seq: days where a number repeats',            (select count(*) from (
                                                            select 1 from public.records
                                                            group by (created_at at time zone 'Asia/Bangkok')::date, seq_number
                                                            having count(*) > 1) d)),
    (12, 'seq: days whose numbers have gaps',           (select count(*) from (
                                                            select (created_at at time zone 'Asia/Bangkok')::date as day
                                                            from public.records
                                                            group by 1
                                                            having max(seq_number) <> count(*)) d))
) as checks(n, rule, rows_breaking_it)
order by n;
