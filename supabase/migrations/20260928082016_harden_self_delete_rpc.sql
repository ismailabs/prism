begin;

create function prism_private.delete_own_account(confirmation text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if confirmation is distinct from 'DELETE' then
    raise exception 'Explicit deletion confirmation is required.' using errcode = '22023';
  end if;
  if current_user_id is null or not coalesce(prism_private.session_allowed(), false) then
    raise exception 'A current authenticated session and MFA verification are required.' using errcode = '42501';
  end if;

  delete from auth.sessions where user_id = current_user_id;
  delete from auth.users where id = current_user_id;
  if not found then
    raise exception 'Authenticated user was not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function prism_private.delete_own_account(text) from public, anon, authenticated;
grant usage on schema prism_private to authenticated;
grant execute on function prism_private.delete_own_account(text) to authenticated;

drop function public.delete_own_account(text);
create function public.delete_own_account(confirmation text)
returns void
language sql
security invoker
set search_path = ''
as $$
  select prism_private.delete_own_account(confirmation)
$$;

revoke all on function public.delete_own_account(text) from public, anon;
grant execute on function public.delete_own_account(text) to authenticated;

commit;
