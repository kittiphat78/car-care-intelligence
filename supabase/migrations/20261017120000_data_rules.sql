-- M008 · Data rules enforced by the database (FR-REC-02, FR-REC-03)
--
-- Purpose:  the app checks these limits before saving (B5), but nothing stopped
--           another client or a mistake in the SQL Editor from storing an empty
--           plate, a negative price or an over-long note.
-- Data:     supabase/checks/b6_data_check.sql on production (2026-10-15) found 0 rows
--           breaking any of these rules, so every constraint is validated at once.
--           type and payment_status already have checks from the baseline (M000).
-- Down:     supabase/rollback/20261017120000_data_rules.down.sql
-- Compatible with client v1.x: yes. The app already refuses these values with
--           Thai messages (B5); the database answers 23514 → "ข้อมูลไม่ถูกต้อง".

begin;

alter table public.records
  add constraint records_plate_len_chk     check (char_length(btrim(plate)) between 1 and 20),
  add constraint records_price_chk         check (price >= 0),
  add constraint records_customer_len_chk  check (customer_name is null or char_length(customer_name) <= 50),
  add constraint records_note_len_chk      check (coalesce(char_length(services[3]), 0) <= 200);

alter table public.expenses
  add constraint expenses_amount_chk       check (amount >= 1),
  add constraint expenses_title_len_chk    check (char_length(btrim(title)) between 1 and 100),
  add constraint expenses_note_len_chk     check (note is null or char_length(note) <= 200);

commit;
