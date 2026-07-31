import Link from "next/link";
import { Search, UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CustomerFilterPanel } from "@/components/dashboard/CustomerFilterPanel";
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
};

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
  const qs = params.toString();
  return qs ? `/kunden?${qs}` : "/kunden";
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
  };

  const { data: employees } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name", { ascending: true });

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
  }> = [];
  let error: { message: string } | null = null;

  if (restrictedIds && restrictedIds.length === 0) {
    customers = [];
  } else {
    let query = supabase
      .from("customers")
      .select("id, kind, status, name, company_name, customer_number, email, phone, city, tags")
      .order("created_at", { ascending: false });

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
  }

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
            {customers.length} Kunde{customers.length === 1 ? "" : "n"}
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

      {!error && customers.length === 0 && (
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
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Kunde</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Nr.</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Art</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Kontakt</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Ort</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/kunden/${customer.id}`}
                      className="font-medium text-foreground hover:text-brand"
                    >
                      {customer.name}
                    </Link>
                    {customer.tags && customer.tags.length > 0 && (
                      <p className="mt-0.5 text-xs text-muted">{customer.tags.join(" · ")}</p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">{customer.customer_number ?? "—"}</td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    {CUSTOMER_KIND_LABELS[customer.kind] ?? customer.kind}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${CUSTOMER_STATUS_BADGE_CLASS[customer.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {CUSTOMER_STATUS_LABELS[customer.status] ?? customer.status}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    {customer.email || customer.phone || "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">{customer.city || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}
