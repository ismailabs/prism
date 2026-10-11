-- PROPOSAL ONLY. Not part of the migration chain; never applied to hosted PRISM.
-- Requires separate hosted authorization, exact signature/ACL/dependency review,
-- target identity and a reviewed additive migration generated with the CLI.
-- Never execute this from a browser client or as a hosted test.
begin;

revoke execute on function prism_private.delete_own_account()
  from public, anon, authenticated;

do $$
begin
  if has_function_privilege('anon', 'prism_private.delete_own_account()', 'EXECUTE')
     or has_function_privilege('authenticated', 'prism_private.delete_own_account()', 'EXECUTE') then
    raise exception 'Inherited deletion permission remains; abort and review exact role grants';
  end if;
  if not has_function_privilege('authenticated', 'public.delete_own_account(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'prism_private.delete_own_account(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.delete_own_account(text)', 'EXECUTE')
     or has_function_privilege('anon', 'prism_private.delete_own_account(text)', 'EXECUTE') then
    raise exception 'Confirmed deletion privilege contract differs; abort and review';
  end if;
end;
$$;

commit;
-- Failure: issue ROLLBACK on the same connection before any next operation.
-- After success: capture fresh effective ACLs and compare all unrelated metadata.
-- Do not automatically restore an unsafe prior grant as a rollback strategy.
