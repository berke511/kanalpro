-- Fix: "companies_insert_authenticated" relied on auth.role() = 'authenticated',
-- which proved unreliable for INSERTs performed via the server-side (SSR)
-- Supabase client immediately after sign-in (first-time login bootstrap in
-- getOrCreateProfile()), causing:
--   "new row violates row-level security policy for table companies"
-- and breaking every first login with "Profil konnte nicht geladen werden".
--
-- auth.uid() IS NOT NULL is the standard, more robust way to express "any
-- authenticated user" and does not depend on the shape of the JWT 'role'
-- claim.
drop policy if exists "companies_insert_authenticated" on public.companies;

create policy "companies_insert_authenticated"
  on public.companies for insert
  with check (auth.uid() is not null);
