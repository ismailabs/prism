-- Metadata only. Verify the target and current read authority before reuse.
-- No customer/Auth rows; no DDL, grants or application-function invocation.
BEGIN TRANSACTION READ ONLY;
SELECT json_build_object(
 'transaction_read_only', current_setting('transaction_read_only'),
 'server_version', current_setting('server_version'),
 'exposed_schemas_setting', current_setting('pgrst.db_schemas', true),
 'private_reservations', (
  SELECT json_build_object('schema', n.nspname, 'name', c.relname, 'rls', c.relrowsecurity, 'force_rls', c.relforcerowsecurity,
   'policy_count', (SELECT count(*) FROM pg_policy p WHERE p.polrelid=c.oid),
   'anon_schema_usage', has_schema_privilege('anon',n.oid,'USAGE'),
   'authenticated_schema_usage',has_schema_privilege('authenticated',n.oid,'USAGE'),
   'anon_select',has_table_privilege('anon',c.oid,'SELECT'),
   'authenticated_select',has_table_privilege('authenticated',c.oid,'SELECT'),
   'authenticated_insert',has_table_privilege('authenticated',c.oid,'INSERT'),
   'authenticated_update',has_table_privilege('authenticated',c.oid,'UPDATE'),
   'authenticated_delete',has_table_privilege('authenticated',c.oid,'DELETE'))
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='prism_private' AND c.relname='report_reservations'),
 'public_relations', (
  SELECT json_agg(json_build_object('name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'options',c.reloptions,
   'policy_count',(SELECT count(*) FROM pg_policy p WHERE p.polrelid=c.oid)))
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','v')),
 'policies', (
  SELECT json_agg(json_build_object('table',c.relname,'name',p.polname,'command',p.polcmd,
   'roles',p.polroles,'permissive',p.polpermissive,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)))
  FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname IN ('public','prism_private')),
 'functions', (
  SELECT json_agg(json_build_object('schema',n.nspname,'identity',p.oid::regprocedure::text,
   'definer',p.prosecdef,'owner',r.rolname,'configuration',p.proconfig,
   'definition_md5',md5(pg_get_functiondef(p.oid)),
   'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
   'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE')))
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner
  WHERE n.nspname IN ('public','prism_private') AND p.prokind='f' AND p.prosecdef),
 'client_roles', (
  SELECT json_agg(json_build_object('oid',oid,'name',rolname,'superuser',rolsuper,'bypass_rls',rolbypassrls,'create_role',rolcreaterole,'login',rolcanlogin,'inherit',rolinherit))
  FROM pg_roles WHERE rolname IN ('anon','authenticated','authenticator','service_role')),
 'memberships', (
  SELECT json_agg(json_build_object('role',a.rolname,'member',b.rolname,'admin',m.admin_option,'inherit',m.inherit_option,'set',m.set_option))
  FROM pg_auth_members m JOIN pg_roles a ON a.oid=m.roleid JOIN pg_roles b ON b.oid=m.member),
 'migration_receipts', (SELECT json_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations)
) AS metadata;
ROLLBACK;
