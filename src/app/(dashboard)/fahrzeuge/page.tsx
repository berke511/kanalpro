import Link from "next/link";
import { AlertTriangle, Ban, CheckCircle2, Layers, Truck, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { canManageResourcesAndSchedule } from "@/lib/roles";
import {
  FLEET_KIND_LABELS,
  FLEET_KINDS,
  FLEET_STATUS_LABELS,
  FLEET_STATUSES,
  isDueSoon,
  isOverdue,
  maintenanceProgress,
} from "@/lib/fleet";
import { formatEuro } from "@/lib/format";
import { monthRangeBerlin, todayBerlinISO } from "@/lib/date";
import { FleetCard, type FleetCardData } from "@/components/dashboard/FleetCard";
import { FleetFilterPanel } from "@/components/dashboard/FleetFilterPanel";
import { FleetTable, type FleetRow } from "@/components/dashboard/FleetTable";

type RawSearchParams = {
  q?: string;
  view?: string;
  kind?: string | string[];
  status?: string | string[];
  manufacturer?: string;
  location?: string;
  employee?: string;
  ownership?: string | string[];
  fuelType?: string | string[];
  maintenanceDue?: string;
  tuvDue?: string;
  uvvDue?: string;
  archived?: string;
  error?: string;
  message?: string;
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function FahrzeugePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const currentProfile = await getOrCreateProfile(supabase, user);
  const role = currentProfile?.role ?? null;
  const isAdmin = canManageResourcesAndSchedule(role);
  const today = todayBerlinISO();

  const q = (raw.q ?? "").trim().toLowerCase();
  const view = raw.view === "grid" ? "grid" : "list";
  const kindFilter = toArray(raw.kind).filter((k) => (FLEET_KINDS as readonly string[]).includes(k));
  const statusFilter = toArray(raw.status).filter((s) => (FLEET_STATUSES as readonly string[]).includes(s));
  const ownershipFilter = toArray(raw.ownership);
  const fuelTypeFilter = toArray(raw.fuelType);
  const manufacturerFilter = (raw.manufacturer ?? "").trim();
  const locationFilter = (raw.location ?? "").trim();
  const employeeFilter = (raw.employee ?? "").trim();
  const maintenanceDueFilter = raw.maintenanceDue === "1";
  const tuvDueFilter = raw.tuvDue === "1";
  const uvvDueFilter = raw.uvvDue === "1";
  const showArchived = raw.archived === "1";

  const [{ data: allItemsRaw }, { data: employeesRaw }] = await Promise.all([
    supabase.from("fleet_items").select("*").order("name", { ascending: true }),
    supabase.from("profiles").select("id, full_name, main_vehicle_id, is_archived").order("full_name", { ascending: true }),
  ]);

  const allItems = allItemsRaw ?? [];
  const employees = employeesRaw ?? [];
  const activeEmployees = employees.filter((e) => !e.is_archived);

  // "Zugewiesener Mitarbeiter" wird einzig aus profiles.main_vehicle_id
  // abgeleitet (siehe Migrationskommentar) – hier einmalig zu einer Map
  // gruppiert, damit jede Fahrzeugkarte/-zeile ohne Zusatzabfrage sofort
  // weiß, wer aktuell zugewiesen ist.
  const employeeNamesByFleetId: Record<string, string[]> = {};
  for (const e of employees) {
    if (e.main_vehicle_id) {
      (employeeNamesByFleetId[e.main_vehicle_id] ??= []).push(e.full_name ?? "Unbenannt");
    }
  }

  const fleetIds = allItems.map((i) => i.id);
  const { data: resourceRows } = fleetIds.length
    ? await supabase
        .from("order_resources")
        .select("fleet_item_id, orders!inner(id, title, status, scheduled_date, start_time, customer_id)")
        .in("fleet_item_id", fleetIds)
        .eq("orders.scheduled_date", today)
    : { data: [] as Array<{ fleet_item_id: string; orders: { id: string; title: string; status: string; scheduled_date: string; start_time: string | null; customer_id: string | null } | null }> };

  const customerIds = Array.from(new Set((resourceRows ?? []).map((r) => r.orders?.customer_id).filter((v): v is string => Boolean(v))));
  const { data: customerRows } = customerIds.length
    ? await supabase.from("customers").select("id, name, company_name").in("id", customerIds)
    : { data: [] as Array<{ id: string; name: string; company_name: string | null }> };
  const customerNameById = Object.fromEntries((customerRows ?? []).map((c) => [c.id, c.company_name || c.name]));

  const currentOrderByFleetId: Record<string, { id: string; title: string; customerName: string | null; startTime: string | null }> = {};
  for (const r of resourceRows ?? []) {
    if (r.orders && !currentOrderByFleetId[r.fleet_item_id]) {
      currentOrderByFleetId[r.fleet_item_id] = {
        id: r.orders.id,
        title: r.orders.title,
        customerName: r.orders.customer_id ? customerNameById[r.orders.customer_id] ?? null : null,
        startTime: r.orders.start_time,
      };
    }
  }

  // Signierte Fotos in einem Rutsch laden (Bucket ist privat).
  const photoPaths = allItems.map((i) => i.photo_path).filter((p): p is string => Boolean(p));
  let photoUrlByPath: Record<string, string> = {};
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage.from("fleet-photos").createSignedUrls(photoPaths, 60 * 10);
    photoUrlByPath = Object.fromEntries((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]).filter(([p]) => p));
  }

  // KPI-Kacheln: bewusst ungefiltert (stabile Unternehmensübersicht), aber
  // ohne archivierte Einträge.
  const activeItems = allItems.filter((i) => !i.is_archived);
  const kpis = [
    { key: "gesamt", label: "Gesamt", icon: Layers, value: activeItems.length, gradient: "from-blue-400 to-blue-700" },
    {
      key: "verfuegbar",
      label: "Verfügbar",
      icon: CheckCircle2,
      value: activeItems.filter((i) => i.status === "verfuegbar").length,
      gradient: "from-emerald-400 to-emerald-700",
    },
    {
      key: "im_einsatz",
      label: "Im Einsatz",
      icon: Truck,
      value: activeItems.filter((i) => i.status === "im_einsatz").length,
      gradient: "from-indigo-400 to-indigo-700",
    },
    {
      key: "wartung",
      label: "In Wartung",
      icon: Wrench,
      value: activeItems.filter((i) => i.status === "wartung" || i.status === "werkstatt").length,
      gradient: "from-amber-400 to-amber-700",
    },
    { key: "defekt", label: "Defekt", icon: Ban, value: activeItems.filter((i) => i.status === "defekt").length, gradient: "from-red-400 to-red-700" },
    {
      key: "tuev",
      label: "TÜV fällig",
      icon: AlertTriangle,
      value: activeItems.filter((i) => isDueSoon(i.tuv_due_date) || isOverdue(i.tuv_due_date)).length,
      gradient: "from-cyan-400 to-cyan-700",
    },
  ];

  // Flottenweite Statistiken (Gesamtauslastung, Einsatztage, Kosten,
  // Betriebsstunden, Verfügbarkeitsquote) – bewusst als kompakte,
  // unternehmensweite Kennzahlen unterhalb der KPI-Kacheln, unabhängig von
  // den aktuell gesetzten Filtern.
  const currentMonth = monthRangeBerlin(0);
  const [{ data: allMaintenanceRecords }, { data: allCostEntries }, { data: monthOrderResources }] = await Promise.all([
    fleetIds.length
      ? supabase.from("fleet_maintenance_records").select("record_type, cost").in("fleet_item_id", fleetIds)
      : Promise.resolve({ data: [] as Array<{ record_type: string; cost: number | null }> }),
    fleetIds.length
      ? supabase.from("fleet_cost_entries").select("category, amount").in("fleet_item_id", fleetIds)
      : Promise.resolve({ data: [] as Array<{ category: string; amount: number }> }),
    fleetIds.length
      ? supabase
          .from("order_resources")
          .select("fleet_item_id, orders!inner(scheduled_date)")
          .in("fleet_item_id", fleetIds)
          .gte("orders.scheduled_date", currentMonth.start)
          .lt("orders.scheduled_date", currentMonth.end)
      : Promise.resolve({ data: [] as Array<{ fleet_item_id: string; orders: { scheduled_date: string } | null }> }),
  ]);

  const fleetStats = {
    verfuegbarkeitsquote: activeItems.length ? Math.round((activeItems.filter((i) => i.status === "verfuegbar").length / activeItems.length) * 100) : 0,
    gesamtauslastung: activeItems.length ? Math.round((activeItems.filter((i) => i.status === "im_einsatz").length / activeItems.length) * 100) : 0,
    einsatztageMonat: new Set((monthOrderResources ?? []).map((r) => `${r.fleet_item_id}-${r.orders?.scheduled_date}`)).size,
    wartungskosten: (allMaintenanceRecords ?? []).filter((r) => r.record_type === "wartung").reduce((sum, r) => sum + Number(r.cost ?? 0), 0),
    reparaturkosten: (allMaintenanceRecords ?? []).filter((r) => r.record_type === "reparatur").reduce((sum, r) => sum + Number(r.cost ?? 0), 0),
    kraftstoffkosten: (allCostEntries ?? []).filter((c) => c.category === "kraftstoff").reduce((sum, c) => sum + Number(c.amount ?? 0), 0),
    betriebsstundenGesamt: activeItems.reduce((sum, i) => sum + Number(i.operating_hours ?? 0), 0),
    kilometerstandGesamt: activeItems.reduce((sum, i) => sum + Number(i.odometer_km ?? 0), 0),
  };

  const manufacturerOptions = Array.from(new Set(allItems.map((i) => i.manufacturer).filter((v): v is string => Boolean(v)))).sort();
  const locationOptions = Array.from(new Set(allItems.map((i) => i.location).filter((v): v is string => Boolean(v)))).sort();

  // Filterung im Speicher – der Fuhrpark eines KMU ist überschaubar groß.
  let visibleItems = showArchived ? allItems : allItems.filter((i) => !i.is_archived);
  if (q) {
    visibleItems = visibleItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.license_plate ?? "").toLowerCase().includes(q) ||
        (i.inventory_number ?? "").toLowerCase().includes(q) ||
        (i.manufacturer ?? "").toLowerCase().includes(q) ||
        (i.model ?? "").toLowerCase().includes(q),
    );
  }
  if (kindFilter.length) visibleItems = visibleItems.filter((i) => kindFilter.includes(i.kind));
  if (statusFilter.length) visibleItems = visibleItems.filter((i) => statusFilter.includes(i.status));
  if (ownershipFilter.length) visibleItems = visibleItems.filter((i) => i.ownership && ownershipFilter.includes(i.ownership));
  if (fuelTypeFilter.length) visibleItems = visibleItems.filter((i) => i.fuel_type && fuelTypeFilter.includes(i.fuel_type));
  if (manufacturerFilter) visibleItems = visibleItems.filter((i) => i.manufacturer === manufacturerFilter);
  if (locationFilter) visibleItems = visibleItems.filter((i) => i.location === locationFilter);
  if (employeeFilter) visibleItems = visibleItems.filter((i) => (employeeNamesByFleetId[i.id] ?? []).length > 0 && employees.some((e) => e.id === employeeFilter && e.main_vehicle_id === i.id));
  if (maintenanceDueFilter) visibleItems = visibleItems.filter((i) => isDueSoon(i.next_maintenance_at) || isOverdue(i.next_maintenance_at));
  if (tuvDueFilter) visibleItems = visibleItems.filter((i) => isDueSoon(i.tuv_due_date) || isOverdue(i.tuv_due_date));
  if (uvvDueFilter) visibleItems = visibleItems.filter((i) => isDueSoon(i.uvv_due_date) || isOverdue(i.uvv_due_date));

  const fleetRows: FleetRow[] = visibleItems.map((i) => ({
    id: i.id,
    kind: i.kind,
    name: i.name,
    licensePlate: i.license_plate,
    status: i.status,
    photoUrl: i.photo_path ? photoUrlByPath[i.photo_path] ?? null : null,
    inventoryNumber: i.inventory_number,
    manufacturer: i.manufacturer,
    model: i.model,
    yearBuilt: i.year_built,
    location: i.location,
    assignedEmployeeNames: employeeNamesByFleetId[i.id] ?? [],
    currentOrderTitle: currentOrderByFleetId[i.id]?.title ?? null,
    odometerKm: i.odometer_km,
    operatingHours: i.operating_hours,
    lastMaintenanceAt: i.last_maintenance_at,
    nextMaintenanceAt: i.next_maintenance_at,
    tuvDueDate: i.tuv_due_date,
    uvvDueDate: i.uvv_due_date,
    maintenanceProgress: maintenanceProgress(i.last_maintenance_at, i.next_maintenance_at),
    isArchived: i.is_archived,
  }));

  const fleetCards: FleetCardData[] = visibleItems.map((i) => ({
    id: i.id,
    kind: i.kind,
    name: i.name,
    licensePlate: i.license_plate,
    status: i.status,
    photoUrl: i.photo_path ? photoUrlByPath[i.photo_path] ?? null : null,
    manufacturer: i.manufacturer,
    model: i.model,
    location: i.location,
    assignedEmployeeNames: employeeNamesByFleetId[i.id] ?? [],
    currentOrderTitle: currentOrderByFleetId[i.id]?.title ?? null,
    nextMaintenanceAt: i.next_maintenance_at,
    tuvDueDate: i.tuv_due_date,
    maintenanceProgress: maintenanceProgress(i.last_maintenance_at, i.next_maintenance_at),
    isArchived: i.is_archived,
  }));

  // URL-Hilfsfunktionen fürs Detailpanel/Filter (gleiches Muster wie
  // /mitarbeiter und /kunden).
  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (view !== "list") baseParams.set("view", view);
  kindFilter.forEach((k) => baseParams.append("kind", k));
  statusFilter.forEach((s) => baseParams.append("status", s));
  ownershipFilter.forEach((o) => baseParams.append("ownership", o));
  fuelTypeFilter.forEach((f) => baseParams.append("fuelType", f));
  if (manufacturerFilter) baseParams.set("manufacturer", manufacturerFilter);
  if (locationFilter) baseParams.set("location", locationFilter);
  if (employeeFilter) baseParams.set("employee", employeeFilter);
  if (maintenanceDueFilter) baseParams.set("maintenanceDue", "1");
  if (tuvDueFilter) baseParams.set("tuvDue", "1");
  if (uvvDueFilter) baseParams.set("uvvDue", "1");
  if (showArchived) baseParams.set("archived", "1");
  const baseQuery = baseParams.toString();

  function viewHref(nextView: string) {
    const params = new URLSearchParams(baseQuery);
    if (nextView === "list") params.delete("view");
    else params.set("view", nextView);
    const qs = params.toString();
    return qs ? `/fahrzeuge?${qs}` : "/fahrzeuge";
  }

  const activeCount =
    kindFilter.length +
    statusFilter.length +
    ownershipFilter.length +
    fuelTypeFilter.length +
    (manufacturerFilter ? 1 : 0) +
    (locationFilter ? 1 : 0) +
    (employeeFilter ? 1 : 0) +
    (maintenanceDueFilter ? 1 : 0) +
    (tuvDueFilter ? 1 : 0) +
    (uvvDueFilter ? 1 : 0) +
    (showArchived ? 1 : 0);

  return (
    <div className="p-6">
      <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#3a63ff] via-[#3151e6] to-[#5b3ec9] px-6 py-6 text-white shadow-lg shadow-brand/25 sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/20 blur-2xl" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
              <Truck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Fahrzeug- & Maschinenverwaltung</h1>
              <p className="mt-1 text-sm text-white/80">{activeItems.length} Einträge im Fuhrpark</p>
            </div>
          </div>
          {isAdmin && (
            <Link
              href="/fahrzeuge/neu"
              className="flex items-center gap-1.5 rounded-[11px] bg-white px-3.5 py-2 text-sm font-bold text-brand-dark shadow-md hover:bg-white/90"
            >
              + Neuer Eintrag
            </Link>
          )}
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

      <details className="mt-4 rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_20px_rgba(16,24,40,.06)]">
        <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-semibold text-foreground">Flotten-Statistiken</summary>
        <div className="grid grid-cols-2 gap-3 border-t border-border p-5 sm:grid-cols-4">
          <div className="rounded-xl bg-background p-3">
            <p className="text-lg font-semibold text-foreground">{fleetStats.verfuegbarkeitsquote}%</p>
            <p className="text-xs text-muted">Verfügbarkeitsquote</p>
          </div>
          <div className="rounded-xl bg-background p-3">
            <p className="text-lg font-semibold text-foreground">{fleetStats.gesamtauslastung}%</p>
            <p className="text-xs text-muted">Gesamtauslastung</p>
          </div>
          <div className="rounded-xl bg-background p-3">
            <p className="text-lg font-semibold text-foreground">{fleetStats.einsatztageMonat}</p>
            <p className="text-xs text-muted">Einsatztage (Monat)</p>
          </div>
          <div className="rounded-xl bg-background p-3">
            <p className="text-lg font-semibold text-foreground">{fleetStats.betriebsstundenGesamt.toLocaleString("de-DE")} Std.</p>
            <p className="text-xs text-muted">Betriebsstunden gesamt</p>
          </div>
          <div className="rounded-xl bg-background p-3">
            <p className="text-lg font-semibold text-foreground">{formatEuro(fleetStats.wartungskosten)}</p>
            <p className="text-xs text-muted">Wartungskosten (erfasst)</p>
          </div>
          <div className="rounded-xl bg-background p-3">
            <p className="text-lg font-semibold text-foreground">{formatEuro(fleetStats.reparaturkosten)}</p>
            <p className="text-xs text-muted">Reparaturkosten (erfasst)</p>
          </div>
          <div className="rounded-xl bg-background p-3">
            <p className="text-lg font-semibold text-foreground">{formatEuro(fleetStats.kraftstoffkosten)}</p>
            <p className="text-xs text-muted">Kraftstoffkosten (erfasst)</p>
          </div>
          <div className="rounded-xl bg-background p-3">
            <p className="text-lg font-semibold text-foreground">{fleetStats.kilometerstandGesamt.toLocaleString("de-DE")} km</p>
            <p className="text-xs text-muted">Kilometerstand gesamt</p>
          </div>
        </div>
      </details>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <form method="GET" action="/fahrzeuge" className="relative min-w-[220px] flex-1">
          {view !== "list" && <input type="hidden" name="view" value={view} />}
          <input
            type="search"
            name="q"
            defaultValue={raw.q ?? ""}
            placeholder="Fahrzeuge & Maschinen suchen…"
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-3 pr-3 text-base outline-none focus:border-brand sm:text-sm"
          />
        </form>

        <FleetFilterPanel
          q={raw.q ?? ""}
          view={view}
          kinds={FLEET_KINDS}
          kindLabels={FLEET_KIND_LABELS}
          statuses={FLEET_STATUSES}
          statusLabels={FLEET_STATUS_LABELS}
          manufacturerOptions={manufacturerOptions}
          locationOptions={locationOptions}
          employees={activeEmployees}
          initial={{
            kind: kindFilter,
            status: statusFilter,
            manufacturer: manufacturerFilter,
            location: locationFilter,
            employee: employeeFilter,
            ownership: ownershipFilter,
            fuelType: fuelTypeFilter,
            maintenanceDue: maintenanceDueFilter,
            tuvDue: tuvDueFilter,
            uvvDue: uvvDueFilter,
            archived: showArchived,
          }}
          activeCount={activeCount}
          listHref={viewHref("list")}
          gridHref={viewHref("grid")}
        />
      </div>

      <div className="mt-6">
        {fleetRows.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted">Keine Einträge gefunden.</p>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {fleetCards.map((item) => (
              <FleetCard key={item.id} item={item} href={`/fahrzeuge/${item.id}`} />
            ))}
          </div>
        ) : (
          <FleetTable items={fleetRows} showingArchived={showArchived} />
        )}
      </div>

      {!isAdmin && (
        <p className="mt-6 text-xs text-muted">
          Nur Owner, Admin, Geschäftsführer oder Disponent können den Fuhrpark bearbeiten oder neue Einträge anlegen.
        </p>
      )}
    </div>
  );
}
