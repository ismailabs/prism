begin;
-- Canonical native scale removes redundant historical JPY .00 without changing
-- any stored value. Existing constraints already reject nonzero excess precision.
-- Preserve view column order and dependency/RLS identities.
do $$ declare tbl text; cols text; begin
  foreach tbl in array array['transactions','accounts','objectives','objective_contributions','objective_milestones','person_debts','debt_repayments','transfers'] loop
    select string_agg(case when data_type='numeric' then format('round(t.%I,case when %s=''JPY'' then 0 else 2 end)::text as %I',column_name,case when tbl='transfers' then format('t.%I',replace(column_name,'amount','currency')) when tbl='objective_milestones' then '(select o.currency from public.objectives o where o.id=t.objective_id)' else 't.currency' end,column_name) else format('t.%I',column_name) end,', ' order by ordinal_position)
    into cols from information_schema.columns where table_schema='public' and table_name=tbl and not (tbl='transactions' and column_name in ('recurrence_id','recurrence_index','import_key'));
    if tbl='transactions' then
      cols:=cols||', case when exists(select 1 from public.objective_contributions c where c.transaction_id=t.id) then ''savings_allocation'' when exists(select 1 from public.debt_repayments r where r.transaction_id=t.id) then ''debt_principal'' else ''ordinary'' end as activity_kind';
      cols:=cols||', (t.transaction_date at time zone coalesce((select financial_timezone from public.profiles where id=t.user_id),''UTC''))::date::text as financial_date';
    elsif tbl in ('objective_contributions','debt_repayments') then
      cols:=cols||', round(coalesce(t.amount,(select x.amount from public.transactions x where x.id=t.transaction_id)),case when t.currency=''JPY'' then 0 else 2 end)::text as effective_amount';
    elsif tbl='accounts' then
      cols:=cols||', round((t.opening_balance + coalesce((select sum(case when x.type=''income'' then x.amount else -x.amount end) from public.transactions x where x.account_id=t.id and x.transaction_date<=now()),0) + coalesce((select sum(x.destination_amount) from public.transfers x where x.destination_account_id=t.id and x.occurred_at<=now()),0) - coalesce((select sum(x.source_amount) from public.transfers x where x.source_account_id=t.id and x.occurred_at<=now()),0) + coalesce((select sum(case when d.direction=''i_owe'' then -r.amount else r.amount end) from public.debt_repayments r join public.person_debts d on d.id=r.debt_id where r.account_id=t.id and r.transaction_id is null and r.paid_at<=now()),0)),case when t.currency=''JPY'' then 0 else 2 end)::text as balance, (select count(*)::int from public.transactions x where x.account_id=t.id) as transaction_count, ((select count(*) from public.transactions x where x.account_id=t.id)+(select count(*) from public.transfers x where x.source_account_id=t.id or x.destination_account_id=t.id)+(select count(*) from public.debt_repayments x where x.account_id=t.id)+(select count(*) from public.objective_contributions x where x.account_id=t.id))::int as linked_activity_count';
    end if;
    execute format('create or replace view public.exact_%I with (security_invoker=true) as select %s from public.%I t',tbl,cols,tbl);
    execute format('revoke all on public.exact_%I from public,anon,authenticated',tbl);
    execute format('grant select on public.exact_%I to authenticated',tbl);
  end loop;
end $$;
create or replace view public.exact_monthly_budgets with(security_invoker=true) as
select b.id,b.user_id,b.category_id,b.currency,b.month::text,round(b.amount,case when b.currency='JPY' then 0 else 2 end)::text as amount,b.created_at,
coalesce((select sum(t.amount::numeric) from public.exact_transactions t where t.user_id=b.user_id and t.category_id=b.category_id and t.currency=b.currency and t.type='expense' and t.activity_kind='ordinary' and substr(t.financial_date,1,7)=to_char(b.month,'YYYY-MM') and t.transaction_date<=now()),0)::text as spent from public.monthly_budgets b;
create or replace view public.exact_recurring_rules with(security_invoker=true) as select id,user_id,description,round(amount,case when currency='JPY' then 0 else 2 end)::text as amount,currency,type,account_id,category_id,payment_method_id,start_date::text,end_date::text,frequency,interval,next_index,active,created_at from public.recurring_rules;
revoke all on public.exact_monthly_budgets,public.exact_recurring_rules from public,anon,authenticated;
grant select on public.exact_monthly_budgets,public.exact_recurring_rules to authenticated;
notify pgrst,'reload schema';
commit;
