import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { MaterialDetailPanelData, PanelTabKey } from "@/components/dashboard/MaterialDetailPanel";
import { availableQuantity } from "@/lib/materials";
import {
  archiveMaterial,
  consumeMaterialReservation,
  consumeOrderMaterial,
  deleteMaterial,
  deleteMaterialDocument,
  addMaterialMovement,
  releaseMaterialReservation,
  removeMaterialPhoto,
  reserveMaterialForTarget,
  updateMaterialProfile,
  updateMaterialStatus,
  uploadMaterialDocument,
  uploadMaterialPhoto,
} from "@/app/(dashboard)/material/actions";

export const PANEL_TABS: readonly PanelTabKey[] = ["uebersicht", "bewegungen", "auftraege", "dokumente"];

/**
 * Lädt alle Daten für die Material-Detailansicht und bindet die
 * Server-Actions an den jeweiligen Eintrag. Genutzt von der eigenen Route
 * /material/[id] – früher lief das über ein rechtes Overlay-Panel auf der
 * Materialliste, das durch die eigene Seite ersetzt wurde (gleiches Muster
 * wie /fahrzeuge/[id], siehe src/lib/fleet-detail.ts).
 */
export async function loadMaterialDetailData(options: {
  supabase: SupabaseClient<Database>;
  materialId: string;
  isAdmin: boolean;
  today: string;
  activeTab: PanelTabKey;
  closeHref: string;
  tabHrefs: Record<PanelTabKey, string>;
  returnTo: string;
}): Promise<MaterialDetailPanelData | null> {
  const { supabase, materialId, isAdmin, activeTab, closeHref, tabHrefs, returnTo } = options;

  const [{ data: panelItem }, { data: allLocationsRaw }, { data: employeesRaw }, { data: fleetItemsRaw }] = await Promise.all([
    supabase.from("materials").select("*").eq("id", materialId).maybeSingle(),
    supabase.from("material_locations").select("id, name").order("name", { ascending: true }),
    supabase.from("profiles").select("id, full_name, is_archived").order("full_name", { ascending: true }),
    supabase.from("fleet_items").select("id, name, license_plate").order("name", { ascending: true }),
  ]);

  if (!panelItem) return null;

  const allLocations = allLocationsRaw ?? [];
  const employees = employeesRaw ?? [];
  const activeEmployees = employees.filter((e) => !e.is_archived);
  const fleetItems = fleetItemsRaw ?? [];

  const locationNameById = Object.fromEntries(allLocations.map((l) => [l.id, l.name]));
  const employeeNameById = Object.fromEntries(employees.map((e) => [e.id, e.full_name ?? "Unbenannt"]));
  const fleetLabelById = Object.fromEntries(fleetItems.map((f) => [f.id, f.license_plate ? `${f.license_plate} · ${f.name}` : f.name]));

  const [{ data: movements }, { data: reservations }, { data: orderMaterials }, { data: documents }, { data: openReservations }, { data: openOrderMaterials }] =
    await Promise.all([
      supabase
        .from("material_movements")
        .select("id, movement_type, quantity, from_location_id, to_location_id, reason, performed_by, created_at")
        .eq("material_id", materialId)
        .order("created_at", { ascending: false }),
      supabase
        .from("material_reservations")
        .select("id, quantity, target_type, fleet_item_id, employee_id, note, status, reserved_at")
        .eq("material_id", materialId)
        .order("reserved_at", { ascending: false }),
      supabase
        .from("order_materials")
        .select("id, quantity, status, order_id, orders(id, title)")
        .eq("material_id", materialId)
        .order("created_at", { ascending: false }),
      supabase
        .from("material_documents")
        .select("id, category, file_name, storage_path, size_bytes, created_at")
        .eq("material_id", materialId)
        .order("created_at", { ascending: false }),
      supabase.from("material_reservations").select("quantity").eq("material_id", materialId).eq("status", "reserviert"),
      supabase.from("order_materials").select("quantity").eq("material_id", materialId).eq("status", "reserviert"),
    ]);

  let documentUrlByPath: Record<string, string> = {};
  const docPaths = (documents ?? []).map((d) => d.storage_path);
  if (docPaths.length > 0) {
    const { data: signed } = await supabase.storage.from("material-documents").createSignedUrls(docPaths, 60 * 10);
    documentUrlByPath = Object.fromEntries((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]).filter(([p]) => p));
  }

  let photoUrl: string | null = null;
  if (panelItem.photo_path) {
    const { data: signed } = await supabase.storage.from("material-photos").createSignedUrl(panelItem.photo_path, 60 * 10);
    photoUrl = signed?.signedUrl ?? null;
  }

  const reserved =
    (openReservations ?? []).reduce((sum, r) => sum + Number(r.quantity), 0) +
    (openOrderMaterials ?? []).reduce((sum, r) => sum + Number(r.quantity), 0);

  return {
    id: panelItem.id,
    materialNumber: panelItem.material_number,
    name: panelItem.name,
    category: panelItem.category,
    status: panelItem.status,
    notes: panelItem.notes,
    photoUrl,
    qrCode: panelItem.qr_code,
    unit: panelItem.unit,
    quantity: Number(panelItem.quantity),
    minQuantity: panelItem.min_quantity !== null ? Number(panelItem.min_quantity) : null,
    reservedQuantity: reserved,
    availableQuantity: availableQuantity(Number(panelItem.quantity), reserved),
    locationId: panelItem.location_id,
    locationName: panelItem.location_id ? locationNameById[panelItem.location_id] ?? null : null,
    locationOptions: allLocations,
    supplierName: panelItem.supplier_name,
    supplierContactName: panelItem.supplier_contact_name,
    supplierPhone: panelItem.supplier_phone,
    supplierEmail: panelItem.supplier_email,
    purchasePrice: panelItem.purchase_price !== null ? Number(panelItem.purchase_price) : null,
    unitPrice: panelItem.unit_price !== null ? Number(panelItem.unit_price) : null,
    taxRate: panelItem.tax_rate !== null ? Number(panelItem.tax_rate) : null,
    lastOrderedAt: panelItem.last_ordered_at,
    isArchived: panelItem.is_archived,
    movements: (movements ?? []).map((m) => ({
      id: m.id,
      movement_type: m.movement_type,
      quantity: Number(m.quantity),
      from_location_name: m.from_location_id ? locationNameById[m.from_location_id] ?? null : null,
      to_location_name: m.to_location_id ? locationNameById[m.to_location_id] ?? null : null,
      reason: m.reason,
      performed_by_name: m.performed_by ? employeeNameById[m.performed_by] ?? null : null,
      created_at: m.created_at,
    })),
    reservations: (reservations ?? []).map((r) => ({
      id: r.id,
      quantity: Number(r.quantity),
      target_type: r.target_type,
      target_label:
        r.target_type === "fahrzeug"
          ? fleetLabelById[r.fleet_item_id ?? ""] ?? "Unbekanntes Fahrzeug"
          : employeeNameById[r.employee_id ?? ""] ?? "Unbekannter Mitarbeiter",
      note: r.note,
      status: r.status,
      reserved_at: r.reserved_at,
      releaseAction: releaseMaterialReservation.bind(null, r.id, returnTo),
      consumeAction: consumeMaterialReservation.bind(null, r.id, returnTo),
    })),
    fleetOptions: fleetItems.map((f) => ({ id: f.id, label: f.license_plate ? `${f.license_plate} · ${f.name}` : f.name })),
    employeeOptions: activeEmployees.map((e) => ({ id: e.id, label: e.full_name ?? "Unbenannt" })),
    orderMaterials: (orderMaterials ?? []).map((om) => ({
      id: om.id,
      orderId: om.order_id,
      orderTitle: (om as unknown as { orders: { id: string; title: string } | null }).orders?.title ?? "Unbekannter Auftrag",
      quantity: Number(om.quantity),
      status: om.status,
      consumeAction: consumeOrderMaterial.bind(null, om.id, returnTo),
    })),
    documents: (documents ?? []).map((d) => ({
      id: d.id,
      category: d.category,
      file_name: d.file_name,
      size_bytes: d.size_bytes,
      created_at: d.created_at,
      url: documentUrlByPath[d.storage_path] ?? null,
      deleteAction: deleteMaterialDocument.bind(null, d.id, d.storage_path, returnTo),
    })),
    canManage: isAdmin,
    activeTab,
    hrefs: {
      close: closeHref,
      tabs: tabHrefs,
    },
    updateStatusAction: updateMaterialStatus.bind(null, materialId, returnTo),
    updateProfileAction: updateMaterialProfile.bind(null, materialId, returnTo),
    uploadPhotoAction: uploadMaterialPhoto.bind(null, materialId, returnTo),
    removePhotoAction: removeMaterialPhoto.bind(null, materialId, returnTo),
    addMovementAction: addMaterialMovement.bind(null, materialId, returnTo),
    reserveAction: reserveMaterialForTarget.bind(null, materialId, returnTo),
    uploadDocumentAction: uploadMaterialDocument.bind(null, materialId, returnTo),
    archiveAction: archiveMaterial.bind(null, materialId, !panelItem.is_archived),
    deleteAction: deleteMaterial.bind(null, materialId, returnTo),
  };
}
