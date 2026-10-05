begin;
-- Future progress must agree with present balances. Retain scheduled raw amounts
-- and all existing view columns/security; only the computed present amount changes.
do $$ declare tbl text; cols text; activity_date text; begin
  foreach tbl in array array['objective_contributions','debt_repayments'] loop
    select string_agg(case when data_type='numeric' then format('round(t.%I,case when t.currency=''JPY'' then 0 else 2 end)::text as %I',column_name,column_name) else format('t.%I',column_name) end,', ' order by ordinal_position)
    into cols from information_schema.columns where table_schema='public' and table_name=tbl;
    activity_date := case when tbl='objective_contributions' then 'contributed_at' else 'paid_at' end;
    cols:=cols||format(', round(case when t.%I>now() then 0 when t.transaction_id is not null then coalesce((select x.amount from public.transactions x where x.id=t.transaction_id and x.transaction_date<=now()),0) else coalesce(t.amount,0) end,case when t.currency=''JPY'' then 0 else 2 end)::text as effective_amount',activity_date);
    execute format('create or replace view public.exact_%I with (security_invoker=true) as select %s from public.%I t',tbl,cols,tbl);
    execute format('revoke all on public.exact_%I from public,anon,authenticated',tbl);
    execute format('grant select on public.exact_%I to authenticated',tbl);
  end loop;
end $$;
notify pgrst,'reload schema';
commit;
