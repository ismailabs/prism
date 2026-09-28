begin;

-- An account with ledger entries must be explicitly emptied before deletion.
-- This preserves the meaning of existing transaction history instead of silently
-- turning linked entries into unassigned transactions.
alter table public.transactions drop constraint transactions_owned_account_fkey;
alter table public.transactions add constraint transactions_owned_account_fkey
  foreign key (user_id, account_id, currency)
  references public.accounts(user_id, id, currency)
  on delete restrict;
create index if not exists transactions_account_currency
  on public.transactions(user_id, account_id, currency)
  where account_id is not null;

-- Delete the current principal only after a current non-anonymous session has
-- passed the product's MFA gate. The function never accepts a user id, so one
-- authenticated user cannot choose another account as the deletion target.
drop function if exists public.delete_own_account();
create function public.delete_own_account(confirmation text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if confirmation is distinct from 'DELETE' then
    raise exception 'Explicit deletion confirmation is required.' using errcode = '22023';
  end if;
  if current_user_id is null or not coalesce(prism_private.session_allowed(), false) then
    raise exception 'A current authenticated session and MFA verification are required.' using errcode = '42501';
  end if;

  delete from auth.sessions where user_id = current_user_id;
  delete from auth.users where id = current_user_id;
  if not found then
    raise exception 'Authenticated user was not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_own_account(text) from public, anon;
grant execute on function public.delete_own_account(text) to authenticated;

commit;
