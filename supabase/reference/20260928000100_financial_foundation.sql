-- Phase 2 ONLY. Apply to an isolated restored baseline before any release.
-- Atomic migration: original transactions and payment labels remain intact.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 60),
  type text not null check(type in ('cash','bank','savings','credit','loan','investment','e_wallet')),
  currency text not null default 'MYR' check(currency in ('MYR','USD','EUR','JPY')),
  opening_balance numeric not null default 0,
  opening_date date not null default (now() at time zone 'Asia/Kuala_Lumpur')::date,
  archived boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,id,currency),
  check(opening_balance between -9999999999999999.99 and 9999999999999999.99 and opening_balance=round(opening_balance,case when currency='JPY' then 0 else 2 end))
);
create unique index accounts_owner_name_currency on public.accounts(user_id,lower(btrim(name)),currency);
alter table public.categories add column parent_id uuid;
alter table public.categories add constraint category_owned_parent foreign key(user_id,parent_id,type) references public.categories(user_id,id,type);
alter table public.categories add constraint category_not_self check(parent_id is distinct from id);
create index category_parent_idx on public.categories(user_id,parent_id,type);
create function prism_private.check_category_parent() returns trigger language plpgsql set search_path='' as $$
begin
  -- One explicit subcategory level; locks prevent racing parent/child changes.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,201));
  if new.parent_id is not null and (exists(select 1 from public.categories where id=new.parent_id and parent_id is not null) or exists(select 1 from public.categories where parent_id=new.id)) then
    raise exception 'Subcategories must belong directly to a top-level category.' using errcode='23514';
  end if;
  return new;
end $$;
create trigger category_parent_guard before insert or update on public.categories for each row execute function prism_private.check_category_parent();

create table public.recurring_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(length(btrim(name)) between 1 and 100),
  template jsonb not null check(jsonb_typeof(template)='object' and pg_column_size(template)<16384),
  frequency text not null check(frequency in ('daily','weekly','monthly','yearly')),
  interval_count integer not null default 1 check(interval_count between 1 and 366),
  start_date date not null, end_date date, next_index integer not null default 0 check(next_index>=0),
  confirmation text not null default 'manual' check(confirmation='manual'),
  active boolean not null default true, version integer not null default 1,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  unique(user_id,id), check(end_date is null or end_date>=start_date)
);
create table public.import_batches (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  request_hash text not null, file_name text not null check(length(file_name)<=255),
  imported_count integer not null, skipped_count integer not null,
  created_at timestamptz not null default now(), unique(user_id,id)
);
create table public.financial_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('income','expense','transfer','debt_payment','goal_contribution','investment','refund','adjustment')),
  amount numeric not null,
  currency text not null default 'MYR' check(currency in ('MYR','USD','EUR','JPY')),
  account_id uuid, destination_account_id uuid,
  category_id uuid, category_type text,
  payment_method_id uuid,
  principal numeric, interest numeric,
  merchant text not null default '' check(length(merchant)<=120),
  description text not null default '' check(length(description)<=500),
  tags text[] not null default '{}' check(cardinality(tags)<=12),
  status text not null default 'posted' check(status in ('pending','posted','voided')),
  occurred_at timestamptz not null, business_date date not null,
  recurring_id uuid, occurrence_index integer,
  import_batch_id uuid,
  origin text not null default 'manual' check(origin in ('legacy','manual','csv','recurring')),
  legacy_id uuid unique references public.transactions(id),
  extension_links jsonb not null default '{}' check(extension_links='{}'::jsonb),
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,id), unique(recurring_id,occurrence_index),
  foreign key(user_id,account_id,currency) references public.accounts(user_id,id,currency),
  foreign key(user_id,destination_account_id,currency) references public.accounts(user_id,id,currency),
  foreign key(user_id,category_id,category_type) references public.categories(user_id,id,type),
  foreign key(user_id,payment_method_id) references public.payment_methods(user_id,id),
  foreign key(user_id,recurring_id) references public.recurring_items(user_id,id),
  foreign key(user_id,import_batch_id) references public.import_batches(user_id,id),
  check(amount between -9999999999999999.99 and 9999999999999999.99 and amount<>0 and amount=round(amount,case when currency='JPY' then 0 else 2 end)),
  check(kind='adjustment' or amount>0),
  check((category_id is null and category_type is null) or (category_id is not null and category_type is not null and category_type=case when kind='income' then 'income' else 'expense' end and kind in ('income','expense','refund','debt_payment'))),
  check((kind in ('transfer','debt_payment','goal_contribution','investment') and account_id is not null and destination_account_id is not null and account_id<>destination_account_id) or (kind not in ('transfer','debt_payment','goal_contribution','investment') and destination_account_id is null)),
  check(account_id is not null or origin='legacy'),
  check((kind='debt_payment' and principal is not null and interest is not null and principal>=0 and interest>=0 and principal+interest=amount and principal=round(principal,case when currency='JPY' then 0 else 2 end)) or (kind<>'debt_payment' and principal is null and interest is null)),
  check((recurring_id is null)=(occurrence_index is null))
);
create index events_owner_date on public.financial_events(user_id,business_date desc,id);
create index events_source on public.financial_events(user_id,account_id,currency);
create index events_destination on public.financial_events(user_id,destination_account_id,currency);
create index events_category on public.financial_events(user_id,category_id,category_type);
create index events_import on public.financial_events(user_id,import_batch_id);
create index recurring_owner on public.recurring_items(user_id,active);
create table public.event_audit (
  id bigint generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null, action text not null, before_record jsonb, after_record jsonb,
  created_at timestamptz not null default now()
);
create index event_audit_owner_event on public.event_audit(user_id,event_id,id);

-- Copy exactly. Payment labels are NOT accounts; balances are not inferred.
insert into public.financial_events(id,user_id,kind,amount,currency,category_id,category_type,payment_method_id,description,occurred_at,business_date,origin,legacy_id,created_at,updated_at)
select id,user_id,type,amount,currency,category_id,case when category_id is not null then type end,payment_method_id,description,transaction_date,(transaction_date at time zone 'Asia/Kuala_Lumpur')::date,'legacy',id,created_at,created_at from public.transactions;
do $$ begin
  if exists(select 1 from public.transactions t full join public.financial_events e on e.legacy_id=t.id where t.id is null or e.id is null or (t.id,t.user_id,t.type,t.amount,t.currency,t.category_id,t.payment_method_id,t.description,t.transaction_date,t.created_at) is distinct from (e.id,e.user_id,e.kind,e.amount,e.currency,e.category_id,e.payment_method_id,e.description,e.occurred_at,e.created_at)) then raise exception 'Legacy reconciliation failed'; end if;
end $$;

create function prism_private.event_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare a public.accounts; d public.accounts;
begin
  if tg_op='UPDATE' and (new.user_id,new.id,new.origin,new.legacy_id,new.created_at,new.recurring_id,new.occurrence_index,new.import_batch_id) is distinct from (old.user_id,old.id,old.origin,old.legacy_id,old.created_at,old.recurring_id,old.occurrence_index,old.import_batch_id) then raise exception 'Event identity and provenance are immutable.'; end if;
  if new.account_id is not null then
    select * into a from public.accounts where id=new.account_id and user_id=new.user_id for share;
    if a.id is null or a.currency<>new.currency or (new.status<>'voided' and (a.archived or new.business_date<a.opening_date)) then raise exception 'Account unavailable, currency mismatch, or date precedes opening date.'; end if;
  end if;
  if new.destination_account_id is not null then
    select * into d from public.accounts where id=new.destination_account_id and user_id=new.user_id for share;
    if d.id is null or d.currency<>new.currency or (new.status<>'voided' and (d.archived or new.business_date<d.opening_date)) then raise exception 'Destination unavailable, currency mismatch, or date precedes opening date.'; end if;
    if new.kind='debt_payment' and d.type not in ('credit','loan') then raise exception 'Debt payments require a credit or loan destination.'; end if;
    if new.kind='investment' and d.type<>'investment' then raise exception 'Investment movement requires an investment destination.'; end if;
  end if;
  if new.business_date<>(new.occurred_at at time zone 'Asia/Kuala_Lumpur')::date then raise exception 'Business date must match the Asia/Kuala_Lumpur timestamp date.'; end if;
  if exists(select 1 from unnest(new.tags) tag where length(btrim(tag)) not between 1 and 40) then raise exception 'Tags must contain 1–40 characters.'; end if;
  if tg_op='UPDATE' then new.version:=old.version+1; new.updated_at:=now(); end if;
  return new;
end $$;
create trigger financial_event_guard before insert or update on public.financial_events for each row execute function prism_private.event_guard();
create function prism_private.audit_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.event_audit(user_id,event_id,action,before_record,after_record) values(new.user_id,new.id,tg_op,case when tg_op='UPDATE' then to_jsonb(old) end,to_jsonb(new)); return new;
end $$;
create trigger event_audit_trigger after insert or update on public.financial_events for each row execute function prism_private.audit_event();

do $$ declare t text; begin
 foreach t in array array['accounts','financial_events','recurring_items','import_batches','event_audit'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy own_read on public.%I for select to authenticated using (user_id=(select auth.uid()) and (select prism_private.session_allowed()))',t);
 end loop;
end $$;

create function prism_private.require_finance_user() returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); begin
 if u is null or not coalesce(prism_private.session_allowed(),false) then raise exception 'A current verified session is required.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,202));
 return u;
end $$;
create function prism_private.money_text(v text,c text,allow_negative boolean default false) returns numeric language plpgsql immutable set search_path='' as $$
declare n numeric; begin
 if v is null or v!~(case when allow_negative then '^-?[0-9]+(\.[0-9]+)?$' else '^[0-9]+(\.[0-9]+)?$' end) then raise exception 'Amount must be an exact decimal string.'; end if;
 n:=v::numeric;
 if c not in ('MYR','USD','EUR','JPY') or c is null or abs(n)>9999999999999999.99 or n<>round(n,case when c='JPY' then 0 else 2 end) then raise exception 'Invalid currency, amount precision or range.'; end if;
 return n;
end $$;
create function prism_private.event_json(e public.financial_events) returns jsonb language sql immutable set search_path='' as $$
 select to_jsonb(e)||jsonb_build_object('amount',e.amount::text,'principal',e.principal::text,'interest',e.interest::text)
$$;
create function public.finance_save_account(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=prism_private.require_finance_user(); a public.accounts; ident uuid:=coalesce((p->>'id')::uuid,gen_random_uuid()); c text:=coalesce(p->>'currency','MYR'); bal numeric;
begin
 bal:=prism_private.money_text(coalesce(p->>'opening_balance','0'),c,true);
 if p ? 'id' then
  select * into a from public.accounts where id=ident and user_id=u for update;
  if a.id is null or a.version is distinct from (p->>'version')::integer or not(p ? 'version') then raise exception 'Account changed or is unavailable. Refresh before editing.' using errcode='40001'; end if;
  if (a.currency,a.opening_balance,a.opening_date,a.type) is distinct from (c,bal,(p->>'opening_date')::date,p->>'type') and exists(select 1 from public.financial_events where account_id=ident or destination_account_id=ident) then raise exception 'Account currency, type and opening position cannot change after use. Record an adjustment instead.'; end if;
  update public.accounts set name=btrim(p->>'name'),type=p->>'type',currency=c,opening_balance=bal,opening_date=(p->>'opening_date')::date,archived=coalesce((p->>'archived')::boolean,false),version=version+1,updated_at=now() where id=ident returning * into a;
 else
  insert into public.accounts(id,user_id,name,type,currency,opening_balance,opening_date) values(ident,u,btrim(p->>'name'),p->>'type',c,bal,(p->>'opening_date')::date) returning * into a;
 end if;
 return to_jsonb(a)||jsonb_build_object('opening_balance',a.opening_balance::text);
end $$;

create function prism_private.save_event(p jsonb,u uuid,source text default 'manual',batch uuid default null,recurring uuid default null,occurrence integer default null) returns public.financial_events language plpgsql set search_path='' as $$
declare e public.financial_events; ident uuid:=coalesce((p->>'id')::uuid,gen_random_uuid()); c text:=coalesce(p->>'currency','MYR'); k text:=p->>'kind'; n numeric; cat uuid:=nullif(p->>'category_id','')::uuid; stamp timestamptz; day date;
begin
 n:=prism_private.money_text(p->>'amount',c,k='adjustment');
 if p ? 'occurred_at' then stamp:=(p->>'occurred_at')::timestamptz; else stamp:=((p->>'business_date')::date+time '12:00') at time zone 'Asia/Kuala_Lumpur'; end if;
 day:=(stamp at time zone 'Asia/Kuala_Lumpur')::date;
 if p ? 'id' then
  select * into e from public.financial_events where id=ident and user_id=u for update;
  if e.id is null or not(p ? 'version') or e.version is distinct from (p->>'version')::integer then raise exception 'Transaction changed or is unavailable. Refresh before editing.' using errcode='40001'; end if;
  update public.financial_events set kind=k,amount=n,currency=c,account_id=nullif(p->>'account_id','')::uuid,destination_account_id=nullif(p->>'destination_account_id','')::uuid,category_id=cat,category_type=case when cat is not null then case when k='income' then 'income' else 'expense' end end,
   principal=case when k='debt_payment' then prism_private.money_text(p->>'principal',c) end,interest=case when k='debt_payment' then prism_private.money_text(p->>'interest',c) end,
   description=coalesce(p->>'description',''),merchant=coalesce(p->>'merchant',''),tags=coalesce(array(select jsonb_array_elements_text(p->'tags')),'{}'),status=coalesce(p->>'status','posted'),occurred_at=stamp,business_date=day where id=ident returning * into e;
 else
  insert into public.financial_events(id,user_id,kind,amount,currency,account_id,destination_account_id,category_id,category_type,principal,interest,description,merchant,tags,status,occurred_at,business_date,origin,import_batch_id,recurring_id,occurrence_index)
  values(ident,u,k,n,c,nullif(p->>'account_id','')::uuid,nullif(p->>'destination_account_id','')::uuid,cat,case when cat is not null then case when k='income' then 'income' else 'expense' end end,
   case when k='debt_payment' then prism_private.money_text(p->>'principal',c) end,case when k='debt_payment' then prism_private.money_text(p->>'interest',c) end,
   coalesce(p->>'description',''),coalesce(p->>'merchant',''),coalesce(array(select jsonb_array_elements_text(p->'tags')),'{}'),coalesce(p->>'status','posted'),stamp,day,source,batch,recurring,occurrence) returning * into e;
 end if;
 return e;
end $$;
create function public.finance_save_event(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=prism_private.require_finance_user(); e public.financial_events; begin
 e:=prism_private.save_event(p,u); return prism_private.event_json(e);
end $$;
create function public.finance_void_event(p_id uuid,p_version integer) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=prism_private.require_finance_user(); begin
 update public.financial_events set status='voided' where id=p_id and user_id=u and version=p_version;
 if not found then raise exception 'Transaction changed or is unavailable.' using errcode='40001'; end if;
end $$;

create function public.finance_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=prism_private.require_finance_user(); result jsonb;
begin
 select jsonb_build_object(
 'accounts',coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object('opening_balance',a.opening_balance::text,'balance',(a.opening_balance+coalesce((select sum(x.delta) from (
   select case when e.kind in ('income','refund') then e.amount when e.kind='adjustment' then e.amount else -e.amount end as delta from public.financial_events e where e.user_id=u and e.account_id=a.id and e.status='posted' and e.business_date<=(now() at time zone 'Asia/Kuala_Lumpur')::date
   union all select case when e.kind='debt_payment' then e.principal else e.amount end from public.financial_events e where e.user_id=u and e.destination_account_id=a.id and e.status='posted' and e.business_date<=(now() at time zone 'Asia/Kuala_Lumpur')::date
 )x),0))::text)) from public.accounts a where user_id=u),'[]'::jsonb),
 'events',coalesce((select jsonb_agg(prism_private.event_json(e) order by business_date desc,id) from public.financial_events e where user_id=u),'[]'::jsonb),
 'recurring',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('next_date',prism_private.recurring_date(r.start_date,r.frequency,r.interval_count,r.next_index))) from public.recurring_items r where user_id=u),'[]'::jsonb)
 ) into result;
 return result;
end $$;

create function prism_private.recurring_date(anchor date,frequency text,step integer,idx integer) returns date language sql immutable set search_path='' as $$
 select case frequency when 'daily' then anchor+step*idx when 'weekly' then anchor+7*step*idx when 'monthly' then (anchor+make_interval(months=>step*idx))::date when 'yearly' then (anchor+make_interval(years=>step*idx))::date end
$$;
create function public.finance_save_recurring(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=prism_private.require_finance_user(); r public.recurring_items; t jsonb:=p->'template'; c text:=t->>'currency'; a public.accounts;
begin
 -- Validate references now, and fully validate again when confirmed. Rules never move money by themselves.
 perform prism_private.money_text(t->>'amount',c,(t->>'kind')='adjustment');
 if t->>'kind' not in ('income','expense','transfer','debt_payment','goal_contribution','investment','refund','adjustment') or t->>'kind' is null then raise exception 'Invalid recurring type'; end if;
 select * into a from public.accounts where id=(t->>'account_id')::uuid and user_id=u and currency=c and not archived;
 if a.id is null then raise exception 'Select an active account you own.'; end if;
 if nullif(t->>'destination_account_id','') is not null and not exists(select 1 from public.accounts where id=(t->>'destination_account_id')::uuid and user_id=u and currency=c and not archived) then raise exception 'Invalid destination'; end if;
 if nullif(t->>'category_id','') is not null and not exists(select 1 from public.categories where id=(t->>'category_id')::uuid and user_id=u) then raise exception 'Invalid category'; end if;
 t:=t-'id'-'version'-'occurred_at'-'business_date';
 if p ? 'id' then
  update public.recurring_items set active=(p->>'active')::boolean,version=version+1,updated_at=now() where id=(p->>'id')::uuid and user_id=u and version=(p->>'version')::integer returning * into r;
  if not found then raise exception 'Recurring item changed or is unavailable.' using errcode='40001'; end if;
 else
  insert into public.recurring_items(user_id,name,template,frequency,interval_count,start_date,end_date) values(u,p->>'name',t,p->>'frequency',(p->>'interval_count')::integer,(p->>'start_date')::date,nullif(p->>'end_date','')::date) returning * into r;
 end if;
 return to_jsonb(r);
end $$;
create function public.finance_confirm_recurring(p_id uuid,p_index integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=prism_private.require_finance_user(); r public.recurring_items; e public.financial_events; day date;
begin
 select * into r from public.recurring_items where id=p_id and user_id=u for update;
 if r.id is null then raise exception 'Recurring item unavailable'; end if;
 select * into e from public.financial_events where recurring_id=p_id and occurrence_index=p_index and user_id=u;
 if found then return prism_private.event_json(e); end if;
 if not r.active or r.next_index<>p_index then raise exception 'Occurrence changed or rule is paused.'; end if;
 day:=prism_private.recurring_date(r.start_date,r.frequency,r.interval_count,p_index);
 if day>(now() at time zone 'Asia/Kuala_Lumpur')::date or (r.end_date is not null and day>r.end_date) then raise exception 'Occurrence is not due.'; end if;
 e:=prism_private.save_event(r.template||jsonb_build_object('business_date',day,'status','posted'),u,'recurring',null,p_id,p_index);
 update public.recurring_items set next_index=next_index+1,version=version+1,updated_at=now() where id=p_id;
 return prism_private.event_json(e);
end $$;

create function public.finance_import(p_id uuid,p_file_name text,p_rows jsonb,p_skip_duplicates boolean default true) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=prism_private.require_finance_user(); b public.import_batches; row jsonb; e public.financial_events; imported integer:=0; skipped integer:=0; h text; n numeric; day date;
begin
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 1000 or pg_column_size(p_rows)>5242880 then raise exception 'Import between 1 and 1,000 validated rows.'; end if;
 h:=md5(p_rows::text||p_skip_duplicates::text);
 select * into b from public.import_batches where id=p_id and user_id=u;
 if found then if b.request_hash<>h then raise exception 'Import ID reused with different content.'; end if; return to_jsonb(b); end if;
 insert into public.import_batches(id,user_id,request_hash,file_name,imported_count,skipped_count) values(p_id,u,h,p_file_name,0,0);
 for row in select value from jsonb_array_elements(p_rows) loop
  if row->>'kind' not in ('income','expense') or row->>'kind' is null or row ? 'id' or row ? 'occurred_at' then raise exception 'CSV imports accept new dated income/expense records only.'; end if;
  n:=prism_private.money_text(row->>'amount',row->>'currency'); day:=(row->>'business_date')::date;
  if p_skip_duplicates and exists(select 1 from public.financial_events where user_id=u and status<>'voided' and kind=row->>'kind' and amount=n and currency=row->>'currency' and business_date=day and description=coalesce(row->>'description','') and account_id=(row->>'account_id')::uuid) then skipped:=skipped+1;
  else e:=prism_private.save_event(row||jsonb_build_object('status','posted'),u,'csv',p_id); imported:=imported+1; end if;
 end loop;
 update public.import_batches set imported_count=imported,skipped_count=skipped where id=p_id returning * into b;
 return to_jsonb(b);
end $$;

-- The new application writes the canonical model. The legacy table is an immutable
-- history source during the rollback window; do not deploy old writers to staging.
revoke insert,update,delete on public.transactions from authenticated;
alter table public.profiles alter column currency set default 'MYR';
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='prism_private' and p.proname in ('check_category_parent','event_guard','audit_event','require_finance_user','money_text','event_json','save_event','recurring_date')) or (n.nspname='public' and p.proname like 'finance_%') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  if f.signature::text like 'finance_%' then execute format('grant execute on function %s to authenticated',f.signature); end if;
 end loop;
end $$;
notify pgrst,'reload schema';
commit;

