import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { OrderDetailPanelData, PanelTabKey } from "@/components/dashboard/OrderDetailPanel";
import { ORDER_AUDIT_ACTION_LABELS, computeOrderProgress } from "@/lib/orders";
import {
  addOrderMaterial,
  assignEmployee,
  assignVehicle,
  deleteOrderDocument,
  removeOrderMaterial,
  unassignEmployee,
  unassignVehicle,
  updateOrderFull,
  uploadOrderDocument,
} from "@/app/(dashboard)/auftraege/actions";

export const PANEL_TABS: readonly PanelTabKey[] = [
  "uebersicht",
  "details",
  "ressourcen",
  "material",
  "dokumente",
  "aktivitaeten",
  "bearbeiten",
];

/**
 * Lädt alle Daten für die Auftragsdetailansicht und bindet die Server-
 * Actions an den jeweiligen Auftrag. Genutzt von der eigenen Route
 * /auftraege/[id] – früher lief das über ein rechtes Overlay-Panel auf der
 * Liste, das durch die eigene Seite ersetzt wurde (gleiches Muster wie
 * /fahrzeuge/[id], /material/[id], /berichte/[id], /rechnungen/[id]).
 */
export async function loadOrderDetailData(options: {
  supabase: SupabaseClient<Database>;
  orderId: string;
  canManageResources: boolean;
  activeTab: PanelTabKey;
  tabHrefs: Record<PanelTabKey, string>;
  returnTo: string;
}): Promise<OrderDetailPanelData | null> {
  const { supabase, orderId, canManageResources, activeTab, tabHrefs, returnTo } = options;

  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();

  if (!order) return null;

  const [
    { data: customerRow },
    { data: primaryContactRow },
    { data: propertyRow },
    { data: createdByRow },
    { data: updatedByRow },
    { data: dispatcherRow },
    { data: assignmentRows },
    { data: resourceRows },
    { data: reportRows },
    { data: lastAuditRows },
    { data: allEmployees },
    { data: allFleetItems },
    { data: allMaterials },
  ] = await Promise.all([
    order.customer_id
      ? supabase.from("customers").select("id, name, phone, email").eq("id", order.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    order.customer_id
      ? supabase
          .from("customer_contacts")
          .select("name, phone, email")
          .eq("customer_id", order.customer_id)
          .eq("is_primary", true)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    order.property_id
      ? supabase
          .from("customer_properties")
          .select("name, street, postal_code, city")
          .eq("id", order.property_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    order.created_by
      ? supabase.from("profiles").select("full_name").eq("id", order.created_by).maybeSingle()
      : Promise.resolve({ data: null }),
    order.updated_by
      ? supabase.from("profiles").select("full_name").eq("id", order.updated_by).maybeSingle()
      : Promise.resolve({ data: null }),
    order.dispatcher_id
      ? supabase.from("profiles").select("full_name").eq("id", order.dispatcher_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("order_assignments")
      .select("id, employee_id, profiles!order_assignments_employee_id_fkey(full_name)")
      .eq("order_id", orderId),
    supabase.from("order_resources").select("id, fleet_item_id, fleet_items(name, license_plate, kind)").eq("order_id", orderId),
    supabase.from("service_reports").select("created_at, signed_at").eq("order_id", orderId),
    supabase
      .from("order_audit_log")
      .select("action, summary, created_at, actor_id")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("profiles").select("id, full_name").order("full_name", { ascending: true }),
    supabase.from("fleet_items").select("id, name, license_plate, kind").order("name", { ascending: true }),
    supabase.from("materials").select("id, name, unit").order("name", { ascending: true }),
  ]);

  const employeeNameById = Object.fromEntries((allEmployees ?? []).map((e) => [e.id, e.full_name ?? "Unbekannt"]));

  const employees = (assignmentRows ?? []).map((a) => ({
    assignmentId: a.id,
    id: a.employee_id,
    name: a.profiles?.full_name ?? "Unbekannt",
    unassignAction: unassignEmployee.bind(null, orderId, a.id, returnTo),
  }));
  const vehicles = (resourceRows ?? []).map((r) => ({
    resourceId: r.id,
    id: r.fleet_item_id,
    name: r.fleet_items?.name ?? "Unbekannt",
    licensePlate: r.fleet_items?.license_plate ?? null,
    unassignAction: unassignVehicle.bind(null, orderId, r.id, returnTo),
  }));

  let firstReportAt: string | null = null;
  let signedAt: string | null = null;
  for (const r of reportRows ?? []) {
    if (!firstReportAt || r.created_at < firstReportAt) firstReportAt = r.created_at;
    if (r.signed_at && (!signedAt || r.signed_at < signedAt)) signedAt = r.signed_at;
  }

  const progress = computeOrderProgress({
    createdAt: order.created_at,
    status: order.status,
    hasResources: employees.length > 0 || vehicles.length > 0,
    resourcesAssignedAt: null,
    startedAt: order.started_at,
    documentationCompletedAt: order.documentation_completed_at,
    firstReportAt,
    signedAt,
    completedAt: order.completed_at,
  });

  const lastAudit = lastAuditRows?.[0] ?? null;

  // Tab-abhängige Zusatzdaten: nur geladen, wenn der jeweilige Reiter auch
  // tatsächlich aktiv ist (gleiches Muster wie zuvor im Panel-Ladeblock auf
  // /auftraege).
  const [{ data: materialLinkRows }, { data: documentRows }, { data: activityRows }, { data: editCustomersRaw }] =
    await Promise.all([
      activeTab === "material"
        ? supabase
            .from("order_materials")
            .select("id, quantity, materials(name, unit)")
            .eq("order_id", orderId)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: null }),
      activeTab === "dokumente"
        ? supabase
            .from("order_documents")
            .select("id, file_name, storage_path, category, size_bytes, created_at")
            .eq("order_id", orderId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: null }),
      activeTab === "aktivitaeten"
        ? supabase
            .from("order_audit_log")
            .select("id, action, summary, created_at, actor_id")
            .eq("order_id", orderId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: null }),
      activeTab === "bearbeiten"
        ? supabase.from("customers").select("id, name, company_name").eq("is_archived", false).order("name", { ascending: true })
        : Promise.resolve({ data: null }),
    ]);

  const materials: OrderDetailPanelData["materials"] = (materialLinkRows ?? []).map((m) => ({
    linkId: m.id,
    name: m.materials?.name ?? "Unbekannt",
    unit: m.materials?.unit ?? null,
    quantity: Number(m.quantity),
    removeAction: removeOrderMaterial.bind(null, orderId, m.id, returnTo),
  }));

  let documents: OrderDetailPanelData["documents"] = [];
  if (activeTab === "dokumente") {
    const docs = documentRows ?? [];
    let urlByPath: Record<string, string> = {};
    if (docs.length > 0) {
      const { data: signed } = await supabase.storage.from("order-documents").createSignedUrls(
        docs.map((d) => d.storage_path),
        60 * 10,
      );
      urlByPath = Object.fromEntries((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]).filter(([p]) => p));
    }
    documents = docs.map((d) => ({
      id: d.id,
      file_name: d.file_name,
      category: d.category,
      size_bytes: d.size_bytes,
      created_at: d.created_at,
      url: urlByPath[d.storage_path] ?? null,
      deleteAction: deleteOrderDocument.bind(null, orderId, d.id, d.storage_path, returnTo),
    }));
  }

  const activity: OrderDetailPanelData["activity"] = (activityRows ?? []).map((a) => ({
    id: a.id,
    action: a.action,
    summary: a.summary,
    authorName: a.actor_id ? employeeNameById[a.actor_id] ?? "Unbekannt" : "System",
    createdAt: a.created_at,
  }));

  const assignedEmployeeIds = new Set(employees.map((e) => e.id));
  const assignedVehicleIds = new Set(vehicles.map((v) => v.id));

  const employeeIdsSelected = (assignmentRows ?? []).map((a) => a.employee_id);
  const vehicleIdsSelected = (resourceRows ?? [])
    .filter((r) => r.fleet_items?.kind !== "maschine")
    .map((r) => r.fleet_item_id);
  const machineIdsSelected = (resourceRows ?? [])
    .filter((r) => r.fleet_items?.kind === "maschine")
    .map((r) => r.fleet_item_id);

  return {
    order: {
      id: order.id,
      order_number: order.order_number,
      title: order.title,
      description: order.description,
      status: order.status,
      priority: order.priority,
      order_kind: order.order_kind,
      service_type: order.service_type,
      is_favorite: order.is_favorite,
      is_archived: order.is_archived,
      scheduled_date: order.scheduled_date,
      start_time: order.start_time,
      planned_duration_minutes: order.planned_duration_minutes,
      time_window_start: order.time_window_start,
      time_window_end: order.time_window_end,
      all_day: order.all_day,
      is_recurring: order.is_recurring,
      internal_notes: order.internal_notes,
      access_info: order.access_info,
      arrival_info: order.arrival_info,
      onsite_contact: order.onsite_contact,
      safety_notes: order.safety_notes,
      order_value: order.order_value,
      created_at: order.created_at,
      updated_at: order.updated_at,
    },
    customer: customerRow
      ? { id: customerRow.id, name: customerRow.name, phone: customerRow.phone, email: customerRow.email }
      : null,
    primaryContact: primaryContactRow ?? null,
    property: propertyRow
      ? {
          name: propertyRow.name,
          street: propertyRow.street,
          postal_code: propertyRow.postal_code,
          city: propertyRow.city,
          latitude: null,
          longitude: null,
        }
      : null,
    createdByName: createdByRow?.full_name ?? null,
    updatedByName: updatedByRow?.full_name ?? null,
    dispatcherName: dispatcherRow?.full_name ?? null,
    progress,
    lastActivity: lastAudit
      ? {
          text: lastAudit.summary || ORDER_AUDIT_ACTION_LABELS[lastAudit.action] || lastAudit.action,
          createdAt: lastAudit.created_at,
          authorName: lastAudit.actor_id ? employeeNameById[lastAudit.actor_id] ?? "Unbekannt" : "System",
        }
      : null,
    employees,
    vehicles,
    materials,
    documents,
    activity,
    activeTab,
    canManageResources,
    employeeOptions: (allEmployees ?? [])
      .filter((e) => !assignedEmployeeIds.has(e.id))
      .map((e) => ({ id: e.id, label: e.full_name || "Unbekannt" })),
    vehicleOptions: (allFleetItems ?? [])
      .filter((v) => !assignedVehicleIds.has(v.id))
      .map((v) => ({ id: v.id, label: v.license_plate ? `${v.license_plate} · ${v.name}` : v.name })),
    materialOptions: (allMaterials ?? []).map((m) => ({ id: m.id, label: m.name, unit: m.unit })),
    editForm: {
      customers: (editCustomersRaw ?? []).map((c) => ({ id: c.id, label: c.company_name || c.name })),
      employees: (allEmployees ?? []).map((e) => ({ id: e.id, label: e.full_name || "Unbenannt" })),
      vehicles: (allFleetItems ?? [])
        .filter((f) => f.kind !== "maschine")
        .map((f) => ({ id: f.id, label: f.license_plate ? `${f.license_plate} · ${f.name}` : f.name })),
      machines: (allFleetItems ?? []).filter((f) => f.kind === "maschine").map((f) => ({ id: f.id, label: f.name })),
      selectedEmployeeIds: employeeIdsSelected,
      selectedVehicleIds: vehicleIdsSelected,
      selectedMachineIds: machineIdsSelected,
      updateAction: updateOrderFull.bind(null, orderId),
    },
    hrefs: {
      tabs: tabHrefs,
      newReport: `/berichte/neu?order=${orderId}`,
      newQuote: customerRow ? `/rechnungen/neu?customer_id=${customerRow.id}&kind=angebot` : null,
      newInvoice: customerRow ? `/rechnungen/neu?customer_id=${customerRow.id}&kind=rechnung` : null,
    },
    assignEmployeeAction: assignEmployee.bind(null, orderId, returnTo),
    assignVehicleAction: assignVehicle.bind(null, orderId, returnTo),
    addMaterialAction: addOrderMaterial.bind(null, orderId, returnTo),
    uploadDocumentAction: uploadOrderDocument.bind(null, orderId, returnTo),
  };
}
