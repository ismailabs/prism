-- HISTORICAL ONLY: do not execute or include in a migration replay.
-- This file does not match the live database and includes the removed Reports feature.
-- Phase 1 preserves it for forensic comparison. See docs/codex/PHASE_1_SAFETY.md.
begin;

create schema if not exists prism_private;
revoke all on schema prism_private from public, anon, authenticated;
grant usage on schema prism_private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'Prism member' check (char_length(btrim(username)) between 1 and 60),
  currency text not null default 'USD' check (currency in ('USD', 'EUR', 'JPY', 'MYR')),
  language text not null default 'en' check (language in ('en', 'ms')),
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  mfa_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  type text not null check (type in ('income', 'expense')),
  color text not null default '#8B5CF6' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  unique (user_id, id, type)
);
create unique index categories_user_name_type_key on public.categories (user_id, lower(btrim(name)), type);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  type text not null check (type in ('credit_card', 'cash', 'bank_transfer', 'e_wallet')),
  created_at timestamptz not null default now(),
  unique (user_id, id)
);
create unique index payment_methods_user_name_key on public.payment_methods (user_id, lower(btrim(name)));

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(18, 2) not null check (amount > 0 and amount <> 'NaN'::numeric and amount < 10000000000000000),
  currency text not null default 'USD' check (currency in ('USD', 'EUR', 'JPY', 'MYR')),
  type text not null check (type in ('income', 'expense')),
  category_id uuid,
  payment_method_id uuid,
  description text not null default '' check (char_length(description) <= 500),
  transaction_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint transactions_owned_category_fkey foreign key (user_id, category_id, type)
    references public.categories(user_id, id, type) on delete set null (category_id),
  constraint transactions_owned_payment_method_fkey foreign key (user_id, payment_method_id)
    references public.payment_methods(user_id, id) on delete set null (payment_method_id)
);
create index transactions_user_date_idx on public.transactions (user_id, transaction_date desc, id);
create index transactions_category_idx on public.transactions (user_id, category_id, type);
create index transactions_payment_method_idx on public.transactions (user_id, payment_method_id);

create table public.higgsfield_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  status text not null default 'queued' check (status in ('queued', 'in_progress', 'completed', 'failed')),
  request_id text,
  media_url text,
  error text,
  model_id text,
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  currency text not null default 'USD' check (currency in ('USD', 'EUR', 'JPY', 'MYR')),
  locale text not null default 'en' check (locale in ('en', 'ms')),
  provider_status_url text,
  provider_response_url text,
  stage text check (stage in ('image', 'avatar', 'video')),
  context jsonb not null default '{}'::jsonb check (jsonb_typeof(context) = 'object' and pg_column_size(context) <= 65536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index higgsfield_reports_user_created_idx on public.higgsfield_reports (user_id, created_at desc);
create index higgsfield_reports_active_idx on public.higgsfield_reports (user_id) where status in ('queued', 'in_progress');

-- The reservation ledger persists even if an administrator cleans up a report.
create table prism_private.report_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid not null,
  created_at timestamptz not null default now()
);
create index report_reservations_user_created_idx on prism_private.report_reservations(user_id, created_at desc);
alter table prism_private.report_reservations enable row level security;
revoke all on prism_private.report_reservations from public, anon, authenticated;

-- Authorization uses the live Auth session and factors, never editable metadata
-- or the profile's display-only mfa_enabled flag. Revoked JWTs fail immediately.
create function prism_private.session_allowed()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') = 'false'
    and exists (
      select 1 from auth.sessions s
      where s.id = nullif((select auth.jwt()) ->> 'session_id', '')::uuid
        and s.user_id = (select auth.uid())
        and (s.not_after is null or s.not_after > now())
    )
    and (
      not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = (select auth.uid()) and f.status = 'verified'
      )
      or (select auth.jwt()) ->> 'aal' = 'aal2'
    );
$$;
revoke all on function prism_private.session_allowed() from public, anon, authenticated;
grant execute on function prism_private.session_allowed() to authenticated;

create function prism_private.create_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, username, mfa_enabled)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'username'), ''), nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 'Prism member'), 60),
    exists(select 1 from auth.mfa_factors f where f.user_id = new.id and f.status = 'verified')
  );
  return new;
end;
$$;
revoke all on function prism_private.create_profile() from public, anon, authenticated;
create trigger prism_create_profile after insert on auth.users for each row execute function prism_private.create_profile();

create function prism_private.sync_mfa_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  affected_user uuid;
begin
  affected_user := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  update public.profiles set mfa_enabled = exists (
    select 1 from auth.mfa_factors f where f.user_id = affected_user and f.status = 'verified'
  ) where id = affected_user;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function prism_private.sync_mfa_profile() from public, anon, authenticated;
create trigger prism_sync_mfa_profile after insert or update or delete on auth.mfa_factors
  for each row execute function prism_private.sync_mfa_profile();

-- Backfill pre-existing Auth users without replacing their identity data.
insert into public.profiles (id, username, mfa_enabled)
select u.id, left(coalesce(nullif(btrim(u.raw_user_meta_data ->> 'username'), ''), nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), 'Prism member'), 60),
  exists(select 1 from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified')
from auth.users u on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.transactions enable row level security;
alter table public.higgsfield_reports enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_require_session_and_mfa on public.profiles as restrictive for all to authenticated
  using ((select prism_private.session_allowed())) with check ((select prism_private.session_allowed()));

create policy categories_select_own on public.categories for select to authenticated using ((select auth.uid()) = user_id);
create policy categories_insert_own on public.categories for insert to authenticated with check ((select auth.uid()) = user_id);
create policy categories_update_own on public.categories for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy categories_delete_own on public.categories for delete to authenticated using ((select auth.uid()) = user_id);
create policy categories_require_session_and_mfa on public.categories as restrictive for all to authenticated
  using ((select prism_private.session_allowed())) with check ((select prism_private.session_allowed()));

create policy payment_methods_select_own on public.payment_methods for select to authenticated using ((select auth.uid()) = user_id);
create policy payment_methods_insert_own on public.payment_methods for insert to authenticated with check ((select auth.uid()) = user_id);
create policy payment_methods_update_own on public.payment_methods for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy payment_methods_delete_own on public.payment_methods for delete to authenticated using ((select auth.uid()) = user_id);
create policy payment_methods_require_session_and_mfa on public.payment_methods as restrictive for all to authenticated
  using ((select prism_private.session_allowed())) with check ((select prism_private.session_allowed()));

create policy transactions_select_own on public.transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy transactions_insert_own on public.transactions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy transactions_update_own on public.transactions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy transactions_delete_own on public.transactions for delete to authenticated using ((select auth.uid()) = user_id);
create policy transactions_require_session_and_mfa on public.transactions as restrictive for all to authenticated
  using ((select prism_private.session_allowed())) with check ((select prism_private.session_allowed()));

create policy higgsfield_reports_select_own on public.higgsfield_reports for select to authenticated using ((select auth.uid()) = user_id);
create policy higgsfield_reports_require_session_and_mfa on public.higgsfield_reports as restrictive for all to authenticated
  using ((select prism_private.session_allowed())) with check ((select prism_private.session_allowed()));

-- Explicit grants are required by the current Supabase Data API defaults.
revoke all on public.profiles, public.categories, public.payment_methods, public.transactions, public.higgsfield_reports from public, anon, authenticated;
grant select on public.profiles, public.higgsfield_reports to authenticated;
grant update(username, currency, language, theme) on public.profiles to authenticated;
grant select, insert, update, delete on public.categories, public.payment_methods, public.transactions to authenticated;
grant all on public.profiles, public.categories, public.payment_methods, public.transactions, public.higgsfield_reports to service_role;

create function prism_private.reserve_higgsfield_report(p_kind text, p_month text, p_currency text, p_locale text)
returns public.higgsfield_reports language plpgsql security definer set search_path = ''
as $$
declare
  requester uuid := (select auth.uid());
  report public.higgsfield_reports;
begin
  if requester is null or not coalesce(prism_private.session_allowed(), false) then
    raise exception 'A current authenticated session and enrolled MFA verification are required.' using errcode = '42501';
  end if;
  if p_kind is null or p_kind not in ('image', 'video')
    or p_month is null or p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    or p_currency is null or p_currency not in ('USD', 'EUR', 'JPY', 'MYR')
    or p_locale is null or p_locale not in ('en', 'ms') then
    raise exception 'Invalid report request.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(requester::text, 81427));
  update public.higgsfield_reports set status = 'failed', error = 'Generation expired. Please try again.', updated_at = now()
    where user_id = requester and status in ('queued', 'in_progress') and created_at < now() - interval '1 hour';
  if (select count(*) from public.higgsfield_reports where user_id = requester and status in ('queued', 'in_progress')) >= 2 then
    raise exception 'Two reports are already processing. Wait for one to finish.' using errcode = 'P0001';
  end if;
  if (select count(*) from prism_private.report_reservations where user_id = requester and created_at >= now() - interval '24 hours') >= 10 then
    raise exception 'Daily report limit reached. Try again in 24 hours.' using errcode = 'P0001';
  end if;
  insert into public.higgsfield_reports(user_id, kind, month, currency, locale)
    values(requester, p_kind, p_month, p_currency, p_locale) returning * into report;
  insert into prism_private.report_reservations(user_id, report_id) values(requester, report.id);
  return report;
end;
$$;
revoke all on function prism_private.reserve_higgsfield_report(text, text, text, text) from public, anon, authenticated;
grant execute on function prism_private.reserve_higgsfield_report(text, text, text, text) to authenticated;

create function public.reserve_higgsfield_report(p_kind text, p_month text, p_currency text, p_locale text)
returns public.higgsfield_reports language sql security invoker set search_path = ''
as $$ select prism_private.reserve_higgsfield_report(p_kind, p_month, p_currency, p_locale); $$;
revoke all on function public.reserve_higgsfield_report(text, text, text, text) from public, anon, authenticated;
grant execute on function public.reserve_higgsfield_report(text, text, text, text) to authenticated;

create function prism_private.delete_own_account()
returns void language plpgsql security definer set search_path = ''
as $$
declare requester uuid := (select auth.uid());
begin
  if requester is null or not coalesce(prism_private.session_allowed(), false) then
    raise exception 'A current authenticated session and enrolled MFA verification are required.' using errcode = '42501';
  end if;
  -- Revoke every live session before deleting the Auth identity. All owned rows
  -- (including MFA factors and reservation history) disappear via cascading FKs.
  delete from auth.sessions where user_id = requester;
  delete from auth.users where id = requester;
end;
$$;
revoke all on function prism_private.delete_own_account() from public, anon, authenticated;
grant execute on function prism_private.delete_own_account() to authenticated;

create function public.delete_own_account()
returns void language sql security invoker set search_path = ''
as $$ select prism_private.delete_own_account(); $$;
revoke all on function public.delete_own_account() from public, anon, authenticated;
grant execute on function public.delete_own_account() to authenticated;

-- Authenticated realtime listeners remain subject to each table's SELECT RLS.
do $$
declare table_name text;
begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array['profiles', 'categories', 'payment_methods', 'transactions'] loop
      if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end;
$$;

commit;
