-- Read-only independent SQL oracle for APPROVED SYNTHETIC staging history only.
-- psql -v owner=<synthetic UUID> -v cutoff=<exact ISO instant> -f this-file
\set ON_ERROR_STOP on
begin transaction read only;
-- One consistent snapshot for every query; do not export production records.
set transaction isolation level repeatable read;

-- Fail before any timestamptz cast can round unsupported cutoff precision.
-- The text CASE is cast only after choosing its branch; invalid input is a
-- hard SQL error under ON_ERROR_STOP, never a silently rounded checkpoint.
select (case when :'cutoff' ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,6})?(Z|[+-](0[0-9]|1[0-5]):[0-5][0-9])$'
 and left(:'cutoff',4)<>'0000' then '1' else 'Invalid cutoff: explicit ISO and at most six fractional digits required' end)::integer as cutoff_shape_valid;
select (case when :'cutoff'::timestamptz>='0001-01-01T00:00:00Z'::timestamptz
 and :'cutoff'::timestamptz<'10000-01-01T00:00:00Z'::timestamptz
 then '1' else 'Invalid cutoff: UTC timestamp outside supported range' end)::integer as cutoff_range_valid;

-- CASH: every expected/actual difference must be 0; mappings must exist.
with legacy as (
 select a.id,a.user_id,a.currency,a.opening_balance
 +coalesce((select sum(case when t.type='income' then t.amount else -t.amount end)
   from public.transactions t where t.user_id=a.user_id and t.account_id=a.id
   and t.currency=a.currency and t.transaction_date<=:'cutoff'::timestamptz),0)
 +coalesce((select sum(t.destination_amount) from public.transfers t
   where t.user_id=a.user_id and t.destination_account_id=a.id
   and t.destination_currency=a.currency and t.occurred_at<=:'cutoff'::timestamptz),0)
 -coalesce((select sum(t.source_amount) from public.transfers t
   where t.user_id=a.user_id and t.source_account_id=a.id
   and t.source_currency=a.currency and t.occurred_at<=:'cutoff'::timestamptz),0)
 +coalesce((select sum(case when d.direction='i_owe' then -r.amount else r.amount end)
   from public.debt_repayments r join public.person_debts d on d.id=r.debt_id
   where r.user_id=a.user_id and r.currency=a.currency and r.account_id=a.id
   and r.transaction_id is null and r.paid_at<=:'cutoff'::timestamptz),0) as expected
 from public.accounts a where a.user_id=:'owner'::uuid
), compared as (
 select x.id,x.currency,x.expected,la.id as mapping,
 coalesce((select sum(case when l.side='debit' then l.amount else -l.amount end)
   from public.journal_lines l join public.journals j on j.id=l.journal_id
   join public.financial_events e on e.id=j.event_id
   where l.account_id=la.id and e.occurred_at<=:'cutoff'::timestamptz),0) as actual
 from legacy x left join public.ledger_accounts la on la.user_id=x.user_id
 and la.legacy_source='accounts' and la.legacy_id=x.id
 and la.currency=x.currency and la.classification='asset'
)
select 'accounts' as source,id,currency,mapping is not null as mapped,
 expected::text,actual::text,(actual-expected)::text as difference from compared order by id;

-- PRINCIPAL: linked transactions counted once; fees/interest classification
-- must already have affirmative approval outside this oracle.
with legacy as (
 select d.id,d.user_id,d.currency,d.direction,d.original_amount
 -coalesce((select sum(coalesce(r.amount,t.amount)) from public.debt_repayments r
   left join public.transactions t on t.id=r.transaction_id and t.user_id=r.user_id
   where r.debt_id=d.id and r.user_id=d.user_id
   and r.paid_at<=:'cutoff'::timestamptz),0) as expected
 from public.person_debts d where d.user_id=:'owner'::uuid
), compared as (
 select x.id,x.currency,x.expected,la.id as mapping,
 (case when x.direction='i_owe' then -1 else 1 end)
 *coalesce((select sum(case when l.side='debit' then l.amount else -l.amount end)
   from public.journal_lines l join public.journals j on j.id=l.journal_id
   join public.financial_events e on e.id=j.event_id
   where l.account_id=la.id and e.occurred_at<=:'cutoff'::timestamptz),0) as actual
 from legacy x left join public.ledger_accounts la on la.user_id=x.user_id
 and la.legacy_source='person_debts' and la.legacy_id=x.id and la.currency=x.currency
 and la.classification=case when x.direction='i_owe' then 'liability' else 'asset' end
)
select 'person_debts' as source,id,currency,mapping is not null as mapped,
 expected::text,actual::text,(actual-expected)::text as difference from compared order by id;

-- GOALS: allocation-only plus funded transfers; no second cash debit.
with compared as (
 select g.id,g.currency,
 coalesce((select sum(coalesce(c.amount,t.amount)) from public.objective_contributions c
   left join public.transactions t on t.id=c.transaction_id and t.user_id=c.user_id
   where c.objective_id=g.id and c.user_id=g.user_id
   and c.contributed_at<=:'cutoff'::timestamptz),0) as expected,
 coalesce((select sum(a.amount*a.direction) from public.ledger_allocations a
   join public.financial_events e on e.id=a.event_id
   where a.goal_id=g.id and a.user_id=g.user_id and a.currency=g.currency
   and e.occurred_at<=:'cutoff'::timestamptz),0) as actual
 from public.objectives g where g.user_id=:'owner'::uuid
)
select 'objectives' as source,id,currency,expected::text,actual::text,
 (actual-expected)::text as difference from compared order by id;

-- MONTHLY ORDINARY FLOWS: full outer join also detects extra ledger months.
-- Prerequisite: profile timezone unchanged and frozen dates match approved history.
with legacy as (
 select t.currency,date_trunc('month',t.transaction_date at time zone p.financial_timezone)::date as month,
 t.type,sum(t.amount) as amount
 from public.transactions t join public.profiles p on p.id=t.user_id
 where t.user_id=:'owner'::uuid and t.transaction_date<=:'cutoff'::timestamptz
 and not exists(select 1 from public.debt_repayments r where r.transaction_id=t.id)
 and not exists(select 1 from public.objective_contributions c where c.transaction_id=t.id)
 group by t.currency,month,t.type
), ledger as (
 select e.currency,date_trunc('month',e.financial_date)::date as month,
 case when a.classification='income' then 'income' else 'expense' end as type,
 sum((case when a.classification='income' then -1 else 1 end)
     *(case when l.side='debit' then l.amount else -l.amount end)) as amount
 from public.journal_lines l join public.journals j on j.id=l.journal_id
 join public.financial_events e on e.id=j.event_id
 join public.ledger_accounts a on a.id=l.account_id
 where e.user_id=:'owner'::uuid and e.occurred_at<=:'cutoff'::timestamptz
 and a.classification in ('income','expense') group by e.currency,month,type
)
select coalesce(x.currency,y.currency) as currency,coalesce(x.month,y.month)::text as month,
 coalesce(x.type,y.type) as type,coalesce(x.amount,0)::text as expected,
 coalesce(y.amount,0)::text as actual,(coalesce(y.amount,0)-coalesce(x.amount,0))::text as difference
from legacy x full join ledger y using(currency,month,type) order by currency,month,type;

-- Accepted fixture must have no unassigned effective transaction or FX transfer.
select id,'unassigned_cash' as anomaly from public.transactions
where user_id=:'owner'::uuid and account_id is null and transaction_date<=:'cutoff'::timestamptz;
select id,'unsupported_fx' as anomaly from public.transfers
where user_id=:'owner'::uuid and source_currency<>destination_currency and occurred_at<=:'cutoff'::timestamptz;
commit;
