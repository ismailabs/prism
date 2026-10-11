-- PREPARED ONLY. NOT EXECUTED HERE. Current mission authorizes production metadata
-- inspection at hyhsppiitijkuvpyswce only with an enforced read-only connection. Never invoke a deletion RPC.
-- Set provider/project identity out-of-band first; SQL alone cannot prove it.
begin read only;
set local statement_timeout = '10s';
set local lock_timeout = '2s';
select current_database(), current_user, version(), current_setting('transaction_read_only');
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_userbyid(p.proowner) as owner, p.prosecdef, p.proconfig,
       p.proacl::text, has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       has_schema_privilege('authenticated',n.oid,'USAGE') as authenticated_schema_usage,
       md5(pg_get_functiondef(p.oid)) as definition_fingerprint
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where p.proname='delete_own_account' and n.nspname in ('public','prism_private')
order by n.nspname, arguments;
select n.nspname,p.oid::regprocedure::text as function_identity,
       case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as grantee,
       a.privilege_type,a.is_grantable
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
where p.proname='delete_own_account' and n.nspname in ('public','prism_private')
order by 1,2,3;
-- Include indirect memberships and SET-only paths; direct grants alone miss them.
with recursive role_paths as (
  select r.oid as root_oid,r.oid as role_oid,array[r.oid] as path,
         true as inherit_path,true as set_path
  from pg_roles r where r.rolname in ('anon','authenticated','authenticator')
  union all
  select p.root_oid,m.roleid,p.path || m.roleid,
         p.inherit_path and m.inherit_option,p.set_path and m.set_option
  from role_paths p join pg_auth_members m on m.member=p.role_oid
  where not m.roleid=any(p.path) and cardinality(p.path)<32
)
select root_role.rolname as root_role,granted_role.rolname as granted_role,
       cardinality(p.path)-1 as depth,p.inherit_path,p.set_path,
       granted_role.rolinherit,granted_role.rolsuper,granted_role.rolbypassrls,
       pg_has_role(p.root_oid,p.role_oid,'USAGE') as effective_inherited,
       pg_has_role(p.root_oid,p.role_oid,'SET') as effective_set,
       pg_has_role(p.root_oid,p.role_oid,'MEMBER WITH ADMIN OPTION') as effective_admin,
       cardinality(p.path)=32 and exists
         (select 1 from pg_auth_members m where m.member=p.role_oid
          and not m.roleid=any(p.path)) as depth_limit_reached
from role_paths p join pg_roles root_role on root_role.oid=p.root_oid
join pg_roles granted_role on granted_role.oid=p.role_oid
order by 1,3,2;
-- A depth-limit result is incomplete evidence, requiring further operator review.
select n.nspname,pg_get_userbyid(n.nspowner) as owner,n.nspacl::text,
       has_schema_privilege('anon',n.oid,'USAGE') as anon_usage,
       has_schema_privilege('authenticated',n.oid,'USAGE') as authenticated_usage
from pg_namespace n where n.nspname in ('public','prism_private') order by 1;
select n.nspname,p.oid::regprocedure::text as function_identity,
       d.deptype,pg_describe_object(d.classid,d.objid,d.objsubid) as dependent
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
join pg_depend d on d.refclassid='pg_proc'::regclass and d.refobjid=p.oid
where n.nspname='prism_private' and p.proname='delete_own_account'
  and pg_get_function_identity_arguments(p.oid)='';
-- Optional source inspection by an approved operator, redacted before sharing:
-- select pg_get_functiondef(to_regprocedure('prism_private.delete_own_account()'));
-- SQL setting may be absent/overridden: absence DOES NOT prove unexposed.
select current_setting('pgrst.db_schemas',true) as db_setting_hint_only;
select pg_get_userbyid(d.defaclrole) as owner,
       case when d.defaclnamespace=0 then '(global)' else n.nspname end as schema,
       d.defaclobjtype, d.defaclacl::text
from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace
where d.defaclobjtype='f' and (d.defaclnamespace=0 or n.nspname in ('public','prism_private'))
order by 1,2;
rollback;
