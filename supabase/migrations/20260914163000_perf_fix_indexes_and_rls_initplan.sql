-- Performance fix: add missing foreign-key indexes (76) and stop RLS
-- policies from re-evaluating auth.uid() per row (20 policies).
-- Source: Supabase performance advisors (unindexed_foreign_keys, auth_rls_initplan).

-- =========================================================
-- 1) Missing indexes on foreign-key columns
--    Without these, every filtered/joined query on these columns
--    (almost always company_id, i.e. on EVERY request) falls back
--    to a sequential scan instead of an index scan.
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_company_id ON public.chat_message_reactions(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_conversation_id ON public.chat_message_reactions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_profile_id ON public.chat_message_reactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_company_id ON public.chat_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to_id ON public.chat_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_company_invites_accepted_by ON public.company_invites(accepted_by);
CREATE INDEX IF NOT EXISTS idx_company_invites_created_by ON public.company_invites(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_customer_audit_log_actor_id ON public.customer_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_customer_audit_log_company_id ON public.customer_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_company_id ON public.customer_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_company_id ON public.customer_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_uploaded_by ON public.customer_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_customer_notes_author_id ON public.customer_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_company_id ON public.customer_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_properties_company_id ON public.customer_properties(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON public.customers(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_updated_by ON public.customers(updated_by);
CREATE INDEX IF NOT EXISTS idx_employee_documents_uploaded_by ON public.employee_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_employee_qualifications_created_by ON public.employee_qualifications(created_by);
CREATE INDEX IF NOT EXISTS idx_employee_vehicle_history_assigned_by ON public.employee_vehicle_history(assigned_by);
CREATE INDEX IF NOT EXISTS idx_employee_vehicle_history_company_id ON public.employee_vehicle_history(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_vehicle_history_fleet_item_id ON public.employee_vehicle_history(fleet_item_id);
CREATE INDEX IF NOT EXISTS idx_fleet_cost_entries_company_id ON public.fleet_cost_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_fleet_cost_entries_created_by ON public.fleet_cost_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_fleet_cost_entries_fleet_item_id ON public.fleet_cost_entries(fleet_item_id);
CREATE INDEX IF NOT EXISTS idx_fleet_documents_company_id ON public.fleet_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_fleet_documents_fleet_item_id ON public.fleet_documents(fleet_item_id);
CREATE INDEX IF NOT EXISTS idx_fleet_documents_uploaded_by ON public.fleet_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_fleet_items_linked_vehicle_id ON public.fleet_items(linked_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fleet_maintenance_records_company_id ON public.fleet_maintenance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_fleet_maintenance_records_created_by ON public.fleet_maintenance_records(created_by);
CREATE INDEX IF NOT EXISTS idx_fleet_maintenance_records_fleet_item_id ON public.fleet_maintenance_records(fleet_item_id);
CREATE INDEX IF NOT EXISTS idx_invoice_history_actor_id ON public.invoice_history(actor_id);
CREATE INDEX IF NOT EXISTS idx_invoice_history_company_id ON public.invoice_history(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_assigned_to ON public.invoices(assigned_to);
CREATE INDEX IF NOT EXISTS idx_invoices_converted_to_invoice_id ON public.invoices(converted_to_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_source_quote_id ON public.invoices(source_quote_id);
CREATE INDEX IF NOT EXISTS idx_material_documents_company_id ON public.material_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_material_documents_material_id ON public.material_documents(material_id);
CREATE INDEX IF NOT EXISTS idx_material_documents_uploaded_by ON public.material_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_material_movements_company_id ON public.material_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_material_movements_from_location_id ON public.material_movements(from_location_id);
CREATE INDEX IF NOT EXISTS idx_material_movements_order_id ON public.material_movements(order_id);
CREATE INDEX IF NOT EXISTS idx_material_movements_performed_by ON public.material_movements(performed_by);
CREATE INDEX IF NOT EXISTS idx_material_movements_to_location_id ON public.material_movements(to_location_id);
CREATE INDEX IF NOT EXISTS idx_material_reservations_company_id ON public.material_reservations(company_id);
CREATE INDEX IF NOT EXISTS idx_material_reservations_employee_id ON public.material_reservations(employee_id);
CREATE INDEX IF NOT EXISTS idx_material_reservations_fleet_item_id ON public.material_reservations(fleet_item_id);
CREATE INDEX IF NOT EXISTS idx_material_reservations_reserved_by ON public.material_reservations(reserved_by);
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_order_assignments_assigned_by ON public.order_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_order_assignments_company_id ON public.order_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_order_audit_log_actor_id ON public.order_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_order_documents_company_id ON public.order_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_order_documents_uploaded_by ON public.order_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_order_materials_added_by ON public.order_materials(added_by);
CREATE INDEX IF NOT EXISTS idx_order_materials_company_id ON public.order_materials(company_id);
CREATE INDEX IF NOT EXISTS idx_order_materials_material_id ON public.order_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_order_resources_company_id ON public.order_resources(company_id);
CREATE INDEX IF NOT EXISTS idx_order_resources_fleet_item_id ON public.order_resources(fleet_item_id);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON public.orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON public.orders(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_updated_by ON public.orders(updated_by);
CREATE INDEX IF NOT EXISTS idx_report_employees_company_id ON public.report_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_report_employees_employee_id ON public.report_employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_report_history_actor_id ON public.report_history(actor_id);
CREATE INDEX IF NOT EXISTS idx_report_machines_company_id ON public.report_machines(company_id);
CREATE INDEX IF NOT EXISTS idx_report_machines_fleet_item_id ON public.report_machines(fleet_item_id);
CREATE INDEX IF NOT EXISTS idx_report_materials_company_id ON public.report_materials(company_id);
CREATE INDEX IF NOT EXISTS idx_report_materials_material_id ON public.report_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_report_photos_company_id ON public.report_photos(company_id);
CREATE INDEX IF NOT EXISTS idx_report_photos_uploaded_by ON public.report_photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_service_reports_created_by ON public.service_reports(created_by);

-- =========================================================
-- 2) RLS policies: wrap auth.uid() as (select auth.uid()) so Postgres
--    evaluates it once per query (InitPlan) instead of once per row.
--    Pure performance change - the security logic is unchanged.
-- =========================================================

ALTER POLICY chat_message_reactions_delete_own ON public.chat_message_reactions
  USING (profile_id = (select auth.uid()));

ALTER POLICY chat_message_reactions_insert_own ON public.chat_message_reactions
  WITH CHECK (is_conversation_member(conversation_id) AND (profile_id = (select auth.uid())) AND (company_id = current_company_id()));

ALTER POLICY chat_messages_insert_member ON public.chat_messages
  WITH CHECK (is_conversation_member(conversation_id) AND (sender_id = (select auth.uid())) AND (company_id = current_company_id()));

ALTER POLICY chat_messages_update_own ON public.chat_messages
  USING (sender_id = (select auth.uid()))
  WITH CHECK (sender_id = (select auth.uid()));

ALTER POLICY companies_insert_authenticated ON public.companies
  WITH CHECK ((select auth.uid()) IS NOT NULL);

ALTER POLICY companies_update_owner_admin ON public.companies
  USING ((id = current_company_id()) AND EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['owner'::text,'admin'::text])
  ));

ALTER POLICY company_invites_delete_admin ON public.company_invites
  USING ((company_id = current_company_id()) AND EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['owner'::text,'admin'::text])
  ));

ALTER POLICY company_invites_insert_admin ON public.company_invites
  WITH CHECK ((company_id = current_company_id()) AND EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['owner'::text,'admin'::text])
  ));

ALTER POLICY conversation_members_delete_self ON public.conversation_members
  USING (profile_id = (select auth.uid()));

ALTER POLICY conversation_members_insert_member_or_creator ON public.conversation_members
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = conversation_members.profile_id AND p.company_id = current_company_id())
    AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_members.conversation_id AND c.company_id = current_company_id())
    AND (is_conversation_member(conversation_id) OR EXISTS (
      SELECT 1 FROM conversations c WHERE c.id = conversation_members.conversation_id AND c.created_by = (select auth.uid())
    ))
  );

ALTER POLICY conversation_members_update_self ON public.conversation_members
  USING (profile_id = (select auth.uid()))
  WITH CHECK (profile_id = (select auth.uid()));

ALTER POLICY conversations_insert_own_company ON public.conversations
  WITH CHECK ((company_id = current_company_id()) AND (created_by = (select auth.uid())));

ALTER POLICY conversations_select_member_or_creator ON public.conversations
  USING (is_conversation_member(id) OR (created_by = (select auth.uid())));

ALTER POLICY notifications_select_own ON public.notifications
  USING (recipient_id = (select auth.uid()));

ALTER POLICY notifications_update_own ON public.notifications
  USING (recipient_id = (select auth.uid()))
  WITH CHECK (recipient_id = (select auth.uid()));

ALTER POLICY orders_select_own_company ON public.orders
  USING (
    (company_id = current_company_id()) AND (
      (current_user_role() <> 'techniker'::text)
      OR (assigned_to = (select auth.uid()))
      OR (dispatcher_id = (select auth.uid()))
      OR EXISTS (SELECT 1 FROM order_assignments oa WHERE oa.order_id = orders.id AND oa.employee_id = (select auth.uid()))
    )
  );

ALTER POLICY profiles_delete_admin ON public.profiles
  USING (
    (company_id = current_company_id())
    AND (id <> (select auth.uid()))
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['owner'::text,'admin'::text]))
  );

ALTER POLICY profiles_insert_self ON public.profiles
  WITH CHECK (id = (select auth.uid()));

ALTER POLICY profiles_update_admin ON public.profiles
  USING (
    (company_id = current_company_id())
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['owner'::text,'admin'::text]))
  );

ALTER POLICY profiles_update_self ON public.profiles
  USING (id = (select auth.uid()));
