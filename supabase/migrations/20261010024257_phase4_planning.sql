begin;
-- Planning only. No money backfill, posting RPC, balance counter or accrual job.
alter table public.monthly_budgets add column rollover_enabled boolean not null default false;
alter table public.monthly_budgets add column alert_percent integer not null default 80 check(alert_percent between 1 and 100);
create or replace view public.exact_monthly_budgets with(security_invoker=true) as
select b.id,b.user_id,b.category_id,b.currency,b.month::text,
round(b.amount,case when b.currency='JPY' then 0 else 2 end)::text as amount,b.created_at,
coalesce((select sum(t.amount::numeric) from public.exact_transactions t where t.user_id=b.user_id and t.category_id=b.category_id and t.currency=b.currency and t.type='expense' and t.activity_kind='ordinary' and substr(t.financial_date,1,7)=to_char(b.month,'YYYY-MM') and t.transaction_date<=now()),0)::text as spent,
b.rollover_enabled,b.alert_percent from public.monthly_budgets b;

create table public.reserve_plans(
id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
month date not null check(extract(day from month)=1),currency text not null check(currency in('MYR','USD','EUR','JPY')),
name text not null check(length(btrim(name)) between 1 and 100),
amount numeric not null check(amount>0 and amount<10000000000000000 and amount=round(amount,case when currency='JPY' then 0 else 2 end)),
created_at timestamptz not null default now(),unique(user_id,month,currency,name)
);
create table public.debt_plans(
id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
debt_id uuid not null,currency text not null check(currency in('MYR','USD','EUR','JPY')),
debt_type text not null check(debt_type in('credit_card','personal','car','student','mortgage','bnpl','family_friend','custom')),
scenario_principal numeric not null check(scenario_principal>0 and scenario_principal<10000000000000000 and scenario_principal=round(scenario_principal,case when currency='JPY' then 0 else 2 end)),
balance_as_of date not null,apr_bps integer check(apr_bps between 0 and 100000),
rate_mode text not null check(rate_mode in('fixed','variable','manual')),
minimum_payment numeric check(minimum_payment>0 and minimum_payment<10000000000000000 and minimum_payment=round(minimum_payment,case when currency='JPY' then 0 else 2 end)),
frequency text not null check(frequency in('monthly','biweekly','weekly')),
first_payment_date date not null check(first_payment_date>=balance_as_of),custom_rank integer not null default 0 check(custom_rank between 0 and 100000),
created_at timestamptz not null default now(),unique(user_id,debt_id),
foreign key(user_id,debt_id,currency) references public.person_debts(user_id,id,currency) on delete cascade
);
create index reserve_plans_owner_month on public.reserve_plans(user_id,month);
create index debt_plans_owner_debt_currency on public.debt_plans(user_id,debt_id,currency);
do $$ declare t text; begin
foreach t in array array['reserve_plans','debt_plans'] loop
execute format('alter table public.%I enable row level security',t);
execute format('revoke all on public.%I from public,anon,authenticated',t);
execute format('grant select,insert,update,delete on public.%I to authenticated',t);
execute format('create policy own_select on public.%I for select to authenticated using (user_id=(select auth.uid()))',t);
execute format('create policy own_insert on public.%I for insert to authenticated with check(user_id=(select auth.uid()))',t);
execute format('create policy own_update on public.%I for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',t);
execute format('create policy own_delete on public.%I for delete to authenticated using(user_id=(select auth.uid()))',t);
execute format('create policy require_session on public.%I as restrictive for all to authenticated using((select prism_private.session_allowed())) with check((select prism_private.session_allowed()))',t);
end loop;end $$;
create view public.exact_reserve_plans with(security_invoker=true) as select id,user_id,month::text,currency,name,round(amount,case when currency='JPY' then 0 else 2 end)::text as amount,created_at from public.reserve_plans;
create view public.exact_debt_plans with(security_invoker=true) as select id,user_id,debt_id,currency,debt_type,round(scenario_principal,case when currency='JPY' then 0 else 2 end)::text as scenario_principal,balance_as_of::text,apr_bps,rate_mode,round(minimum_payment,case when currency='JPY' then 0 else 2 end)::text as minimum_payment,frequency,first_payment_date::text,custom_rank,created_at from public.debt_plans;
revoke all on public.exact_reserve_plans,public.exact_debt_plans from public,anon,authenticated;
grant select on public.exact_reserve_plans,public.exact_debt_plans to authenticated;

-- Preserve financial history until Phase 2 can post explicit audited corrections.
-- Administrative account erasure still runs as the existing privileged owner.
create function prism_private.protect_debt_history() returns trigger language plpgsql security invoker set search_path='' as $$
begin
if current_user='authenticated' then
 if tg_table_name='debt_repayments' then raise exception 'Repayment history requires an audited reversal; deletion or rewriting is unavailable.';end if;
 if exists(select 1 from public.debt_repayments r where r.debt_id=old.id and r.user_id=old.user_id) then
  if tg_op='DELETE' then raise exception 'A debt with repayment history cannot be deleted.';end if;
  if new.original_amount<>old.original_amount or new.currency<>old.currency or new.direction<>old.direction then raise exception 'Historical debt terms require an audited correction.';end if;
 end if;
end if;
if tg_op='DELETE' then return old;end if;return new;
end $$;
revoke all on function prism_private.protect_debt_history() from public,anon,authenticated;
create trigger protect_debt_history before delete or update on public.person_debts for each row execute function prism_private.protect_debt_history();
create trigger protect_repayment_history before delete or update on public.debt_repayments for each row execute function prism_private.protect_debt_history();
notify pgrst,'reload schema';
commit;
