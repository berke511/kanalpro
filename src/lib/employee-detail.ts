import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { EmployeeDetailPanelData, PanelTabKey } from "@/components/dashboard/EmployeeDetailPanel";
import {
  addQualification,
  archiveEmployee,
  assignMainVehicle,
  removeEmployee,
  removeQualification,
  unassignMainVehicle,
  updateEmployeeProfile,
  updateEmployeeRole,
  updateEmployeeStatus,
  updateEmployeeWorkTime,
  uploadEmployeeDocument,
  uploadEmployeePhoto,
  removeEmployeePhoto,
  deleteEmployeeDocument,
} from "@/app/(dashboard)/mitarbeiter/actions";

export const PANEL_TABS: readonly PanelTabKey[] = [
  "uebersicht",
  "profil",
  "qualifikationen",
  "fahrzeug",
  "dokumente",
  "arbeitszeit",
];

/**
 * Lädt alle Daten für die Mitarbeiter-Detailansicht und bindet die
 * Server-Actions an die jeweilige Mitarbeiter-ID. Gemeinsam genutzt von der
 * eigenen Detailseite (/mitarbeiter/[id]) – früher außerdem vom
 * Overlay-Panel auf der Mitarbeiterliste, das durch die eigene Seite
 * ersetzt wurde (siehe /mitarbeiter/[id]/page.tsx).
 */
export async function loadEmployeeDetailData(options: {
  supabase: SupabaseClient<Database>;
  employeeId: string;
  currentUserId: string;
  isAdmin: boolean;
  role: string | null;
  today: string;
  fleetById: Record<string, { id: string; name: string; license_plate: string | null }>;
  vehicleSelectOptions: Array<{ id: string; label: string }>;
  activeTab: PanelTabKey;
  closeHref: string;
  tabHrefs: Record<PanelTabKey, string>;
  returnTo: string;
}): Promise<EmployeeDetailPanelData | null> {
  const {
    supabase,
    employeeId,
    currentUserId,
    isAdmin,
    role,
    today,
    fleetById,
    vehicleSelectOptions,
    activeTab,
    closeHref,
    tabHrefs,
    returnTo,
  } = options;

  const { data: panelEmployee } = await supabase.from("profiles").select("*").eq("id", employeeId).maybeSingle();
  if (!panelEmployee) return null;

  const canManage = isAdmin;
  const canChangeStatus = canManage || role === "disponent";

  const [{ data: qualifications }, { data: documents }, { data: vehicleHistory }, { data: todayOrders }] =
    await Promise.all([
      supabase
        .from("employee_qualifications")
        .select("id, qualification_type, label, issued_date, expires_at, notes")
        .eq("employee_id", employeeId)
        .order("expires_at", { ascending: true, nullsFirst: false }),
      supabase
        .from("employee_documents")
        .select("id, category, file_name, storage_path, size_bytes, expires_at, created_at")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false }),
      supabase
        .from("employee_vehicle_history")
        .select("id, assigned_at, unassigned_at, fleet_items(name, license_plate)")
        .eq("employee_id", employeeId)
        .order("assigned_at", { ascending: false })
        .limit(10),
      supabase
        .from("order_assignments")
        .select("order_id, orders!inner(id, title, status, priority, scheduled_date, start_time, customer_id, property_id, dispatcher_id)")
        .eq("employee_id", employeeId)
        .eq("orders.scheduled_date", today)
        .order("start_time", { foreignTable: "orders", ascending: true })
        .limit(1),
    ]);

  let documentUrlByPath: Record<string, string> = {};
  const docPaths = (documents ?? []).map((d) => d.storage_path);
  if (docPaths.length > 0) {
    const { data: signed } = await supabase.storage.from("employee-documents").createSignedUrls(docPaths, 60 * 10);
    documentUrlByPath = Object.fromEntries((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]).filter(([p]) => p));
  }

  let photoUrl: string | null = null;
  if (panelEmployee.photo_path) {
    const { data: signed } = await supabase.storage.from("employee-photos").createSignedUrl(panelEmployee.photo_path, 60 * 10);
    photoUrl = signed?.signedUrl ?? null;
  }

  let todayAssignment: EmployeeDetailPanelData["todayAssignment"] = null;
  const todayOrder = todayOrders?.[0]?.orders;
  if (todayOrder) {
    const [{ data: customerRow }, { data: propertyRow }, { data: dispatcherRow }] = await Promise.all([
      todayOrder.customer_id
        ? supabase.from("customers").select("name, company_name").eq("id", todayOrder.customer_id).maybeSingle()
        : Promise.resolve({ data: null }),
      todayOrder.property_id
        ? supabase.from("customer_properties").select("street, postal_code, city").eq("id", todayOrder.property_id).maybeSingle()
        : Promise.resolve({ data: null }),
      todayOrder.dispatcher_id
        ? supabase.from("profiles").select("full_name").eq("id", todayOrder.dispatcher_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const address = propertyRow
      ? [propertyRow.street, [propertyRow.postal_code, propertyRow.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")
      : null;
    todayAssignment = {
      title: todayOrder.title,
      customerName: customerRow ? customerRow.company_name || customerRow.name : null,
      address: address || null,
      startTime: todayOrder.start_time,
      dispatcherName: dispatcherRow?.full_name ?? null,
      priority: todayOrder.priority,
      orderId: todayOrder.id,
    };
  }

  return {
    id: panelEmployee.id,
    fullName: panelEmployee.full_name,
    role: panelEmployee.role,
    status: panelEmployee.status,
    email: panelEmployee.email,
    phone: panelEmployee.phone,
    street: panelEmployee.street,
    postalCode: panelEmployee.postal_code,
    city: panelEmployee.city,
    birthDate: panelEmployee.birth_date,
    hireDate: panelEmployee.hire_date,
    personnelNumber: panelEmployee.personnel_number,
    department: panelEmployee.department,
    location: panelEmployee.location,
    emergencyContactName: panelEmployee.emergency_contact_name,
    emergencyContactPhone: panelEmployee.emergency_contact_phone,
    notes: panelEmployee.notes,
    photoUrl,
    weeklyHours: panelEmployee.weekly_hours,
    workTimeModel: panelEmployee.work_time_model,
    vacationDaysTotal: Number(panelEmployee.vacation_days_total),
    vacationDaysUsed: Number(panelEmployee.vacation_days_used),
    sickDaysCurrentYear: Number(panelEmployee.sick_days_current_year),
    overtimeHours: Number(panelEmployee.overtime_hours),
    isArchived: panelEmployee.is_archived,
    isSelf: currentUserId === panelEmployee.id,
    mainVehicle: panelEmployee.main_vehicle_id
      ? { id: panelEmployee.main_vehicle_id, name: fleetById[panelEmployee.main_vehicle_id]?.name ?? "Unbekannt" }
      : null,
    vehicleHistory: (vehicleHistory ?? []).map((h) => ({
      id: h.id,
      vehicleName: h.fleet_items?.license_plate ? `${h.fleet_items.license_plate} · ${h.fleet_items.name}` : h.fleet_items?.name ?? "Unbekannt",
      assignedAt: h.assigned_at,
      unassignedAt: h.unassigned_at,
    })),
    qualifications: (qualifications ?? []).map((q) => ({
      ...q,
      removeAction: removeQualification.bind(null, q.id, returnTo),
    })),
    documents: (documents ?? []).map((d) => ({
      id: d.id,
      category: d.category,
      file_name: d.file_name,
      size_bytes: d.size_bytes,
      expires_at: d.expires_at,
      created_at: d.created_at,
      url: documentUrlByPath[d.storage_path] ?? null,
      deleteAction: deleteEmployeeDocument.bind(null, d.id, d.storage_path, returnTo),
    })),
    todayAssignment,
    canManage,
    canChangeStatus,
    activeTab,
    vehicleOptions: vehicleSelectOptions,
    hrefs: {
      close: closeHref,
      tabs: tabHrefs,
    },
    updateStatusAction: updateEmployeeStatus.bind(null, employeeId, returnTo),
    updateProfileAction: updateEmployeeProfile.bind(null, employeeId, returnTo),
    updateWorkTimeAction: updateEmployeeWorkTime.bind(null, employeeId, returnTo),
    assignVehicleAction: assignMainVehicle.bind(null, employeeId, returnTo),
    unassignVehicleAction: unassignMainVehicle.bind(null, employeeId, returnTo),
    uploadPhotoAction: uploadEmployeePhoto.bind(null, employeeId, returnTo),
    removePhotoAction: removeEmployeePhoto.bind(null, employeeId, returnTo),
    addQualificationAction: addQualification.bind(null, employeeId, returnTo),
    uploadDocumentAction: uploadEmployeeDocument.bind(null, employeeId, returnTo),
    changeRoleAction: updateEmployeeRole.bind(null, employeeId),
    archiveAction: archiveEmployee.bind(null, employeeId, !panelEmployee.is_archived),
    deleteAction: removeEmployee.bind(null, employeeId),
  };
}
