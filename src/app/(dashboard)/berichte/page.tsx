import Link from "next/link";
import { CalendarCheck, CalendarDays, CheckCircle2, ClipboardList, Clock, FileSignature } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { canDeleteOrArchiveOrders } from "@/lib/roles";
import { REPORT_STATUSES, REPORT_STATUS_LABELS, formatMinutesAsHours } from "@/lib/reports";
import { dateFromISO, todayBerlinISO } from "@/lib/date";
import { ReportTable, type ReportRow } from "@/components/dashboard/ReportTable";
import { ReportFilterPanel } from "@/components/dashboard/ReportFilterPanel";

type RawSearchParams = {
  q?: string;
  status?: string | string[];
  employee?: string;
  customer?: string;
  order?: string;
  from?: string;
  to?: string;
  signed?: string;
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

  const [{ data: allReportsRaw }, { data: employeesRaw }] = await Promise.all([
    supabase
      .from("service_reports")
      .select(
        "id, report_number, status, report_date, hours_worked, start_time, end_time, break_minutes, signed_at, customer_signature_name, pdf_generated_at, is_archived, order_id, customer_id, orders(id, order_number, title), customers(name), report_employees(employee_id, profiles(full_name))",
      )
      .order("report_date", { ascending: false }),
    supabase.from("profiles").select("id, full_name, is_archived").order("full_name", { ascending: true }),
  ]);

  const allReports = allReportsRaw ?? [];
  const employees = employeesRaw ?? [];
  const activeEmployees = employees.filter((e) => !e.is_archived);
  const employeeNameById = Object.fromEntries(employees.map((e) => [e.id, e.full_name ?? "Unbenannt"]));

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
    { key: "heute", label: "Berichte heute", icon: CalendarDays, value: berichteHeute, gradient: "from-blue-400 to-blue-700" },
    { key: "unterschrift", label: "Unterschriften ausstehend", icon: FileSignature, value: unterschriftenAusstehend, gradient: "from-amber-400 to-amber-700" },
    { key: "woche", label: "Berichte diese Woche", icon: CalendarCheck, value: berichteDieseWoche, gradient: "from-indigo-400 to-indigo-700" },
    { key: "offen", label: "Offene Berichte", icon: ClipboardList, value: offeneBerichte, gradient: "from-purple-400 to-purple-700" },
    { key: "abgeschlossen", label: "Abgeschlossene Berichte", icon: CheckCircle2, value: abgeschlosseneBerichte, gradient: "from-emerald-400 to-emerald-700" },
    { key: "dauer", label: "Ø Arbeitszeit", icon: Clock, value: avgMinutes !== null ? formatMinutesAsHours(avgMinutes) : "—", gradient: "from-cyan-400 to-cyan-700" },
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

  return (
    <div className="p-6">
      <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#3a63ff] via-[#3151e6] to-[#5b3ec9] px-6 py-6 text-white shadow-lg shadow-brand/25 sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/20 blur-2xl" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Einsatz- & Abschlussberichte</h1>
              <p className="mt-1 text-sm text-white/80">{activeReports.length} Bericht{activeReports.length === 1 ? "" : "e"}</p>
            </div>
          </div>
          <Link
            href="/berichte/neu"
            className="flex items-center gap-1.5 rounded-[11px] bg-white px-3.5 py-2 text-sm font-bold text-brand-dark shadow-md hover:bg-white/90"
          >
            + Neuer Einsatzbericht
          </Link>
        </div>
      </div>

      {raw.error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{raw.error}</p>}
      {raw.message && <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{raw.message}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.key} className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_20px_rgba(16,24,40,.06)]">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${kpi.gradient} text-white shadow-md`}>
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

      <div className="mt-6">
        {reportRows.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted">Keine Einsatzberichte gefunden.</p>
        ) : (
          <ReportTable items={reportRows} canManage={canArchiveOrDelete} />
        )}
      </div>
    </div>
  );
}
