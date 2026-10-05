begin;
alter table public.profiles add column default_analysis_period text not null default 'month'
  check (default_analysis_period in ('month','last-3-months','last-6-months','last-12-months','year-to-date','all-time'));
grant update(default_analysis_period) on public.profiles to authenticated;
-- Inherit exact_transactions ownership, current-session and MFA restrictions.
-- Calendar dates are resolved by that view using the authenticated profile zone.
create view public.finance_daily_totals with (security_invoker=true) as
select user_id, financial_date, substr(financial_date,1,7) as month,
  currency,type,category_id,sum(amount::numeric)::text as amount,
  count(*)::integer as transaction_count
from public.exact_transactions
where activity_kind='ordinary' and transaction_date<=now()
group by user_id,financial_date,currency,type,category_id;
revoke all on public.finance_daily_totals from public,anon,authenticated;
grant select on public.finance_daily_totals to authenticated;
-- Management cards must count all linked records, not the recent-activity page.
create view public.finance_list_usage with (security_invoker=true) as
select user_id,'categories'::text as resource,category_id as id,count(*)::integer as transaction_count
from public.transactions where category_id is not null group by user_id,category_id
union all
select user_id,'payments'::text,payment_method_id,count(*)::integer
from public.transactions where payment_method_id is not null group by user_id,payment_method_id;
revoke all on public.finance_list_usage from public,anon,authenticated;
grant select on public.finance_list_usage to authenticated;
commit;
