begin;
create unique index categories_owner_id on public.categories(user_id,id);
create view public.finance_monthly_totals with(security_invoker=true) as
select user_id, substr(financial_date,1,7) as month, currency,type,category_id,
sum(amount::numeric)::text as amount, count(*)::integer as transaction_count
from public.exact_transactions where activity_kind='ordinary' and transaction_date<=now()
group by user_id,substr(financial_date,1,7),currency,type,category_id;
create view public.finance_net_flow with(security_invoker=true) as
select user_id,currency,sum(case when type='income' then amount::numeric else -amount::numeric end)::text as amount
from public.exact_transactions where activity_kind='ordinary' and transaction_date<=now() group by user_id,currency;
revoke all on public.finance_monthly_totals,public.finance_net_flow from public,anon,authenticated;
grant select on public.finance_monthly_totals,public.finance_net_flow to authenticated;

create table public.monthly_budgets(
id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
category_id uuid not null, category_type text not null default 'expense' check(category_type='expense'), currency text not null check(currency in('MYR','USD','EUR','JPY')),
month date not null check(extract(day from month)=1),
amount numeric not null check(amount>0 and amount<10000000000000000 and amount=round(amount,case when currency='JPY' then 0 else 2 end)),
created_at timestamptz not null default now(),unique(user_id,category_id,currency,month),
foreign key(user_id,category_id,category_type) references public.categories(user_id,id,type) on delete restrict
);
create function prism_private.validate_budget() returns trigger language plpgsql security invoker set search_path='' as $$
begin if not exists(select 1 from public.categories where id=new.category_id and user_id=new.user_id and type='expense') then raise exception 'Budget category must be an owned expense category.';end if;return new;end $$;
create trigger validate_budget before insert or update on public.monthly_budgets for each row execute function prism_private.validate_budget();
create view public.exact_monthly_budgets with(security_invoker=true) as
select b.id,b.user_id,b.category_id,b.currency,b.month::text,b.amount::text,b.created_at,
coalesce((select sum(t.amount::numeric) from public.exact_transactions t where t.user_id=b.user_id and t.category_id=b.category_id and t.currency=b.currency and t.type='expense' and t.activity_kind='ordinary' and substr(t.financial_date,1,7)=to_char(b.month,'YYYY-MM') and t.transaction_date<=now()),0)::text as spent
from public.monthly_budgets b;

create table public.recurring_rules(
id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
description text not null check(length(btrim(description)) between 1 and 500),
amount numeric not null check(amount>0 and amount<10000000000000000 and amount=round(amount,case when currency='JPY' then 0 else 2 end)),
currency text not null check(currency in('MYR','USD','EUR','JPY')),type text not null check(type in('income','expense')),
account_id uuid,category_id uuid,payment_method_id uuid,start_date date not null,end_date date,
frequency text not null check(frequency in('daily','weekly','monthly','yearly')),
interval integer not null default 1 check(interval between 1 and 366),next_index integer not null default 0 check(next_index between 0 and 100000),
active boolean not null default true,created_at timestamptz not null default now(),unique(user_id,id),
check(end_date is null or end_date>=start_date),
foreign key(user_id,account_id,currency) references public.accounts(user_id,id,currency) on delete restrict,
foreign key(user_id,category_id,type) references public.categories(user_id,id,type) on delete restrict,
foreign key(user_id,payment_method_id) references public.payment_methods(user_id,id) on delete restrict
);
alter table public.transactions add column recurrence_id uuid;
alter table public.transactions add column recurrence_index integer;
alter table public.transactions add column import_key text;
alter table public.transactions add constraint recurring_owned_rule foreign key(user_id,recurrence_id) references public.recurring_rules(user_id,id) on delete restrict;
alter table public.transactions add constraint recurrence_pair check((recurrence_id is null)=(recurrence_index is null));
create unique index transaction_recurrence on public.transactions(user_id,recurrence_id,recurrence_index) where recurrence_id is not null;
create unique index transaction_import_key on public.transactions(user_id,import_key) where import_key is not null;
create view public.exact_recurring_rules with(security_invoker=true) as select id,user_id,description,amount::text,currency,type,account_id,category_id,payment_method_id,start_date::text,end_date::text,frequency,interval,next_index,active,created_at from public.recurring_rules;

create function public.record_recurring_occurrence(p_rule_id uuid,p_index integer,p_date date) returns uuid
language plpgsql security invoker set search_path='' as $$
declare rule public.recurring_rules; due date; base date; result uuid; zone text;
begin
select * into rule from public.recurring_rules where id=p_rule_id and user_id=auth.uid() for update;
if rule.id is null then raise exception 'Recurring rule unavailable.';end if;
select id into result from public.transactions where recurrence_id=rule.id and recurrence_index=p_index and user_id=auth.uid();
if result is not null then return result;end if;
if not rule.active or p_index<>rule.next_index then raise exception 'Record the next active occurrence.';end if;
if rule.frequency in('daily','weekly') then due:=rule.start_date+(p_index*rule.interval*(case when rule.frequency='weekly' then 7 else 1 end));
else
base:=(date_trunc('month',rule.start_date)+(p_index*rule.interval*(case when rule.frequency='yearly' then 12 else 1 end))*interval '1 month')::date;
due:=base+least(extract(day from rule.start_date)::integer,extract(day from (base+interval '1 month'-interval '1 day'))::integer)-1;
end if;
select financial_timezone into zone from public.profiles where id=auth.uid();
if zone is null then raise exception 'Configure a financial timezone first.';end if;
if p_date is distinct from due or (rule.end_date is not null and due>rule.end_date) or due>(now() at time zone zone)::date then raise exception 'Occurrence is not due in the financial timezone.';end if;
insert into public.transactions(user_id,amount,currency,type,account_id,category_id,payment_method_id,description,transaction_date,recurrence_id,recurrence_index)
values(auth.uid(),rule.amount,rule.currency,rule.type,rule.account_id,rule.category_id,rule.payment_method_id,rule.description,(due+time '12:00') at time zone zone,rule.id,p_index) returning id into result;
update public.recurring_rules set next_index=next_index+1 where id=rule.id;
return result;
end $$;

-- Validate every CSV row in one database transaction. Retry of the same batch
-- cannot duplicate rows. Optional semantic duplicate skipping is user-selected.
create function public.import_transactions(p_rows jsonb,p_batch uuid,p_skip_duplicates boolean) returns integer
language plpgsql security invoker set search_path='' as $$
declare entry jsonb; zone text; result integer:=0; inserted integer; idx integer:=0; instant timestamptz;
begin
if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>10000 or p_batch is null then raise exception 'Invalid bounded import batch.';end if;
select financial_timezone into zone from public.profiles where id=auth.uid();
if zone is null then raise exception 'Configure a financial timezone first.';end if;
-- Serialize imports for this user, including duplicate checks.
perform 1 from public.profiles where id=auth.uid() for update;
for entry in select value from jsonb_array_elements(p_rows) loop
idx:=idx+1;
if jsonb_typeof(entry->'amount')<>'string' then raise exception 'Import amounts must be exact decimal text.';end if;
instant:=((entry->>'date')::date+time '12:00') at time zone zone;
if not p_skip_duplicates or not exists(select 1 from public.transactions t where t.user_id=auth.uid() and (t.transaction_date at time zone zone)::date=(entry->>'date')::date and t.amount=(entry->>'amount')::numeric and t.currency=entry->>'currency' and t.type=entry->>'type' and t.description=entry->>'description' and t.account_id is not distinct from nullif(entry->>'account_id','')::uuid and t.category_id is not distinct from nullif(entry->>'category_id','')::uuid and t.payment_method_id is not distinct from nullif(entry->>'payment_method_id','')::uuid) then
insert into public.transactions(user_id,amount,currency,type,description,transaction_date,account_id,category_id,payment_method_id,import_key)
values(auth.uid(),(entry->>'amount')::numeric,entry->>'currency',entry->>'type',entry->>'description',instant,nullif(entry->>'account_id','')::uuid,nullif(entry->>'category_id','')::uuid,nullif(entry->>'payment_method_id','')::uuid,p_batch::text||':'||idx::text)
on conflict(user_id,import_key) where import_key is not null do nothing;
get diagnostics inserted=row_count;result:=result+inserted;
end if;
end loop;return result;
end $$;

create function public.transaction_page(p_filters jsonb,p_page integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
if p_page<1 or p_page>1000000 then raise exception 'Invalid page.';end if;
if (nullif(p_filters->>'min','') is not null or nullif(p_filters->>'max','') is not null) and nullif(p_filters->>'currency','') is null then raise exception 'Choose a native currency for amount bounds.';end if;
with filtered as (
select e.* from public.exact_transactions e join public.transactions t on t.id=e.id
left join public.categories c on c.id=e.category_id
where e.user_id=auth.uid()
and (coalesce(p_filters->>'search','')='' or strpos(lower(e.description||' '||coalesce(c.name,'')),lower(p_filters->>'search'))>0)
and (coalesce(p_filters->>'type','')='' or e.type=p_filters->>'type')
and (coalesce(p_filters->>'category','')='' or e.category_id=(p_filters->>'category')::uuid)
and (coalesce(p_filters->>'payment','')='' or e.payment_method_id=(p_filters->>'payment')::uuid)
and (coalesce(p_filters->>'account','')='' or e.account_id=(p_filters->>'account')::uuid)
and (coalesce(p_filters->>'currency','')='' or e.currency=p_filters->>'currency')
and (coalesce(p_filters->>'from','')='' or e.financial_date>=p_filters->>'from')
and (coalesce(p_filters->>'to','')='' or e.financial_date<=p_filters->>'to')
and (nullif(p_filters->>'min','') is null or t.amount>=(p_filters->>'min')::numeric)
and (nullif(p_filters->>'max','') is null or t.amount<=(p_filters->>'max')::numeric)
), paged as(select * from filtered order by transaction_date desc,id limit 15 offset (p_page-1)*15)
select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(paged)) from paged),'[]'::jsonb),'total',(select count(*) from filtered)) into result;
return result;
end $$;

do $$ declare tbl text;begin foreach tbl in array array['monthly_budgets','recurring_rules'] loop
execute format('alter table public.%I enable row level security',tbl);
execute format('revoke all on public.%I from public,anon,authenticated',tbl);
execute format('grant select,insert,update,delete on public.%I to authenticated',tbl);
execute format('create policy own_select on public.%I for select to authenticated using(user_id=(select auth.uid()))',tbl);
execute format('create policy own_insert on public.%I for insert to authenticated with check(user_id=(select auth.uid()))',tbl);
execute format('create policy own_update on public.%I for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',tbl);
execute format('create policy own_delete on public.%I for delete to authenticated using(user_id=(select auth.uid()))',tbl);
execute format('create policy require_session on public.%I as restrictive for all to authenticated using((select prism_private.session_allowed())) with check((select prism_private.session_allowed()))',tbl);
execute format('revoke all on public.exact_%I from public,anon,authenticated',tbl);
execute format('grant select on public.exact_%I to authenticated',tbl);
end loop;end $$;
revoke all on function public.record_recurring_occurrence(uuid,integer,date),public.import_transactions(jsonb,uuid,boolean) from public,anon;
grant execute on function public.record_recurring_occurrence(uuid,integer,date),public.import_transactions(jsonb,uuid,boolean) to authenticated;
revoke all on function public.transaction_page(jsonb,integer) from public,anon;
grant execute on function public.transaction_page(jsonb,integer) to authenticated;
revoke all on function prism_private.validate_budget() from public,anon,authenticated;
-- One subscription per signed-in workspace, with focus/reconnect refetch as a
-- fallback. Register every new visible entity in the existing publication.
do $$ declare tbl text; begin
 if exists(select 1 from pg_catalog.pg_publication where pubname='supabase_realtime') then
  foreach tbl in array array['transfers','monthly_budgets','recurring_rules'] loop
   if not exists(select 1 from pg_catalog.pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=tbl) then
    execute format('alter publication supabase_realtime add table public.%I',tbl);
   end if;
  end loop;
 end if;
end $$;
create index contribution_account on public.objective_contributions(user_id,account_id) where account_id is not null;
create index recurring_account on public.recurring_rules(user_id,account_id) where account_id is not null;
create index recurring_category on public.recurring_rules(user_id,category_id,type) where category_id is not null;
create index recurring_payment on public.recurring_rules(user_id,payment_method_id) where payment_method_id is not null;
notify pgrst,'reload schema';
commit;
