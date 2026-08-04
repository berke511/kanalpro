-- Sicherheitslücke: Die INSERT/DELETE-Policies für order_assignments und
-- order_resources schlossen bisher nur die Rolle "techniker" aus. Dadurch
-- konnte die Rolle "büro" Mitarbeiter/Fahrzeuge direkt über die Datenbank
-- zu- oder abweisen, obwohl canManageResourcesAndSchedule() im Frontend
-- (src/lib/roles.ts) das ausdrücklich nur Disponent/Admin/Geschäftsführer/
-- Owner erlaubt. Verschärft die Policies so, dass sie exakt dieselbe
-- Rollenmenge wie das Frontend durchsetzen.
--
-- Hinweis: Dieser Fix wurde bereits am 2026-08-04 direkt live über
-- apply_migration angewendet; diese Datei holt das nur im Repo nach, damit
-- die Migrationshistorie mit dem tatsächlichen Datenbankzustand
-- übereinstimmt.
drop policy if exists "order_assignments_insert_own_company" on public.order_assignments;
create policy "order_assignments_insert_own_company" on public.order_assignments
  for insert with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

drop policy if exists "order_assignments_delete_own_company" on public.order_assignments;
create policy "order_assignments_delete_own_company" on public.order_assignments
  for delete using (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

drop policy if exists "order_resources_insert_own_company" on public.order_resources;
create policy "order_resources_insert_own_company" on public.order_resources
  for insert with check (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );

drop policy if exists "order_resources_delete_own_company" on public.order_resources;
create policy "order_resources_delete_own_company" on public.order_resources
  for delete using (
    company_id = public.current_company_id()
    and public.current_user_role() = any (array['owner', 'admin', 'geschaeftsfuehrer', 'disponent'])
  );
