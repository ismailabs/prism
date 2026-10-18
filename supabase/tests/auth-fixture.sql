-- LOCAL ONLY: minimal auth surface for PostgreSQL/RLS integration tests.
create role anon;
create role authenticated;
create role service_role bypassrls;
create role supabase_auth_admin;
create schema auth;
create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}',email text,email_confirmed_at timestamptz default now(),is_anonymous boolean not null default false);
create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade,not_after timestamptz,created_at timestamptz default now(),aal text default 'aal2',factor_id uuid,tag text default 'financial-fixture');
create table auth.mfa_factors(id uuid primary key,user_id uuid references auth.users(id) on delete cascade,status text,factor_type text default 'totp');
create table auth.mfa_amr_claims(id uuid primary key default gen_random_uuid(),session_id uuid references auth.sessions(id) on delete cascade,authentication_method text,created_at timestamptz default now(),updated_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;
grant usage on schema auth to authenticated,anon;

-- Financial calculation regressions need authorized synthetic sessions. This
-- helper exists ONLY in the local fake-Auth schema, never in a migration or
-- real Supabase. Security tests explicitly create tag='bare' sessions and use
-- real Auth acceptance separately; this is not evidence of human/native MFA.
create function auth.seed_financial_fixture() returns trigger language plpgsql as $$
declare f1 uuid:=gen_random_uuid(); f2 uuid:=gen_random_uuid(); e text;
begin
  if new.tag is distinct from 'financial-fixture' then return new; end if;
  if to_regclass('prism_private.approved_mfa_factors') is null then return new; end if;
  update auth.users set email=coalesce(email,id::text||'@example.test') where id=new.user_id returning email into e;
  insert into auth.mfa_factors(id,user_id,status) values(f1,new.user_id,'verified'),(f2,new.user_id,'verified');
  update auth.sessions set factor_id=f1,aal='aal2' where id=new.id;
  insert into auth.mfa_amr_claims(session_id,authentication_method) values(new.id,'totp');
  if to_regclass('prism_private.approved_mfa_factors') is not null then
    execute 'insert into prism_private.approved_mfa_factors(factor_id,user_id,verified_email,mailbox_verified_at,approving_session_id,separate_backup_acknowledged) values($1,$3,$4,now(),$5,true),($2,$3,$4,now(),$5,true)' using f1,f2,new.user_id,e,new.id;
    execute 'insert into prism_private.mfa_activated_accounts(user_id) values($1) on conflict do nothing' using new.user_id;
  end if;
  return new;
end $$;
create trigger local_only_financial_fixture after insert on auth.sessions for each row execute function auth.seed_financial_fixture();
grant usage on schema auth to supabase_auth_admin;
grant select on all tables in schema auth to supabase_auth_admin;
