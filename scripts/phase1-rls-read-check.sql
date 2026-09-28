-- Read-only database-role check; run with an administrative SQL connection.
-- Uses existing sessions only inside this transaction; exports no session IDs/tokens.
-- This tests database policies, NOT JWT signature verification or browser login.
begin transaction read only;
do $$
declare
  identity record;
  tested integer := 0;
  own_count bigint;
  foreign_count bigint;
begin
  for identity in
    select u.id, s.id as session_id,
      (select count(*) from public.transactions t where t.user_id=u.id) as expected
    from auth.users u
    cross join lateral (select id from auth.sessions where user_id=u.id
      and (not_after is null or not_after>now()) order by created_at desc limit 1) s
    order by expected desc,u.id limit 2
  loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',identity.id,
      'session_id',identity.session_id,'role','authenticated','aal','aal2','is_anonymous',false)::text,true);
    set local role authenticated;
    select count(*) filter (where user_id=auth.uid()),count(*) filter (where user_id<>auth.uid())
      into own_count,foreign_count from public.transactions;
    if own_count<>identity.expected or foreign_count<>0 then
      raise exception 'Transaction ownership isolation failed';
    end if;
    if exists(select 1 from public.categories where user_id<>auth.uid())
      or exists(select 1 from public.payment_methods where user_id<>auth.uid())
      or exists(select 1 from public.profiles where id<>auth.uid()) then
      raise exception 'Related resource ownership isolation failed';
    end if;
    reset role;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',identity.id,
      'session_id','00000000-0000-0000-0000-000000000000','role','authenticated','aal','aal2')::text,true);
    set local role authenticated;
    if exists(select 1 from public.transactions) or exists(select 1 from public.profiles)
      or exists(select 1 from public.categories) or exists(select 1 from public.payment_methods) then
      raise exception 'Invalid session was not denied';
    end if;
    reset role;
    tested := tested+1;
  end loop;
  if tested<>2 then raise exception 'Two existing session identities unavailable'; end if;
  if has_table_privilege('anon','public.transactions','SELECT') then
    raise exception 'Unexpected anonymous table grant';
  end if;
end $$;
rollback;
select 'PASS: two identities isolated; invalid sessions denied; anon lacks transaction SELECT' as result;
