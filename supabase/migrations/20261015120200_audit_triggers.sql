-- M005 · Audit fields set by the database, not by the client (ER-14)
--
-- Purpose:  created_by / created_by_email / updated_by_email / updated_at were
--           whatever the browser sent, so they could be wrong or faked. With a
--           signed-in user (JWT) they now always come from the session:
--             insert  → created_by = auth.uid(), created_by_email = JWT email,
--                       updated_* cleared
--             update  → created_by* kept from the old row,
--                       updated_at = now(), updated_by_email = JWT email
--           Without a JWT (owner in the SQL Editor, migrations, seed) the given
--           values are kept, except that created_by* still cannot change on update.
-- Down:     supabase/rollback/20261015120200_audit_triggers.down.sql
-- Compatible with client v1.0.x: yes. The old client already sends its own id and
--           e-mail; the stored values are the same, only the clock is the server's.

begin;

create or replace function public.tg_set_audit()
  returns trigger
  language plpgsql
  security invoker
  set search_path = ''
as $$
declare
  uid   uuid := auth.uid();
  email text := auth.jwt() ->> 'email';
begin
  if tg_op = 'INSERT' then
    if uid is not null then
      new.created_by       := uid;
      new.created_by_email := email;
    end if;
    new.updated_at       := null;
    new.updated_by_email := null;
  else
    new.created_by       := old.created_by;
    new.created_by_email := old.created_by_email;
    new.updated_at       := now();
    if uid is not null then
      new.updated_by_email := email;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists records_audit  on public.records;
drop trigger if exists expenses_audit on public.expenses;

create trigger records_audit
  before insert or update on public.records
  for each row execute function public.tg_set_audit();

create trigger expenses_audit
  before insert or update on public.expenses
  for each row execute function public.tg_set_audit();

commit;
