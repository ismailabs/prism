-- P.R.I.S.M. active-product baseline only. Apply once to an empty Supabase project.
-- Historical account/event-ledger material is intentionally kept in ../reference.
begin;
create schema if not exists prism_private;
revoke all on schema prism_private from public, anon, authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text not null default 'Prism member' check(length(btrim(username)) between 1 and 60),
 currency text not null default 'USD' check(currency in ('USD','EUR','JPY','MYR')),
 language text not null default 'en' check(language in ('en','ms')),
 theme text not null default 'system' check(theme in ('light','dark','system')),
 mfa_enabled boolean not null default false, created_at timestamptz not null default now()
);
create table public.categories (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 60), type text not null check(type in ('income','expense')),
 color text not null default '#8B5CF6' check(color ~ '^#[0-9A-Fa-f]{6}$'), created_at timestamptz not null default now(),
 unique(user_id,id,type)
);
create table public.payment_methods (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 60), type text not null check(type in ('credit_card','cash','bank_transfer','e_wallet')),
 created_at timestamptz not null default now(), unique(user_id,id)
);
create table public.transactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 amount numeric(18,2) not null check(amount>0 and amount<10000000000000000 and amount=round(amount,case when currency='JPY' then 0 else 2 end)),
 currency text not null default 'USD' check(currency in ('USD','EUR','JPY','MYR')),
 type text not null check(type in ('income','expense')), category_id uuid, payment_method_id uuid,
 description text not null default '' check(length(description)<=500), transaction_date timestamptz not null default now(), created_at timestamptz not null default now(),
 foreign key(user_id,category_id,type) references public.categories(user_id,id,type) on delete set null(category_id),
 foreign key(user_id,payment_method_id) references public.payment_methods(user_id,id) on delete set null(payment_method_id)
);
create index transactions_user_date_idx on public.transactions(user_id,transaction_date desc,id);
create unique index categories_owner_name_type_idx on public.categories(user_id,lower(btrim(name)),type);
create unique index payments_owner_name_idx on public.payment_methods(user_id,lower(btrim(name)));

create function prism_private.session_allowed() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and coalesce(auth.jwt()->>'is_anonymous','false')='false'
 and exists(select 1 from auth.sessions s where s.id=nullif(auth.jwt()->>'session_id','')::uuid and s.user_id=auth.uid() and (s.not_after is null or s.not_after>now()))
 and (not exists(select 1 from auth.mfa_factors f where f.user_id=auth.uid() and f.status='verified') or auth.jwt()->>'aal'='aal2'
 ) $$;
create function prism_private.create_profile() returns trigger language plpgsql security definer set search_path='' as $$ begin
 insert into public.profiles(id,username) values(new.id,left(coalesce(nullif(btrim(new.raw_user_meta_data->>'username'),''),'Prism member'),60)) on conflict(id) do nothing; return new; end $$;
create function prism_private.sync_mfa_profile() returns trigger language plpgsql security definer set search_path='' as $$ declare u uuid:=case when tg_op='DELETE' then old.user_id else new.user_id end; begin update public.profiles set mfa_enabled=exists(select 1 from auth.mfa_factors f where f.user_id=u and f.status='verified') where id=u; return coalesce(new,old); end $$;
create function prism_private.delete_own_account() returns void language plpgsql security definer set search_path='' as $$ begin
 if not coalesce(prism_private.session_allowed(),false) then raise exception 'A current authenticated session and MFA verification are required.' using errcode='42501'; end if;
 delete from auth.sessions where user_id=auth.uid(); delete from auth.users where id=auth.uid(); end $$;
create function public.delete_own_account() returns void language sql security invoker set search_path='' as $$ select prism_private.delete_own_account() $$;
create trigger prism_create_profile after insert on auth.users for each row execute function prism_private.create_profile();
create trigger prism_sync_mfa_profile after insert or update or delete on auth.mfa_factors for each row execute function prism_private.sync_mfa_profile();

alter table public.profiles enable row level security; alter table public.categories enable row level security; alter table public.payment_methods enable row level security; alter table public.transactions enable row level security;
revoke all on public.profiles,public.categories,public.payment_methods,public.transactions from public,anon,authenticated;
grant select on public.profiles to authenticated; grant update(username,currency,language,theme) on public.profiles to authenticated;
grant select,insert,update,delete on public.categories,public.payment_methods,public.transactions to authenticated;
create policy profile_owner on public.profiles for all to authenticated using(id=auth.uid() and prism_private.session_allowed()) with check(id=auth.uid() and prism_private.session_allowed());
create policy category_owner on public.categories for all to authenticated using(user_id=auth.uid() and prism_private.session_allowed()) with check(user_id=auth.uid() and prism_private.session_allowed());
create policy payment_owner on public.payment_methods for all to authenticated using(user_id=auth.uid() and prism_private.session_allowed()) with check(user_id=auth.uid() and prism_private.session_allowed());
create policy transaction_owner on public.transactions for all to authenticated using(user_id=auth.uid() and prism_private.session_allowed()) with check(user_id=auth.uid() and prism_private.session_allowed());
revoke all on function prism_private.session_allowed(),prism_private.create_profile(),prism_private.sync_mfa_profile(),prism_private.delete_own_account() from public,anon,authenticated;
grant execute on function prism_private.session_allowed() to authenticated;
revoke all on function public.delete_own_account() from public,anon; grant execute on function public.delete_own_account() to authenticated;
commit;
