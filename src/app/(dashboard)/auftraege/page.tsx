import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileUp,
  Hourglass,
  LayoutList,
  Plus,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { CustomerSearchInput } from "@/components/dashboard/CustomerSearchInput";
import { OrderFilterPanel } from "@/components/dashboard/OrderFilterPanel";
import { OrderTable, type OrderRow } from "@/components/dashboard/OrderTable";
import { OrderDetailPanel, type OrderDetailPanelData, type PanelTabKey } from "@/components/dashboard/OrderDetailPanel";
import { PageSizeSelect } from "@/components/dashboard/PageSizeSelect";
import { CUSTOMER_KIND_LABELS } from "@/lib/customers";
import { canCreateOrders, canManageResourcesAndSchedule } from "@/lib/roles";
import { formatDate, monthRangeBerlin, todayBerlinISO, yesterdayBerlinISO } from "@/lib/date";
import {
  assignEmployee,
  assignVehicle,
  addOrderMaterial,
  deleteOrderDocument,
  removeOrderMaterial,
  unassignEmployee,
  unassignVehicle,
  uploadOrderDocument,
} from "@/app/(dashboard)/auftraege/actions";
import {
  ORDER_AUDIT_ACTION_LABELS,
  ORDER_KINDS,
  ORDER_KIND_LABELS,
  ORDER_PRIORITIES,
  ORDER_PRIORITY_LABELS,
  ORDER_STATUSES,
  STATUS_LABELS,
  computeOrderProgress,
} from "@/lib/orders";

const PANEL_TABS: readonly PanelTabKey[] = ["uebersicht", "details", "ressourcen", "material", "dokumente", "aktivitaeten"];

type RawSearchParams = {
  q?: string;
  status?: string | string[];
  von?: string;
  bis?: string;
  customer?: string | string[];
  property?: string | string[];
  employee?: string | string[];
  vehicle?: string | string[];
  kind?: string | string[];
  priority?: string | string[];
  archived?: string;
  page?: string;
  pageSize?: string;
  sort?: string;
  dir?: string;
  panel?: string;
  panelTab?: string;
};

type FilterState = {
  q: string;
  status: string[];
  von: string;
  bis: string;
  customer: string[];
  property: string[];
  employee: string[];
  vehicle: string[];
  kind: string[];
  priority: string[];
  archived: boolean;
  page: number;
  pageSize: number;
  sort: string;
  dir: "asc" | "desc";
};

const SORTABLE_COLUMNS = ["order_number", "scheduled_date", "status", "priority", "created_at"] as const;
const PAGE_SIZE_OPTIONS = [25, 50, 100];

function toArray(v?: string | string[]): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

// Baut eine /auftraege-URL aus dem übergebenen Filterzustand – gleiches
// Muster wie in der Kundenverwaltung, damit Filter-Chips, Sortierlinks und
// Pagination stets alle übrigen Parameter erhalten.
function buildHref(state: Partial<FilterState>) {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  (state.status ?? []).forEach((s) => params.append("status", s));
  if (state.von) params.set("von", state.von);
  if (state.bis) params.set("bis", state.bis);
  (state.customer ?? []).forEach((c) => params.append("customer", c));
  (state.property ?? []).forEach((p) => params.append("property", p));
  (state.employee ?? []).forEach((e) => params.append("employee", e));
  (state.vehicle ?? []).forEach((v) => params.append("vehicle", v));
  (state.kind ?? []).forEach((k) => params.append("kind", k));
  (state.priority ?? []).forEach((p) => params.append("priority", p));
  if (state.archived) params.set("archived", "1");
  if (state.pageSize && state.pageSize !== 25) params.set("pageSize", String(state.pageSize));
  if (state.sort && state.sort !== "created_at") params.set("sort", state.sort);
  if (state.dir && state.dir !== "desc") params.set("dir", state.dir);
  if (state.page && state.page > 1) params.set("page", String(state.page));
  const qs = params.toString();
  return qs ? `/auftraege?${qs}` : "/auftraege";
}

function buildSortHref(state: FilterState, column: string) {
  const nextDir: "asc" | "desc" = state.sort === column && state.dir === "asc" ? "desc" : "asc";
  return buildHref({ ...state, sort: column, dir: nextDir, page: 1 });
}

function deltaText(delta: number, suffix: string) {
  if (delta === 0) return `±0 ${suffix}`;
  return `${delta > 0 ? "+" : ""}${delta} ${suffix}`;
}

export default async function AuftraegePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getOrCreateProfile(supabase, user) : null;
  const role = profile?.role ?? null;

  const state: FilterState = {
    q: (raw.q ?? "").trim(),
    status: toArray(raw.status).filter((s) => (ORDER_STATUSES as readonly string[]).includes(s)),
    von: raw.von ?? "",
    bis: raw.bis ?? "",
    customer: toArray(raw.customer),
    property: toArray(raw.property),
    employee: toArray(raw.employee),
    vehicle: toArray(raw.vehicle),
    kind: toArray(raw.kind).filter((k) => (ORDER_KINDS as readonly string[]).includes(k)),
    priority: toArray(raw.priority).filter((p) => (ORDER_PRIORITIES as readonly string[]).includes(p)),
    archived: raw.archived === "1",
    page: Math.max(1, Number.parseInt(raw.page ?? "1", 10) || 1),
    pageSize: PAGE_SIZE_OPTIONS.includes(Number(raw.pageSize)) ? Number(raw.pageSize) : 25,
    sort: (SORTABLE_COLUMNS as readonly string[]).includes(raw.sort ?? "") ? (raw.sort as string) : "created_at",
    dir: raw.dir === "asc" ? "asc" : "desc",
  };

  // Optionslisten für das Filterpanel (Kunde/Objekt/Mitarbeiter/Fahrzeug).
  const [{ data: customerOptions }, { data: propertyOptions }, { data: employeeOptions }, { data: vehicleOptions }] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id, name, company_name")
        .eq("is_archived", false)
        .order("name", { ascending: true }),
      supabase.from("customer_properties").select("id, name").order("name", { ascending: true }),
      supabase.from("profiles").select("id, full_name").order("full_name", { ascending: true }),
      supabase.from("fleet_items").select("id, name, license_plate").order("name", { ascending: true }),
    ]);

  const customerNameById = Object.fromEntries(
    (customerOptions ?? []).map((c) => [c.id, c.company_name || c.name]),
  );
  const employeeNameById = Object.fromEntries((employeeOptions ?? []).map((e) => [e.id, e.full_name]));
  const propertyNameById = Object.fromEntries((propertyOptions ?? []).map((p) => [p.id, p.name]));
  const vehicleNameById = Object.fromEntries(
    (vehicleOptions ?? []).map((v) => [v.id, v.license_plate || v.name]),
  );

  // KPI-Kacheln: bewusst unabhängig von der aktuellen Suche/Filterung, damit
  // sie eine stabile Unternehmensübersicht liefern (RLS grenzt für
  // Techniker automatisch auf ihre zugewiesenen Aufträge ein).
  const today = todayBerlinISO();
  const yesterday = yesterdayBerlinISO();
  const currentMonth = monthRangeBerlin(0);
  const prevMonth = monthRangeBerlin(-1);

  const [
    { count: totalCount },
    { count: createdThisMonth },
    { count: createdPrevMonth },
    { count: todayCount },
    { count: yesterdayCount },
    { count: inBearbeitungCount },
    { count: inBearbeitungUrgentCount },
    { count: overdueCount },
    { count: overdueNotfallCount },
    { count: completedThisMonth },
    { count: completedPrevMonth },
  ] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("is_archived", false),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false)
      .gte("created_at", currentMonth.start)
      .lt("created_at", currentMonth.end),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false)
      .gte("created_at", prevMonth.start)
      .lt("created_at", prevMonth.end),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("is_archived", false).eq("scheduled_date", today),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false)
      .eq("scheduled_date", yesterday),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("is_archived", false).eq("status", "in_bearbeitung"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false)
      .eq("status", "in_bearbeitung")
      .in("priority", ["zeitkritisch", "notfall"]),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false)
      .lt("scheduled_date", today)
      .not("status", "in", '("abgeschlossen","storniert")'),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false)
      .lt("scheduled_date", today)
      .not("status", "in", '("abgeschlossen","storniert")')
      .eq("priority", "notfall"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false)
      .eq("status", "abgeschlossen")
      .gte("completed_at", currentMonth.start)
      .lt("completed_at", currentMonth.end),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false)
      .eq("status", "abgeschlossen")
      .gte("completed_at", prevMonth.start)
      .lt("completed_at", prevMonth.end),
  ]);

  const kpis = [
    {
      key: "gesamt",
      label: "Gesamtaufträge",
      icon: ClipboardList,
      value: totalCount ?? 0,
      subInfo: null as string | null,
      delta: deltaText((createdThisMonth ?? 0) - (createdPrevMonth ?? 0), "ggü. Vormonat"),
    },
    {
      key: "heute",
      label: "Heute",
      icon: CalendarDays,
      value: todayCount ?? 0,
      subInfo: null,
      delta: deltaText((todayCount ?? 0) - (yesterdayCount ?? 0), "ggü. gestern"),
    },
    {
      key: "in_bearbeitung",
      label: "In Bearbeitung",
      icon: Hourglass,
      value: inBearbeitungCount ?? 0,
      subInfo: `davon zeitkritisch/Notfall: ${inBearbeitungUrgentCount ?? 0}`,
      delta: null as string | null,
    },
    {
      key: "ueberfaellig",
      label: "Überfällig",
      icon: AlertTriangle,
      value: overdueCount ?? 0,
      subInfo: `davon Notfall: ${overdueNotfallCount ?? 0}`,
      delta: null,
    },
    {
      key: "abgeschlossen",
      label: "Abgeschlossen",
      icon: CheckCircle2,
      value: completedThisMonth ?? 0,
      subInfo: "im aktuellen Monat",
      delta: deltaText((completedThisMonth ?? 0) - (completedPrevMonth ?? 0), "ggü. Vormonat"),
    },
  ];

  // Schnittmengenfilter (idFilterSets): Suche sowie Mitarbeiter-/
  // Fahrzeugfilter erfordern Joins über verknüpfte Tabellen und liefern
  // jeweils eine Menge von Auftrags-IDs – die Ergebnismenge ist die
  // Schnittmenge aller aktiven Bedingungen (gleiches Muster wie /kunden).
  const idFilterSets: string[][] = [];

  if (state.q) {
    const term = state.q.replace(/[%,()]/g, " ");
    const [directOrdersRes, customersRes, contactsRes, customerAddrRes, propertiesRes, assignmentsRes, resourcesRes] =
      await Promise.all([
        supabase.from("orders").select("id").or(`order_number.ilike.%${term}%,title.ilike.%${term}%`),
        supabase.from("customers").select("id").or(`name.ilike.%${term}%,company_name.ilike.%${term}%`),
        supabase.from("customer_contacts").select("customer_id").ilike("name", `%${term}%`),
        supabase
          .from("customers")
          .select("id")
          .or(`street.ilike.%${term}%,postal_code.ilike.%${term}%,city.ilike.%${term}%`),
        supabase
          .from("customer_properties")
          .select("id")
          .or(`name.ilike.%${term}%,street.ilike.%${term}%,postal_code.ilike.%${term}%,city.ilike.%${term}%`),
        supabase
          .from("order_assignments")
          .select("order_id, profiles!order_assignments_employee_id_fkey!inner(full_name)")
          .ilike("profiles.full_name", `%${term}%`),
        supabase
          .from("order_resources")
          .select("order_id, fleet_items!inner(name, license_plate)")
          .or(`name.ilike.%${term}%,license_plate.ilike.%${term}%`, { foreignTable: "fleet_items" }),
      ]);

    const directIds = (directOrdersRes.data ?? []).map((r) => r.id);
    const matchedCustomerIds = Array.from(
      new Set([
        ...(customersRes.data ?? []).map((r) => r.id),
        ...(contactsRes.data ?? []).map((r) => r.customer_id).filter((v): v is string => Boolean(v)),
        ...(customerAddrRes.data ?? []).map((r) => r.id),
      ]),
    );
    const matchedPropertyIds = (propertiesRes.data ?? []).map((r) => r.id);

    let customerOrderIds: string[] = [];
    let propertyOrderIds: string[] = [];
    if (matchedCustomerIds.length > 0) {
      const { data } = await supabase.from("orders").select("id").in("customer_id", matchedCustomerIds);
      customerOrderIds = (data ?? []).map((r) => r.id);
    }
    if (matchedPropertyIds.length > 0) {
      const { data } = await supabase.from("orders").select("id").in("property_id", matchedPropertyIds);
      propertyOrderIds = (data ?? []).map((r) => r.id);
    }
    const employeeOrderIds = (assignmentsRes.data ?? []).map((r) => r.order_id);
    const vehicleOrderIds = (resourcesRes.data ?? []).map((r) => r.order_id);

    idFilterSets.push(
      Array.from(
        new Set([...directIds, ...customerOrderIds, ...propertyOrderIds, ...employeeOrderIds, ...vehicleOrderIds]),
      ),
    );
  }

  if (state.employee.length > 0) {
    const { data } = await supabase.from("order_assignments").select("order_id").in("employee_id", state.employee);
    idFilterSets.push(Array.from(new Set((data ?? []).map((r) => r.order_id))));
  }

  if (state.vehicle.length > 0) {
    const { data } = await supabase.from("order_resources").select("order_id").in("fleet_item_id", state.vehicle);
    idFilterSets.push(Array.from(new Set((data ?? []).map((r) => r.order_id))));
  }

  let restrictedIds: string[] | null = null;
  if (idFilterSets.length > 0) {
    restrictedIds = idFilterSets[0];
    for (let i = 1; i < idFilterSets.length; i++) {
      const set = new Set(idFilterSets[i]);
      restrictedIds = restrictedIds.filter((id) => set.has(id));
    }
  }

  type OrderQueryRow = {
    id: string;
    order_number: string | null;
    title: string;
    order_kind: string;
    status: string;
    priority: string;
    is_favorite: boolean;
    is_archived: boolean;
    scheduled_date: string | null;
    start_time: string | null;
    customer_id: string | null;
    property_id: string | null;
    created_at: string;
    started_at: string | null;
    documentation_completed_at: string | null;
    completed_at: string | null;
  };

  let orders: OrderQueryRow[] = [];
  let error: { message: string } | null = null;
  let totalFilteredCount = 0;

  const from = (state.page - 1) * state.pageSize;
  const to = from + state.pageSize - 1;

  if (restrictedIds && restrictedIds.length === 0) {
    orders = [];
  } else {
    let query = supabase
      .from("orders")
      .select(
        "id, order_number, title, order_kind, status, priority, is_favorite, is_archived, scheduled_date, start_time, customer_id, property_id, created_at, started_at, documentation_completed_at, completed_at",
        { count: "exact" },
      )
      .order(state.sort, { ascending: state.dir === "asc" })
      .range(from, to);

    if (!state.archived) {
      query = query.eq("is_archived", false);
    }
    if (state.status.length > 0) {
      query = query.in("status", state.status);
    }
    if (state.kind.length > 0) {
      query = query.in("order_kind", state.kind);
    }
    if (state.priority.length > 0) {
      query = query.in("priority", state.priority);
    }
    if (state.customer.length > 0) {
      query = query.in("customer_id", state.customer);
    }
    if (state.property.length > 0) {
      query = query.in("property_id", state.property);
    }
    if (state.von) {
      query = query.gte("scheduled_date", state.von);
    }
    if (state.bis) {
      query = query.lte("scheduled_date", state.bis);
    }
    if (restrictedIds) {
      query = query.in("id", restrictedIds);
    }

    const res = await query;
    orders = (res.data as OrderQueryRow[] | null) ?? [];
    error = res.error;
    totalFilteredCount = res.count ?? orders.length;
  }

  // Zusatzdaten für die Tabellenspalten – bewusst nur für die Aufträge der
  // aktuellen Seite geladen (siehe Kundenverwaltung).
  const pageIds = orders.map((o) => o.id);
  const customerIds = Array.from(new Set(orders.map((o) => o.customer_id).filter((v): v is string => Boolean(v))));
  const propertyIds = Array.from(new Set(orders.map((o) => o.property_id).filter((v): v is string => Boolean(v))));

  let customersById: Record<string, { name: string; company_name: string | null; kind: string }> = {};
  const primaryContactByCustomer: Record<string, string> = {};
  let propertiesById: Record<string, { name: string; street: string | null; postal_code: string | null; city: string | null }> =
    {};
  const employeesByOrder: Record<string, Array<{ id: string; name: string }>> = {};
  const vehiclesByOrder: Record<string, Array<{ id: string; name: string; licensePlate: string | null }>> = {};
  const reportsByOrder: Record<string, { firstReportAt: string | null; signedAt: string | null }> = {};

  if (pageIds.length > 0) {
    const [customersRes, contactsRes, propertiesRes, assignmentsRes, resourcesRes, reportsRes] = await Promise.all([
      customerIds.length > 0
        ? supabase.from("customers").select("id, name, company_name, kind").in("id", customerIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string; company_name: string | null; kind: string }> }),
      customerIds.length > 0
        ? supabase
            .from("customer_contacts")
            .select("customer_id, name")
            .in("customer_id", customerIds)
            .eq("is_primary", true)
        : Promise.resolve({ data: [] as Array<{ customer_id: string; name: string }> }),
      propertyIds.length > 0
        ? supabase.from("customer_properties").select("id, name, street, postal_code, city").in("id", propertyIds)
        : Promise.resolve({
            data: [] as Array<{ id: string; name: string; street: string | null; postal_code: string | null; city: string | null }>,
          }),
      supabase
        .from("order_assignments")
        .select("order_id, employee_id, profiles!order_assignments_employee_id_fkey(full_name)")
        .in("order_id", pageIds),
      supabase.from("order_resources").select("order_id, fleet_item_id, fleet_items(name, license_plate)").in("order_id", pageIds),
      supabase.from("service_reports").select("order_id, created_at, signed_at").in("order_id", pageIds),
    ]);

    customersById = Object.fromEntries((customersRes.data ?? []).map((c) => [c.id, c]));
    for (const row of contactsRes.data ?? []) {
      primaryContactByCustomer[row.customer_id] = row.name;
    }
    propertiesById = Object.fromEntries((propertiesRes.data ?? []).map((p) => [p.id, p]));

    for (const row of assignmentsRes.data ?? []) {
      const name = row.profiles?.full_name ?? "Unbekannt";
      (employeesByOrder[row.order_id] ??= []).push({ id: row.employee_id, name });
    }
    for (const row of resourcesRes.data ?? []) {
      (vehiclesByOrder[row.order_id] ??= []).push({
        id: row.fleet_item_id,
        name: row.fleet_items?.name ?? "Unbekannt",
        licensePlate: row.fleet_items?.license_plate ?? null,
      });
    }
    for (const row of reportsRes.data ?? []) {
      const entry = reportsByOrder[row.order_id] ?? { firstReportAt: null, signedAt: null };
      if (!entry.firstReportAt || row.created_at < entry.firstReportAt) {
        entry.firstReportAt = row.created_at;
      }
      if (row.signed_at && (!entry.signedAt || row.signed_at < entry.signedAt)) {
        entry.signedAt = row.signed_at;
      }
      reportsByOrder[row.order_id] = entry;
    }
  }

  const orderRows: OrderRow[] = orders.map((o) => {
    const customer = o.customer_id ? customersById[o.customer_id] : null;
    const property = o.property_id ? propertiesById[o.property_id] : null;
    const employees = employeesByOrder[o.id] ?? [];
    const vehicles = vehiclesByOrder[o.id] ?? [];
    const reports = reportsByOrder[o.id];

    const progress = computeOrderProgress({
      createdAt: o.created_at,
      status: o.status,
      hasResources: employees.length > 0 || vehicles.length > 0,
      resourcesAssignedAt: null,
      startedAt: o.started_at,
      documentationCompletedAt: o.documentation_completed_at,
      firstReportAt: reports?.firstReportAt ?? null,
      signedAt: reports?.signedAt ?? null,
      completedAt: o.completed_at,
    });

    return {
      id: o.id,
      order_number: o.order_number,
      title: o.title,
      order_kind: o.order_kind,
      status: o.status,
      priority: o.priority,
      is_favorite: o.is_favorite,
      is_archived: o.is_archived,
      scheduled_date: o.scheduled_date,
      start_time: o.start_time,
      customerName: customer ? customer.company_name || customer.name : null,
      customerSecondLine: customer
        ? (o.customer_id ? primaryContactByCustomer[o.customer_id] : null) ?? CUSTOMER_KIND_LABELS[customer.kind] ?? null
        : null,
      propertyName: property?.name ?? null,
      propertyStreet: property?.street ?? null,
      propertyCityLine: property ? [property.postal_code, property.city].filter(Boolean).join(" ") || null : null,
      employees,
      vehicles,
      progressPercent: progress.percent,
    };
  });

  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / state.pageSize));
  const rangeStart = totalFilteredCount === 0 ? 0 : from + 1;
  const rangeEnd = Math.min(from + orders.length, totalFilteredCount);

  const sortHrefs = Object.fromEntries(
    ["order_number", "scheduled_date", "status", "priority"].map((col) => [col, buildSortHref(state, col)]),
  );

  const activeCount =
    state.status.length +
    (state.von ? 1 : 0) +
    (state.bis ? 1 : 0) +
    state.customer.length +
    state.property.length +
    state.employee.length +
    state.vehicle.length +
    state.kind.length +
    state.priority.length +
    (state.archived ? 1 : 0);

  const hasAnyFilter = activeCount > 0 || Boolean(state.q);

  type Chip = { key: string; label: string; href: string };
  const chips: Chip[] = [
    ...state.status.map((s) => ({
      key: `status-${s}`,
      label: `Status: ${STATUS_LABELS[s] ?? s}`,
      href: buildHref({ ...state, status: state.status.filter((x) => x !== s) }),
    })),
    ...(state.von ? [{ key: "von", label: `Termin ab ${formatDate(state.von)}`, href: buildHref({ ...state, von: "" }) }] : []),
    ...(state.bis ? [{ key: "bis", label: `Termin bis ${formatDate(state.bis)}`, href: buildHref({ ...state, bis: "" }) }] : []),
    ...state.customer.map((c) => ({
      key: `customer-${c}`,
      label: `Kunde: ${customerNameById[c] ?? "Unbekannt"}`,
      href: buildHref({ ...state, customer: state.customer.filter((x) => x !== c) }),
    })),
    ...state.property.map((p) => ({
      key: `property-${p}`,
      label: `Objekt: ${propertyNameById[p] ?? "Unbekannt"}`,
      href: buildHref({ ...state, property: state.property.filter((x) => x !== p) }),
    })),
    ...state.employee.map((e) => ({
      key: `employee-${e}`,
      label: `Mitarbeiter: ${employeeNameById[e] ?? "Unbekannt"}`,
      href: buildHref({ ...state, employee: state.employee.filter((x) => x !== e) }),
    })),
    ...state.vehicle.map((v) => ({
      key: `vehicle-${v}`,
      label: `Fahrzeug: ${vehicleNameById[v] ?? "Unbekannt"}`,
      href: buildHref({ ...state, vehicle: state.vehicle.filter((x) => x !== v) }),
    })),
    ...state.kind.map((k) => ({
      key: `kind-${k}`,
      label: `Art: ${ORDER_KIND_LABELS[k] ?? k}`,
      href: buildHref({ ...state, kind: state.kind.filter((x) => x !== k) }),
    })),
    ...state.priority.map((p) => ({
      key: `priority-${p}`,
      label: `Priorität: ${ORDER_PRIORITY_LABELS[p] ?? p}`,
      href: buildHref({ ...state, priority: state.priority.filter((x) => x !== p) }),
    })),
    ...(state.archived
      ? [{ key: "archived", label: "Inkl. archivierte Aufträge", href: buildHref({ ...state, archived: false }) }]
      : []),
  ];

  const canCreate = canCreateOrders(role);

  // Rechtes Detailpanel: gesteuert über die Query-Parameter "panel"
  // (Auftrags-ID) und "panelTab", damit ein Auftrag geöffnet werden kann,
  // ohne die Liste zu verlassen (gleiches Muster wie /kunden).
  const listQueryString = buildHref(state).split("?")[1] ?? "";
  const panelId = raw.panel && raw.panel.trim().length > 0 ? raw.panel.trim() : null;
  const panelTab: PanelTabKey = PANEL_TABS.includes(raw.panelTab as PanelTabKey) ? (raw.panelTab as PanelTabKey) : "uebersicht";

  function panelHref(orderId: string, tab: PanelTabKey = "uebersicht") {
    const params = new URLSearchParams(listQueryString);
    params.set("panel", orderId);
    if (tab !== "uebersicht") params.set("panelTab", tab);
    else params.delete("panelTab");
    return `/auftraege?${params.toString()}`;
  }

  function panelCloseHref() {
    const params = new URLSearchParams(listQueryString);
    params.delete("panel");
    params.delete("panelTab");
    const qs = params.toString();
    return qs ? `/auftraege?${qs}` : "/auftraege";
  }

  let panelData: OrderDetailPanelData | null = null;

  if (panelId) {
    const { data: panelOrder } = await supabase.from("orders").select("*").eq("id", panelId).maybeSingle();

    if (panelOrder) {
      const returnTo = panelHref(panelId, panelTab);
      const canManageResources = canManageResourcesAndSchedule(role);

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
        { data: allMaterials },
      ] = await Promise.all([
        panelOrder.customer_id
          ? supabase.from("customers").select("id, name, phone, email").eq("id", panelOrder.customer_id).maybeSingle()
          : Promise.resolve({ data: null }),
        panelOrder.customer_id
          ? supabase
              .from("customer_contacts")
              .select("name, phone, email")
              .eq("customer_id", panelOrder.customer_id)
              .eq("is_primary", true)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        panelOrder.property_id
          ? supabase
              .from("customer_properties")
              .select("name, street, postal_code, city")
              .eq("id", panelOrder.property_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        panelOrder.created_by
          ? supabase.from("profiles").select("full_name").eq("id", panelOrder.created_by).maybeSingle()
          : Promise.resolve({ data: null }),
        panelOrder.updated_by
          ? supabase.from("profiles").select("full_name").eq("id", panelOrder.updated_by).maybeSingle()
          : Promise.resolve({ data: null }),
        panelOrder.dispatcher_id
          ? supabase.from("profiles").select("full_name").eq("id", panelOrder.dispatcher_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("order_assignments")
          .select("id, employee_id, profiles!order_assignments_employee_id_fkey(full_name)")
          .eq("order_id", panelId),
        supabase.from("order_resources").select("id, fleet_item_id, fleet_items(name, license_plate)").eq("order_id", panelId),
        supabase.from("service_reports").select("created_at, signed_at").eq("order_id", panelId),
        supabase
          .from("order_audit_log")
          .select("action, summary, created_at, actor_id")
          .eq("order_id", panelId)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase.from("materials").select("id, name, unit").order("name", { ascending: true }),
      ]);

      const employees = (assignmentRows ?? []).map((a) => ({
        assignmentId: a.id,
        id: a.employee_id,
        name: a.profiles?.full_name ?? "Unbekannt",
        unassignAction: unassignEmployee.bind(null, panelId, a.id, returnTo),
      }));
      const vehicles = (resourceRows ?? []).map((r) => ({
        resourceId: r.id,
        id: r.fleet_item_id,
        name: r.fleet_items?.name ?? "Unbekannt",
        licensePlate: r.fleet_items?.license_plate ?? null,
        unassignAction: unassignVehicle.bind(null, panelId, r.id, returnTo),
      }));

      let firstReportAt: string | null = null;
      let signedAt: string | null = null;
      for (const r of reportRows ?? []) {
        if (!firstReportAt || r.created_at < firstReportAt) firstReportAt = r.created_at;
        if (r.signed_at && (!signedAt || r.signed_at < signedAt)) signedAt = r.signed_at;
      }

      const progress = computeOrderProgress({
        createdAt: panelOrder.created_at,
        status: panelOrder.status,
        hasResources: employees.length > 0 || vehicles.length > 0,
        resourcesAssignedAt: null,
        startedAt: panelOrder.started_at,
        documentationCompletedAt: panelOrder.documentation_completed_at,
        firstReportAt,
        signedAt,
        completedAt: panelOrder.completed_at,
      });

      const lastAudit = lastAuditRows?.[0] ?? null;

      let materials: OrderDetailPanelData["materials"] = [];
      let documents: OrderDetailPanelData["documents"] = [];
      let activity: OrderDetailPanelData["activity"] = [];

      if (panelTab === "material") {
        const { data } = await supabase
          .from("order_materials")
          .select("id, quantity, materials(name, unit)")
          .eq("order_id", panelId)
          .order("created_at", { ascending: true });
        materials = (data ?? []).map((m) => ({
          linkId: m.id,
          name: m.materials?.name ?? "Unbekannt",
          unit: m.materials?.unit ?? null,
          quantity: Number(m.quantity),
          removeAction: removeOrderMaterial.bind(null, panelId, m.id, returnTo),
        }));
      }

      if (panelTab === "dokumente") {
        const { data } = await supabase
          .from("order_documents")
          .select("id, file_name, storage_path, category, size_bytes, created_at")
          .eq("order_id", panelId)
          .order("created_at", { ascending: false });
        const docs = data ?? [];
        let urlByPath: Record<string, string> = {};
        if (docs.length > 0) {
          const { data: signed } = await supabase.storage
            .from("order-documents")
            .createSignedUrls(docs.map((d) => d.storage_path), 60 * 10);
          urlByPath = Object.fromEntries((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]).filter(([p]) => p));
        }
        documents = docs.map((d) => ({
          id: d.id,
          file_name: d.file_name,
          category: d.category,
          size_bytes: d.size_bytes,
          created_at: d.created_at,
          url: urlByPath[d.storage_path] ?? null,
          deleteAction: deleteOrderDocument.bind(null, panelId, d.id, d.storage_path, returnTo),
        }));
      }

      if (panelTab === "aktivitaeten") {
        const { data } = await supabase
          .from("order_audit_log")
          .select("id, action, summary, created_at, actor_id")
          .eq("order_id", panelId)
          .order("created_at", { ascending: false });
        activity = (data ?? []).map((a) => ({
          id: a.id,
          action: a.action,
          summary: a.summary,
          authorName: a.actor_id ? employeeNameById[a.actor_id] ?? "Unbekannt" : "System",
          createdAt: a.created_at,
        }));
      }

      const assignedEmployeeIds = new Set(employees.map((e) => e.id));
      const assignedVehicleIds = new Set(vehicles.map((v) => v.id));

      panelData = {
        order: {
          id: panelOrder.id,
          order_number: panelOrder.order_number,
          title: panelOrder.title,
          description: panelOrder.description,
          status: panelOrder.status,
          priority: panelOrder.priority,
          order_kind: panelOrder.order_kind,
          service_type: panelOrder.service_type,
          is_favorite: panelOrder.is_favorite,
          is_archived: panelOrder.is_archived,
          scheduled_date: panelOrder.scheduled_date,
          start_time: panelOrder.start_time,
          planned_duration_minutes: panelOrder.planned_duration_minutes,
          time_window_start: panelOrder.time_window_start,
          time_window_end: panelOrder.time_window_end,
          all_day: panelOrder.all_day,
          is_recurring: panelOrder.is_recurring,
          internal_notes: panelOrder.internal_notes,
          access_info: panelOrder.access_info,
          arrival_info: panelOrder.arrival_info,
          onsite_contact: panelOrder.onsite_contact,
          safety_notes: panelOrder.safety_notes,
          order_value: panelOrder.order_value,
          created_at: panelOrder.created_at,
          updated_at: panelOrder.updated_at,
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
        activeTab: panelTab,
        canManageResources,
        employeeOptions: (employeeOptions ?? [])
          .filter((e) => !assignedEmployeeIds.has(e.id))
          .map((e) => ({ id: e.id, label: e.full_name || "Unbekannt" })),
        vehicleOptions: (vehicleOptions ?? [])
          .filter((v) => !assignedVehicleIds.has(v.id))
          .map((v) => ({ id: v.id, label: v.license_plate ? `${v.license_plate} · ${v.name}` : v.name })),
        materialOptions: (allMaterials ?? []).map((m) => ({ id: m.id, label: m.name, unit: m.unit })),
        hrefs: {
          close: panelCloseHref(),
          tabs: Object.fromEntries(PANEL_TABS.map((t) => [t, panelHref(panelId, t)])) as Record<PanelTabKey, string>,
          fullProfile: `/auftraege/${panelId}`,
          newReport: `/berichte/neu?order=${panelId}`,
          newQuote: customerRow ? `/rechnungen/neu?customer_id=${customerRow.id}&kind=angebot` : null,
          newInvoice: customerRow ? `/rechnungen/neu?customer_id=${customerRow.id}&kind=rechnung` : null,
        },
        assignEmployeeAction: assignEmployee.bind(null, panelId, returnTo),
        assignVehicleAction: assignVehicle.bind(null, panelId, returnTo),
        addMaterialAction: addOrderMaterial.bind(null, panelId, returnTo),
        uploadDocumentAction: uploadOrderDocument.bind(null, panelId, returnTo),
      };
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Auftragsmanagement</h1>
          <p className="mt-1 text-sm text-muted">Verwalten Sie alle Aufträge und Einsätze zentral.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Folgt in einer späteren Phase"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted opacity-60"
          >
            <FileUp className="h-4 w-4" />
            Importieren
          </button>
          {canCreate && (
            <Link
              href="/auftraege/neu"
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
            >
              <Plus className="h-4 w-4" />
              Neuer Auftrag
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.key} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-2.5 text-xs text-muted">{kpi.label}</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums">{kpi.value}</p>
              {kpi.subInfo && <p className="mt-1 text-[11px] text-muted">{kpi.subInfo}</p>}
              {kpi.delta && <p className="mt-1 text-[11px] text-muted">{kpi.delta}</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex max-w-xl flex-1 flex-wrap gap-3">
          <CustomerSearchInput
            initialQuery={state.q}
            placeholder="Suche nach Auftragsnummer, Titel, Kunde, Ansprechpartner, Objekt, Adresse, Ort, Mitarbeiter, Fahrzeug…"
          />
        </div>

        <OrderFilterPanel
          q={state.q}
          statuses={ORDER_STATUSES}
          statusLabels={STATUS_LABELS}
          kinds={ORDER_KINDS}
          kindLabels={ORDER_KIND_LABELS}
          priorities={ORDER_PRIORITIES}
          priorityLabels={ORDER_PRIORITY_LABELS}
          customers={(customerOptions ?? []).map((c) => ({ id: c.id, label: c.company_name || c.name }))}
          properties={(propertyOptions ?? []).map((p) => ({ id: p.id, label: p.name }))}
          employees={(employeeOptions ?? []).map((e) => ({ id: e.id, label: e.full_name || "Unbekannt" }))}
          vehicles={(vehicleOptions ?? []).map((v) => ({ id: v.id, label: v.license_plate || v.name }))}
          initial={state}
          activeCount={activeCount}
        />
      </div>

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={chip.href}
              className="flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-dark hover:bg-brand-soft/70"
            >
              {chip.label}
              <X className="h-3 w-3" />
            </Link>
          ))}
          <Link href="/auftraege" className="flex items-center px-2 py-1 text-xs font-medium text-muted hover:text-foreground">
            Alle Filter zurücksetzen
          </Link>
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Aufträge konnten nicht geladen werden: {error.message}
        </p>
      )}

      {!error && orders.length === 0 && totalFilteredCount > 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-muted">Diese Seite enthält keine Aufträge mehr.</p>
          <Link href={buildHref({ ...state, page: 1 })} className="mt-3 inline-block text-sm font-medium text-brand">
            Zurück zur ersten Seite
          </Link>
        </div>
      )}

      {!error && totalFilteredCount === 0 && !hasAnyFilter && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <LayoutList className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm font-medium text-foreground">Noch keine Aufträge vorhanden</p>
          <p className="mt-1 text-sm text-muted">
            Erstellen Sie Ihren ersten Auftrag oder verwenden Sie eine Vorlage.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {canCreate && (
              <Link
                href="/auftraege/neu"
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
              >
                <Plus className="h-4 w-4" />
                Neuen Auftrag erstellen
              </Link>
            )}
            <button
              type="button"
              disabled
              title="Folgt in einer späteren Phase"
              className="cursor-not-allowed rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted opacity-60"
            >
              Vorlage verwenden
            </button>
            <button
              type="button"
              disabled
              title="Folgt in einer späteren Phase"
              className="cursor-not-allowed rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted opacity-60"
            >
              Aufträge importieren
            </button>
          </div>
        </div>
      )}

      {!error && totalFilteredCount === 0 && hasAnyFilter && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-muted">Keine Aufträge gefunden.</p>
          <Link href="/auftraege" className="mt-3 inline-block text-sm font-medium text-brand">
            Filter zurücksetzen
          </Link>
        </div>
      )}

      {orderRows.length > 0 && (
        <OrderTable
          orders={orderRows}
          sortHrefs={sortHrefs}
          currentSort={state.sort}
          currentDir={state.dir}
          showingArchived={state.archived}
          panelBaseQuery={listQueryString}
        />
      )}

      {totalFilteredCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {rangeStart}–{rangeEnd} von {totalFilteredCount}
          </p>
          <div className="flex items-center gap-4">
            <PageSizeSelect baseHref={buildHref({ ...state, page: 1, pageSize: 25 })} value={state.pageSize} />
            <div className="flex items-center gap-1">
              <Link
                href={buildHref({ ...state, page: Math.max(1, state.page - 1) })}
                aria-disabled={state.page <= 1}
                className={`rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium ${
                  state.page <= 1
                    ? "pointer-events-none text-muted/40"
                    : "text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                Zurück
              </Link>
              <span className="px-2 text-xs text-muted">
                Seite {state.page} von {totalPages}
              </span>
              <Link
                href={buildHref({ ...state, page: Math.min(totalPages, state.page + 1) })}
                aria-disabled={state.page >= totalPages}
                className={`rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium ${
                  state.page >= totalPages
                    ? "pointer-events-none text-muted/40"
                    : "text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                Weiter
              </Link>
            </div>
          </div>
        </div>
      )}

      {panelData && <OrderDetailPanel data={panelData} />}
    </div>
  );
}
