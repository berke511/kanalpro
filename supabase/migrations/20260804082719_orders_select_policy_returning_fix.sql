-- Fix: INSERT INTO orders ... RETURNING scheiterte mit "new row violates
-- row-level security policy for table orders", obwohl WITH CHECK (Insert-
-- Policy) unabhängig getestet immer TRUE ergab. Ursache: die SELECT-Policy
-- "orders_select_own_company" nutzte can_view_order(id) – diese Funktion
-- fragt intern per SELECT erneut die orders-Tabelle nach der übergebenen id
-- ab. Bei INSERT ... RETURNING wird die SELECT-Policy innerhalb desselben
-- Commands ausgewertet, in dem die Zeile gerade erst eingefügt wird; die
-- interne Nachfrage von can_view_order() sieht die brandneue Zeile in
-- diesem Moment nicht zuverlässig, wodurch die Sichtbarkeitsprüfung
-- fälschlich fehlschlägt und Postgres den RETURNING-Vorgang als RLS-
-- Verstoß meldet.
--
-- Fix: Die Policy für die orders-Tabelle selbst greift jetzt direkt auf die
-- Spalten der geprüften Zeile zu (company_id/assigned_to/dispatcher_id/id
-- stehen im USING-Ausdruck einer Policy ohnehin unmittelbar zur Verfügung)
-- statt über eine indirekte Selbst-Abfrage zu gehen. can_view_order() bleibt
-- unverändert für die anderen Tabellen (order_assignments, order_resources,
-- order_materials, order_documents, order_audit_log), da dort die Funktion
-- eine andere, bereits existierende orders-Zeile über deren Fremdschlüssel
-- nachschlägt – dort tritt das Problem nicht auf.
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
        where oa.order_id = id and oa.employee_id = auth.uid()
      )
    )
  );
