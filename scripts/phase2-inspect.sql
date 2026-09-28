-- READ ONLY. Inspect before designing/applying the Phase 2 migration.
select jsonb_build_object(
 'columns',(select jsonb_agg(to_jsonb(c)) from (
   select table_schema,table_name,column_name,data_type,numeric_precision,numeric_scale,column_default,is_nullable
   from information_schema.columns where table_schema in ('public','prism_private') order by table_schema,table_name,ordinal_position
 ) c),
 'constraints',(select jsonb_agg(jsonb_build_object('table',conrelid::regclass::text,'name',conname,'definition',pg_get_constraintdef(oid))) from pg_constraint where connamespace in ('public'::regnamespace,'prism_private'::regnamespace)),
 'policies',(select jsonb_agg(to_jsonb(p)) from pg_policies p where schemaname in ('public','prism_private')),
 'indexes',(select jsonb_agg(to_jsonb(i)) from pg_indexes i where schemaname in ('public','prism_private')),
 'functions',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'definition',pg_get_functiondef(p.oid))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','prism_private') and p.prokind='f'),
 'triggers',(select jsonb_agg(jsonb_build_object('table',t.tgrelid::regclass::text,'definition',pg_get_triggerdef(t.oid))) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('public','prism_private','auth'))
) as inspection;
