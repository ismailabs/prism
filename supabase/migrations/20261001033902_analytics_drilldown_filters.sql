begin;
-- Additive filters; preserve invoker security, exact transport, ownership and pagination.
create or replace function public.transaction_page(p_filters jsonb,p_page integer) returns jsonb
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
and (coalesce(p_filters->>'category','')='' or case when p_filters->>'category'='uncategorized' then e.category_id is null else e.category_id=(p_filters->>'category')::uuid end)
and (coalesce(p_filters->>'activity','')='' or (e.activity_kind=p_filters->>'activity' and e.transaction_date<=now()))
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

revoke all on function public.transaction_page(jsonb,integer) from public,anon;
grant execute on function public.transaction_page(jsonb,integer) to authenticated;
commit;
