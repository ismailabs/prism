-- READ ONLY. Hashes are change detectors, not backups or anonymized public data.
-- Keep results private. Totals remain in PostgreSQL exact numeric arithmetic.
select jsonb_build_object(
 'tables',(select jsonb_agg(x) from (
   select 'profiles' as name,count(*) as rows,md5(string_agg(row_to_json(t)::text,'' order by id)) as fingerprint from public.profiles t
   union all select 'categories',count(*),md5(string_agg(row_to_json(t)::text,'' order by id)) from public.categories t
   union all select 'payment_methods',count(*),md5(string_agg(row_to_json(t)::text,'' order by id)) from public.payment_methods t
   union all select 'transactions',count(*),md5(string_agg(row_to_json(t)::text,'' order by id)) from public.transactions t
   union all select 'private_reservations',count(*),md5(string_agg(row_to_json(t)::text,'' order by id)) from prism_private.report_reservations t
 ) x),
 'owner_currency_totals_fingerprint',(select md5(string_agg(row_to_json(g)::text,'' order by user_id,currency,type)) from (
   select user_id,currency,type,count(*) as rows,sum(amount)::text as total from public.transactions group by user_id,currency,type
 )g),
 'invalid_category_links',(select count(*) from public.transactions t where t.category_id is not null and not exists(select 1 from public.categories c where c.id=t.category_id and c.user_id=t.user_id and c.type=t.type)),
 'invalid_payment_links',(select count(*) from public.transactions t where t.payment_method_id is not null and not exists(select 1 from public.payment_methods p where p.id=t.payment_method_id and p.user_id=t.user_id)),
 'orphan_owners',(select count(*) from public.transactions t where not exists(select 1 from auth.users u where u.id=t.user_id))
) as baseline;
