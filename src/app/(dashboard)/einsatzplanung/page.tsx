
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Filter, Sun, Truck, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { dateFromISO, nowBerlinMinutes, todayBerlinISO } from "@/lib/date";
import { ORDER_KIND_COLOR, ORDER_STATUSES, STATUS_LABELS } from "@/lib/orders";
import { EinsatzplanungGrid, type CalendarOrder } from "@/components/dashboard/EinsatzplanungGrid";
import { EinsatzplanungFilterBar } from "@/components/dashboard/EinsatzplanungFilterBar";
import { UnscheduledOrderCard } from "@/components/dashboard/UnscheduledOrderCard";

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const VIEWS = ["woche", "tag", "monat"] as const;
type View = (typeof VIEWS)[number];

type RawSearchParams = {
  view?: string;
  offset?: string;
  employee?: string;
  vehicle?: string;
  status?: string;
  error?: string;
  message?: string;
};

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatShort(iso: string) {
  const [, month, day] = iso.split("-");
  return `${day}.${month}.`;
}

function formatLong(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

// Montag der Woche, die `offsetWeeks` Wochen von der aktuellen (Berliner)
// Woche entfernt liegt – identisches Muster wie zuvor, nur nicht mehr an
// den Namen "week" für den Query-Parameter gebunden, da jetzt auch
// Tages-/Monatsansichten über denselben Offset-Mechanismus navigieren.
function getMonday(offsetWeeks: number) {
  const today = dateFromISO(todayBerlinISO());
  const day = today.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setUTCDate(monday.getUTCDate() + diffToMonday + offsetWeeks * 7);
  return monday;
}

function getMonthStart(offsetMonths: number) {
  const today = dateFromISO(todayBerlinISO());
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offsetMonths, 1));
}

// Beschriftungen für die Vor-/Zurück-Navigation im Hero-Header: statt
// nackter Pfeile zeigen die Buttons den relativen Tag/Zeitraum plus das
// tatsächliche Datum an (z. B. "Gestern · 17.08." bzw. "Vorige Woche ·
// 10.–16.08."), damit sofort klar ist, wohin man navigiert.
function dayRelativeLabel(targetOffset: number) {
  if (targetOffset === -1) return "Gestern";
  if (targetOffset === 0) return "Heute";
  if (targetOffset === 1) return "Morgen";
  const d = dateFromISO(todayBerlinISO());
  d.setUTCDate(d.getUTCDate() + targetOffset);
  return d.toLocaleDateString("de-DE", { weekday: "short", timeZone: "UTC" });
}

function dayDateLabel(targetOffset: number) {
  const d = dateFromISO(todayBerlinISO());
  d.setUTCDate(d.getUTCDate() + targetOffset);
  return formatShort(toISODate(d));
}

function weekRangeLabel(targetOffsetWeeks: number) {
  const monday = getMonday(targetOffsetWeeks);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return `${formatShort(toISODate(monday))} – ${formatShort(toISODate(sunday))}`;
}

function monthNameLabel(targetOffsetMonths: number) {
  const start = getMonthStart(targetOffsetMonths);
  return start.toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function EinsatzplanungPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const view: View = VIEWS.includes(raw.view as View) ? (raw.view as View) : "woche";
  const offset = raw.offset && Number.isFinite(Number(raw.offset)) ? Number(raw.offset) : 0;
  const todayISO = todayBerlinISO();

  // Sichtbarer Zeitraum je nach Ansicht ermitteln – Woche: Mo–So,
  // Tag: ein einzelner Tag, Monat: gesamter Kalendermonat (Zellen für
  // Tage außerhalb des Monats bleiben leer, kein "Overflow" in
  // Nachbarmonate, um die Implementierung schlank zu halten).
  let days: string[] = [];
  let rangeStart: string;
  let rangeEnd: string;
  let headerLabel: string;
  let monthLeadingBlanks = 0;

  if (view === "tag") {
    const d = dateFromISO(todayISO);
    d.setUTCDate(d.getUTCDate() + offset);
    const iso = toISODate(d);
    days = [iso];
    rangeStart = iso;
    rangeEnd = iso;
    headerLabel = formatLong(iso);
  } else if (view === "monat") {
    const monthStart = getMonthStart(offset);
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
    const daysInMonth = Math.round((monthEnd.getTime() - monthStart.getTime()) / 86_400_000);
    days = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(monthStart);
      d.setUTCDate(d.getUTCDate() + i);
      return toISODate(d);
    });
    rangeStart = days[0];
    rangeEnd = days[days.length - 1];
    const firstWeekday = monthStart.getUTCDay();
    monthLeadingBlanks = firstWeekday === 0 ? 6 : firstWeekday - 1;
    headerLabel = monthStart.toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
  } else {
    const monday = getMonday(offset);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      return toISODate(d);
    });
    days = weekDays;
    rangeStart = weekDays[0];
    rangeEnd = weekDays[6];
    headerLabel = `${formatShort(rangeStart)} – ${formatShort(rangeEnd)}`;
  }

  let prevNavMain: string;
  let prevNavSub: string;
  let nextNavMain: string;
  let nextNavSub: string;
  if (view === "tag") {
    prevNavMain = dayRelativeLabel(offset - 1);
    prevNavSub = dayDateLabel(offset - 1);
    nextNavMain = dayRelativeLabel(offset + 1);
    nextNavSub = dayDateLabel(offset + 1);
  } else if (view === "monat") {
    prevNavMain = "Voriger Monat";
    prevNavSub = monthNameLabel(offset - 1);
    nextNavMain = "Nächster Monat";
    nextNavSub = monthNameLabel(offset + 1);
  } else {
    prevNavMain = "Vorige Woche";
    prevNavSub = weekRangeLabel(offset - 1);
    nextNavMain = "Nächste Woche";
    nextNavSub = weekRangeLabel(offset + 1);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Erzeugt beim ersten Dashboard-Aufruf Firma/Profil, falls noch nicht
  // vorhanden (Seiteneffekt) – der Rückgabewert wird hier nicht mehr
  // benötigt, seit die frühere Detail-Seitenleiste (inkl. rollenabhängiger
  // Aktions-Buttons) durch die eigene Auftragsseite ersetzt wurde.
  if (user) {
    await getOrCreateProfile(supabase, user);
  }

  const [{ data: employeeOptions }, { data: fleetOptions }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").order("full_name", { ascending: true }),
    supabase.from("fleet_items").select("id, name, license_plate, kind").order("name", { ascending: true }),
  ]);

  const employeeFilter = raw.employee ?? "";
  const vehicleFilter = raw.vehicle ?? "";
  const statusFilter = (ORDER_STATUSES as readonly string[]).includes(raw.status ?? "") ? (raw.status as string) : "";

  const { data: scheduledOrders, error: scheduledError } = await supabase
    .from("orders")
    .select(
      "id, order_number, title, order_kind, status, priority, scheduled_date, start_time, planned_duration_minutes, all_day, customer_id, property_id, customers(name, company_name)",
    )
    .eq("is_archived", false)
    .gte("scheduled_date", rangeStart)
    .lte("scheduled_date", rangeEnd)
    .order("start_time", { ascending: true });

  const orderIds = (scheduledOrders ?? []).map((o) => o.id);

  const [{ data: assignmentRows }, { data: resourceRows }] = await Promise.all([
    orderIds.length > 0
      ? supabase
          .from("order_assignments")
          .select("order_id, employee_id, profiles!order_assignments_employee_id_fkey(full_name)")
          .in("order_id", orderIds)
      : Promise.resolve({ data: [] as Array<{ order_id: string; employee_id: string; profiles: { full_name: string | null } | null }> }),
    orderIds.length > 0
      ? supabase.from("order_resources").select("order_id, fleet_item_id").in("order_id", orderIds)
      : Promise.resolve({ data: [] as Array<{ order_id: string; fleet_item_id: string }> }),
  ]);

  const employeesByOrder: Record<string, Array<{ id: string; name: string }>> = {};
  for (const row of assignmentRows ?? []) {
    (employeesByOrder[row.order_id] ??= []).push({ id: row.employee_id, name: row.profiles?.full_name ?? "Unbekannt" });
  }
  const vehiclesByOrder: Record<string, string[]> = {};
  for (const row of resourceRows ?? []) {
    (vehiclesByOrder[row.order_id] ??= []).push(row.fleet_item_id);
  }

  // Filter (Mitarbeiter/Fahrzeug/Status) werden bewusst im Speicher
  // angewendet statt über zusätzliche DB-Abfragen – der sichtbare
  // Zeitraum (max. ein Monat) enthält typischerweise nur eine
  // überschaubare Anzahl Aufträge.
  let visibleOrders = scheduledOrders ?? [];
  if (employeeFilter) {
    visibleOrders = visibleOrders.filter((o) => (employeesByOrder[o.id] ?? []).some((e) => e.id === employeeFilter));
  }
  if (vehicleFilter) {
    visibleOrders = visibleOrders.filter((o) => (vehiclesByOrder[o.id] ?? []).includes(vehicleFilter));
  }
  if (statusFilter) {
    visibleOrders = visibleOrders.filter((o) => o.status === statusFilter);
  }

  const ordersByDay: Record<string, CalendarOrder[]> = {};
  for (const iso of days) ordersByDay[iso] = [];
  for (const o of visibleOrders) {
    if (!o.scheduled_date || !ordersByDay[o.scheduled_date]) continue;
    ordersByDay[o.scheduled_date].push({
      id: o.id,
      title: o.title,
      order_kind: o.order_kind,
      status: o.status,
      scheduled_date: o.scheduled_date,
      start_time: o.start_time,
      planned_duration_minutes: o.planned_duration_minutes,
      all_day: o.all_day,
      customerName: o.customers ? o.customers.company_name || o.customers.name : null,
      employeeNames: (employeesByOrder[o.id] ?? []).map((e) => e.name),
    });
  }

  // Nicht eingeplante Aufträge (unabhängig vom sichtbaren Zeitraum) – nur
  // offene/aktive Aufträge, die noch keinen Termin haben.
  const { data: unscheduledOrders } = await supabase
    .from("orders")
    .select("id, title, order_kind, planned_duration_minutes, customer_id, customers(name, company_name)")
    .eq("is_archived", false)
    .is("scheduled_date", null)
    .not("status", "in", '("abgeschlossen","storniert")')
    .order("created_at", { ascending: false })
    .limit(50);

  // Auslastung: geplante Minuten je Mitarbeiter/Fahrzeug im sichtbaren
  // Zeitraum, gegen eine angenommene Kapazität von 8h/Tag Werktagszeit
  // gerechnet (bewusst grob – exakte Schichtpläne existieren noch nicht).
  const capacityMinutes = Math.max(1, days.length * 480);
  const employeeMinutes: Record<string, number> = {};
  const vehicleMinutes: Record<string, number> = {};
  for (const o of visibleOrders) {
    const duration = o.planned_duration_minutes || 60;
    for (const e of employeesByOrder[o.id] ?? []) {
      employeeMinutes[e.id] = (employeeMinutes[e.id] ?? 0) + duration;
    }
    for (const vehicleId of vehiclesByOrder[o.id] ?? []) {
      vehicleMinutes[vehicleId] = (vehicleMinutes[vehicleId] ?? 0) + duration;
    }
  }
  const employeeUtilization = (employeeOptions ?? [])
    .map((e) => ({ id: e.id, name: e.full_name || "Unbenannt", percent: Math.min(100, Math.round(((employeeMinutes[e.id] ?? 0) / capacityMinutes) * 100)) }))
    .filter((e) => (employeeMinutes[e.id] ?? 0) > 0)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 6);
  const vehicleUtilization = (fleetOptions ?? [])
    .filter((f) => f.kind === "fahrzeug")
    .map((f) => ({
      id: f.id,
      name: f.license_plate ? `${f.license_plate} · ${f.name}` : f.name,
      percent: Math.min(100, Math.round(((vehicleMinutes[f.id] ?? 0) / capacityMinutes) * 100)),
    }))
    .filter((f) => (vehicleMinutes[f.id] ?? 0) > 0)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 6);

  const avgEmployeeUtilization =
    employeeUtilization.length > 0
      ? Math.round(employeeUtilization.reduce((sum, e) => sum + e.percent, 0) / employeeUtilization.length)
      : 0;
  const avgVehicleUtilization =
    vehicleUtilization.length > 0
      ? Math.round(vehicleUtilization.reduce((sum, v) => sum + v.percent, 0) / vehicleUtilization.length)
      : 0;
  const todayScheduledCount = visibleOrders.filter((o) => o.scheduled_date === todayISO).length;

  const kpis = [
    { label: "Einsätze im Zeitraum", value: visibleOrders.length, gradient: "from-blue-400 to-blue-700", Icon: CalendarDays },
    { label: "Heute geplant", value: todayScheduledCount, gradient: "from-indigo-400 to-indigo-700", Icon: Sun },
    { label: "Nicht eingeplant", value: unscheduledOrders?.length ?? 0, gradient: "from-amber-400 to-amber-700", Icon: Clock },
    { label: "Ø Mitarbeiterauslastung", value: `${avgEmployeeUtilization}%`, gradient: "from-emerald-400 to-emerald-700", Icon: User },
    { label: "Ø Fahrzeugauslastung", value: `${avgVehicleUtilization}%`, gradient: "from-purple-400 to-purple-700", Icon: Truck },
  ];

  // URL-Hilfsfunktion: Basis-Query für Filterwechsel – Muster identisch zu
  // /auftraege. Auftragsdetails öffnen sich seit der Umstellung auf eine
  // eigene Seite (/auftraege/{id}) statt in einer Seitenleiste hier.
  function buildQuery(overrides: Record<string, string | number | undefined>) {
    const params = new URLSearchParams();
    const merged = { view, offset: offset || undefined, employee: employeeFilter || undefined, vehicle: vehicleFilter || undefined, status: statusFilter || undefined, ...overrides };
    if (merged.view && merged.view !== "woche") params.set("view", String(merged.view));
    if (merged.offset) params.set("offset", String(merged.offset));
    if (merged.employee) params.set("employee", String(merged.employee));
    if (merged.vehicle) params.set("vehicle", String(merged.vehicle));
    if (merged.status) params.set("status", String(merged.status));
    const qs = params.toString();
    return qs ? `/einsatzplanung?${qs}` : "/einsatzplanung";
  }

  const baseQuery = buildQuery({}).split("?")[1] ?? "";

  const statusOptions = ORDER_STATUSES.map((s) => ({ id: s, label: STATUS_LABELS[s] ?? s }));
  const employeeSelectOptions = (employeeOptions ?? []).map((e) => ({ id: e.id, label: e.full_name || "Unbenannt" }));
  const vehicleSelectOptions = (fleetOptions ?? []).map((f) => ({
    id: f.id,
    label: f.license_plate ? `${f.license_plate} · ${f.name}` : f.name,
  }));

  const returnTo = buildQuery({});

  return (
    <div className="p-6">
      <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#3a63ff] via-[#3151e6] to-[#5b3ec9] px-6 py-6 text-white shadow-lg shadow-brand/25 sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/20 blur-2xl" />
        <div className="relative z-10">
          <h1 className="text-2xl font-semibold tracking-tight">Einsatzplanung & Disposition</h1>
          <p className="mt-1 text-sm text-white/80">{headerLabel}</p>
        </div>
        <div className="relative z-10 mt-5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-white/25 bg-white/15 p-1 text-sm font-medium">
            {(["tag", "woche", "monat"] as const).map((v) => (
              <Link
                key={v}
                href={buildQuery({ view: v, offset: 0 })}
                className={`rounded-lg px-3 py-1.5 capitalize transition-all duration-150 ${
                  view === v ? "bg-white text-brand-dark shadow-sm" : "text-white/85 hover:bg-white/15"
                }`}
              >
                {v}
              </Link>
            ))}
          </div>
          <div className="flex items-stretch gap-0.5 rounded-xl border border-white/25 bg-white/15 p-1">
            <Link
              href={buildQuery({ offset: offset - 1 })}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-white transition-colors hover:bg-white/15"
            >
              <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
              <span className="text-left leading-tight">
                <span className="block text-xs font-semibold">{prevNavMain}</span>
                <span className="block text-[10px] font-medium text-white/70">{prevNavSub}</span>
              </span>
            </Link>
            <Link
              href={buildQuery({ offset: 0 })}
              className="flex items-center rounded-lg px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              Heute
            </Link>
            <Link
              href={buildQuery({ offset: offset + 1 })}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-white transition-colors hover:bg-white/15"
            >
              <span className="text-right leading-tight">
                <span className="block text-xs font-semibold">{nextNavMain}</span>
                <span className="block text-[10px] font-medium text-white/70">{nextNavSub}</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_20px_rgba(16,24,40,.06)]"
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${kpi.gradient} text-white shadow-md`}>
              <kpi.Icon className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-lg font-bold leading-tight text-foreground">{kpi.value}</p>
              <p className="text-[11px] text-muted-2">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
          <Filter className="h-3.5 w-3.5" />
          Filter
        </span>
        <EinsatzplanungFilterBar
          baseQuery={baseQuery}
          employees={employeeSelectOptions}
          vehicles={vehicleSelectOptions}
          statuses={statusOptions}
          employeeValue={employeeFilter}
          vehicleValue={vehicleFilter}
          statusValue={statusFilter}
        />
      </div>

      {raw.error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{raw.error}</p>}
      {raw.message && <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{raw.message}</p>}
      {scheduledError && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Einsätze konnten nicht geladen werden: {scheduledError.message}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="w-full shrink-0 lg:w-72">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_20px_rgba(16,24,40,.06)]">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              Nicht eingeplante Aufträge
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark px-1.5 text-xs font-semibold text-white shadow-sm">
                {unscheduledOrders?.length ?? 0}
              </span>
            </h2>
            <div className="mt-3 space-y-2">
              {(!unscheduledOrders || unscheduledOrders.length === 0) && (
                <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted">
                  Alle offenen Aufträge sind eingeplant.
                </p>
              )}
              {(unscheduledOrders ?? []).map((order) => (
                <UnscheduledOrderCard
                  key={order.id}
                  order={{
                    id: order.id,
                    title: order.title,
                    order_kind: order.order_kind,
                    customerName: order.customers ? order.customers.company_name || order.customers.name : null,
                    planned_duration_minutes: order.planned_duration_minutes,
                  }}
                  employees={employeeSelectOptions}
                  vehicles={vehicleSelectOptions}
                  returnTo={returnTo}
                />
              ))}
            </div>
          </div>
        </div>

        <div key={`${view}-${offset}`} className="min-w-0 flex-1 animate-fade-in">
          {view === "monat" ? (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_20px_rgba(16,24,40,.06)]">
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-muted">
                {WEEKDAY_LABELS.map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-2">
                {Array.from({ length: monthLeadingBlanks }).map((_, i) => (
                  <div key={`blank-${i}`} />
                ))}
                {days.map((iso) => {
                  const dayOrders = ordersByDay[iso] ?? [];
                  const isToday = iso === todayISO;
                  const [, , day] = iso.split("-");
                  const dayOffset = Math.round((dateFromISO(iso).getTime() - dateFromISO(todayISO).getTime()) / 86_400_000);
                  return (
                    <Link
                      key={iso}
                      href={buildQuery({ view: "tag", offset: dayOffset })}
                      className={`flex min-h-[84px] flex-col rounded-lg border p-1.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
                        isToday ? "border-brand/40 bg-brand-soft/30 ring-1 ring-brand/20" : "border-border hover:border-brand/30 hover:bg-background"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
                          isToday ? "bg-gradient-to-br from-brand to-brand-dark text-white shadow-sm" : "text-foreground"
                        }`}
                      >
                        {Number(day)}
                      </span>
                      <div className="mt-1 flex flex-wrap gap-0.5">
                        {dayOrders.slice(0, 6).map((o) => (
                          <span key={o.id} className={`h-1.5 w-1.5 rounded-full ${ORDER_KIND_COLOR[o.order_kind]?.dot ?? "bg-gray-400"}`} />
                        ))}
                      </div>
                      {dayOrders.length > 0 && <span className="mt-auto text-[10px] text-muted">{dayOrders.length} Einsätze</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <EinsatzplanungGrid
              days={days}
              ordersByDay={ordersByDay}
              todayISO={todayISO}
              nowMinutes={nowBerlinMinutes()}
              weekdayLabels={view === "tag" ? [new Date(`${days[0]}T00:00:00Z`).toLocaleDateString("de-DE", { weekday: "short", timeZone: "UTC" })] : WEEKDAY_LABELS}
            />
          )}

          {(employeeUtilization.length > 0 || vehicleUtilization.length > 0) && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {vehicleUtilization.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <Truck className="h-3.5 w-3.5" />
                    </span>
                    Fahrzeugauslastung
                  </h3>
                  <div className="mt-3 space-y-2.5">
                    {vehicleUtilization.map((v) => (
                      <div key={v.id}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate text-foreground">{v.name}</span>
                          <span className="font-medium text-muted">{v.percent}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-background">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-dark transition-all"
                            style={{ width: `${v.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {employeeUtilization.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <User className="h-3.5 w-3.5" />
                    </span>
                    Mitarbeiterauslastung
                  </h3>
                  <div className="mt-3 space-y-2.5">
                    {employeeUtilization.map((e) => (
                      <div key={e.id}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate text-foreground">{e.name}</span>
                          <span className="font-medium text-muted">{e.percent}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-background">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-dark transition-all"
                            style={{ width: `${e.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
