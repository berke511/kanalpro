-- Fix: Nach der RETURNING-Korrektur in
-- 20260804082719_orders_select_policy_returning_fix.sql sah die Rolle
-- "techniker" plötzlich GAR KEINE Aufträge mehr (auch nicht die eigenen
-- zugewiesenen) statt wie vorgesehen nur ihre. Ursache: im USING-Ausdruck
-- der Policy "orders_select_own_company" ist "id" innerhalb des
-- korrelierten Subquery gegen order_assignments mehrdeutig – sowohl
-- orders.id als auch order_assignments.id existieren, und die unqualifizierte
-- Referenz wurde am nächstliegenden Scope (order_assignments.id) gebunden
-- statt an orders.id. Dadurch lieferte "oa.order_id = id" faktisch nie eine
-- Übereinstimmung.
--
-- Fix: Die äußere Tabelle im Subquery wird jetzt immer explizit als
-- "orders.id" qualifiziert.
--
-- Hinweis: Dieser Fix wurde bereits am 2026-08-04 direkt live über
-- apply_migration angewendet; diese Datei holt das nur im Repo nach, damit
-- die Migrationshistorie mit dem tatsächlichen Datenbankzustand
-- übereinstimmt.
drop policy if exists "orders_select_own_company" on public.orders;
create policy "orders_select_own_company" on public.orders
  for select using (
    company_id = public.current_company_id()
    and (
      public.current_user_role() <> 'techniker'
      or assigned_to = auth.uid()
      or dispatcher_id = auth.uid()
      or exists (
        select 1 from public.order_assignments oa
        where oa.order_id = orders.id and oa.employee_id = auth.uid()
      )
    )
  );
