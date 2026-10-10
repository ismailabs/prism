-- LOCAL PHASE 02 PROPOSAL. No legacy writes, automatic backfill or read cutover.
begin;
set local lock_timeout = '5s';

create table public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null check (code ~ '^[A-Za-z0-9:_-]{1,100}$'),
  classification text not null check(classification in ('asset','liability','equity','income','expense')),
  currency text not null check(currency in ('MYR','USD','EUR','JPY')),
  legacy_source text check(legacy_source in ('accounts','person_debts')),
  legacy_id uuid,
  created_at timestamptz not null default now(),
  check((legacy_source is null) = (legacy_id is null)),
  unique(user_id,code), unique(user_id,id,currency),
  unique(user_id,legacy_source,legacy_id)
);
create table public.financial_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_key text not null check(length(request_key) between 1 and 128),
  request_payload jsonb not null check(jsonb_typeof(request_payload)='object'),
  kind text not null check(kind in ('income','salary','expense','split_expense','transfer','opening','loan_payment','card_settlement','goal_earmark','goal_transfer','refund','reversal','adjustment')),
  currency text not null check(currency in ('MYR','USD','EUR','JPY')),
  occurred_at timestamptz not null check(isfinite(occurred_at)),
  financial_timezone text not null,
  financial_date date not null,
  posted_at timestamptz not null default now(),
  posting_xid xid8 not null default pg_current_xact_id(),
  reverses_event_id uuid,
  legacy_source text check(legacy_source in ('accounts','transactions','transfers','person_debts','debt_repayments','objective_contributions')),
  legacy_id uuid,
  check((legacy_source is null) = (legacy_id is null)),
  check((kind='reversal') = (reverses_event_id is not null)),
  unique(user_id,request_key), unique(user_id,id,currency),
  unique(user_id,legacy_source,legacy_id),
  foreign key(user_id,reverses_event_id,currency) references public.financial_events(user_id,id,currency)
);
create unique index ledger_single_reversal on public.financial_events(reverses_event_id) where reverses_event_id is not null;
create index ledger_events_period on public.financial_events(user_id,currency,financial_date,id);
create table public.journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null unique,
  currency text not null,
  unique(user_id,id,currency),
  foreign key(user_id,event_id,currency) references public.financial_events(user_id,id,currency) on delete cascade
);
create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journal_id uuid not null,
  account_id uuid not null,
  currency text not null,
  side text not null check(side in ('debit','credit')),
  amount numeric not null check(amount>0 and amount<10000000000000000 and amount=round(amount,case when currency='JPY' then 0 else 2 end)),
  ordinal smallint not null check(ordinal between 1 and 64),
  unique(journal_id,ordinal), unique(journal_id,account_id,side),
  foreign key(user_id,journal_id,currency) references public.journals(user_id,id,currency) on delete cascade,
  foreign key(user_id,account_id,currency) references public.ledger_accounts(user_id,id,currency)
);
create index ledger_lines_account on public.journal_lines(user_id,account_id,journal_id);
create table public.ledger_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null unique,
  goal_id uuid not null,
  currency text not null,
  amount numeric not null check(amount>0 and amount<10000000000000000 and amount=round(amount,case when currency='JPY' then 0 else 2 end)),
  direction smallint not null check(direction in (-1,1)),
  foreign key(user_id,event_id,currency) references public.financial_events(user_id,id,currency) on delete cascade
);
create index ledger_allocations_goal on public.ledger_allocations(user_id,goal_id,event_id);

create function prism_private.ledger_insert_only_during_posting() returns trigger
language plpgsql security invoker set search_path='' as $$
declare eid uuid;
begin
  if tg_table_name='journal_lines' then select event_id into eid from public.journals where id=new.journal_id;
  else eid:=new.event_id; end if;
  if not exists(select 1 from public.financial_events where id=eid and user_id=new.user_id and posting_xid=pg_current_xact_id()) then
    raise exception 'A posted event cannot acquire additional journal or allocation rows.' using errcode='23514';
  end if;
  return new;
end $$;
revoke all on function prism_private.ledger_insert_only_during_posting() from public,anon,authenticated;
create trigger ledger_posting_insert before insert on public.journals for each row execute function prism_private.ledger_insert_only_during_posting();
create trigger ledger_posting_insert before insert on public.journal_lines for each row execute function prism_private.ledger_insert_only_during_posting();
create trigger ledger_posting_insert before insert on public.ledger_allocations for each row execute function prism_private.ledger_insert_only_during_posting();

-- Immutable even for privileged accidental UPDATE. Only confirmed whole-user
-- erasure can cascade after the Auth parent is gone; no client DELETE grants.
create function prism_private.ledger_immutable() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='DELETE' and not exists(select 1 from auth.users where id=old.user_id) then return old; end if;
  raise exception 'Posted ledger history is immutable; use an explicit reversal.' using errcode='23514';
end $$;
revoke all on function prism_private.ledger_immutable() from public,anon,authenticated;

create function prism_private.ledger_complete() returns trigger
language plpgsql security invoker set search_path='' as $$
declare e public.financial_events; j uuid; n integer; net numeric; alloc integer;
begin
  select * into e from public.financial_events where id=new.id;
  if not found then return null; end if;
  select id into j from public.journals where event_id=e.id;
  select count(*) into alloc from public.ledger_allocations where event_id=e.id;
  if j is null then
    if alloc<>1 or e.kind not in ('goal_earmark','reversal') then raise exception 'Event requires a complete journal or allocation.' using errcode='23514'; end if;
  else
    select count(*),coalesce(sum(case when side='debit' then amount else -amount end),0) into n,net from public.journal_lines where journal_id=j;
    if n<2 or n>64 or net<>0 then raise exception 'Journal must balance exactly with 2 to 64 lines.' using errcode='23514'; end if;
    if e.kind='goal_earmark' or (e.kind='goal_transfer' and alloc<>1) or (alloc<>0 and e.kind not in ('goal_transfer','reversal')) then raise exception 'Invalid allocation/journal combination.' using errcode='23514'; end if;
  end if;
  return null;
end $$;
revoke all on function prism_private.ledger_complete() from public,anon,authenticated;
create constraint trigger ledger_complete after insert on public.financial_events
deferrable initially deferred for each row execute function prism_private.ledger_complete();

do $$ declare t text; begin
  foreach t in array array['ledger_accounts','financial_events','journals','journal_lines','ledger_allocations'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy own_select on public.%I for select to authenticated using (user_id=(select auth.uid()))',t);
    execute format('create policy require_session on public.%I as restrictive for all to authenticated using ((select prism_private.session_allowed())) with check ((select prism_private.session_allowed()))',t);
    execute format('create trigger ledger_immutable before update or delete on public.%I for each row execute function prism_private.ledger_immutable()',t);
  end loop;
end $$;

-- Definers are necessary to make RPCs the exclusive write path. Ownership and
-- Auth session/MFA are checked before every privileged read/write.
create function prism_private.create_ledger_account(p jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); result uuid; a public.ledger_accounts; source text:=p->>'legacy_source'; lid uuid;
begin
  if u is null or prism_private.session_allowed() is not true then raise exception 'Valid authenticated session required.' using errcode='42501'; end if;
  if jsonb_typeof(p)<>'object' or p is null or exists(select 1 from jsonb_object_keys(p) k where k not in ('code','classification','currency','legacy_source','legacy_id')) then raise exception 'Invalid account request.'; end if;
  lid:=(p->>'legacy_id')::uuid;
  perform pg_advisory_xact_lock(hashtextextended(u::text||':ledger-account:'||coalesce(p->>'code',''),0));
  select * into a from public.ledger_accounts where user_id=u and code=p->>'code';
  if found then
    if (a.classification,a.currency,a.legacy_source,a.legacy_id) is distinct from (p->>'classification',p->>'currency',source,lid) then raise exception 'Account identity conflict.' using errcode='23505'; end if;
    return a.id;
  end if;
  if source='accounts' and not exists(select 1 from public.accounts where id=lid and user_id=u and currency=p->>'currency' and p->>'classification'='asset') then raise exception 'Legacy cash mapping unavailable.'; end if;
  if source='person_debts' and not exists(select 1 from public.person_debts where id=lid and user_id=u and currency=p->>'currency' and p->>'classification'=case when direction='i_owe' then 'liability' else 'asset' end) then raise exception 'Legacy debt mapping unavailable.'; end if;
  insert into public.ledger_accounts(user_id,code,classification,currency,legacy_source,legacy_id)
  values(u,p->>'code',p->>'classification',p->>'currency',source,lid) returning id into result;
  return result;
end $$;
revoke all on function prism_private.create_ledger_account(jsonb) from public,anon,authenticated;
grant execute on function prism_private.create_ledger_account(jsonb) to authenticated;
create function public.create_ledger_account(p jsonb) returns uuid
language sql security invoker set search_path='' as $$ select prism_private.create_ledger_account(p) $$;
revoke all on function public.create_ledger_account(jsonb) from public,anon,authenticated;
grant execute on function public.create_ledger_account(jsonb) to authenticated;

create function prism_private.post_ledger_event(p jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  u uuid:=auth.uid(); e public.financial_events; original public.financial_events;
  eid uuid; jid uuid; line jsonb; idx integer:=0; amount_value numeric;
  k text:=p->>'kind'; c text:=p->>'currency'; occurred timestamptz;
  tz text; goal uuid; original_id uuid;
  a public.ledger_accounts; net numeric:=0; allocation numeric;
begin
  if u is null or prism_private.session_allowed() is not true then raise exception 'Valid authenticated session required.' using errcode='42501'; end if;
  if p is null or jsonb_typeof(p)<>'object' or exists(select 1 from jsonb_object_keys(p) key where key not in ('request_key','kind','currency','occurred_at','lines','goal_id','allocation_amount','reverses_event_id','legacy_source','legacy_id','reason_code')) then raise exception 'Invalid posting request.'; end if;
  goal:=(p->>'goal_id')::uuid; original_id:=(p->>'reverses_event_id')::uuid;
  if pg_column_size(p)>65536 then raise exception 'Posting request exceeds the supported size.'; end if;
  if p->>'request_key' is null or length(p->>'request_key') not between 1 and 128 then raise exception 'A stable request key is required.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text||':ledger-event:'||(p->>'request_key'),0));
  select * into e from public.financial_events where user_id=u and request_key=p->>'request_key';
  if found then
    if e.request_payload<>p then raise exception 'Request key reused with a changed payload.' using errcode='23505'; end if;
    return e.id;
  end if;
  -- Validate BEFORE timestamptz can round a seventh fractional digit. Match
  -- the domain transport range; reject leap seconds/24:00 and implicit offsets.
  if jsonb_typeof(p->'occurred_at') is distinct from 'string' or p->>'occurred_at' !~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,6})?(Z|[+-](0[0-9]|1[0-5]):[0-5][0-9])$' or left(p->>'occurred_at',4)='0000' then raise exception 'Explicit timestamp with at most six fractional digits required.'; end if;
  occurred:=(p->>'occurred_at')::timestamptz;
  if occurred<'0001-01-01T00:00:00Z'::timestamptz or occurred>='10000-01-01T00:00:00Z'::timestamptz then raise exception 'UTC timestamp outside supported range.'; end if;
  if occurred is null or not isfinite(occurred) or occurred>clock_timestamp() then raise exception 'Future items require confirmation at their effective time.'; end if;
  select coalesce(financial_timezone,'Asia/Kuala_Lumpur') into tz from public.profiles where id=u;
  if extract(year from occurred at time zone tz) not between 1 and 9999 then raise exception 'Financial calendar date outside supported range.'; end if;
  if k='adjustment' and (p->>'reason_code' is null or p->>'reason_code' !~ '^[A-Za-z0-9:_-]{1,100}$') then raise exception 'Adjustment requires an explicit reason code.'; end if;
  if k='reversal' then
    if p ? 'lines' or p ? 'goal_id' or p ? 'allocation_amount' then raise exception 'Reversal amounts are derived from the original.'; end if;
    select * into original from public.financial_events where id=original_id and user_id=u for update;
    if not found or original.kind='reversal' or original.currency<>c or occurred<original.occurred_at then raise exception 'Original event unavailable or reversal date/currency invalid.'; end if;
  elsif original_id is not null then raise exception 'Only reversals reference an original.';
  end if;
  if k in ('goal_earmark','goal_transfer') then
    if jsonb_typeof(p->'allocation_amount')<>'string' or p->>'allocation_amount' !~ '^[0-9]+(\.[0-9]+)?$' then raise exception 'Allocation must be decimal text.'; end if;
    allocation:=(p->>'allocation_amount')::numeric;
    if not exists(select 1 from public.objectives where id=goal and user_id=u and currency=c) then raise exception 'Goal unavailable or currency mismatch.'; end if;
  elsif goal is not null or p ? 'allocation_amount' then raise exception 'Allocation requires a goal event.';
  end if;
  insert into public.financial_events(user_id,request_key,request_payload,kind,currency,occurred_at,financial_timezone,financial_date,reverses_event_id,legacy_source,legacy_id)
  values(u,p->>'request_key',p,k,c,occurred,tz,(occurred at time zone tz)::date,original_id,p->>'legacy_source',(p->>'legacy_id')::uuid) returning id into eid;
  if k='reversal' then
    if exists(select 1 from public.journals where event_id=original_id) then
      insert into public.journals(user_id,event_id,currency) values(u,eid,c) returning id into jid;
      insert into public.journal_lines(user_id,journal_id,account_id,currency,side,amount,ordinal)
      select u,jid,l.account_id,c,case when l.side='debit' then 'credit' else 'debit' end,l.amount,l.ordinal
      from public.journal_lines l join public.journals j on j.id=l.journal_id where j.event_id=original_id;
    end if;
    insert into public.ledger_allocations(user_id,event_id,goal_id,currency,amount,direction)
    select u,eid,goal_id,c,amount,-direction from public.ledger_allocations where event_id=original_id;
  else
    if k='goal_earmark' then
      if p ? 'lines' then raise exception 'Earmarks do not move cash.'; end if;
    else
      if jsonb_typeof(p->'lines') is distinct from 'array' or jsonb_array_length(p->'lines') not between 2 and 64 then raise exception 'Expected 2 to 64 journal lines.'; end if;
      -- Stable lock order also serializes principal/settlement caps across keys.
      perform la.id from public.ledger_accounts la where la.user_id=u and la.id in
        (select (value->>'account_id')::uuid from jsonb_array_elements(p->'lines')) order by la.id for update;
      insert into public.journals(user_id,event_id,currency) values(u,eid,c) returning id into jid;
      for line in select value from jsonb_array_elements(p->'lines') loop
        idx:=idx+1;
        if jsonb_typeof(line)<>'object' or exists(select 1 from jsonb_object_keys(line) key where key not in ('account_id','side','amount')) or jsonb_typeof(line->'amount') is distinct from 'string' or line->>'amount' !~ '^[0-9]+(\.[0-9]+)?$' then raise exception 'Line amount must be exact decimal text.'; end if;
        amount_value:=(line->>'amount')::numeric;
        select * into a from public.ledger_accounts where id=(line->>'account_id')::uuid and user_id=u and currency=c;
        if not found then raise exception 'Ledger account unavailable or currency mismatch.'; end if;
        if k in ('loan_payment','card_settlement') and a.classification='liability' and amount_value>
          (select coalesce(sum(case when l.side='credit' then l.amount else -l.amount end),0) from public.journal_lines l where l.account_id=a.id and l.user_id=u)
        then raise exception 'Principal or settlement exceeds the posted liability.' using errcode='23514'; end if;
        if not (case k
          when 'income' then (line->>'side'='debit' and a.classification='asset') or (line->>'side'='credit' and a.classification='income')
          when 'salary' then (line->>'side'='debit' and a.classification='asset') or (line->>'side'='credit' and a.classification='income')
          when 'expense' then (line->>'side'='debit' and a.classification='expense') or (line->>'side'='credit' and a.classification in ('asset','liability'))
          when 'split_expense' then (line->>'side'='debit' and a.classification='expense') or (line->>'side'='credit' and a.classification in ('asset','liability'))
          when 'transfer' then a.classification='asset'
          when 'goal_transfer' then a.classification='asset'
          when 'loan_payment' then (line->>'side'='debit' and a.classification in ('liability','expense')) or (line->>'side'='credit' and a.classification='asset')
          when 'card_settlement' then (line->>'side'='debit' and a.classification='liability') or (line->>'side'='credit' and a.classification='asset')
          when 'refund' then (line->>'side'='debit' and a.classification='asset') or (line->>'side'='credit' and a.classification='expense')
          when 'opening' then a.classification in ('asset','liability','equity')
          when 'adjustment' then true
          else false end) then raise exception 'Line classification does not match this financial action.'; end if;
        insert into public.journal_lines(user_id,journal_id,account_id,currency,side,amount,ordinal)
        values(u,jid,a.id,c,line->>'side',amount_value,idx);
        net:=net+case when line->>'side'='debit' then amount_value else -amount_value end;
      end loop;
      if net<>0 then raise exception 'Journal must balance exactly.' using errcode='23514'; end if;
      if k in ('transfer','goal_transfer') and (idx<>2 or (select count(distinct account_id) from public.journal_lines where journal_id=jid)<>2) then raise exception 'Transfer requires two distinct assets.'; end if;
      if k='loan_payment' and not exists(select 1 from public.journal_lines l join public.ledger_accounts la on la.id=l.account_id where l.journal_id=jid and la.classification='liability') then raise exception 'Loan payment requires explicit principal.'; end if;
      if k='opening' and not exists(select 1 from public.journal_lines l join public.ledger_accounts la on la.id=l.account_id where l.journal_id=jid and la.classification='equity') then raise exception 'Opening requires explicit opening equity.'; end if;
      if k='goal_transfer' and allocation<>(select sum(amount) from public.journal_lines where journal_id=jid and side='debit') then raise exception 'Goal transfer allocation must equal destination funding.'; end if;
    end if;
    if k in ('goal_earmark','goal_transfer') then
      insert into public.ledger_allocations(user_id,event_id,goal_id,currency,amount,direction) values(u,eid,goal,c,allocation,1);
    end if;
  end if;
  return eid;
end $$;
revoke all on function prism_private.post_ledger_event(jsonb) from public,anon,authenticated;
grant execute on function prism_private.post_ledger_event(jsonb) to authenticated;
create function public.post_ledger_event(p jsonb) returns uuid
language sql security invoker set search_path='' as $$ select prism_private.post_ledger_event(p) $$;
revoke all on function public.post_ledger_event(jsonb) from public,anon,authenticated;
grant execute on function public.post_ledger_event(jsonb) to authenticated;

-- JSON read paths use decimal text; underlying numeric tables are advanced SQL
-- surfaces and must never be consumed as authoritative JSON numbers.
create view public.exact_ledger_lines with(security_invoker=true) as
select l.id,l.user_id,l.journal_id,j.event_id,l.account_id,a.code,a.classification,l.currency,l.side,
round(l.amount,case when l.currency='JPY' then 0 else 2 end)::text as amount,l.ordinal,e.kind,
to_char(e.occurred_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as occurred_at,e.financial_date::text,e.financial_timezone
from public.journal_lines l join public.journals j on j.id=l.journal_id
join public.financial_events e on e.id=j.event_id join public.ledger_accounts a on a.id=l.account_id;
create view public.exact_ledger_allocations with(security_invoker=true) as
select id,user_id,event_id,goal_id,currency,round(amount*direction,case when currency='JPY' then 0 else 2 end)::text as amount from public.ledger_allocations;
revoke all on public.exact_ledger_lines,public.exact_ledger_allocations from public,anon,authenticated;
grant select on public.exact_ledger_lines,public.exact_ledger_allocations to authenticated;
commit;
