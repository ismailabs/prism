-- Staging-approved policy. This migration neither validates breached passwords
-- nor authorizes a production release. Existing users/owners/factors are kept.
begin;

create table prism_private.approved_mfa_factors (
  factor_id uuid primary key references auth.mfa_factors(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  verified_email text not null,
  approved_at timestamptz not null default now(),
  mailbox_verified_at timestamptz not null,
  approving_session_id uuid not null,
  separate_backup_acknowledged boolean not null check (separate_backup_acknowledged)
);
create index approved_mfa_owner on prism_private.approved_mfa_factors(user_id);
alter table prism_private.approved_mfa_factors enable row level security;
revoke all on prism_private.approved_mfa_factors from public, anon, authenticated;

-- Sticky enrollment history prevents all-factor loss from looking like a new
-- account. Email/password alone can never restart an activated account's MFA.
create table prism_private.mfa_activated_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  activated_at timestamptz not null default now()
);
create table prism_private.mfa_management_sessions (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  proof_factor_id uuid not null references prism_private.approved_mfa_factors(factor_id) on delete cascade,
  valid_until timestamptz not null
);
alter table prism_private.mfa_activated_accounts enable row level security;
alter table prism_private.mfa_management_sessions enable row level security;
revoke all on prism_private.mfa_activated_accounts,prism_private.mfa_management_sessions from public,anon,authenticated;

create table prism_private.mfa_security_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  factor_id uuid,
  event text not null check (event in ('factor_approved')),
  created_at timestamptz not null default now()
);
alter table prism_private.mfa_security_events enable row level security;
revoke all on prism_private.mfa_security_events from public, anon, authenticated;
revoke all on sequence prism_private.mfa_security_events_id_seq from public, anon, authenticated;

-- Supabase, not user_metadata, supplies both AMR claims and its live AMR rows.
-- Only email-specific PKCE methods qualify. Generic 'otp' can also mean SMS.
create function prism_private.fresh_mailbox_proof(claims jsonb, sid uuid, uid uuid)
returns timestamptz language sql stable security definer set search_path='' as $$
  select max(a.updated_at)
  from auth.mfa_amr_claims a
  join auth.sessions s on s.id=a.session_id and s.user_id=uid
  join auth.users u on u.id=uid
  cross join lateral jsonb_array_elements(case when jsonb_typeof(claims->'amr')='array' then claims->'amr' else '[]'::jsonb end) j
  where a.session_id=sid
    and a.authentication_method in ('magiclink','email/signup','recovery')
    and a.authentication_method=j->>'method'
    and u.email_confirmed_at is not null and u.is_anonymous is false
    and u.email=claims->>'email'
    and a.updated_at between now()-interval '10 minutes' and now()+interval '30 seconds'
    and case when j->>'timestamp' ~ '^[0-9]{1,12}$'
      then (j->>'timestamp')::bigint=floor(extract(epoch from a.updated_at))::bigint else false end
$$;

create function prism_private.recent_totp_proof(max_age interval)
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(exists(
    select 1 from auth.mfa_amr_claims a
    cross join lateral jsonb_array_elements(case when jsonb_typeof(auth.jwt()->'amr')='array' then auth.jwt()->'amr' else '[]'::jsonb end) j
    where a.session_id=nullif(auth.jwt()->>'session_id','')::uuid
      and a.authentication_method='totp' and j->>'method'='totp'
      and a.updated_at between now()-max_age and now()+interval '30 seconds'
      and case when j->>'timestamp' ~ '^[0-9]{1,12}$'
        then (j->>'timestamp')::bigint=floor(extract(epoch from a.updated_at))::bigint else false end
  ),false)
$$;

create function prism_private.mfa_session_valid()
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(auth.uid() is not null
    and coalesce(auth.jwt()->>'is_anonymous','false')='false'
    and auth.jwt()->>'aal'='aal2'
    and exists(
      select 1 from auth.sessions s
      join auth.users u on u.id=s.user_id
      join auth.mfa_factors f on f.id=s.factor_id and f.user_id=s.user_id
      where s.id=nullif(auth.jwt()->>'session_id','')::uuid and s.user_id=auth.uid()
        and s.aal::text='aal2' and u.is_anonymous is false
        and u.email_confirmed_at is not null
        and s.created_at between now()-interval '24 hours' and now()+interval '30 seconds'
        and (s.not_after is null or s.not_after>now())
        and f.status::text='verified' and f.factor_type::text='totp'
    ) and prism_private.recent_totp_proof(interval '24 hours'),false)
$$;

create function prism_private.mfa_management_authorized(uid uuid,sid uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from prism_private.mfa_management_sessions m
    join prism_private.approved_mfa_factors p on p.factor_id=m.proof_factor_id and p.user_id=m.user_id
    join auth.mfa_factors f on f.id=p.factor_id and f.user_id=p.user_id
    where m.session_id=sid and m.user_id=uid and m.valid_until>now()
      and f.status::text='verified' and f.factor_type::text='totp'
  )
$$;

create function prism_private.begin_mfa_management()
returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); sid uuid:=nullif(auth.jwt()->>'session_id','')::uuid; fid uuid;
begin
  if not prism_private.mfa_session_valid() or not prism_private.recent_totp_proof(interval '5 minutes')
    or prism_private.fresh_mailbox_proof(auth.jwt(),sid,uid) is null then
    raise exception 'Fresh mailbox and approved authenticator verification are required.' using errcode='42501';
  end if;
  select s.factor_id into fid from auth.sessions s
    join prism_private.approved_mfa_factors p on p.factor_id=s.factor_id and p.user_id=s.user_id
    where s.id=sid and s.user_id=uid;
  if fid is null then raise exception 'An existing approved authenticator is required.' using errcode='42501'; end if;
  insert into prism_private.mfa_management_sessions(session_id,user_id,proof_factor_id,valid_until)
    values(sid,uid,fid,now()+interval '10 minutes')
    on conflict(session_id) do update set proof_factor_id=excluded.proof_factor_id,valid_until=excluded.valid_until;
end $$;

create or replace function prism_private.session_allowed()
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(prism_private.mfa_session_valid()
    and exists(
      select 1 from auth.sessions s
      join prism_private.approved_mfa_factors p on p.factor_id=s.factor_id and p.user_id=s.user_id
      join auth.users u on u.id=s.user_id and u.email=p.verified_email
      where s.id=nullif(auth.jwt()->>'session_id','')::uuid and s.user_id=auth.uid()
    ) and exists(select 1 from prism_private.mfa_activated_accounts where user_id=auth.uid()) and (
      select count(*) from prism_private.approved_mfa_factors p
      join auth.mfa_factors f on f.id=p.factor_id and f.user_id=p.user_id
      join auth.users u on u.id=p.user_id and u.email=p.verified_email
      where p.user_id=auth.uid() and f.status::text='verified' and f.factor_type::text='totp'
    )>=2,false)
$$;

create function prism_private.financial_access_status()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  uid uuid:=auth.uid(); sid uuid:=nullif(auth.jwt()->>'session_id','')::uuid;
  s auth.sessions; approved_ids jsonb; email_proof timestamptz; current_approved boolean;
begin
  if uid is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  select * into s from auth.sessions where id=sid and user_id=uid;
  if not found then return jsonb_build_object('allowed',false,'reason','session_invalid','approvedFactorIds','[]'::jsonb,'mailboxVerified',false); end if;
  select coalesce(jsonb_agg(p.factor_id order by p.approved_at),'[]'::jsonb) into approved_ids
  from prism_private.approved_mfa_factors p
  join auth.mfa_factors f on f.id=p.factor_id and f.user_id=p.user_id
  join auth.users u on u.id=p.user_id and u.email=p.verified_email
  where p.user_id=uid and f.status::text='verified' and f.factor_type::text='totp';
  email_proof:=prism_private.fresh_mailbox_proof(auth.jwt(),sid,uid);
  current_approved:=approved_ids ? s.factor_id::text;
  return jsonb_build_object(
    'allowed',prism_private.session_allowed(),
    'reason',case
      when s.created_at is null or s.created_at<=now()-interval '24 hours' or (s.not_after is not null and s.not_after<=now()) then 'session_expired'
      when auth.jwt()->>'aal' is distinct from 'aal2' or s.aal::text is distinct from 'aal2' then 'needs_mfa'
      when not coalesce(current_approved,false) then 'needs_approval'
      when jsonb_array_length(approved_ids)<2 then 'needs_backup'
      when not prism_private.session_allowed() then 'session_invalid'
      else 'ready' end,
    'approvedFactorIds',approved_ids,
    'activated',exists(select 1 from prism_private.mfa_activated_accounts where user_id=uid),
    'managementAuthorized',prism_private.mfa_management_authorized(uid,sid),
    'currentFactorId',s.factor_id,
    'mailboxVerified',email_proof is not null,
    'recentVerification',prism_private.recent_totp_proof(interval '5 minutes'),
    'sessionExpiresAt',s.created_at+interval '24 hours');
end $$;

create function prism_private.approve_mfa_factor(p_factor_id uuid,p_separate_backup boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid:=auth.uid(); sid uuid:=nullif(auth.jwt()->>'session_id','')::uuid;
  mail_proof timestamptz; current_factor uuid; current_email text;
begin
  if not prism_private.mfa_session_valid() or not prism_private.recent_totp_proof(interval '5 minutes') then
    raise exception 'A current session and fresh authenticator verification are required.' using errcode='42501';
  end if;
  select factor_id into current_factor from auth.sessions where id=sid and user_id=uid;
  if p_factor_id is distinct from current_factor or p_separate_backup is distinct from true then
    raise exception 'Verify this factor and acknowledge independently accessible backup storage.' using errcode='42501';
  end if;
  mail_proof:=prism_private.fresh_mailbox_proof(auth.jwt(),sid,uid);
  if mail_proof is null then raise exception 'Fresh verified-mailbox proof is required.' using errcode='42501'; end if;
  if exists(select 1 from prism_private.mfa_activated_accounts where user_id=uid)
    and not exists(select 1 from prism_private.approved_mfa_factors where factor_id=p_factor_id and user_id=uid)
    and not prism_private.mfa_management_authorized(uid,sid) then
    raise exception 'An existing approved authenticator is required for replacement; email alone cannot recover lost factors.' using errcode='42501';
  end if;
  select email into current_email from auth.users where id=uid;
  insert into prism_private.approved_mfa_factors(factor_id,user_id,verified_email,mailbox_verified_at,approving_session_id,separate_backup_acknowledged)
    values(p_factor_id,uid,current_email,mail_proof,sid,true)
    on conflict(factor_id) do update set verified_email=excluded.verified_email,approved_at=now(),
      mailbox_verified_at=excluded.mailbox_verified_at,approving_session_id=excluded.approving_session_id,separate_backup_acknowledged=true
    where prism_private.approved_mfa_factors.user_id=uid;
  if not found then raise exception 'Factor ownership mismatch.' using errcode='42501'; end if;
  if (select count(*) from prism_private.approved_mfa_factors p join auth.mfa_factors f on f.id=p.factor_id and f.user_id=p.user_id
      where p.user_id=uid and p.verified_email=current_email and f.status::text='verified' and f.factor_type::text='totp')>=2 then
    insert into prism_private.mfa_activated_accounts(user_id) values(uid) on conflict do nothing;
  end if;
  insert into prism_private.mfa_security_events(user_id,session_id,factor_id,event) values(uid,sid,p_factor_id,'factor_approved');
  return prism_private.financial_access_status();
end $$;

-- Free Custom Access Token hook: reject token issuance for an unapproved
-- factor without fresh mailbox proof. GoTrue's MFA transaction must roll back;
-- real local/hosted tests prove this, rather than assuming a UI enrollment gate.
create function prism_private.mfa_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare
  claims jsonb:=event->'claims'; uid uuid:=(event->>'user_id')::uuid;
  sid uuid:=(event->'claims'->>'session_id')::uuid; approved boolean;
begin
  if claims->>'aal'='aal2' then
    if not exists(select 1 from auth.sessions where id=sid and user_id=uid
      and created_at between now()-interval '24 hours' and now()+interval '30 seconds'
      and (not_after is null or not_after>now())) then
      return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Sign in again to renew your financial session.'));
    end if;
    select exists(
      select 1 from auth.sessions s
      join prism_private.approved_mfa_factors p on p.factor_id=s.factor_id and p.user_id=s.user_id
      join auth.mfa_factors f on f.id=s.factor_id and f.user_id=s.user_id
      where s.id=sid and s.user_id=uid and f.status::text='verified' and f.factor_type::text='totp'
    ) into approved;
    if not approved and prism_private.fresh_mailbox_proof(claims,sid,uid) is null then
      return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Verify your existing email before activating an authenticator.'));
    end if;
    if not approved and exists(select 1 from prism_private.mfa_activated_accounts where user_id=uid)
      and not prism_private.mfa_management_authorized(uid,sid) then
      return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Use an existing approved authenticator before replacing a factor.'));
    end if;
  end if;
  return jsonb_build_object('claims',claims);
end $$;

create function public.financial_access_status() returns jsonb language sql security invoker set search_path='' as $$
  select prism_private.financial_access_status()
$$;
create function public.approve_mfa_factor(p_factor_id uuid,p_separate_backup boolean) returns jsonb language sql security invoker set search_path='' as $$
  select prism_private.approve_mfa_factor(p_factor_id,p_separate_backup)
$$;
create function public.begin_mfa_management() returns void language sql security invoker set search_path='' as $$
  select prism_private.begin_mfa_management()
$$;

create or replace function prism_private.delete_own_account(confirmation text)
returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
  if confirmation is distinct from 'DELETE' then raise exception 'Explicit deletion confirmation is required.' using errcode='22023'; end if;
  if uid is null or not prism_private.session_allowed() or not prism_private.recent_totp_proof(interval '5 minutes') then
    raise exception 'Financial access and fresh authenticator verification are required.' using errcode='42501';
  end if;
  delete from auth.sessions where user_id=uid;
  delete from auth.users where id=uid;
  if not found then raise exception 'Authenticated user was not found.' using errcode='P0002'; end if;
end $$;

revoke all on function prism_private.fresh_mailbox_proof(jsonb,uuid,uuid),prism_private.recent_totp_proof(interval),prism_private.mfa_session_valid(),
  prism_private.financial_access_status(),prism_private.approve_mfa_factor(uuid,boolean),prism_private.mfa_access_token_hook(jsonb) from public,anon,authenticated;
revoke all on function prism_private.mfa_management_authorized(uuid,uuid),prism_private.begin_mfa_management() from public,anon,authenticated;
grant execute on function prism_private.financial_access_status(),prism_private.approve_mfa_factor(uuid,boolean) to authenticated;
grant execute on function prism_private.begin_mfa_management() to authenticated;
revoke all on function public.financial_access_status(),public.approve_mfa_factor(uuid,boolean),public.begin_mfa_management() from public,anon;
grant execute on function public.financial_access_status(),public.approve_mfa_factor(uuid,boolean),public.begin_mfa_management() to authenticated;
grant usage on schema prism_private to supabase_auth_admin;
grant select on prism_private.approved_mfa_factors to supabase_auth_admin;
grant select on prism_private.mfa_activated_accounts,prism_private.mfa_management_sessions to supabase_auth_admin;
create policy auth_hook_approval_lookup on prism_private.approved_mfa_factors for select to supabase_auth_admin using(true);
create policy auth_hook_activation_lookup on prism_private.mfa_activated_accounts for select to supabase_auth_admin using(true);
create policy auth_hook_management_lookup on prism_private.mfa_management_sessions for select to supabase_auth_admin using(true);
grant execute on function prism_private.mfa_access_token_hook(jsonb),prism_private.fresh_mailbox_proof(jsonb,uuid,uuid) to supabase_auth_admin;
grant execute on function prism_private.mfa_management_authorized(uuid,uuid) to supabase_auth_admin;

-- Data API/RLS is the sole financial transport; streamed DELETE events have
-- different authorization semantics. Do not publish private financial rows.
do $$ declare t record; begin
  for t in select schemaname,tablename from pg_catalog.pg_publication_tables where pubname='supabase_realtime' and schemaname='public' loop
    execute format('alter publication supabase_realtime drop table %I.%I',t.schemaname,t.tablename);
  end loop;
end $$;
notify pgrst,'reload schema';
commit;
