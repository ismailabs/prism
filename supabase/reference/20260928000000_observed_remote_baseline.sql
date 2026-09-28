-- Observed live application baseline, 2026-09-28. Requires Supabase auth schema/roles.
-- For isolated replay only; existing production is already at this baseline.
create schema if not exists prism_private;
revoke all on schema prism_private from public, anon, authenticated;
grant usage on schema prism_private to authenticated;
create table prism_private.report_reservations (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "report_id" uuid not null,
  "created_at" timestamp with time zone default now() not null
);
create table public.categories (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "name" text not null,
  "type" text not null,
  "color" text default '#8B5CF6'::text not null,
  "created_at" timestamp with time zone default now() not null
);
create table public.payment_methods (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "name" text not null,
  "type" text not null,
  "created_at" timestamp with time zone default now() not null
);
create table public.profiles (
  "id" uuid not null,
  "username" text default 'Prism member'::text not null,
  "currency" text default 'USD'::text not null,
  "language" text default 'en'::text not null,
  "theme" text default 'system'::text not null,
  "mfa_enabled" boolean default false not null,
  "created_at" timestamp with time zone default now() not null
);
create table public.transactions (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "amount" numeric(18,2) not null,
  "currency" text default 'USD'::text not null,
  "type" text not null,
  "category_id" uuid,
  "payment_method_id" uuid,
  "description" text default ''::text not null,
  "transaction_date" timestamp with time zone default now() not null,
  "created_at" timestamp with time zone default now() not null
);
alter table profiles add constraint "profiles_username_check" CHECK (((char_length(btrim(username)) >= 1) AND (char_length(btrim(username)) <= 60)));
alter table profiles add constraint "profiles_currency_check" CHECK ((currency = ANY (ARRAY['USD'::text, 'EUR'::text, 'JPY'::text, 'MYR'::text])));
alter table profiles add constraint "profiles_language_check" CHECK ((language = ANY (ARRAY['en'::text, 'ms'::text])));
alter table profiles add constraint "profiles_theme_check" CHECK ((theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])));
alter table profiles add constraint "profiles_pkey" PRIMARY KEY (id);
alter table categories add constraint "categories_name_check" CHECK (((char_length(btrim(name)) >= 1) AND (char_length(btrim(name)) <= 60)));
alter table categories add constraint "categories_type_check" CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text])));
alter table categories add constraint "categories_color_check" CHECK ((color ~ '^#[0-9A-Fa-f]{6}$'::text));
alter table categories add constraint "categories_pkey" PRIMARY KEY (id);
alter table categories add constraint "categories_user_id_id_type_key" UNIQUE (user_id, id, type);
alter table payment_methods add constraint "payment_methods_name_check" CHECK (((char_length(btrim(name)) >= 1) AND (char_length(btrim(name)) <= 60)));
alter table payment_methods add constraint "payment_methods_type_check" CHECK ((type = ANY (ARRAY['credit_card'::text, 'cash'::text, 'bank_transfer'::text, 'e_wallet'::text])));
alter table payment_methods add constraint "payment_methods_pkey" PRIMARY KEY (id);
alter table payment_methods add constraint "payment_methods_user_id_id_key" UNIQUE (user_id, id);
alter table transactions add constraint "transactions_amount_check" CHECK (((amount > (0)::numeric) AND (amount <> 'NaN'::numeric) AND (amount < ('10000000000000000'::bigint)::numeric)));
alter table transactions add constraint "transactions_currency_check" CHECK ((currency = ANY (ARRAY['USD'::text, 'EUR'::text, 'JPY'::text, 'MYR'::text])));
alter table transactions add constraint "transactions_type_check" CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text])));
alter table transactions add constraint "transactions_description_check" CHECK ((char_length(description) <= 500));
alter table transactions add constraint "transactions_pkey" PRIMARY KEY (id);
alter table prism_private.report_reservations add constraint "report_reservations_pkey" PRIMARY KEY (id);
alter table profiles add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table categories add constraint "categories_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table payment_methods add constraint "payment_methods_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table transactions add constraint "transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table transactions add constraint "transactions_owned_category_fkey" FOREIGN KEY (user_id, category_id, type) REFERENCES categories(user_id, id, type) ON DELETE SET NULL (category_id);
alter table transactions add constraint "transactions_owned_payment_method_fkey" FOREIGN KEY (user_id, payment_method_id) REFERENCES payment_methods(user_id, id) ON DELETE SET NULL (payment_method_id);
alter table prism_private.report_reservations add constraint "report_reservations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX report_reservations_user_created_idx ON prism_private.report_reservations USING btree (user_id, created_at DESC);
CREATE UNIQUE INDEX categories_user_name_type_key ON public.categories USING btree (user_id, lower(btrim(name)), type);
CREATE UNIQUE INDEX payment_methods_user_name_key ON public.payment_methods USING btree (user_id, lower(btrim(name)));
CREATE INDEX transactions_user_date_idx ON public.transactions USING btree (user_id, transaction_date DESC, id);
CREATE INDEX transactions_category_idx ON public.transactions USING btree (user_id, category_id, type);
CREATE INDEX transactions_payment_method_idx ON public.transactions USING btree (user_id, payment_method_id);
CREATE OR REPLACE FUNCTION prism_private.session_allowed()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION prism_private.create_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 insert into public.profiles(id, username, mfa_enabled)
 values (
 new.id,
 left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'username'), ''), nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 'Prism member'), 60),
 exists(select 1 from auth.mfa_factors f where f.user_id = new.id and f.status = 'verified')
 );
 return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION prism_private.sync_mfa_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION prism_private.delete_own_account()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.delete_own_account()
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select prism_private.delete_own_account(); $function$
;
CREATE TRIGGER prism_create_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION prism_private.create_profile();
CREATE TRIGGER prism_sync_mfa_profile AFTER INSERT OR DELETE OR UPDATE ON auth.mfa_factors FOR EACH ROW EXECUTE FUNCTION prism_private.sync_mfa_profile();
alter table prism_private.report_reservations enable row level security;
revoke all on prism_private.report_reservations from public, anon, authenticated;
alter table public.categories enable row level security;
revoke all on public.categories from public, anon, authenticated;
alter table public.payment_methods enable row level security;
revoke all on public.payment_methods from public, anon, authenticated;
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
alter table public.transactions enable row level security;
revoke all on public.transactions from public, anon, authenticated;
create policy "profiles_require_session_and_mfa" on public.profiles as RESTRICTIVE for ALL to "authenticated" using (( SELECT prism_private.session_allowed() AS session_allowed)) with check (( SELECT prism_private.session_allowed() AS session_allowed));
create policy "profiles_select_own" on public.profiles as PERMISSIVE for SELECT to "authenticated" using ((( SELECT auth.uid() AS uid) = id));
create policy "profiles_update_own" on public.profiles as PERMISSIVE for UPDATE to "authenticated" using ((( SELECT auth.uid() AS uid) = id)) with check ((( SELECT auth.uid() AS uid) = id));
create policy "categories_delete_own" on public.categories as PERMISSIVE for DELETE to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "categories_insert_own" on public.categories as PERMISSIVE for INSERT to "authenticated" with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "categories_require_session_and_mfa" on public.categories as RESTRICTIVE for ALL to "authenticated" using (( SELECT prism_private.session_allowed() AS session_allowed)) with check (( SELECT prism_private.session_allowed() AS session_allowed));
create policy "categories_select_own" on public.categories as PERMISSIVE for SELECT to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "categories_update_own" on public.categories as PERMISSIVE for UPDATE to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "payment_methods_delete_own" on public.payment_methods as PERMISSIVE for DELETE to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "payment_methods_insert_own" on public.payment_methods as PERMISSIVE for INSERT to "authenticated" with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "payment_methods_require_session_and_mfa" on public.payment_methods as RESTRICTIVE for ALL to "authenticated" using (( SELECT prism_private.session_allowed() AS session_allowed)) with check (( SELECT prism_private.session_allowed() AS session_allowed));
create policy "payment_methods_select_own" on public.payment_methods as PERMISSIVE for SELECT to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "payment_methods_update_own" on public.payment_methods as PERMISSIVE for UPDATE to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "transactions_delete_own" on public.transactions as PERMISSIVE for DELETE to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "transactions_insert_own" on public.transactions as PERMISSIVE for INSERT to "authenticated" with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "transactions_require_session_and_mfa" on public.transactions as RESTRICTIVE for ALL to "authenticated" using (( SELECT prism_private.session_allowed() AS session_allowed)) with check (( SELECT prism_private.session_allowed() AS session_allowed));
create policy "transactions_select_own" on public.transactions as PERMISSIVE for SELECT to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "transactions_update_own" on public.transactions as PERMISSIVE for UPDATE to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
grant select on public.profiles to authenticated;
grant update(username,currency,language,theme) on public.profiles to authenticated;
grant select,insert,update,delete on public.categories,public.payment_methods,public.transactions to authenticated;
revoke all on all functions in schema prism_private from public,anon,authenticated;
grant execute on function prism_private.session_allowed(),prism_private.delete_own_account() to authenticated;
revoke all on function public.delete_own_account() from public,anon;
grant execute on function public.delete_own_account() to authenticated;
