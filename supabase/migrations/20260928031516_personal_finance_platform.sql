-- Additive upgrade of the observed production tracker schema. Existing rows are untouched.
begin;

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  currency text not null check (currency in ('USD','EUR','JPY','MYR')),
  opening_balance numeric(18,2) not null default 0 check (opening_balance > -10000000000000000 and opening_balance < 10000000000000000 and opening_balance = round(opening_balance, case when currency='JPY' then 0 else 2 end)),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id,id), unique (user_id,id,currency)
);
create index accounts_owner on public.accounts(user_id,archived);
alter table public.transactions add column account_id uuid;
alter table public.transactions add constraint transactions_owned_account_fkey foreign key(user_id,account_id,currency) references public.accounts(user_id,id,currency) on delete set null(account_id);
create index transactions_account on public.transactions(user_id,account_id,transaction_date);
create unique index transactions_owner_id_currency on public.transactions(user_id,id,currency);

create table public.objectives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('goal','savings')),
  name text not null check (length(btrim(name)) between 1 and 100),
  notes text not null default '' check (length(notes)<=2000),
  category text not null default 'General' check (length(btrim(category)) between 1 and 60),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  target_amount numeric(18,2) not null check (target_amount>0 and target_amount<10000000000000000 and target_amount=round(target_amount,case when currency='JPY' then 0 else 2 end)),
  currency text not null check (currency in ('USD','EUR','JPY','MYR')),
  target_date date,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,id), unique(user_id,id,currency)
);
create index objectives_owner on public.objectives(user_id,kind,status);
create table public.objective_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  objective_id uuid not null,
  name text not null check (length(btrim(name)) between 1 and 100),
  amount numeric(18,2) not null check (amount>0 and amount<10000000000000000),
  created_at timestamptz not null default now(),
  foreign key(user_id,objective_id) references public.objectives(user_id,id) on delete cascade
);
create index milestones_owner on public.objective_milestones(user_id,objective_id,amount);
create table public.objective_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  objective_id uuid not null,
  currency text not null check (currency in ('USD','EUR','JPY','MYR')),
  amount numeric(18,2), -- NULL means use the live linked transaction amount.
  transaction_id uuid,
  note text not null default '' check (length(note)<=500),
  contributed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check ((transaction_id is null and amount is not null) or (transaction_id is not null and amount is null)),
  check (amount is null or (amount>0 and amount<10000000000000000 and amount=round(amount,case when currency='JPY' then 0 else 2 end))),
  foreign key(user_id,objective_id,currency) references public.objectives(user_id,id,currency) on delete cascade,
  foreign key(user_id,transaction_id,currency) references public.transactions(user_id,id,currency) on delete cascade
);
create unique index objective_contribution_transaction on public.objective_contributions(transaction_id) where transaction_id is not null;
create index contributions_owner on public.objective_contributions(user_id,objective_id,contributed_at desc);

create table public.person_debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  direction text not null check (direction in ('i_owe','owed_to_me')),
  counterparty text not null check (length(btrim(counterparty)) between 1 and 100),
  original_amount numeric(18,2) not null check (original_amount>0 and original_amount<10000000000000000 and original_amount=round(original_amount,case when currency='JPY' then 0 else 2 end)),
  currency text not null check (currency in ('USD','EUR','JPY','MYR')),
  due_date date,
  notes text not null default '' check(length(notes)<=2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,id), unique(user_id,id,currency)
);
create index debts_owner on public.person_debts(user_id,direction,due_date);
create table public.debt_repayments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null,
  currency text not null check (currency in ('USD','EUR','JPY','MYR')),
  amount numeric(18,2), -- NULL means use the live linked transaction amount.
  transaction_id uuid,
  note text not null default '' check(length(note)<=500),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check ((transaction_id is null and amount is not null) or (transaction_id is not null and amount is null)),
  check (amount is null or (amount>0 and amount<10000000000000000 and amount=round(amount,case when currency='JPY' then 0 else 2 end))),
  foreign key(user_id,debt_id,currency) references public.person_debts(user_id,id,currency) on delete cascade,
  foreign key(user_id,transaction_id,currency) references public.transactions(user_id,id,currency) on delete cascade
);
create unique index debt_repayment_transaction on public.debt_repayments(transaction_id) where transaction_id is not null;
create index repayments_owner on public.debt_repayments(user_id,debt_id,paid_at desc);

-- Checks are made in the database so edits via the Data API cannot break linked activity.
create function prism_private.validate_finance_link() returns trigger language plpgsql security invoker set search_path='' as $$
declare tx public.transactions; debt public.person_debts; total numeric;
begin
  if new.transaction_id is not null then
    select * into tx from public.transactions where id=new.transaction_id and user_id=new.user_id;
    if tx.id is null or tx.currency<>new.currency then raise exception 'Linked transaction is unavailable or has a different currency.'; end if;
    if tg_table_name='objective_contributions' then
      if tx.type<>'expense' then raise exception 'An objective contribution requires an outgoing transaction.'; end if;
      if exists(select 1 from public.debt_repayments where transaction_id=new.transaction_id) then raise exception 'Transaction is already linked to a debt repayment.'; end if;
    end if;
    if tg_table_name='debt_repayments' then
      if exists(select 1 from public.objective_contributions where transaction_id=new.transaction_id) then raise exception 'Transaction is already linked to an objective contribution.'; end if;
      select * into debt from public.person_debts where id=new.debt_id and user_id=new.user_id;
      if tx.type <> (case when debt.direction='i_owe' then 'expense' else 'income' end) then raise exception 'Repayment transaction has the wrong direction.'; end if;
    end if;
  end if;
  if tg_table_name='debt_repayments' then
    select * into debt from public.person_debts where id=new.debt_id and user_id=new.user_id for update;
    select coalesce(sum(coalesce(r.amount,t.amount)),0) into total from public.debt_repayments r left join public.transactions t on t.id=r.transaction_id and t.user_id=r.user_id where r.debt_id=new.debt_id and r.id<>new.id;
    if total+coalesce(new.amount,tx.amount)>debt.original_amount then raise exception 'Repayment exceeds the original debt.'; end if;
  end if;
  return new;
end $$;
create trigger validate_objective_contribution before insert or update on public.objective_contributions for each row execute function prism_private.validate_finance_link();
create trigger validate_debt_repayment before insert or update on public.debt_repayments for each row execute function prism_private.validate_finance_link();
create function prism_private.validate_transaction_links() returns trigger language plpgsql security invoker set search_path='' as $$
declare r record; debt public.person_debts;
begin
  if new.currency<>old.currency then
    if exists(select 1 from public.objective_contributions where transaction_id=new.id) or exists(select 1 from public.debt_repayments where transaction_id=new.id) then raise exception 'Unlink this transaction before changing its currency.'; end if;
  end if;
  if new.type<>'expense' and exists(select 1 from public.objective_contributions where transaction_id=new.id) then raise exception 'Unlink this transaction before changing its direction.'; end if;
  for r in select debt_id from public.debt_repayments where transaction_id=new.id loop
    select * into debt from public.person_debts where id=r.debt_id;
    if new.type<>(case when debt.direction='i_owe' then 'expense' else 'income' end) then raise exception 'Unlink this transaction before changing its direction.'; end if;
    if (select coalesce(sum(coalesce(p.amount,case when p.transaction_id=new.id then new.amount else t.amount end)),0) from public.debt_repayments p left join public.transactions t on t.id=p.transaction_id where p.debt_id=debt.id)>debt.original_amount then raise exception 'Edited transaction would overpay a debt.'; end if;
  end loop;
  return new;
end $$;
create trigger validate_transaction_finance_links before update of amount,currency,type on public.transactions for each row execute function prism_private.validate_transaction_links();
create function prism_private.validate_debt_edit() returns trigger language plpgsql security invoker set search_path='' as $$
declare total numeric;
begin
  if (new.currency,new.user_id) is distinct from (old.currency,old.user_id) then raise exception 'Debt ownership and currency cannot change.'; end if;
  select coalesce(sum(coalesce(r.amount,t.amount)),0) into total from public.debt_repayments r left join public.transactions t on t.id=r.transaction_id where r.debt_id=new.id;
  if new.original_amount<total then raise exception 'Original amount cannot be below recorded repayments.'; end if;
  if new.direction<>old.direction and exists(select 1 from public.debt_repayments where debt_id=new.id and transaction_id is not null) then raise exception 'Unlink repayments before changing debt direction.'; end if;
  new.updated_at:=now(); return new;
end $$;
create trigger validate_debt_edit before update on public.person_debts for each row execute function prism_private.validate_debt_edit();

do $$ declare t text; begin
  foreach t in array array['accounts','objectives','objective_milestones','objective_contributions','person_debts','debt_repayments'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create policy own_select on public.%I for select to authenticated using (user_id=(select auth.uid()))',t);
    execute format('create policy own_insert on public.%I for insert to authenticated with check (user_id=(select auth.uid()))',t);
    execute format('create policy own_update on public.%I for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()))',t);
    execute format('create policy own_delete on public.%I for delete to authenticated using (user_id=(select auth.uid()))',t);
    execute format('create policy require_session on public.%I as restrictive for all to authenticated using ((select prism_private.session_allowed())) with check ((select prism_private.session_allowed()))',t);
  end loop;
end $$;
revoke all on function prism_private.validate_finance_link(),prism_private.validate_transaction_links(),prism_private.validate_debt_edit() from public,anon,authenticated;
-- Existing event trigger helper was exposed through the public schema.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from public,anon,authenticated;
  end if;
end $$;
notify pgrst,'reload schema';
commit;
