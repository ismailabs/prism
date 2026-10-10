begin;

-- Planning metadata only; financial amounts and ledger history remain unchanged.
create table public.goal_action_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  objective_id uuid not null,
  account_id uuid,
  currency text not null check(currency in ('MYR','USD','EUR','JPY')),
  cadence_amount numeric not null check(cadence_amount>0 and cadence_amount<10000000000000000 and cadence_amount=round(cadence_amount,case when currency='JPY' then 0 else 2 end)),
  frequency text not null check(frequency in ('weekly','monthly')),
  start_date date not null check(start_date>='1900-01-01' and start_date<'9999-01-01'),
  created_at timestamptz not null default now(),
  unique(user_id,objective_id),
  foreign key(user_id,objective_id,currency) references public.objectives(user_id,id,currency) on delete cascade,
  foreign key(user_id,account_id,currency) references public.accounts(user_id,id,currency) on delete set null(account_id)
);
create index goal_actions_account on public.goal_action_plans(user_id,account_id,currency) where account_id is not null;
alter table public.goal_action_plans enable row level security;
revoke all on public.goal_action_plans from public,anon,authenticated;
grant select,insert,update,delete on public.goal_action_plans to authenticated;
create policy own_select on public.goal_action_plans for select to authenticated using(user_id=(select auth.uid()));
create policy own_insert on public.goal_action_plans for insert to authenticated with check(user_id=(select auth.uid()));
create policy own_update on public.goal_action_plans for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_delete on public.goal_action_plans for delete to authenticated using(user_id=(select auth.uid()));
create policy require_session on public.goal_action_plans as restrictive for all to authenticated using((select prism_private.session_allowed())) with check((select prism_private.session_allowed()));
create view public.exact_goal_action_plans with(security_invoker=true) as
select id,user_id,objective_id,account_id,currency,round(cadence_amount,case when currency='JPY' then 0 else 2 end)::text as cadence_amount,frequency,start_date::text,created_at from public.goal_action_plans;
revoke all on public.exact_goal_action_plans from public,anon,authenticated;
grant select on public.exact_goal_action_plans to authenticated;

-- The caller supplies a stable identity for retries. Existing financial guards,
-- ownership constraints and unique transfer/transaction links still apply.
create function public.record_goal_contribution(p_id uuid,p_objective uuid,p_currency text,p_amount numeric,p_transfer uuid,p_account uuid,p_note text,p_at timestamptz)
returns uuid language plpgsql security invoker set search_path='' as $$
declare existing public.objective_contributions;
begin
  if auth.uid() is null or prism_private.session_allowed() is not true then raise exception 'Verified session required.' using errcode='42501'; end if;
  insert into public.objective_contributions(id,user_id,objective_id,currency,amount,transfer_id,account_id,note,contributed_at)
  values(p_id,auth.uid(),p_objective,p_currency,p_amount,p_transfer,p_account,p_note,p_at) on conflict(id) do nothing;
  select * into existing from public.objective_contributions where id=p_id and user_id=auth.uid();
  if existing.id is null or (existing.objective_id,existing.currency,existing.amount,existing.transfer_id,existing.account_id,existing.note,existing.contributed_at)
    is distinct from (p_objective,p_currency,p_amount,p_transfer,p_account,p_note,p_at)
  then raise exception 'Contribution retry differs from the original request.'; end if;
  return existing.id;
end $$;
revoke all on function public.record_goal_contribution(uuid,uuid,text,numeric,uuid,uuid,text,timestamptz) from public,anon;
grant execute on function public.record_goal_contribution(uuid,uuid,text,numeric,uuid,uuid,text,timestamptz) to authenticated;

-- Preserve columns, security and legacy links; derive progress only from
-- occurred source movements. The old exact view trusted the stored link amount
-- even when its transfer was future dated.
create or replace view public.exact_objective_contributions with(security_invoker=true) as
select c.id,c.user_id,c.objective_id,c.currency,
round(c.amount,case when c.currency='JPY' then 0 else 2 end)::text as amount,
c.transaction_id,c.note,c.contributed_at,c.created_at,c.account_id,c.transfer_id,
round(case when c.contributed_at>now() then 0
 when c.transfer_id is not null then coalesce((select case when t.occurred_at<=now() then t.destination_amount else 0 end from public.transfers t where t.id=c.transfer_id and t.user_id=c.user_id),0)
 when c.transaction_id is not null then coalesce((select case when t.transaction_date<=now() then t.amount else 0 end from public.transactions t where t.id=c.transaction_id and t.user_id=c.user_id),0)
 else c.amount end,case when c.currency='JPY' then 0 else 2 end)::text as effective_amount
from public.objective_contributions c;

-- Typed, owner-aligned relationships. Null an orphaned link, retain the private
-- annotation/reminder itself, and never cascade deletion toward finance.
create unique index transactions_owner_action_id on public.transactions(user_id,id);
create unique index budgets_owner_action_id on public.monthly_budgets(user_id,id);
create table public.financial_reminders (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 120),
 due_local timestamp without time zone not null check(due_local>='1900-01-01' and due_local<'9999-01-01'),
 timezone text not null,
 frequency text not null default 'once' check(frequency in ('once','daily','weekly','monthly','yearly')),
 interval integer not null default 1 check(interval between 1 and 120),
 importance text not null default 'normal' check(importance in ('low','normal','high')),
 state text not null default 'open' check(state in ('open','complete','dismissed')),
 archived boolean not null default false,
 transaction_id uuid,account_id uuid,debt_id uuid,objective_id uuid,budget_id uuid,period_month text check(period_month is null or (period_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' and period_month>='1900-01' and period_month<='9998-12')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,id),
 check(num_nonnulls(transaction_id,account_id,debt_id,objective_id,budget_id,period_month)<=1),
 foreign key(user_id,transaction_id) references public.transactions(user_id,id) on delete set null(transaction_id),
 foreign key(user_id,account_id) references public.accounts(user_id,id) on delete set null(account_id),
 foreign key(user_id,debt_id) references public.person_debts(user_id,id) on delete set null(debt_id),
 foreign key(user_id,objective_id) references public.objectives(user_id,id) on delete set null(objective_id),
 foreign key(user_id,budget_id) references public.monthly_budgets(user_id,id) on delete set null(budget_id)
);
create index reminders_owner_due on public.financial_reminders(user_id,archived,due_local,id);
create table public.financial_notes (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 120),
 body text not null default '' check(length(body)<=8000),tags text[] not null default '{}' check(cardinality(tags)<=8),
 pinned boolean not null default false,archived boolean not null default false,
 transaction_id uuid,account_id uuid,debt_id uuid,objective_id uuid,budget_id uuid,reminder_id uuid,period_month text check(period_month is null or (period_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' and period_month>='1900-01' and period_month<='9998-12')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 search_document tsvector generated always as(to_tsvector('simple'::regconfig,title||' '||body)) stored,
 check(num_nonnulls(transaction_id,account_id,debt_id,objective_id,budget_id,reminder_id,period_month)<=1),
 foreign key(user_id,transaction_id) references public.transactions(user_id,id) on delete set null(transaction_id),
 foreign key(user_id,account_id) references public.accounts(user_id,id) on delete set null(account_id),
 foreign key(user_id,debt_id) references public.person_debts(user_id,id) on delete set null(debt_id),
 foreign key(user_id,objective_id) references public.objectives(user_id,id) on delete set null(objective_id),
 foreign key(user_id,budget_id) references public.monthly_budgets(user_id,id) on delete set null(budget_id),
 foreign key(user_id,reminder_id) references public.financial_reminders(user_id,id) on delete set null(reminder_id)
);
create index notes_owner_page on public.financial_notes(user_id,archived,pinned desc,updated_at desc,id);
create index notes_search on public.financial_notes using gin(search_document);
create index notes_tags on public.financial_notes using gin(tags);
create table public.action_receipts (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 occurrence_key text not null check(length(occurrence_key) between 1 and 240),
 state text not null default 'read' check(state in ('read','complete','dismissed')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,occurrence_key)
);
create table public.action_preferences (
 id uuid primary key default gen_random_uuid(),user_id uuid not null unique references auth.users(id) on delete cascade,
 reminders_enabled boolean not null default true,debt_enabled boolean not null default true,
 recurring_enabled boolean not null default true,budget_enabled boolean not null default true,goal_enabled boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create function prism_private.validate_action_record() returns trigger language plpgsql security invoker set search_path='' as $$
declare tag text; instant timestamptz; matches integer;
begin
 if tg_op='UPDATE' then
  if (new.id,new.user_id,new.created_at) is distinct from (old.id,old.user_id,old.created_at) then raise exception 'Action ownership and creation identity cannot change.';end if;
 end if;
 new.updated_at:=now();
 if tg_table_name='financial_notes' then
  foreach tag in array new.tags loop
   if tag is null or length(btrim(tag)) not between 1 and 32 or tag !~ '^[[:alnum:] _-]+$' then raise exception 'Use up to eight plain tags, each at most 32 characters.';end if;
  end loop;
 elsif tg_table_name='financial_reminders' then
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone and (name like '%/%' or name='UTC')) then raise exception 'Valid IANA timezone required.';end if;
  if date_trunc('minute',new.due_local)<>new.due_local then raise exception 'Reminder precision is one minute.';end if;
  instant:=new.due_local at time zone new.timezone;
  select count(*) into matches from generate_series(-56,56) s where ((instant+s*interval '15 minutes') at time zone new.timezone)=new.due_local;
  if matches<>1 then raise exception 'Reminder time is missing or ambiguous due to daylight saving.';end if;
 end if;
 return new;
end $$;
revoke all on function prism_private.validate_action_record() from public,anon,authenticated;
do $$ declare tbl text;begin
 foreach tbl in array array['financial_notes','financial_reminders','action_receipts','action_preferences'] loop
  execute format('alter table public.%I enable row level security',tbl);
  execute format('revoke all on public.%I from public,anon,authenticated',tbl);
  execute format('grant select,insert,update,delete on public.%I to authenticated',tbl);
  execute format('create policy own_select on public.%I for select to authenticated using(user_id=(select auth.uid()))',tbl);
  execute format('create policy own_insert on public.%I for insert to authenticated with check(user_id=(select auth.uid()))',tbl);
  execute format('create policy own_update on public.%I for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',tbl);
  execute format('create policy own_delete on public.%I for delete to authenticated using(user_id=(select auth.uid()))',tbl);
  execute format('create policy require_session on public.%I as restrictive for all to authenticated using((select prism_private.session_allowed())) with check((select prism_private.session_allowed()))',tbl);
  execute format('create trigger validate_action before insert or update on public.%I for each row execute function prism_private.validate_action_record()',tbl);
 end loop;
end $$;
-- Foreign key lookup indexes for reference deletion and integrity checks.
do $$ declare tbl text;col text;begin
 foreach tbl in array array['financial_notes','financial_reminders'] loop
  foreach col in array array['transaction_id','account_id','debt_id','objective_id','budget_id'] loop
   execute format('create index %I on public.%I(user_id,%I) where %I is not null',tbl||'_'||col,tbl,col,col);
  end loop;
 end loop;
end $$;
create index notes_reminder on public.financial_notes(user_id,reminder_id) where reminder_id is not null;
notify pgrst,'reload schema';
commit;
