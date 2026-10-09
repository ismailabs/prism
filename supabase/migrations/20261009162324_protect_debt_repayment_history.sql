-- Forward-only, unapplied production proposal. No rows or monetary values change.
begin;

create function prism_private.protect_debt_repayment_history() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  -- App users may delete an empty debt, but cannot cascade away repayment/cash
  -- history. DELETE already holds the parent row lock; repayment INSERT takes
  -- that same lock in validate_finance_link(), serializing the history check.
  -- The existing confirmed Auth self-deletion executes as its private definer
  -- owner, so the explicit whole-account erasure contract remains intact.
  if current_user = 'authenticated' and exists (
    select 1 from public.debt_repayments r
    where r.debt_id=old.id and r.user_id=old.user_id
  ) then
    raise exception 'Debt has repayment history. Keep this record until reversal support is available.'
      using errcode='23514';
  end if;
  return old;
end $$;

revoke all on function prism_private.protect_debt_repayment_history() from public,anon,authenticated;
create trigger protect_debt_repayment_history before delete on public.person_debts
for each row execute function prism_private.protect_debt_repayment_history();
commit;
