begin;

-- New profiles only, including OAuth-created profiles. Existing choices and
-- financial records are not backfilled. Users can still choose other values.
alter table public.profiles alter column currency set default 'MYR';
alter table public.profiles alter column financial_timezone set default 'Asia/Kuala_Lumpur';

-- Keep the existing trigger/identity contract and restricted function privileges.
-- Only the two supported signup languages may become the new profile's language.
create or replace function prism_private.create_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,username,language)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data->>'username'),''),'Prism member'),60),
    case when new.raw_user_meta_data #>> '{prism_setup_preferences,language}' = 'ms' then 'ms' else 'en' end
  ) on conflict(id) do nothing;
  return new;
end $$;

commit;
