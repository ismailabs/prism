-- Preserve existing values while rejecting extra decimal precision instead of rounding it.
begin;
drop trigger validate_transaction_finance_links on public.transactions;
alter table public.transactions alter column amount type numeric;
create trigger validate_transaction_finance_links before update of amount,currency,type on public.transactions for each row execute function prism_private.validate_transaction_links();
alter table public.accounts alter column opening_balance type numeric;
alter table public.objectives alter column target_amount type numeric;
alter table public.objective_contributions alter column amount type numeric;
alter table public.objective_milestones alter column amount type numeric;
alter table public.person_debts alter column original_amount type numeric;
alter table public.debt_repayments alter column amount type numeric;

create function prism_private.validate_milestone() returns trigger language plpgsql security invoker set search_path='' as $$
declare c text;
begin
  select currency into c from public.objectives where id=new.objective_id and user_id=new.user_id;
  if c is null or new.amount<>round(new.amount,case when c='JPY' then 0 else 2 end) then
    raise exception 'Milestone amount has invalid currency precision.';
  end if;
  return new;
end $$;
create trigger validate_milestone before insert or update on public.objective_milestones for each row execute function prism_private.validate_milestone();
revoke all on function prism_private.validate_milestone() from public,anon,authenticated;
commit;
