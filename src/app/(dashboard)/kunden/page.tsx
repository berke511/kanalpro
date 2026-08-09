import Link from "next/link";
import { Building2, ClipboardList, Clock, FileText, Receipt, Star, TrendingUp, UserPlus, Users, Wrench, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatEuro } from "@/lib/format";
import {
  addCustomerNote,
  addCustomerProperty,
  deleteCustomerDocument,
  deleteCustomerProperty,
  uploadCustomerDocument,
} from "@/app/(dashboard)/kunden/actions";
import { CustomerFilterPanel } from "@/components/dashboard/CustomerFilterPanel";
import { CustomerSearchInput } from "@/components/dashboard/CustomerSearchInput";
import { CustomerTable, type CustomerRow } from "@/components/dashboard/CustomerTable";
import { CustomerDetailPanel, type CustomerDetailPanelData, type PanelTabKey } from "@/components/dashboard/CustomerDetailPanel";
import { PageSizeSelect } from "@/components/dashboard/PageSizeSelect";
import {
  CUSTOMER_KINDS,
  CUSTOMER_KIND_LABELS,
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_BADGE_CLASS,
  CUSTOMER_STATUS_LABELS,
  MAINTENANCE_CONTRACT_TAG,
  isCompanyKind,
} from "@/lib/customers";

const PANEL_TABS: readonly PanelTabKey[] = ["uebersicht", "stammdaten", "objekte", "dokumente", "aktivitaeten"];

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
  archived?: string;
  view?: string;
  page?: string;
  pageSize?: string;
  sort?: string;
  dir?: string;
  panel?: string;
  panelTab?: string;
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
  archived: boolean;
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
  if (state.archived) params.set("archived", "1");
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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
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
    archived: raw.archived === "1",
    view: raw.view === "grid" ? "grid" : raw.view === "compact" ? "compact" : "list",
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
    { label: "Gesamte Kunden", value: totalCount ?? 0, icon: Users, gradient: "from-blue-400 to-blue-700" },
    { label: "Neukunden", value: neukundenCount ?? 0, icon: UserPlus, gradient: "from-emerald-400 to-emerald-700" },
    { label: "Aktive Kunden", value: (bestandskundenCount ?? 0) + (wartungskundenCount ?? 0), icon: ClipboardList, gradient: "from-indigo-400 to-indigo-700" },
    { label: "Wartungsverträge", value: maintenanceCount ?? 0, icon: Wrench, gradient: "from-teal-400 to-teal-700" },
    { label: "Offene Angebote", value: openQuotesCount ?? 0, icon: FileText, gradient: "from-slate-400 to-slate-700" },
    { label: "Offene Rechnungen", value: openInvoicesCount ?? 0, icon: Receipt, gradient: "from-amber-400 to-amber-700" },
  ];

  // Zusätzliche, unternehmensweite Kennzahlen für die Seitenleiste (Top-
  // Kunden nach Umsatz, neueste Kunden) – bewusst unabhängig von der
  // aktuellen Such-/Filteransicht, gleiches Prinzip wie die KPI-Kacheln
  // oben. Umsatzberechnung folgt demselben Muster wie in
  // rechnungen/statistiken/page.tsx (bezahlte Rechnungen, laufendes Jahr).
  const yearStart = `${new Date().getUTCFullYear()}-01-01`;
  const [{ data: revenueInvoices }, { data: revenueItems }, { data: newestCustomers }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, customer_id, customers(name, company_name), status, kind, issue_date, payment_date")
      .eq("kind", "rechnung")
      .eq("status", "bezahlt")
      .eq("is_archived", false),
    supabase.from("invoice_items").select("invoice_id, quantity, unit_price"),
    supabase
      .from("customers")
      .select("id, name, company_name, created_at")
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const revenueItemsByInvoice = new Map<string, number>();
  for (const it of revenueItems ?? []) {
    revenueItemsByInvoice.set(
      it.invoice_id,
      (revenueItemsByInvoice.get(it.invoice_id) ?? 0) + Number(it.quantity) * Number(it.unit_price),
    );
  }
  const revenueByCustomerName = new Map<string, number>();
  for (const inv of revenueInvoices ?? []) {
    const d = inv.payment_date ?? inv.issue_date;
    if (!d || d < yearStart) continue;
    const c = inv.customers as { name: string | null; company_name: string | null } | null;
    const label = c?.company_name?.trim() || c?.name?.trim() || "Unbekannt";
    revenueByCustomerName.set(label, (revenueByCustomerName.get(label) ?? 0) + (revenueItemsByInvoice.get(inv.id) ?? 0));
  }
  const topCustomers = Array.from(revenueByCustomerName.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Subquery-basierte Schnittmengenfilter: Letzter Auftrag, offene
  // Rechnungen/Angebote. Jede aktive Bedingung liefert eine Menge von
  // Kunden-IDs; die Ergebnismenge ist die Schnittmenge aller aktiven
  // Bedingungen.
  const idFilterSets: string[][] = [];

  // Suche: kombiniert Treffer direkt auf dem Kundendatensatz (Name, Firma,
  // E-Mail, Telefon, Kundennummer) mit Treffern auf zugeordneten
  // Ansprechpartnern (customer_contacts.name) – innerhalb der Suche als
  // Vereinigung (ein Treffer in irgendeinem Feld reicht), kombiniert mit den
  // übrigen Filtern über die bestehende Schnittmengen-Logik.
  if (state.q) {
    const term = state.q.replace(/[%,()]/g, " ");
    const [directRes, contactsRes] = await Promise.all([
      supabase
        .from("customers")
        .select("id")
        .or(
          `name.ilike.%${term}%,company_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,customer_number.ilike.%${term}%`,
        ),
      supabase.from("customer_contacts").select("customer_id").ilike("name", `%${term}%`),
    ]);
    const directIds = (directRes.data ?? []).map((r) => r.id);
    const contactIds = (contactsRes.data ?? [])
      .map((r) => r.customer_id)
      .filter((v): v is string => Boolean(v));
    idFilterSets.push(Array.from(new Set([...directIds, ...contactIds])));
  }

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
    is_archived: boolean;
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
        "id, kind, status, name, company_name, customer_number, email, phone, city, tags, is_favorite, is_archived, assigned_employee_id",
        { count: "exact" },
      )
      .order(state.sort, { ascending: state.dir === "asc" })
      .range(from, to);

    if (!state.archived) {
      query = query.eq("is_archived", false);
    }
    if (state.kind.length > 0) {
      query = query.in("kind", state.kind);
    }
    if (state.status.length > 0) {
      query = query.in("status", state.status);
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
    (state.maintenance ? 1 : 0) +
    (state.archived ? 1 : 0);

  // Rechtes Detailpanel: wird über die Query-Parameter "panel" (Kunden-ID)
  // und "panelTab" gesteuert, damit ein Kunde geöffnet werden kann, ohne die
  // Kundenliste zu verlassen (Zurück-Button/direkter Link funktionieren
  // dadurch weiterhin normal). "listQueryString" ist der aktuelle Filter-/
  // Sortier-/Seitenzustand ohne Panel-Parameter – Grundlage für alle
  // Panel-bezogenen Links (öffnen, Tab wechseln, schließen).
  const listQueryString = buildHref(state).split("?")[1] ?? "";
  const panelId = raw.panel && raw.panel.trim().length > 0 ? raw.panel.trim() : null;
  const panelTab: PanelTabKey = PANEL_TABS.includes(raw.panelTab as PanelTabKey) ? (raw.panelTab as PanelTabKey) : "uebersicht";

  function panelHref(customerId: string, tab: PanelTabKey = "uebersicht") {
    const params = new URLSearchParams(listQueryString);
    params.set("panel", customerId);
    if (tab !== "uebersicht") params.set("panelTab", tab);
    else params.delete("panelTab");
    return `/kunden?${params.toString()}`;
  }

  function panelCloseHref() {
    const params = new URLSearchParams(listQueryString);
    params.delete("panel");
    params.delete("panelTab");
    const qs = params.toString();
    return qs ? `/kunden?${qs}` : "/kunden";
  }

  let panelData: CustomerDetailPanelData | null = null;

  if (panelId) {
    const { data: panelCustomer } = await supabase.from("customers").select("*").eq("id", panelId).maybeSingle();

    if (panelCustomer) {
      const returnTo = panelHref(panelId, panelTab);

      const [{ data: primaryContactRow }, { count: objectsCount }, { data: invoiceRows }, { data: lastOrderRows }] =
        await Promise.all([
          supabase
            .from("customer_contacts")
            .select("name, role, phone, email")
            .eq("customer_id", panelId)
            .eq("is_primary", true)
            .maybeSingle(),
          supabase.from("customer_properties").select("id", { count: "exact", head: true }).eq("customer_id", panelId),
          supabase.from("invoices").select("id, kind, status").eq("customer_id", panelId),
          supabase
            .from("orders")
            .select("scheduled_date")
            .eq("customer_id", panelId)
            .not("scheduled_date", "is", null)
            .order("scheduled_date", { ascending: false })
            .limit(1),
        ]);

      const quotesCount = (invoiceRows ?? []).filter((i) => i.kind === "angebot").length;
      const invoicesCount = (invoiceRows ?? []).filter((i) => i.kind === "rechnung").length;
      const paidInvoiceIds = (invoiceRows ?? [])
        .filter((i) => i.kind === "rechnung" && i.status === "bezahlt")
        .map((i) => i.id);

      let revenue = 0;
      if (paidInvoiceIds.length > 0) {
        const { data: items } = await supabase
          .from("invoice_items")
          .select("quantity, unit_price")
          .in("invoice_id", paidInvoiceIds);
        revenue = (items ?? []).reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
      }

      let properties: CustomerDetailPanelData["properties"] = [];
      let documents: CustomerDetailPanelData["documents"] = [];
      let activity: CustomerDetailPanelData["activity"] = [];

      if (panelTab === "objekte") {
        const { data } = await supabase
          .from("customer_properties")
          .select("id, name, street, postal_code, city, notes")
          .eq("customer_id", panelId)
          .order("created_at", { ascending: true });
        properties = (data ?? []).map((p) => ({
          ...p,
          deleteAction: deleteCustomerProperty.bind(null, panelId, p.id, returnTo),
        }));
      }

      if (panelTab === "dokumente") {
        const { data } = await supabase
          .from("customer_documents")
          .select("id, file_name, storage_path, size_bytes, created_at")
          .eq("customer_id", panelId)
          .order("created_at", { ascending: false });
        const docs = data ?? [];
        let urlByPath: Record<string, string> = {};
        if (docs.length > 0) {
          const { data: signed } = await supabase.storage
            .from("customer-documents")
            .createSignedUrls(docs.map((d) => d.storage_path), 60 * 10);
          urlByPath = Object.fromEntries((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]).filter(([p]) => p));
        }
        documents = docs.map((d) => ({
          ...d,
          url: urlByPath[d.storage_path] ?? null,
          deleteAction: deleteCustomerDocument.bind(null, panelId, d.id, d.storage_path, returnTo),
        }));
      }

      if (panelTab === "aktivitaeten") {
        const [{ data: noteData }, { data: auditData }] = await Promise.all([
          supabase
            .from("customer_notes")
            .select("id, note, created_at, author_id")
            .eq("customer_id", panelId)
            .order("created_at", { ascending: false }),
          supabase
            .from("customer_audit_log")
            .select("id, action, summary, created_at, actor_id")
            .eq("customer_id", panelId)
            .order("created_at", { ascending: false }),
        ]);
        const authorIds = Array.from(
          new Set(
            [...(noteData ?? []).map((n) => n.author_id), ...(auditData ?? []).map((a) => a.actor_id)].filter(
              Boolean,
            ) as string[],
          ),
        );
        let authorNames: Record<string, string> = {};
        if (authorIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", authorIds);
          authorNames = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name ?? "Unbekannt"]));
        }
        const noteItems = (noteData ?? []).map((n) => ({
          id: `note-${n.id}`,
          kind: "note" as const,
          text: n.note,
          authorName: n.author_id ? authorNames[n.author_id] ?? "Unbekannt" : "Unbekannt",
          createdAt: n.created_at,
        }));
        const auditItems = (auditData ?? []).map((a) => ({
          id: `audit-${a.id}`,
          kind: "audit" as const,
          text: `${a.action === "created" ? "Angelegt" : a.action === "updated" ? "Aktualisiert" : "Gelöscht"}${a.summary ? ` – ${a.summary}` : ""}`,
          authorName: a.actor_id ? authorNames[a.actor_id] ?? "Unbekannt" : "Unbekannt",
          createdAt: a.created_at,
        }));
        activity = [...noteItems, ...auditItems].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      }

      panelData = {
        customer: panelCustomer,
        employeeName: panelCustomer.assigned_employee_id
          ? employeeNameById[panelCustomer.assigned_employee_id] ?? null
          : null,
        primaryContact: primaryContactRow ?? null,
        kpis: {
          objectsCount: objectsCount ?? 0,
          revenue,
          quotesCount,
          invoicesCount,
          lastOrderDate: lastOrderRows?.[0]?.scheduled_date ?? null,
        },
        activeTab: panelTab,
        properties,
        documents,
        activity,
        hrefs: {
          close: panelCloseHref(),
          tabs: Object.fromEntries(PANEL_TABS.map((t) => [t, panelHref(panelId, t)])) as Record<PanelTabKey, string>,
          fullProfile: `/kunden/${panelId}`,
          editCustomer: `/kunden/${panelId}?tab=allgemein`,
          newOrder: `/auftraege/neu?customer_id=${panelId}`,
          newQuote: `/rechnungen/neu?customer_id=${panelId}&kind=angebot`,
          newInvoice: `/rechnungen/neu?customer_id=${panelId}&kind=rechnung`,
        },
        addPropertyAction: addCustomerProperty.bind(null, panelId, returnTo),
        addNoteAction: addCustomerNote.bind(null, panelId, returnTo),
        uploadDocumentAction: uploadCustomerDocument.bind(null, panelId, returnTo),
      };
    }
  }

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
    ...(state.archived
      ? [{ key: "archived", label: "Inkl. archivierte Kunden", href: buildHref({ ...state, archived: false }) }]
      : []),
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#3a63ff] via-[#3151e6] to-[#5b3ec9] px-6 py-6 text-white shadow-lg shadow-brand/25 sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/20 blur-2xl" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Kundenverwaltung</h1>
            <p className="mt-1 text-sm text-white/80">
              {totalFilteredCount} Kunde{totalFilteredCount === 1 ? "" : "n"}
            </p>
          </div>
          <Link
            href="/kunden/neu"
            className="flex items-center gap-1.5 rounded-[11px] bg-white px-4 py-2.5 text-sm font-bold text-brand-dark shadow-md hover:bg-white/90"
          >
            <UserPlus className="h-4 w-4" />
            Neuer Kunde
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-2xl border border-border bg-card p-[15px] shadow-sm">
              <span className={`flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br ${kpi.gradient} text-white shadow-md`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-2.5 text-xl font-bold tabular-nums tracking-tight">{kpi.value}</p>
              <p className="mt-0.5 text-[10.5px] text-muted-2">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="min-w-0 lg:col-span-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex max-w-xl flex-1 flex-wrap gap-3">
          <CustomerSearchInput initialQuery={state.q} />
        </div>

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
          compactHref={buildHref({ ...state, view: "compact" })}
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

      {customers.length > 0 && (state.view === "list" || state.view === "compact") && (
        <CustomerTable
          customers={customerRows}
          sortHrefs={sortHrefs}
          currentSort={state.sort}
          currentDir={state.dir}
          panelBaseQuery={listQueryString}
          density={state.view === "compact" ? "compact" : "comfortable"}
          employees={employees ?? []}
          showingArchived={state.archived}
        />
      )}

      {customers.length > 0 && state.view === "grid" && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {customerRows.map((customer) => {
            const isCompany = isCompanyKind(customer.kind);
            return (
              <Link
                key={customer.id}
                href={panelHref(customer.id)}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-brand/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-700 text-xs font-semibold text-white shadow-sm">
                      {isCompany ? <Building2 className="h-4 w-4" /> : initials(customer.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{customer.name}</p>
                      <p className="truncate text-xs text-muted">
                        {customer.primaryContactName || CUSTOMER_KIND_LABELS[customer.kind] || customer.kind}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {customer.is_favorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${CUSTOMER_STATUS_BADGE_CLASS[customer.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {CUSTOMER_STATUS_LABELS[customer.status] ?? customer.status}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted">
                  {customer.customer_number ? `Nr. ${customer.customer_number} · ` : ""}
                  {customer.email || customer.phone || "—"}
                  {customer.city ? ` · ${customer.city}` : ""}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
                  <span>Letzter Auftrag: {customer.lastOrderDate ? formatDate(customer.lastOrderDate) : "—"}</span>
                  <span className="font-medium text-foreground">
                    {customer.revenue > 0 ? formatEuro(customer.revenue) : "—"}
                  </span>
                </div>
              </Link>
            );
          })}
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

      <aside className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-sm font-semibold">Top-Kunden nach Umsatz</h2>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-2">Laufendes Jahr</p>
          {topCustomers.length === 0 ? (
            <p className="mt-4 text-xs text-muted">Noch keine bezahlten Rechnungen in diesem Jahr.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {topCustomers.map(([name, revenue], index) => (
                <li key={name} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand-dark">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{name}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {formatEuro(revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-gradient-to-br from-indigo-400 to-indigo-600 text-white shadow-sm">
              <Clock className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-sm font-semibold">Neueste Kunden</h2>
          </div>
          {(newestCustomers ?? []).length === 0 ? (
            <p className="mt-4 text-xs text-muted">Noch keine Kunden angelegt.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {(newestCustomers ?? []).map((c) => {
                const label = c.company_name?.trim() || c.name;
                return (
                  <li key={c.id}>
                    <Link href={panelHref(c.id)} className="flex items-center gap-2.5 group">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-700 text-[11px] font-semibold text-white shadow-sm">
                        {initials(label)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground group-hover:text-brand">{label}</p>
                        <p className="text-[11px] text-muted-2">{formatDate(c.created_at.slice(0, 10))}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
      </div>

      {panelData && <CustomerDetailPanel data={panelData} />}
    </div>
  );
}
