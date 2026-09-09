import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { PanelTabKey, ReportDetailPanelData } from "@/components/dashboard/ReportDetailPanel";
import {
  addReportEmployee,
  addReportMachine,
  addReportMaterial,
  archiveReport,
  consumeReportMaterial,
  deleteReport,
  deleteReportPhoto,
  finalizeOrderFromReport,
  markReportPdfGenerated,
  prepareInvoiceFromReport,
  removeReportEmployee,
  removeReportMachine,
  removeReportMaterial,
  saveReportSignature,
  updateReportDetails,
  updateReportStatus,
  uploadReportPhoto,
} from "@/app/(dashboard)/berichte/actions";

export const PANEL_TABS: readonly PanelTabKey[] = [
  "kunde",
  "auftrag",
  "mitarbeiter",
  "arbeitszeit",
  "material",
  "fotos",
  "unterschrift",
  "pdf",
  "historie",
];

/**
 * Lädt alle Daten für die Einsatzbericht-Detailansicht und bindet die
 * Server-Actions an den jeweiligen Eintrag. Genutzt von der eigenen Route
 * /berichte/[id] – früher lief das über ein rechtes Overlay-Panel auf der
 * Berichteliste, das durch die eigene Seite ersetzt wurde (gleiches Muster
 * wie /fahrzeuge/[id], /material/[id], /mitarbeiter/[id]).
 */
export async function loadReportDetailData(options: {
  supabase: SupabaseClient<Database>;
  reportId: string;
  canArchiveOrDelete: boolean;
  canLinkCommercial: boolean;
  activeTab: PanelTabKey;
  closeHref: string;
  tabHrefs: Record<PanelTabKey, string>;
  returnTo: string;
}): Promise<ReportDetailPanelData | null> {
  const { supabase, reportId, canArchiveOrDelete, canLinkCommercial, activeTab, closeHref, tabHrefs, returnTo } = options;

  const { data: panelItem } = await supabase.from("service_reports").select("*").eq("id", reportId).maybeSingle();

  if (!panelItem) return null;

  const [{ data: employeesRaw }, { data: fleetItemsRaw }, { data: materialsRaw }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, is_archived").order("full_name", { ascending: true }),
    supabase.from("fleet_items").select("id, name, kind, license_plate").order("name", { ascending: true }),
    supabase.from("materials").select("id, name, material_number, unit, unit_price").eq("is_archived", false).order("name", { ascending: true }),
  ]);

  const employees = employeesRaw ?? [];
  const activeEmployees = employees.filter((e) => !e.is_archived);
  const employeeNameById = Object.fromEntries(employees.map((e) => [e.id, e.full_name ?? "Unbenannt"]));
  const fleetItems = fleetItemsRaw ?? [];
  const fleetLabelById = Object.fromEntries(fleetItems.map((f) => [f.id, f.license_plate ? `${f.license_plate} · ${f.name}` : f.name]));
  const materials = materialsRaw ?? [];
  const materialOptions = materials.map((m) => ({ id: m.id, label: m.material_number ? `${m.material_number} · ${m.name}` : m.name, unit: m.unit }));

  const [{ data: order }, { data: customer }, { data: reportEmployees }, { data: reportMachines }, { data: reportMaterials }, { data: photos }, { data: history }] =
    await Promise.all([
      supabase.from("orders").select("id, order_number, title, order_kind, onsite_contact, property_id").eq("id", panelItem.order_id).maybeSingle(),
      panelItem.customer_id
        ? supabase.from("customers").select("name, contact_person, phone, email, street, postal_code, city").eq("id", panelItem.customer_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("report_employees").select("id, employee_id").eq("report_id", reportId),
      supabase.from("report_machines").select("id, fleet_item_id").eq("report_id", reportId),
      supabase.from("report_materials").select("id, material_id, quantity, unit_price, consumed_at, materials(name, unit)").eq("report_id", reportId),
      supabase.from("report_photos").select("id, category, file_name, storage_path, created_at").eq("report_id", reportId).order("created_at", { ascending: false }),
      supabase.from("report_history").select("id, action, summary, actor_id, created_at").eq("report_id", reportId).order("created_at", { ascending: false }),
    ]);

  let property: { name: string | null; street: string | null; city: string | null } | null = null;
  if (order?.property_id) {
    const { data } = await supabase.from("customer_properties").select("name, street, postal_code, city").eq("id", order.property_id).maybeSingle();
    property = data ? { name: data.name, street: data.street, city: [data.postal_code, data.city].filter(Boolean).join(" ") } : null;
  }

  let photoUrlByPath: Record<string, string> = {};
  const photoPaths = (photos ?? []).map((p) => p.storage_path);
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage.from("report-photos").createSignedUrls(photoPaths, 60 * 10);
    photoUrlByPath = Object.fromEntries((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]).filter(([p]) => p));
  }

  let signatureUrl: string | null = null;
  if (panelItem.customer_signature_path) {
    const { data: signed } = await supabase.storage.from("report-signatures").createSignedUrl(panelItem.customer_signature_path, 60 * 10);
    signatureUrl = signed?.signedUrl ?? null;
  }

  const usedEmployeeIds = new Set((reportEmployees ?? []).map((e) => e.employee_id));
  const usedMachineIds = new Set((reportMachines ?? []).map((m) => m.fleet_item_id));

  return {
    id: panelItem.id,
    reportNumber: panelItem.report_number,
    status: panelItem.status,
    isArchived: panelItem.is_archived,
    reportDate: panelItem.report_date,
    startTime: panelItem.start_time,
    endTime: panelItem.end_time,
    breakMinutes: panelItem.break_minutes,
    durationMinutes: panelItem.hours_worked !== null ? Math.round(Number(panelItem.hours_worked) * 60) : null,
    weather: panelItem.weather,
    workTypes: panelItem.work_types ?? [],
    workPerformed: panelItem.work_performed,
    internalNotes: panelItem.internal_notes,
    customer: customer
      ? {
          name: customer.name,
          contactPerson: customer.contact_person,
          phone: customer.phone,
          email: customer.email,
          street: customer.street,
          postalCode: customer.postal_code,
          city: customer.city,
        }
      : null,
    order: {
      id: order?.id ?? panelItem.order_id,
      orderNumber: order?.order_number ?? null,
      title: order?.title ?? "Unbekannter Auftrag",
      orderKind: order?.order_kind ?? null,
      onsiteContact: order?.onsite_contact ?? null,
      propertyName: property?.name ?? null,
      propertyStreet: property?.street ?? null,
      propertyCity: property?.city ?? null,
    },
    employees: (reportEmployees ?? []).map((e) => ({
      id: e.id,
      name: employeeNameById[e.employee_id] ?? "Unbenannt",
      removeAction: removeReportEmployee.bind(null, e.id, returnTo),
    })),
    employeeOptions: activeEmployees.filter((e) => !usedEmployeeIds.has(e.id)).map((e) => ({ id: e.id, label: e.full_name ?? "Unbenannt" })),
    machines: (reportMachines ?? []).map((m) => ({
      id: m.id,
      label: fleetLabelById[m.fleet_item_id] ?? "Unbekannt",
      removeAction: removeReportMachine.bind(null, m.id, returnTo),
    })),
    machineOptions: fleetItems.filter((f) => !usedMachineIds.has(f.id)).map((f) => ({ id: f.id, label: fleetLabelById[f.id] ?? f.name })),
    materials: (reportMaterials ?? []).map((m) => {
      const info = (m as unknown as { materials: { name: string; unit: string } | null }).materials;
      return {
        id: m.id,
        materialId: m.material_id,
        name: info?.name ?? "Unbekanntes Material",
        quantity: Number(m.quantity),
        unit: info?.unit ?? "Stück",
        unitPrice: m.unit_price !== null ? Number(m.unit_price) : null,
        consumedAt: m.consumed_at,
        consumeAction: consumeReportMaterial.bind(null, m.id, panelItem.order_id, returnTo),
        removeAction: removeReportMaterial.bind(null, m.id, returnTo),
      };
    }),
    materialOptions,
    photos: (photos ?? []).map((p) => ({
      id: p.id,
      category: p.category,
      fileName: p.file_name,
      url: photoUrlByPath[p.storage_path] ?? null,
      createdAt: p.created_at,
      deleteAction: deleteReportPhoto.bind(null, p.id, p.storage_path, returnTo),
    })),
    signature: {
      name: panelItem.customer_signature_name,
      role: panelItem.customer_signature_role,
      signedAt: panelItem.signed_at,
      url: signatureUrl,
    },
    pdfGeneratedAt: panelItem.pdf_generated_at,
    history: (history ?? []).map((h) => ({
      id: h.id,
      action: h.action,
      summary: h.summary,
      actorName: h.actor_id ? employeeNameById[h.actor_id] ?? null : null,
      createdAt: h.created_at,
    })),
    canManage: true,
    canArchiveOrDelete,
    canLinkCommercial,
    invoicePreparedAt: panelItem.invoice_prepared_at,
    activeTab,
    hrefs: {
      close: closeHref,
      tabs: tabHrefs,
    },
    updateStatusAction: updateReportStatus.bind(null, reportId, returnTo),
    updateDetailsAction: updateReportDetails.bind(null, reportId, returnTo),
    addEmployeeAction: addReportEmployee.bind(null, reportId, returnTo),
    addMachineAction: addReportMachine.bind(null, reportId, returnTo),
    addMaterialAction: addReportMaterial.bind(null, reportId, returnTo),
    uploadPhotoAction: uploadReportPhoto.bind(null, reportId, returnTo),
    saveSignatureAction: saveReportSignature.bind(null, reportId, returnTo),
    markPdfAction: markReportPdfGenerated.bind(null, reportId, returnTo),
    finalizeOrderAction: finalizeOrderFromReport.bind(null, reportId, panelItem.order_id, returnTo),
    prepareInvoiceAction: prepareInvoiceFromReport.bind(null, reportId, returnTo),
    archiveAction: archiveReport.bind(null, reportId, !panelItem.is_archived, returnTo),
    deleteAction: deleteReport.bind(null, reportId, "/berichte"),
  };
}
