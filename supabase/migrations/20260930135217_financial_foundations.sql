begin;

-- NULL explicitly means not configured yet. The client persists the browser IANA
-- timezone on first verified login; historical instants remain untouched.
alter table public.profiles add column financial_timezone text;
create function prism_private.validate_timezone() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.financial_timezone is not null and not exists (
    select 1 from pg_catalog.pg_timezone_names where name=new.financial_timezone
      and (name like '%/%' or name='UTC')
  ) then raise exception 'Choose a valid IANA financial timezone.'; end if;
  return new;
end $$;
create trigger validate_financial_timezone before insert or update of financial_timezone
on public.profiles for each row execute function prism_private.validate_timezone();
grant update(financial_timezone) on public.profiles to authenticated;

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_account_id uuid not null,
  destination_account_id uuid not null,
  source_amount numeric not null,
  source_currency text not null,
  destination_amount numeric not null,
  destination_currency text not null,
  occurred_at timestamptz not null default now(),
  note text not null default '' check(length(note)<=500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,id), unique(user_id,id,destination_currency),
  constraint transfer_distinct_accounts check(source_account_id<>destination_account_id),
  constraint transfer_source_money check(source_amount>0 and source_amount<10000000000000000 and source_amount=round(source_amount,case when source_currency='JPY' then 0 else 2 end)),
  constraint transfer_destination_money check(destination_amount>0 and destination_amount<10000000000000000 and destination_amount=round(destination_amount,case when destination_currency='JPY' then 0 else 2 end)),
  constraint transfer_same_currency check(source_currency<>destination_currency or source_amount=destination_amount),
  foreign key(user_id,source_account_id,source_currency) references public.accounts(user_id,id,currency) on delete restrict,
  foreign key(user_id,destination_account_id,destination_currency) references public.accounts(user_id,id,currency) on delete restrict
);
create index transfers_source on public.transfers(user_id,source_account_id,occurred_at desc,id);
create index transfers_destination on public.transfers(user_id,destination_account_id,occurred_at desc,id);

-- A contribution is an earmark, optionally attributed to an account or an actual
-- transfer. Attribution never creates a second cash movement. Legacy transaction
-- links stay intact, visibly classified by the transport view below.
alter table public.objective_contributions add column account_id uuid;
alter table public.objective_contributions add column transfer_id uuid;
alter table public.objective_contributions add constraint contribution_owned_account
foreign key(user_id,account_id,currency) references public.accounts(user_id,id,currency) on delete restrict;
alter table public.objective_contributions add constraint contribution_owned_transfer
foreign key(user_id,transfer_id,currency) references public.transfers(user_id,id,destination_currency) on delete restrict;
alter table public.objective_contributions add constraint contribution_single_event
check(transaction_id is null or (account_id is null and transfer_id is null));
create unique index contribution_transfer on public.objective_contributions(transfer_id) where transfer_id is not null;
alter table public.debt_repayments add column account_id uuid;
alter table public.debt_repayments add constraint repayment_owned_account
foreign key(user_id,account_id,currency) references public.accounts(user_id,id,currency) on delete restrict;
alter table public.debt_repayments add constraint repayment_single_cash_movement
check(transaction_id is null or account_id is null);
create index repayment_account on public.debt_repayments(user_id,account_id) where account_id is not null;

create or replace function prism_private.validate_finance_link() returns trigger
language plpgsql security invoker set search_path='' as $$
declare tx public.transactions; debt public.person_debts; movement public.transfers; total numeric;
begin
  if tg_op='UPDATE' and new.user_id<>old.user_id then raise exception 'Financial ownership cannot change.'; end if;
  if new.transaction_id is not null then
    -- Both relationship tables serialize on the same parent row. A separate
    -- SELECT after the lock sees the preceding commit under READ COMMITTED.
    select * into tx from public.transactions where id=new.transaction_id and user_id=new.user_id for update;
    if tx.id is null or tx.currency<>new.currency then raise exception 'Linked transaction is unavailable or has a different currency.'; end if;
    if tg_table_name='objective_contributions' then
      if tx.type<>'expense' then raise exception 'An objective contribution requires an outgoing transaction.'; end if;
      if exists(select 1 from public.debt_repayments where transaction_id=new.transaction_id) then raise exception 'Transaction is already linked to a debt repayment.'; end if;
    else
      if exists(select 1 from public.objective_contributions where transaction_id=new.transaction_id) then raise exception 'Transaction is already linked to an objective contribution.'; end if;
    end if;
  end if;
  if tg_table_name='objective_contributions' then
    if new.transfer_id is not null then
      select * into movement from public.transfers where id=new.transfer_id and user_id=new.user_id for update;
      if movement.id is null or movement.destination_currency<>new.currency or movement.destination_amount<>new.amount
        or (new.account_id is not null and new.account_id<>movement.destination_account_id)
      then raise exception 'Contribution must match the transfer destination and exact amount.'; end if;
    end if;
  else
    select * into debt from public.person_debts where id=new.debt_id and user_id=new.user_id for update;
    if debt.id is null then raise exception 'Debt is unavailable.'; end if;
    if tx.id is not null and tx.type<>(case when debt.direction='i_owe' then 'expense' else 'income' end) then raise exception 'Repayment transaction has the wrong direction.'; end if;
    select coalesce(sum(coalesce(r.amount,t.amount)),0) into total from public.debt_repayments r
    left join public.transactions t on t.id=r.transaction_id and t.user_id=r.user_id
    where r.debt_id=new.debt_id and r.id<>new.id;
    if total+coalesce(new.amount,tx.amount)>debt.original_amount then raise exception 'Repayment exceeds the original debt.'; end if;
  end if;
  return new;
end $$;

create or replace function prism_private.validate_transaction_links() returns trigger
language plpgsql security invoker set search_path='' as $$
declare r record; debt public.person_debts;
begin
  if new.user_id<>old.user_id then raise exception 'Transaction ownership cannot change.'; end if;
  if new.currency<>old.currency and (exists(select 1 from public.objective_contributions where transaction_id=new.id) or exists(select 1 from public.debt_repayments where transaction_id=new.id)) then raise exception 'Unlink this transaction before changing its currency.'; end if;
  if new.type<>'expense' and exists(select 1 from public.objective_contributions where transaction_id=new.id) then raise exception 'Unlink this transaction before changing its direction.'; end if;
  for r in select debt_id from public.debt_repayments where transaction_id=new.id loop
    select * into debt from public.person_debts where id=r.debt_id for update;
    if new.type<>(case when debt.direction='i_owe' then 'expense' else 'income' end) then raise exception 'Unlink this transaction before changing its direction.'; end if;
    if (select coalesce(sum(coalesce(p.amount,case when p.transaction_id=new.id then new.amount else t.amount end)),0) from public.debt_repayments p left join public.transactions t on t.id=p.transaction_id where p.debt_id=debt.id)>debt.original_amount then raise exception 'Edited transaction would overpay a debt.'; end if;
  end loop;
  return new;
end $$;
create or replace function prism_private.validate_debt_edit() returns trigger
language plpgsql security invoker set search_path='' as $$
declare total numeric;
begin
  if (new.currency,new.user_id) is distinct from (old.currency,old.user_id) then raise exception 'Debt ownership and currency cannot change.'; end if;
  select coalesce(sum(coalesce(r.amount,t.amount)),0) into total from public.debt_repayments r left join public.transactions t on t.id=r.transaction_id where r.debt_id=new.id;
  if new.original_amount<total then raise exception 'Original amount cannot be below recorded repayments.'; end if;
  if new.direction<>old.direction and exists(select 1 from public.debt_repayments where debt_id=new.id) then raise exception 'Remove repayments before changing debt direction.'; end if;
  new.updated_at:=now(); return new;
end $$;
create function prism_private.validate_transfer_edit() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.user_id<>old.user_id then raise exception 'Transfer ownership cannot change.'; end if;
  if (new.destination_account_id,new.destination_currency,new.destination_amount) is distinct from (old.destination_account_id,old.destination_currency,old.destination_amount)
    and exists(select 1 from public.objective_contributions where transfer_id=new.id)
  then raise exception 'Remove the savings allocation before changing this transfer destination.'; end if;
  new.updated_at:=now(); return new;
end $$;
create trigger validate_transfer_edit before update on public.transfers for each row execute function prism_private.validate_transfer_edit();

alter table public.transfers enable row level security;
revoke all on public.transfers from public,anon,authenticated;
grant select,insert,update,delete on public.transfers to authenticated;
create policy own_select on public.transfers for select to authenticated using(user_id=(select auth.uid()));
create policy own_insert on public.transfers for insert to authenticated with check(user_id=(select auth.uid()));
create policy own_update on public.transfers for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_delete on public.transfers for delete to authenticated using(user_id=(select auth.uid()));
create policy require_session on public.transfers as restrictive for all to authenticated using((select prism_private.session_allowed())) with check((select prism_private.session_allowed()));

-- Financial numerics are cast by PostgreSQL BEFORE JSON serialization.
-- Invoker views retain ownership AND restrictive session/MFA RLS.
do $$ declare tbl text; cols text; begin
  foreach tbl in array array['transactions','accounts','objectives','objective_contributions','objective_milestones','person_debts','debt_repayments','transfers'] loop
    select string_agg(case when data_type='numeric' then format('t.%I::text as %I',column_name,column_name) else format('t.%I',column_name) end,', ' order by ordinal_position)
    into cols from information_schema.columns where table_schema='public' and table_name=tbl;
    if tbl='transactions' then
      cols:=cols||', case when exists(select 1 from public.objective_contributions c where c.transaction_id=t.id) then ''savings_allocation'' when exists(select 1 from public.debt_repayments r where r.transaction_id=t.id) then ''debt_principal'' else ''ordinary'' end as activity_kind';
      cols:=cols||', (t.transaction_date at time zone coalesce((select financial_timezone from public.profiles where id=t.user_id),''UTC''))::date::text as financial_date';
    elsif tbl in ('objective_contributions','debt_repayments') then
      cols:=cols||', coalesce(t.amount,(select x.amount from public.transactions x where x.id=t.transaction_id))::text as effective_amount';
    elsif tbl='accounts' then
      cols:=cols||', (t.opening_balance + coalesce((select sum(case when x.type=''income'' then x.amount else -x.amount end) from public.transactions x where x.account_id=t.id and x.transaction_date<=now()),0) + coalesce((select sum(x.destination_amount) from public.transfers x where x.destination_account_id=t.id and x.occurred_at<=now()),0) - coalesce((select sum(x.source_amount) from public.transfers x where x.source_account_id=t.id and x.occurred_at<=now()),0) + coalesce((select sum(case when d.direction=''i_owe'' then -r.amount else r.amount end) from public.debt_repayments r join public.person_debts d on d.id=r.debt_id where r.account_id=t.id and r.transaction_id is null and r.paid_at<=now()),0))::text as balance, (select count(*)::int from public.transactions x where x.account_id=t.id) as transaction_count, ((select count(*) from public.transactions x where x.account_id=t.id)+(select count(*) from public.transfers x where x.source_account_id=t.id or x.destination_account_id=t.id)+(select count(*) from public.debt_repayments x where x.account_id=t.id)+(select count(*) from public.objective_contributions x where x.account_id=t.id))::int as linked_activity_count';
    end if;
    execute format('create view public.exact_%I with (security_invoker=true) as select %s from public.%I t',tbl,cols,tbl);
    execute format('revoke all on public.exact_%I from public,anon,authenticated',tbl);
    execute format('grant select on public.exact_%I to authenticated',tbl);
  end loop;
end $$;
create index transactions_financial_page on public.transactions(user_id,transaction_date desc,id);
revoke all on function prism_private.validate_timezone(),prism_private.validate_transfer_edit() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
