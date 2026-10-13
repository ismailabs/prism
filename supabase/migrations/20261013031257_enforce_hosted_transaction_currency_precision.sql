-- Historical hosted receipts can have an amount check without currency scale.
-- Add the missing invariant without rounding, replacing checks or rewriting data.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '120s';
set local timezone = 'UTC';
lock table public.transactions in access exclusive mode;

create temporary table prism_precision_row_guard on commit drop as
select count(*) as row_count,
  sha256(convert_to(coalesce(string_agg(row_to_json(t)::text, E'\n'
    order by row_to_json(t)::text collate "C"), ''), 'UTF8')) as row_hash
from public.transactions t;

alter table public.transactions
  add constraint transactions_currency_precision
  check (amount = round(amount, case when currency = 'JPY' then 0 else 2 end))
  not valid;
-- Fails atomically if any historical value violates the invariant.
alter table public.transactions validate constraint transactions_currency_precision;

do $guard$
declare actual_count bigint; actual_hash bytea;
begin
  select count(*),
    sha256(convert_to(coalesce(string_agg(row_to_json(t)::text, E'\n'
      order by row_to_json(t)::text collate "C"), ''), 'UTF8'))
    into actual_count, actual_hash from public.transactions t;
  if not exists (select 1 from pg_temp.prism_precision_row_guard
    where row_count = actual_count and row_hash = actual_hash) then
    raise exception 'Transaction records changed during precision repair';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.transactions'::regclass) then
    raise exception 'Transaction RLS must remain enabled';
  end if;
end $guard$;
commit;
