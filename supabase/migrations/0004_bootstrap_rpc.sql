-- Fix: first-time login still failed with
--   "new row violates row-level security policy for table companies"
-- (and, once that was patched, the same error for "profiles").
--
-- Root cause: getOrCreateProfile() did
--   insert into companies (...) select().single()
-- PostgREST's RETURNING representation re-SELECTs the inserted row, which
-- must satisfy the table's SELECT policy (companies_select_own /
-- profiles_select_same_company). Both of those policies resolve through
-- current_company_id(), which looks up the caller's own `profiles` row —
-- but that row does not exist yet during first-time bootstrap, and a
-- statement cannot see a row it is itself in the middle of inserting via a
-- fresh subquery lookup. Classic chicken-and-egg RLS problem: no ordinary
-- INSERT ... RETURNING can ever satisfy it for a brand-new user.
--
-- Fix: do the company + profile creation inside a SECURITY DEFINER
-- function, which bypasses RLS entirely for these two inserts. The caller
-- (getOrCreateProfile in src/lib/supabase/profile.ts) then does a plain,
-- separate SELECT afterwards, which succeeds normally because by that
-- point the profile row is already committed and current_company_id()
-- resolves correctly.
create or replace function public.bootstrap_company_and_profile(
  p_company_name text,
  p_full_name text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  -- Idempotent: if a concurrent request already created the profile,
  -- just return it instead of erroring.
  select * into v_profile from public.profiles where id = auth.uid();
  if found then
    return v_profile;
  end if;

  insert into public.companies (name)
  values (coalesce(nullif(trim(p_company_name), ''), 'Mein Unternehmen'))
  returning id into v_company_id;

  insert into public.profiles (id, company_id, full_name, role)
  values (auth.uid(), v_company_id, nullif(trim(p_full_name), ''), 'owner')
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function public.bootstrap_company_and_profile(text, text) from public;
grant execute on function public.bootstrap_company_and_profile(text, text) to authenticated;
