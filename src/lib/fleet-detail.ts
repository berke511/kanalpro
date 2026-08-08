import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { FleetDetailPanelData, PanelTabKey } from "@/components/dashboard/FleetDetailPanel";
import { maintenanceProgress } from "@/lib/fleet";
import {
  addCostEntry,
  addMaintenanceRecord,
  archiveFleetItem,
  assignFleetEmployee,
  deleteFleetDocument,
  deleteFleetItem,
  removeCostEntry,
  removeFleetPhoto,
  removeMaintenanceRecord,
  unassignFleetEmployee,
  updateFleetProfile,
  updateFleetStatus,
  uploadFleetDocument,
  uploadFleetPhoto,
} from "@/app/(dashboard)/fahrzeuge/actions";

export const PANEL_TABS: readonly PanelTabKey[] = ["uebersicht", "technik", "wartung", "dokumente", "kosten"];

/**
 * Lädt alle Daten für die Fahrzeug-/Maschinen-Detailansicht und bindet die
 * Server-Actions an den jeweiligen Eintrag. Genutzt von der eigenen Route
 * /fahrzeuge/[id] – früher lief das über ein Overlay-Panel auf der
 * Fuhrpark-Liste, das durch die eigene Seite ersetzt wurde (gleiches Muster
 * wie /mitarbeiter/[id], siehe src/lib/employee-detail.ts).
 */
export async function loadFleetDetailData(options: {
  supabase: SupabaseClient<Database>;
  fleetItemId: string;
  isAdmin: boolean;
  today: string;
  activeTab: PanelTabKey;
  closeHref: string;
  tabHrefs: Record<PanelTabKey, string>;
  returnTo: string;
}): Promise<FleetDetailPanelData | null> {
  const { supabase, fleetItemId, isAdmin, today, activeTab, closeHref, tabHrefs, returnTo } = options;

  const [{ data: panelItem }, { data: employeesRaw }, { data: allItemsRaw }] = await Promise.all([
    supabase.from("fleet_items").select("*").eq("id", fleetItemId).maybeSingle(),
    supabase.from("profiles").select("id, full_name, main_vehicle_id, is_archived").order("full_name", { ascending: true }),
    supabase.from("fleet_items").select("id, name, license_plate").order("name", { ascending: true }),
  ]);

  if (!panelItem) return null;

  const employees = employeesRaw ?? [];
  const activeEmployees = employees.filter((e) => !e.is_archived);
  const allItems = allItemsRaw ?? [];

  const [{ data: maintenanceRecords }, { data: costEntries }, { data: documents }, { data: linkedVehicleRow }, { data: resourceRows }] =
    await Promise.all([
      supabase
        .from("fleet_maintenance_records")
        .select("id, record_type, performed_at, description, cost, performed_by, odometer_km, operating_hours")
        .eq("fleet_item_id", fleetItemId)
        .order("performed_at", { ascending: false }),
      supabase
        .from("fleet_cost_entries")
        .select("id, category, amount, occurred_at, note")
        .eq("fleet_item_id", fleetItemId)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("fleet_documents")
        .select("id, category, file_name, storage_path, size_bytes, expires_at, created_at")
        .eq("fleet_item_id", fleetItemId)
        .order("created_at", { ascending: false }),
      panelItem.linked_vehicle_id
        ? supabase.from("fleet_items").select("id, name").eq("id", panelItem.linked_vehicle_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("order_resources")
        .select("orders!inner(id, title, status, scheduled_date, start_time, customer_id)")
        .eq("fleet_item_id", fleetItemId)
        .eq("orders.scheduled_date", today)
        .limit(1),
    ]);

  let documentUrlByPath: Record<string, string> = {};
  const docPaths = (documents ?? []).map((d) => d.storage_path);
  if (docPaths.length > 0) {
    const { data: signed } = await supabase.storage.from("fleet-documents").createSignedUrls(docPaths, 60 * 10);
    documentUrlByPath = Object.fromEntries((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]).filter(([p]) => p));
  }

  let photoUrl: string | null = null;
  if (panelItem.photo_path) {
    const { data: signed } = await supabase.storage.from("fleet-photos").createSignedUrl(panelItem.photo_path, 60 * 10);
    photoUrl = signed?.signedUrl ?? null;
  }

  const costTotals = { wartung: 0, reparatur: 0, kraftstoff: 0, versicherung: 0, leasing: 0, sonstige: 0, total: 0 };
  for (const r of maintenanceRecords ?? []) {
    const cost = Number(r.cost ?? 0);
    if (r.record_type === "wartung") costTotals.wartung += cost;
    else if (r.record_type === "reparatur") costTotals.reparatur += cost;
    costTotals.total += cost;
  }
  for (const c of costEntries ?? []) {
    const amount = Number(c.amount ?? 0);
    if (c.category in costTotals) {
      (costTotals as unknown as Record<string, number>)[c.category] += amount;
    }
    costTotals.total += amount;
  }

  const assignedEmployees = employees
    .filter((e) => e.main_vehicle_id === fleetItemId)
    .map((e) => ({
      id: e.id,
      fullName: e.full_name,
      unassignAction: unassignFleetEmployee.bind(null, fleetItemId, e.id, returnTo),
    }));

  let currentOrder: FleetDetailPanelData["currentOrder"] = null;
  const todayOrder = resourceRows?.[0]?.orders;
  if (todayOrder) {
    const customerName = todayOrder.customer_id
      ? (await supabase.from("customers").select("name, company_name").eq("id", todayOrder.customer_id).maybeSingle()).data
      : null;
    currentOrder = {
      id: todayOrder.id,
      title: todayOrder.title,
      customerName: customerName ? customerName.company_name || customerName.name : null,
      startTime: todayOrder.start_time,
    };
  }

  return {
    id: panelItem.id,
    kind: panelItem.kind,
    name: panelItem.name,
    licensePlate: panelItem.license_plate,
    status: panelItem.status,
    notes: panelItem.notes,
    photoUrl,
    inventoryNumber: panelItem.inventory_number,
    manufacturer: panelItem.manufacturer,
    model: panelItem.model,
    yearBuilt: panelItem.year_built,
    location: panelItem.location,
    serviceArea: panelItem.service_area,
    ownership: panelItem.ownership,
    fuelType: panelItem.fuel_type,
    odometerKm: panelItem.odometer_km,
    operatingHours: panelItem.operating_hours,
    odometerIntervalKm: panelItem.odometer_interval_km,
    operatingHoursInterval: panelItem.operating_hours_interval,
    lastMaintenanceAt: panelItem.last_maintenance_at,
    nextMaintenanceAt: panelItem.next_maintenance_at,
    nextMaintenanceNote: panelItem.next_maintenance_note,
    tuvDueDate: panelItem.tuv_due_date,
    uvvDueDate: panelItem.uvv_due_date,
    insuranceDueDate: panelItem.insurance_due_date,
    leasingEndDate: panelItem.leasing_end_date,
    defaultCrewSize: panelItem.default_crew_size,
    maxCrewSize: panelItem.max_crew_size,
    defaultEquipment: panelItem.default_equipment,
    linkedVehicle: linkedVehicleRow ? { id: linkedVehicleRow.id, name: linkedVehicleRow.name } : null,
    linkedVehicleOptions: allItems
      .filter((i) => i.id !== fleetItemId)
      .map((i) => ({ id: i.id, label: i.license_plate ? `${i.license_plate} · ${i.name}` : i.name })),
    maintenanceProgress: maintenanceProgress(panelItem.last_maintenance_at, panelItem.next_maintenance_at),
    isArchived: panelItem.is_archived,
    assignedEmployees,
    employeeOptions: activeEmployees.filter((e) => e.main_vehicle_id !== fleetItemId).map((e) => ({ id: e.id, label: e.full_name ?? "Unbenannt" })),
    currentOrder,
    maintenanceRecords: (maintenanceRecords ?? []).map((r) => ({
      ...r,
      removeAction: removeMaintenanceRecord.bind(null, r.id, returnTo),
    })),
    costEntries: (costEntries ?? []).map((c) => ({
      ...c,
      removeAction: removeCostEntry.bind(null, c.id, returnTo),
    })),
    costTotals,
    documents: (documents ?? []).map((d) => ({
      id: d.id,
      category: d.category,
      file_name: d.file_name,
      size_bytes: d.size_bytes,
      expires_at: d.expires_at,
      created_at: d.created_at,
      url: documentUrlByPath[d.storage_path] ?? null,
      deleteAction: deleteFleetDocument.bind(null, d.id, d.storage_path, returnTo),
    })),
    canManage: isAdmin,
    activeTab,
    hrefs: {
      close: closeHref,
      tabs: tabHrefs,
    },
    updateStatusAction: updateFleetStatus.bind(null, fleetItemId, returnTo),
    updateProfileAction: updateFleetProfile.bind(null, fleetItemId, returnTo),
    assignEmployeeAction: assignFleetEmployee.bind(null, fleetItemId, returnTo),
    uploadPhotoAction: uploadFleetPhoto.bind(null, fleetItemId, returnTo),
    removePhotoAction: removeFleetPhoto.bind(null, fleetItemId, returnTo),
    addMaintenanceAction: addMaintenanceRecord.bind(null, fleetItemId, returnTo),
    addCostAction: addCostEntry.bind(null, fleetItemId, returnTo),
    uploadDocumentAction: uploadFleetDocument.bind(null, fleetItemId, returnTo),
    archiveAction: archiveFleetItem.bind(null, fleetItemId, !panelItem.is_archived),
    deleteAction: deleteFleetItem.bind(null, fleetItemId),
  };
}
