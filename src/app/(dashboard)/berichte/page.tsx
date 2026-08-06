import Link from "next/link";
import { CalendarCheck, CalendarDays, CheckCircle2, ClipboardList, Clock, FileSignature } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { canCreateOrdersAndLinkCommercialDocuments, canDeleteOrArchiveOrders } from "@/lib/roles";
import { REPORT_STATUSES, REPORT_STATUS_LABELS, formatMinutesAsHours } from "@/lib/reports";
import { dateFromISO, todayBerlinISO } from "@/lib/date";
import { ReportTable, type ReportRow } from "@/components/dashboard/ReportTable";
import { ReportFilterPanel } from "@/components/dashboard/ReportFilterPanel";
import { ReportDetailPanel, type PanelTabKey, type ReportDetailPanelData } from "@/components/dashboard/ReportDetailPanel";
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
} from "./actions";

const PANEL_TABS: readonly PanelTabKey[] = ["kunde", "auftrag", "mitarbeiter", "arbeitszeit", "material", "fotos", "unterschrift", "pdf", "historie"];

type RawSearchParams = {
  q?: string;
  status?: string | string[];
  employee?: string;
  customer?: string;
  order?: string;
  from?: string;
  to?: string;
  signed?: string;
  panel?: string;
  panelTab?: string;
  error?: string;
  message?: string;
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function BerichtePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const currentProfile = await getOrCreateProfile(supabase, user);
  const role = currentProfile?.role ?? null;
  const canLinkCommercial = canCreateOrdersAndLinkCommercialDocuments(role);
  const canArchiveOrDelete = canDeleteOrArchiveOrders(role) || role === "disponent" || role === "buero";
  const today = todayBerlinISO();

  const q = (raw.q ?? "").trim().toLowerCase();
  const statusFilter = toArray(raw.status).filter((s) => (REPORT_STATUSES as readonly string[]).includes(s));
  const employeeFilter = (raw.employee ?? "").trim();
  const customerFilter = (raw.customer ?? "").trim();
  const orderFilter = (raw.order ?? "").trim();
  const fromFilter = (raw.from ?? "").trim();
  const toFilter = (raw.to ?? "").trim();
  const signedFilter = raw.signed === "1" ? "1" : raw.signed === "0" ? "0" : "";

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  statusFilter.forEach((s) => baseParams.append("status", s));
  if (employeeFilter) baseParams.set("employee", employeeFilter);
  if (customerFilter) baseParams.set("customer", customerFilter);
  if (orderFilter) baseParams.set("order", orderFilter);
  if (fromFilter) baseParams.set("from", fromFilter);
  if (toFilter) baseParams.set("to", toFilter);
  if (signedFilter) baseParams.set("signed", signedFilter);
  const baseQuery = baseParams.toString();

  function panelHref(id: string, tab: PanelTabKey = "kunde") {
    const params = new URLSearchParams(baseQuery);
    params.set("panel", id);
    if (tab !== "kunde") params.set("panelTab", tab);
    else params.delete("panelTab");
    return `/berichte?${params.toString()}`;
  }
  function panelCloseHref() {
    const params = new URLSearchParams(baseQuery);
    params.delete("panel");
    params.delete("panelTab");
    const qs = params.toString();
    return qs ? `/berichte?${qs}` : "/berichte";
  }

  const [{ data: allReportsRaw }, { data: employeesRaw }, { data: fleetItemsRaw }, { data: materialsRaw }] = await Promise.all([
    supabase
      .from("service_reports")
      .select(
        "id, report_number, status, report_date, hours_worked, start_time, end_time, break_minutes, signed_at, customer_signature_name, pdf_generated_at, is_archived, order_id, customer_id, orders(id, order_number, title), customers(name), report_employees(employee_id, profiles(full_name))",
      )
      .order("report_date", { ascending: false }),
    supabase.from("profiles").select("id, full_name, is_archived").order("full_name", { ascending: true }),
    supabase.from("fleet_items").select("id, name, kind, license_plate").order("name", { ascending: true }),
    supabase.from("materials").select("id, name, material_number, unit, unit_price").eq("is_archived", false).order("name", { ascending: true }),
  ]);

  const allReports = allReportsRaw ?? [];
  const employees = employeesRaw ?? [];
  const activeEmployees = employees.filter((e) => !e.is_archived);
  const employeeNameById = Object.fromEntries(employees.map((e) => [e.id, e.full_name ?? "Unbenannt"]));
  const fleetItems = fleetItemsRaw ?? [];
  const fleetLabelById = Object.fromEntries(fleetItems.map((f) => [f.id, f.license_plate ? `${f.license_plate} · ${f.name}` : f.name]));
  const materials = materialsRaw ?? [];
  const materialOptions = materials.map((m) => ({ id: m.id, label: m.material_number ? `${m.material_number} · ${m.name}` : m.name, unit: m.unit }));

  type RawReport = (typeof allReports)[number];
  function orderOf(r: RawReport) {
    return (r as unknown as { orders: { id: string; order_number: string | null; title: string } | null }).orders;
  }
  function customerOf(r: RawReport) {
    return (r as unknown as { customers: { name: string } | null }).customers;
  }
  function employeesOf(r: RawReport) {
    return (r as unknown as { report_employees: Array<{ employee_id: string; profiles: { full_name: string | null } | null }> }).report_employees ?? [];
  }
  function durationMinutesOf(r: RawReport) {
    if (r.hours_worked !== null) return Math.round(Number(r.hours_worked) * 60);
    return null;
  }

  // KPI-Kacheln (ungefiltert, ohne archivierte Einträge – analog Material/Fahrzeuge).
  const activeReports = allReports.filter((r) => !r.is_archived);
  const todayDate = dateFromISO(today);
  const dayOfWeek = todayDate.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(todayDate);
  monday.setUTCDate(monday.getUTCDate() + mondayOffset);
  const weekStartISO = monday.toISOString().slice(0, 10);

  const berichteHeute = activeReports.filter((r) => r.report_date === today).length;
  const unterschriftenAusstehend = activeReports.filter((r) => !r.signed_at).length;
  const berichteDieseWoche = activeReports.filter((r) => r.report_date >= weekStartISO).length;
  const offeneBerichte = activeReports.filter((r) => ["entwurf", "in_bearbeitung", "zur_pruefung"].includes(r.status)).length;
  const abgeschlosseneBerichte = activeReports.filter((r) => r.status === "abgeschlossen").length;
  const withHours = activeReports.filter((r) => r.hours_worked !== null);
  const avgMinutes = withHours.length ? Math.round((withHours.reduce((sum, r) => sum + Number(r.hours_worked) * 60, 0)) / withHours.length) : null;

  const kpis = [
    { key: "heute", label: "Berichte heute", icon: CalendarDays, value: berichteHeute },
    { key: "unterschrift", label: "Unterschriften ausstehend", icon: FileSignature, value: unterschriftenAusstehend },
    { key: "woche", label: "Berichte diese Woche", icon: CalendarCheck, value: berichteDieseWoche },
    { key: "offen", label: "Offene Berichte", icon: ClipboardList, value: offeneBerichte },
    { key: "abgeschlossen", label: "Abgeschlossene Berichte", icon: CheckCircle2, value: abgeschlosseneBerichte },
    { key: "dauer", label: "Ø Arbeitszeit", icon: Clock, value: avgMinutes !== null ? formatMinutesAsHours(avgMinutes) : "—" },
  ];

  // Filteroptionen aus den vorhandenen Berichten ableiten (kein separater
  // Kunden-/Auftrags-Fetch nötig – Datensatz eines KMU ist überschaubar).
  const employeeOptionsFilter = activeEmployees.map((e) => ({ id: e.id, label: e.full_name ?? "Unbenannt" }));
  const customerOptionsMap = new Map<string, string>();
  const orderOptionsMap = new Map<string, string>();
  for (const r of allReports) {
    if (r.customer_id) {
      const c = customerOf(r);
      if (c) customerOptionsMap.set(r.customer_id, c.name);
    }
    const o = orderOf(r);
    if (o) orderOptionsMap.set(o.id, o.order_number ?? o.title);
  }
  const customerOptions = Array.from(customerOptionsMap.entries()).map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  const orderOptions = Array.from(orderOptionsMap.entries()).map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));

  // Filterung im Speicher.
  let visibleReports = allReports;
  if (q) {
    visibleReports = visibleReports.filter((r) => {
      const o = orderOf(r);
      const c = customerOf(r);
      const empNames = employeesOf(r).map((e) => e.profiles?.full_name ?? "").join(" ");
      return (
        (r.report_number ?? "").toLowerCase().includes(q) ||
        (o?.order_number ?? o?.title ?? "").toLowerCase().includes(q) ||
        (c?.name ?? "").toLowerCase().includes(q) ||
        empNames.toLowerCase().includes(q)
      );
    });
  }
  if (statusFilter.length) visibleReports = visibleReports.filter((r) => statusFilter.includes(r.status));
  if (employeeFilter) visibleReports = visibleReports.filter((r) => employeesOf(r).some((e) => e.employee_id === employeeFilter));
  if (customerFilter) visibleReports = visibleReports.filter((r) => r.customer_id === customerFilter);
  if (orderFilter) visibleReports = visibleReports.filter((r) => r.order_id === orderFilter);
  if (fromFilter) visibleReports = visibleReports.filter((r) => r.report_date >= fromFilter);
  if (toFilter) visibleReports = visibleReports.filter((r) => r.report_date <= toFilter);
  if (signedFilter === "1") visibleReports = visibleReports.filter((r) => r.signed_at);
  if (signedFilter === "0") visibleReports = visibleReports.filter((r) => !r.signed_at);

  const reportRows: ReportRow[] = visibleReports.map((r) => {
    const o = orderOf(r);
    const c = customerOf(r);
    return {
      id: r.id,
      reportNumber: r.report_number,
      orderLabel: o?.order_number ?? o?.title ?? "—",
      customerName: c?.name ?? null,
      employeeNames: employeesOf(r).map((e) => e.profiles?.full_name ?? employeeNameById[e.employee_id] ?? "Unbenannt"),
      reportDate: r.report_date,
      durationMinutes: durationMinutesOf(r),
      status: r.status,
      signed: Boolean(r.signed_at),
      pdfGeneratedAt: r.pdf_generated_at,
      isArchived: r.is_archived,
    };
  });

  const activeCount =
    statusFilter.length + (employeeFilter ? 1 : 0) + (customerFilter ? 1 : 0) + (orderFilter ? 1 : 0) + (fromFilter ? 1 : 0) + (toFilter ? 1 : 0) + (signedFilter ? 1 : 0);

  const panelId = raw.panel && raw.panel.trim().length > 0 ? raw.panel.trim() : null;
  const panelTab: PanelTabKey = PANEL_TABS.includes(raw.panelTab as PanelTabKey) ? (raw.panelTab as PanelTabKey) : "kunde";
  let panelData: ReportDetailPanelData | null = null;

  if (panelId) {
    const { data: panelItem } = await supabase.from("service_reports").select("*").eq("id", panelId).maybeSingle();

    if (panelItem) {
      const returnTo = panelHref(panelId, panelTab);

      const [{ data: order }, { data: customer }, { data: reportEmployees }, { data: reportMachines }, { data: reportMaterials }, { data: photos }, { data: history }] = await Promise.all([
        supabase.from("orders").select("id, order_number, title, order_kind, onsite_contact, property_id").eq("id", panelItem.order_id).maybeSingle(),
        panelItem.customer_id
          ? supabase.from("customers").select("name, contact_person, phone, email, street, postal_code, city").eq("id", panelItem.customer_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("report_employees").select("id, employee_id").eq("report_id", panelId),
        supabase.from("report_machines").select("id, fleet_item_id").eq("report_id", panelId),
        supabase.from("report_materials").select("id, material_id, quantity, unit_price, consumed_at, materials(name, unit)").eq("report_id", panelId),
        supabase.from("report_photos").select("id, category, file_name, storage_path, created_at").eq("report_id", panelId).order("created_at", { ascending: false }),
        supabase.from("report_history").select("id, action, summary, actor_id, created_at").eq("report_id", panelId).order("created_at", { ascending: false }),
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

      panelData = {
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
        activeTab: panelTab,
        hrefs: {
          close: panelCloseHref(),
          tabs: Object.fromEntries(PANEL_TABS.map((t) => [t, panelHref(panelId, t)])) as Record<PanelTabKey, string>,
        },
        updateStatusAction: updateReportStatus.bind(null, panelId, returnTo),
        updateDetailsAction: updateReportDetails.bind(null, panelId, returnTo),
        addEmployeeAction: addReportEmployee.bind(null, panelId, returnTo),
        addMachineAction: addReportMachine.bind(null, panelId, returnTo),
        addMaterialAction: addReportMaterial.bind(null, panelId, returnTo),
        uploadPhotoAction: uploadReportPhoto.bind(null, panelId, returnTo),
        saveSignatureAction: saveReportSignature.bind(null, panelId, returnTo),
        markPdfAction: markReportPdfGenerated.bind(null, panelId, returnTo),
        finalizeOrderAction: finalizeOrderFromReport.bind(null, panelId, panelItem.order_id, returnTo),
        prepareInvoiceAction: prepareInvoiceFromReport.bind(null, panelId, returnTo),
        archiveAction: archiveReport.bind(null, panelId, !panelItem.is_archived, returnTo),
        deleteAction: deleteReport.bind(null, panelId, "/berichte"),
      };
    }
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-md shadow-brand/20">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Einsatz- & Abschlussberichte</h1>
            <p className="mt-0.5 text-sm text-muted">{activeReports.length} Bericht{activeReports.length === 1 ? "" : "e"}</p>
          </div>
        </div>
        <Link href="/berichte/neu" className="rounded-lg bg-gradient-to-br from-brand to-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md">
          + Neuer Einsatzbericht
        </Link>
      </div>

      {raw.error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{raw.error}</p>}
      {raw.message && <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{raw.message}</p>}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.key} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <form method="GET" action="/berichte" className="relative min-w-[220px] flex-1">
          <input
            type="search"
            name="q"
            defaultValue={raw.q ?? ""}
            placeholder="Bericht, Auftrag, Kunde oder Mitarbeiter suchen…"
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-3 pr-3 text-base outline-none focus:border-brand sm:text-sm"
          />
        </form>

        <ReportFilterPanel
          q={raw.q ?? ""}
          statuses={REPORT_STATUSES}
          statusLabels={REPORT_STATUS_LABELS}
          employeeOptions={employeeOptionsFilter}
          customerOptions={customerOptions}
          orderOptions={orderOptions}
          initial={{
            status: statusFilter,
            employee: employeeFilter,
            customer: customerFilter,
            order: orderFilter,
            from: fromFilter,
            to: toFilter,
            signed: signedFilter,
          }}
          activeCount={activeCount}
        />
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          {reportRows.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted">Keine Einsatzberichte gefunden.</p>
          ) : (
            <ReportTable items={reportRows} panelBaseQuery={baseQuery} canManage={canArchiveOrDelete} />
          )}
        </div>

        {panelData && <ReportDetailPanel data={panelData} />}
      </div>
    </div>
  );
}
