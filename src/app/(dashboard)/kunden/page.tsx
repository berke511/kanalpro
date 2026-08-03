import Link from "next/link";
import { ClipboardList, FileText, Receipt, Search, UserPlus, Users, Wrench, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CustomerFilterPanel } from "@/components/dashboard/CustomerFilterPanel";
import { CustomerTable, type CustomerRow } from "@/components/dashboard/CustomerTable";
import { PageSizeSelect } from "@/components/dashboard/PageSizeSelect";
import {
  CUSTOMER_KINDS,
  CUSTOMER_KIND_LABELS,
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_BADGE_CLASS,
  CUSTOMER_STATUS_LABELS,
  MAINTENANCE_CONTRACT_TAG,
} from "@/lib/customers";

type RawSearchParams = {
  q?: string;
  kind?: string | string[];
  status?: string | string[];
  city?: string;
  employee?: string;
  createdFrom?: string;
  createdTo?: string;
  lastOrderFrom?: string;
  lastOrderTo?: string;
  openInvoices?: string;
  openQuotes?: string;
  maintenance?: string;
  view?: string;
  page?: string;
  pageSize?: string;
  sort?: string;
  dir?: string;
};

type FilterState = {
  q: string;
  kind: string[];
  status: string[];
  city: string;
  employee: string;
  createdFrom: string;
  createdTo: string;
  lastOrderFrom: string;
  lastOrderTo: string;
  openInvoices: boolean;
  openQuotes: boolean;
  maintenance: boolean;
  view: string;
  page: number;
  pageSize: number;
  sort: string;
  dir: "asc" | "desc";
};

const SORTABLE_COLUMNS = ["name", "customer_number", "kind", "status", "city", "created_at"] as const;
const PAGE_SIZE_OPTIONS = [25, 50, 100];

function toArray(v?: string | string[]): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

// Baut eine /kunden-URL aus dem übergebenen Filterzustand. Wird sowohl für
// die Filter-Chips (einzelnen Wert entfernen) als auch für den
// Ansicht-Umschalter verwendet, damit dabei stets alle übrigen Filter
// erhalten bleiben.
function buildHref(state: Partial<FilterState>) {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  (state.kind ?? []).forEach((k) => params.append("kind", k));
  (state.status ?? []).forEach((s) => params.append("status", s));
  if (state.city) params.set("city", state.city);
  if (state.employee) params.set("employee", state.employee);
  if (state.createdFrom) params.set("createdFrom", state.createdFrom);
  if (state.createdTo) params.set("createdTo", state.createdTo);
  if (state.lastOrderFrom) params.set("lastOrderFrom", state.lastOrderFrom);
  if (state.lastOrderTo) params.set("lastOrderTo", state.lastOrderTo);
  if (state.openInvoices) params.set("openInvoices", "1");
  if (state.openQuotes) params.set("openQuotes", "1");
  if (state.maintenance) params.set("maintenance", "1");
  if (state.view && state.view !== "list") params.set("view", state.view);
  if (state.pageSize && state.pageSize !== 25) params.set("pageSize", String(state.pageSize));
  if (state.sort && state.sort !== "created_at") params.set("sort", state.sort);
  if (state.dir && state.dir !== "desc") params.set("dir", state.dir);
  if (state.page && state.page > 1) params.set("page", String(state.page));
  const qs = params.toString();
  return qs ? `/kunden?${qs}` : "/kunden";
}

function buildSortHref(state: FilterState, column: string) {
  const nextDir: "asc" | "desc" = state.sort === column && state.dir === "asc" ? "desc" : "asc";
  return buildHref({ ...state, sort: column, dir: nextDir, page: 1 });
}

function formatDate(value: string) {
  const [y, m, d] = value.split("-");
  return y && m && d ? `${d}.${m}.${y}` : value;
}

export default async function KundenPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const supabase = await createClient();

  const state: FilterState = {
    q: (raw.q ?? "").trim(),
    kind: toArray(raw.kind).filter((k) => (CUSTOMER_KINDS as readonly string[]).includes(k)),
    status: toArray(raw.status).filter((s) => (CUSTOMER_STATUSES as readonly string[]).includes(s)),
    city: (raw.city ?? "").trim(),
    employee: raw.employee ?? "",
    createdFrom: raw.createdFrom ?? "",
    createdTo: raw.createdTo ?? "",
    lastOrderFrom: raw.lastOrderFrom ?? "",
    lastOrderTo: raw.lastOrderTo ?? "",
    openInvoices: raw.openInvoices === "1",
    openQuotes: raw.openQuotes === "1",
    maintenance: raw.maintenance === "1",
    view: raw.view === "grid" ? "grid" : "list",
    page: Math.max(1, Number.parseInt(raw.page ?? "1", 10) || 1),
    pageSize: PAGE_SIZE_OPTIONS.includes(Number(raw.pageSize)) ? Number(raw.pageSize) : 25,
    sort: (SORTABLE_COLUMNS as readonly string[]).includes(raw.sort ?? "") ? (raw.sort as string) : "created_at",
    dir: raw.dir === "asc" ? "asc" : "desc",
  };

  const { data: employees } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  // Unternehmensweite Kennzahlen für die KPI-Kacheln – bewusst unabhängig
  // von der aktuellen Suche/Filterung, damit sie eine stabile Übersicht
  // liefern statt sich bei jeder Filteränderung mitzuverschieben.
  const [
    { count: totalCount },
    { count: neukundenCount },
    { count: bestandskundenCount },
    { count: wartungskundenCount },
    { count: maintenanceCount },
    { count: openQuotesCount },
    { count: openInvoicesCount },
  ] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "neukunde"),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "bestandskunde"),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "wartungskunde"),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .contains("tags", [MAINTENANCE_CONTRACT_TAG]),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("kind", "angebot")
      .in("status", ["entwurf", "versendet"]),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("kind", "rechnung")
      .in("status", ["entwurf", "versendet"]),
  ]);

  const kpis = [
    { label: "Gesamte Kunden", value: totalCount ?? 0, icon: Users },
    { label: "Neukunden", value: neukundenCount ?? 0, icon: UserPlus },
    { label: "Aktive Kunden", value: (bestandskundenCount ?? 0) + (wartungskundenCount ?? 0), icon: ClipboardList },
    { label: "Wartungsverträge", value: maintenanceCount ?? 0, icon: Wrench },
    { label: "Offene Angebote", value: openQuotesCount ?? 0, icon: FileText },
    { label: "Offene Rechnungen", value: openInvoicesCount ?? 0, icon: Receipt },
  ];

  // Subquery-basierte Schnittmengenfilter: Letzter Auftrag, offene
  // Rechnungen/Angebote. Jede aktive Bedingung liefert eine Menge von
  // Kunden-IDs; die Ergebnismenge ist die Schnittmenge aller aktiven
  // Bedingungen.
  const idFilterSets: string[][] = [];

  if (state.lastOrderFrom || state.lastOrderTo) {
    let oq = supabase.from("orders").select("customer_id").not("customer_id", "is", null);
    if (state.lastOrderFrom) oq = oq.gte("scheduled_date", state.lastOrderFrom);
    if (state.lastOrderTo) oq = oq.lte("scheduled_date", state.lastOrderTo);
    const { data } = await oq;
    idFilterSets.push(Array.from(new Set((data ?? []).map((r) => r.customer_id).filter((v): v is string => Boolean(v)))));
  }

  if (state.openInvoices) {
    const { data } = await supabase
      .from("invoices")
      .select("customer_id")
      .eq("kind", "rechnung")
      .in("status", ["entwurf", "versendet"])
      .not("customer_id", "is", null);
    idFilterSets.push(Array.from(new Set((data ?? []).map((r) => r.customer_id).filter((v): v is string => Boolean(v)))));
  }

  if (state.openQuotes) {
    const { data } = await supabase
      .from("invoices")
      .select("customer_id")
      .eq("kind", "angebot")
      .in("status", ["entwurf", "versendet"])
      .not("customer_id", "is", null);
    idFilterSets.push(Array.from(new Set((data ?? []).map((r) => r.customer_id).filter((v): v is string => Boolean(v)))));
  }

  let restrictedIds: string[] | null = null;
  if (idFilterSets.length > 0) {
    restrictedIds = idFilterSets[0];
    for (let i = 1; i < idFilterSets.length; i++) {
      const set = new Set(idFilterSets[i]);
      restrictedIds = restrictedIds.filter((id) => set.has(id));
    }
  }

  let customers: Array<{
    id: string;
    kind: string;
    status: string;
    name: string;
    company_name: string | null;
    customer_number: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    tags: string[] | null;
    is_favorite: boolean;
    assigned_employee_id: string | null;
  }> = [];
  let error: { message: string } | null = null;
  let totalFilteredCount = 0;

  const from = (state.page - 1) * state.pageSize;
  const to = from + state.pageSize - 1;

  if (restrictedIds && restrictedIds.length === 0) {
    customers = [];
  } else {
    let query = supabase
      .from("customers")
      .select(
        "id, kind, status, name, company_name, customer_number, email, phone, city, tags, is_favorite, assigned_employee_id",
        { count: "exact" },
      )
      .order(state.sort, { ascending: state.dir === "asc" })
      .range(from, to);

    if (state.kind.length > 0) {
      query = query.in("kind", state.kind);
    }
    if (state.status.length > 0) {
      query = query.in("status", state.status);
    }
    if (state.q) {
      const term = state.q.replace(/[%,()]/g, " ");
      query = query.or(
        `name.ilike.%${term}%,company_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,customer_number.ilike.%${term}%`,
      );
    }
    if (state.city) {
      const term = state.city.replace(/[%,()]/g, " ");
      query = query.or(`city.ilike.%${term}%,postal_code.ilike.%${term}%`);
    }
    if (state.employee) {
      query = query.eq("assigned_employee_id", state.employee);
    }
    if (state.createdFrom) {
      query = query.gte("created_at", state.createdFrom);
    }
    if (state.createdTo) {
      query = query.lte("created_at", `${state.createdTo}T23:59:59`);
    }
    if (state.maintenance) {
      query = query.contains("tags", [MAINTENANCE_CONTRACT_TAG]);
    }
    if (restrictedIds) {
      query = query.in("id", restrictedIds);
    }

    const res = await query;
    customers = res.data ?? [];
    error = res.error;
    totalFilteredCount = res.count ?? customers.length;
  }

  // Zusatzdaten für die Tabellenspalten (Verantwortlicher, Letzter Auftrag,
  // Umsatz, primärer Ansprechpartner) werden bewusst nur für die Kunden der
  // aktuellen Seite geladen – nicht für die gesamte (ggf. gefilterte)
  // Ergebnismenge, damit die Anfragen unabhängig von der Kundenzahl klein
  // bleiben.
  const pageIds = customers.map((c) => c.id);
  const employeeNameById = Object.fromEntries((employees ?? []).map((e) => [e.id, e.full_name]));

  const lastOrderByCustomer: Record<string, string> = {};
  const revenueByCustomer: Record<string, number> = {};
  const primaryContactByCustomer: Record<string, string> = {};

  if (pageIds.length > 0) {
    const [ordersRes, invoicesRes, contactsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("customer_id, scheduled_date")
        .in("customer_id", pageIds)
        .not("scheduled_date", "is", null),
      supabase
        .from("invoices")
        .select("id, customer_id")
        .in("customer_id", pageIds)
        .eq("kind", "rechnung")
        .eq("status", "bezahlt"),
      supabase
        .from("customer_contacts")
        .select("customer_id, name")
        .in("customer_id", pageIds)
        .eq("is_primary", true),
    ]);

    for (const row of ordersRes.data ?? []) {
      if (!row.customer_id || !row.scheduled_date) continue;
      const current = lastOrderByCustomer[row.customer_id];
      if (!current || row.scheduled_date > current) {
        lastOrderByCustomer[row.customer_id] = row.scheduled_date;
      }
    }

    const paidInvoiceIds = (invoicesRes.data ?? []).map((inv) => inv.id);
    const invoiceCustomerById = Object.fromEntries(
      (invoicesRes.data ?? []).map((inv) => [inv.id, inv.customer_id]),
    );

    if (paidInvoiceIds.length > 0) {
      const { data: items } = await supabase
        .from("invoice_items")
        .select("invoice_id, quantity, unit_price")
        .in("invoice_id", paidInvoiceIds);

      for (const item of items ?? []) {
        const customerId = invoiceCustomerById[item.invoice_id];
        if (!customerId) continue;
        revenueByCustomer[customerId] =
          (revenueByCustomer[customerId] ?? 0) + Number(item.quantity) * Number(item.unit_price);
      }
    }

    for (const row of contactsRes.data ?? []) {
      primaryContactByCustomer[row.customer_id] = row.name;
    }
  }

  const customerRows: CustomerRow[] = customers.map((c) => ({
    ...c,
    employeeName: c.assigned_employee_id ? employeeNameById[c.assigned_employee_id] ?? null : null,
    lastOrderDate: lastOrderByCustomer[c.id] ?? null,
    revenue: revenueByCustomer[c.id] ?? 0,
    primaryContactName: primaryContactByCustomer[c.id] ?? null,
  }));

  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / state.pageSize));
  const rangeStart = totalFilteredCount === 0 ? 0 : from + 1;
  const rangeEnd = Math.min(from + customers.length, totalFilteredCount);

  const sortHrefs = Object.fromEntries(
    ["name", "customer_number", "kind", "status", "city"].map((col) => [col, buildSortHref(state, col)]),
  );

  const activeCount =
    state.kind.length +
    state.status.length +
    (state.city ? 1 : 0) +
    (state.employee ? 1 : 0) +
    (state.createdFrom ? 1 : 0) +
    (state.createdTo ? 1 : 0) +
    (state.lastOrderFrom ? 1 : 0) +
    (state.lastOrderTo ? 1 : 0) +
    (state.openInvoices ? 1 : 0) +
    (state.openQuotes ? 1 : 0) +
    (state.maintenance ? 1 : 0);

  const hasAnyFilter = activeCount > 0 || Boolean(state.q);
  const employeeName = state.employee ? (employees ?? []).find((e) => e.id === state.employee)?.full_name ?? "Unbekannt" : "";

  type Chip = { key: string; label: string; href: string };
  const chips: Chip[] = [
    ...state.kind.map((k) => ({
      key: `kind-${k}`,
      label: `Art: ${CUSTOMER_KIND_LABELS[k] ?? k}`,
      href: buildHref({ ...state, kind: state.kind.filter((x) => x !== k) }),
    })),
    ...state.status.map((s) => ({
      key: `status-${s}`,
      label: `Status: ${CUSTOMER_STATUS_LABELS[s] ?? s}`,
      href: buildHref({ ...state, status: state.status.filter((x) => x !== s) }),
    })),
    ...(state.city
      ? [{ key: "city", label: `Ort/PLZ: ${state.city}`, href: buildHref({ ...state, city: "" }) }]
      : []),
    ...(state.employee
      ? [{ key: "employee", label: `Mitarbeiter: ${employeeName}`, href: buildHref({ ...state, employee: "" }) }]
      : []),
    ...(state.createdFrom
      ? [{ key: "createdFrom", label: `Erstellt ab ${formatDate(state.createdFrom)}`, href: buildHref({ ...state, createdFrom: "" }) }]
      : []),
    ...(state.createdTo
      ? [{ key: "createdTo", label: `Erstellt bis ${formatDate(state.createdTo)}`, href: buildHref({ ...state, createdTo: "" }) }]
      : []),
    ...(state.lastOrderFrom
      ? [{ key: "lastOrderFrom", label: `Letzter Auftrag ab ${formatDate(state.lastOrderFrom)}`, href: buildHref({ ...state, lastOrderFrom: "" }) }]
      : []),
    ...(state.lastOrderTo
      ? [{ key: "lastOrderTo", label: `Letzter Auftrag bis ${formatDate(state.lastOrderTo)}`, href: buildHref({ ...state, lastOrderTo: "" }) }]
      : []),
    ...(state.openInvoices
      ? [{ key: "openInvoices", label: "Offene Rechnungen", href: buildHref({ ...state, openInvoices: false }) }]
      : []),
    ...(state.openQuotes
      ? [{ key: "openQuotes", label: "Offene Angebote", href: buildHref({ ...state, openQuotes: false }) }]
      : []),
    ...(state.maintenance
      ? [{ key: "maintenance", label: "Wartungsvertrag", href: buildHref({ ...state, maintenance: false }) }]
      : []),
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kundenverwaltung</h1>
          <p className="mt-1 text-sm text-muted">
            {totalFilteredCount} Kunde{totalFilteredCount === 1 ? "" : "n"}
          </p>
        </div>
        <Link
          href="/kunden/neu"
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
        >
          <UserPlus className="h-4 w-4" />
          Neuer Kunde
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-2.5 text-xs text-muted">{kpi.label}</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums">{kpi.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <form method="GET" action="/kunden" className="flex max-w-xl flex-1 flex-wrap gap-3">
          {state.kind.map((k) => (
            <input key={k} type="hidden" name="kind" value={k} />
          ))}
          {state.status.map((s) => (
            <input key={s} type="hidden" name="status" value={s} />
          ))}
          {state.city && <input type="hidden" name="city" value={state.city} />}
          {state.employee && <input type="hidden" name="employee" value={state.employee} />}
          {state.createdFrom && <input type="hidden" name="createdFrom" value={state.createdFrom} />}
          {state.createdTo && <input type="hidden" name="createdTo" value={state.createdTo} />}
          {state.lastOrderFrom && <input type="hidden" name="lastOrderFrom" value={state.lastOrderFrom} />}
          {state.lastOrderTo && <input type="hidden" name="lastOrderTo" value={state.lastOrderTo} />}
          {state.openInvoices && <input type="hidden" name="openInvoices" value="1" />}
          {state.openQuotes && <input type="hidden" name="openQuotes" value="1" />}
          {state.maintenance && <input type="hidden" name="maintenance" value="1" />}
          {state.view !== "list" && <input type="hidden" name="view" value={state.view} />}
          {state.pageSize !== 25 && <input type="hidden" name="pageSize" value={state.pageSize} />}
          {state.sort !== "created_at" && <input type="hidden" name="sort" value={state.sort} />}
          {state.dir !== "desc" && <input type="hidden" name="dir" value={state.dir} />}
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              name="q"
              defaultValue={state.q}
              placeholder="Suche nach Name, Firma, E-Mail, Telefon, Kundennummer…"
              className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-base outline-none focus:border-brand sm:text-sm"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-background sm:py-2"
          >
            <Search className="h-4 w-4" />
            Suchen
          </button>
        </form>

        <CustomerFilterPanel
          q={state.q}
          view={state.view}
          kinds={CUSTOMER_KINDS}
          kindLabels={CUSTOMER_KIND_LABELS}
          statuses={CUSTOMER_STATUSES}
          statusLabels={CUSTOMER_STATUS_LABELS}
          employees={employees ?? []}
          initial={state}
          activeCount={activeCount}
          listHref={buildHref({ ...state, view: "list" })}
          gridHref={buildHref({ ...state, view: "grid" })}
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
          <Link href="/kunden" className="flex items-center px-2 py-1 text-xs font-medium text-muted hover:text-foreground">
            Alle zurücksetzen
          </Link>
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Kunden konnten nicht geladen werden: {error.message}
        </p>
      )}

      {!error && customers.length === 0 && totalFilteredCount > 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-muted">Diese Seite enthält keine Kunden mehr.</p>
          <Link href={buildHref({ ...state, page: 1 })} className="mt-3 inline-block text-sm font-medium text-brand">
            Zurück zur ersten Seite
          </Link>
        </div>
      )}

      {!error && totalFilteredCount === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-muted">
            {hasAnyFilter ? "Keine Kunden gefunden." : "Noch keine Kunden angelegt."}
          </p>
          {hasAnyFilter ? (
            <Link href="/kunden" className="mt-3 inline-block text-sm font-medium text-brand">
              Filter zurücksetzen
            </Link>
          ) : (
            <Link href="/kunden/neu" className="mt-3 inline-block text-sm font-medium text-brand">
              Ersten Kunden anlegen
            </Link>
          )}
        </div>
      )}

      {customers.length > 0 && state.view === "list" && (
        <CustomerTable
          customers={customerRows}
          sortHrefs={sortHrefs}
          currentSort={state.sort}
          currentDir={state.dir}
        />
      )}

      {customers.length > 0 && state.view === "grid" && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((customer) => (
            <Link
              key={customer.id}
              href={`/kunden/${customer.id}`}
              className="rounded-2xl border border-border bg-card p-4 transition hover:border-brand/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-foreground">{customer.name}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CUSTOMER_STATUS_BADGE_CLASS[customer.status] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {CUSTOMER_STATUS_LABELS[customer.status] ?? customer.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {CUSTOMER_KIND_LABELS[customer.kind] ?? customer.kind}
                {customer.customer_number ? ` · Nr. ${customer.customer_number}` : ""}
              </p>
              <div className="mt-3 space-y-1 text-sm text-muted">
                <p>{customer.email || customer.phone || "—"}</p>
                <p>{customer.city || "—"}</p>
              </div>
              {customer.tags && customer.tags.length > 0 && (
                <p className="mt-2 text-xs text-muted">{customer.tags.join(" · ")}</p>
              )}
            </Link>
          ))}
        </div>
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
    </div>
  );
}
