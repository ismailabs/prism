-- PROPOSED STAGING CHECKS ONLY. Not run against a hosted target by this review.
-- Run only on a separately approved synthetic staging database after application.
-- All queries are read-only. Failure/empty expected sets are documented in the plan.
\set ON_ERROR_STOP on
begin transaction read only;
select current_setting('server_version') as postgres_version,
       current_setting('transaction_isolation') as isolation;

-- Five RLS tables, two invoker views. No FORCE RLS assumption for definers.
select c.relname,c.relrowsecurity,c.relforcerowsecurity,c.reloptions
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
 ('ledger_accounts','financial_events','journals','journal_lines','ledger_allocations',
  'exact_ledger_lines','exact_ledger_allocations') order by c.relname;
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname='public' and tablename in
 ('ledger_accounts','financial_events','journals','journal_lines','ledger_allocations')
order by tablename,policyname;
select n.nspname,p.proname,p.prosecdef,p.proconfig,
       pg_get_userbyid(p.proowner) as owner,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       p.proacl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','prism_private') and p.proname in
 ('post_ledger_event','create_ledger_account','ledger_complete','ledger_immutable',
  'ledger_insert_only_during_posting','session_allowed') order by n.nspname,p.proname;
select c.relname,r.role,
       has_table_privilege(r.role,c.oid,'SELECT') as can_select,
       has_table_privilege(r.role,c.oid,'INSERT') as can_insert,
       has_table_privilege(r.role,c.oid,'UPDATE') as can_update,
       has_table_privilege(r.role,c.oid,'DELETE') as can_delete,
       has_table_privilege(r.role,c.oid,'TRUNCATE') as can_truncate
from pg_class c join pg_namespace n on n.oid=c.relnamespace
cross join (values ('anon'),('authenticated')) r(role)
where n.nspname='public' and c.relname in
 ('ledger_accounts','financial_events','journals','journal_lines','ledger_allocations',
  'exact_ledger_lines','exact_ledger_allocations') order by c.relname,r.role;
select tgrelid::regclass as object,tgname,tgenabled,tgdeferrable,tginitdeferred
from pg_trigger where not tgisinternal and tgrelid in
 ('public.ledger_accounts'::regclass,'public.financial_events'::regclass,
  'public.journals'::regclass,'public.journal_lines'::regclass,'public.ledger_allocations'::regclass)
order by object,tgname;
select table_name,column_name,data_type from information_schema.columns
where table_schema='public' and table_name in ('exact_ledger_lines','exact_ledger_allocations')
and (column_name='amount' or (table_name='exact_ledger_lines' and column_name='occurred_at'));

-- Every following anomaly query must return ZERO ROWS.
select j.id,count(l.id) as lines,
       coalesce(sum(case when l.side='debit' then l.amount else -l.amount end),0)::text as imbalance
from public.journals j left join public.journal_lines l on l.journal_id=j.id
group by j.id having count(l.id) not between 2 and 64
or coalesce(sum(case when l.side='debit' then l.amount else -l.amount end),0)<>0;
select e.id,e.kind from public.financial_events e
left join public.journals j on j.event_id=e.id
left join public.ledger_allocations a on a.event_id=e.id
where (j.id is null and (a.id is null or e.kind not in ('goal_earmark','reversal')))
or (j.id is not null and (e.kind='goal_earmark'
    or (e.kind='goal_transfer' and a.id is null)
    or (a.id is not null and e.kind not in ('goal_transfer','reversal'))));
select l.id from public.journal_lines l join public.journals j on j.id=l.journal_id
join public.financial_events e on e.id=j.event_id join public.ledger_accounts a on a.id=l.account_id
where l.user_id<>j.user_id or l.user_id<>e.user_id or l.user_id<>a.user_id
or l.currency<>j.currency or l.currency<>e.currency or l.currency<>a.currency
or l.amount<=0 or l.amount>=10000000000000000
or l.amount<>round(l.amount,case when l.currency='JPY' then 0 else 2 end);
select user_id,request_key,count(*) from public.financial_events group by user_id,request_key having count(*)<>1;
select reverses_event_id,count(*) from public.financial_events where reverses_event_id is not null
group by reverses_event_id having count(*)<>1;
select e.id from public.financial_events e
where e.financial_date<>(e.occurred_at at time zone e.financial_timezone)::date;
select r.id from public.financial_events r
join public.financial_events o on o.id=r.reverses_event_id
where r.kind<>'reversal' or o.kind='reversal' or r.currency<>o.currency
or r.user_id<>o.user_id or r.occurred_at<o.occurred_at
or exists(
  (select l.account_id,l.currency,l.ordinal,l.amount,
          case when l.side='debit' then 'credit' else 'debit' end as side
   from public.journal_lines l join public.journals j on j.id=l.journal_id where j.event_id=o.id
   except
   select l.account_id,l.currency,l.ordinal,l.amount,l.side
   from public.journal_lines l join public.journals j on j.id=l.journal_id where j.event_id=r.id)
  union all
  (select l.account_id,l.currency,l.ordinal,l.amount,l.side
   from public.journal_lines l join public.journals j on j.id=l.journal_id where j.event_id=r.id
   except
   select l.account_id,l.currency,l.ordinal,l.amount,
          case when l.side='debit' then 'credit' else 'debit' end
   from public.journal_lines l join public.journals j on j.id=l.journal_id where j.event_id=o.id))
or exists(
  (select goal_id,currency,amount,-direction from public.ledger_allocations where event_id=o.id
   except select goal_id,currency,amount,direction from public.ledger_allocations where event_id=r.id)
  union all
  (select goal_id,currency,amount,direction from public.ledger_allocations where event_id=r.id
   except select goal_id,currency,amount,-direction from public.ledger_allocations where event_id=o.id));

-- Native balance sheet through the immutable fixture cutoff; all amounts TEXT.
with b as (
 select a.user_id,a.currency,a.classification,
        coalesce(sum(case when l.side='debit' then l.amount else -l.amount end),0) as signed
 from public.ledger_accounts a
 left join (public.journal_lines l join public.journals j on j.id=l.journal_id
            join public.financial_events e on e.id=j.event_id)
 on l.account_id=a.id and e.occurred_at<='2000-02-29T15:59:59Z'::timestamptz
 group by a.user_id,a.currency,a.classification
), s as (
 select user_id,currency,
 coalesce(sum(signed) filter(where classification='asset'),0) as assets,
 -coalesce(sum(signed) filter(where classification='liability'),0) as liabilities,
 -coalesce(sum(signed) filter(where classification in ('equity','income','expense')),0) as equity
 from b group by user_id,currency
)
select user_id,currency,assets::text,liabilities::text,equity::text,
       (assets-liabilities)::text as net_worth,(assets-liabilities-equity)::text as difference
from s order by user_id,currency;
commit;
