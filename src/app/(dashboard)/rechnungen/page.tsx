import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { canCreateOrdersAndLinkCommercialDocuments } from "@/lib/roles";
import { monthRangeBerlin, todayBerlinISO } from "@/lib/date";
import { formatEuro } from "@/lib/format";
import {
  ALL_STATUSES,
  BILL_OPEN_STATUSES,
  QUOTE_PENDING_STATUSES,
  calculateTotals,
  daysBetweenISO,
  effectiveStatus,
} from "@/lib/invoices";
import { InvoiceTable, type InvoiceRow } from "@/components/dashboard/InvoiceTable";
import { InvoiceFilterPanel } from "@/components/dashboard/InvoiceFilterPanel";
import { InvoiceDetailPanel, type InvoiceDetailPanelData, type PanelTabKey } from "@/components/dashboard/InvoiceDetailPanel";
import { CustomerPreviewPanel, type CustomerPreviewData } from "@/components/dashboard/CustomerPreviewPanel";
import { RemindersWidget, type ReminderItem } from "@/components/dashboard/RemindersWidget";
import { InvoiceEmptyState } from "@/components/dashboard/InvoiceEmptyState";
import {
  addInvoiceItem,
  archiveInvoice,
  assignInvoice,
  convertQuoteToInvoice,
  deleteInvoice,
  deleteInvoiceItem,
  duplicateInvoice,
  increaseDunningLevel,
  markInvoiceViewed,
  recordPayment,
  sendInvoice,
  setInvoiceStatus,
  updateInvoice,
  updateInvoiceItem,
} from "./actions";

const PANEL_TABS: readonly PanelTabKey[] = ["uebersicht", "positionen", "verlauf", "zahlung"];

type RawSearchParams = {
  q?: string;
  kind?: string;
  status?: string | string[];
  customer?: string;
  assignedTo?: string;
  order?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: string;
  amountMax?: string;
  paidOnly?: string;
  overdueOnly?: string;
  archived?: string;
  panel?: string;
  panelTab?: string;
  customerPreview?: string;
  error?: string;
  message?: string;
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function RechnungenPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getOrCreateProfile(supabase, user);
  if (!profile) return null;

  const role = profile.role ?? null;
  const canManage = canCreateOrdersAndLinkCommercialDocuments(role);
  const today = todayBerlinISO();

  const q = (raw.q ?? "").trim().toLowerCase();
  const kindFilter = raw.kind === "angebot" || raw.kind === "rechnung" ? raw.kind : "";
  const statusFilter = toArray(raw.status).filter((s) => ALL_STATUSES.includes(s));
  const customerFilter = (raw.customer ?? "").trim();
  const assignedToFilter = (raw.assignedTo ?? "").trim();
  const orderFilter = (raw.order ?? "").trim();
  const paymentMethodFilter = (raw.paymentMethod ?? "").trim();
  const dateFrom = (raw.dateFrom ?? "").trim();
  const dateTo = (raw.dateTo ?? "").trim();
  const amountMin = (raw.amountMin ?? "").trim();
  const amountMax = (raw.amountMax ?? "").trim();
  const paidOnly = raw.paidOnly === "1";
  const overdueOnly = raw.overdueOnly === "1";
  const showArchived = raw.archived === "1";

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (kindFilter) baseParams.set("kind", kindFilter);
  statusFilter.forEach((s) => baseParams.append("status", s));
  if (customerFilter) baseParams.set("customer", customerFilter);
  if (assignedToFilter) baseParams.set("assignedTo", assignedToFilter);
  if (orderFilter) baseParams.set("order", orderFilter);
  if (paymentMethodFilter) baseParams.set("paymentMethod", paymentMethodFilter);
  if (dateFrom) baseParams.set("dateFrom", dateFrom);
  if (dateTo) baseParams.set("dateTo", dateTo);
  if (amountMin) baseParams.set("amountMin", amountMin);
  if (amountMax) baseParams.set("amountMax", amountMax);
  if (paidOnly) baseParams.set("paidOnly", "1");
  if (overdueOnly) baseParams.set("overdueOnly", "1");
  if (showArchived) baseParams.set("archived", "1");
  const baseQuery = baseParams.toString();

  function panelHref(id: string, tab: PanelTabKey = "uebersicht") {
    const params = new URLSearchParams(baseQuery);
    params.set("panel", id);
    if (tab !== "uebersicht") params.set("panelTab", tab);
    else params.delete("panelTab");
    return `/rechnungen?${params.toString()}`;
  }
  function panelCloseHref() {
    const params = new URLSearchParams(baseQuery);
    params.delete("panel");
    params.delete("panelTab");
    const qs = params.toString();
    return qs ? `/rechnungen?${qs}` : "/rechnungen";
  }
  function customerPreviewCloseHref() {
    const params = new URLSearchParams(baseQuery);
    params.delete("customerPreview");
    const qs = params.toString();
    return qs ? `/rechnungen?${qs}` : "/rechnungen";
  }
  function kindHref(nextKind: string) {
    const params = new URLSearchParams(baseQuery);
    if (nextKind) params.set("kind", nextKind);
    else params.delete("kind");
    params.delete("panel");
    params.delete("panelTab");
    const qs = params.toString();
    return qs ? `/rechnungen?${qs}` : "/rechnungen";
  }

  const [{ data: companyRow }, { data: invoicesRaw }, { data: itemsRaw }, { data: employeesRaw }, { data: customersRaw }, { data: ordersRaw }] = await Promise.all([
    supabase.from("companies").select("name").eq("id", profile.company_id).maybeSingle(),
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, kind, status, customer_id, order_id, assigned_to, issue_date, due_date, valid_until, tax_rate, payment_method, payment_date, paid_amount, sent_at, viewed_at, dunning_level, is_archived, notes, source_quote_id, converted_to_invoice_id, customers(name, email, phone, contact_person, street, postal_code, city), orders(title)",
      )
      .order("issue_date", { ascending: false }),
    supabase.from("invoice_items").select("id, invoice_id, description, quantity, unit_price, position"),
    supabase.from("profiles").select("id, full_name, is_archived").order("full_name", { ascending: true }),
    supabase.from("customers").select("id, name").order("name", { ascending: true }),
    supabase.from("orders").select("id, title, customer_id, status").order("created_at", { ascending: false }),
  ]);

  const companyName = companyRow?.name ?? "Mein Unternehmen";
  const employees = employeesRaw ?? [];
  const activeEmployees = employees.filter((e) => !e.is_archived);
  const employeeNameById = Object.fromEntries(employees.map((e) => [e.id, e.full_name ?? "Unbenannt"]));
  const customers = customersRaw ?? [];
  const orders = ordersRaw ?? [];
  const orderTitleById = Object.fromEntries(orders.map((o) => [o.id, o.title]));

  const itemsByInvoiceId = new Map<string, Array<{ id: string; description: string; quantity: number; unit_price: number; position: number }>>();
  for (const it of itemsRaw ?? []) {
    const list = itemsByInvoiceId.get(it.invoice_id) ?? [];
    list.push({ id: it.id, description: it.description, quantity: Number(it.quantity), unit_price: Number(it.unit_price), position: it.position });
    itemsByInvoiceId.set(it.invoice_id, list);
  }

  type CustomerLike = { name: string; email: string | null; phone: string | null; contact_person: string | null; street: string | null; postal_code: string | null; city: string | null };

  const allInvoices = (invoicesRaw ?? []).map((inv) => {
    const items = itemsByInvoiceId.get(inv.id) ?? [];
    const totals = calculateTotals(items, Number(inv.tax_rate ?? 19));
    const eff = effectiveStatus({ kind: inv.kind, status: inv.status, dueDate: inv.due_date, validUntil: inv.valid_until, todayISO: today });
    const customer = inv.customers as CustomerLike | null;
    return {
      ...inv,
      gross: totals.gross,
      effectiveStatus: eff,
      customerName: customer?.name ?? null,
      customerEmail: customer?.email ?? null,
      orderTitle: inv.order_id ? orderTitleById[inv.order_id] ?? null : null,
    };
  });

  // ===================================================================
  // KPI-Kacheln (Spec-Punkt 1)
  // ===================================================================
  const activeInvoices = allInvoices.filter((i) => !i.is_archived);
  const currentMonth = monthRangeBerlin(0);

  const offeneAngebote = activeInvoices.filter((i) => i.kind === "angebot" && ["entwurf", "versendet", "in_pruefung"].includes(i.status)).length;
  const angeboteWartenAufAntwort = activeInvoices.filter((i) => i.kind === "angebot" && QUOTE_PENDING_STATUSES.includes(i.status)).length;
  const offeneRechnungen = activeInvoices.filter((i) => i.kind === "rechnung" && (BILL_OPEN_STATUSES.includes(i.status) || i.effectiveStatus === "ueberfaellig")).length;
  const bezahltDiesenMonat = activeInvoices
    .filter((i) => i.kind === "rechnung" && i.status === "bezahlt" && i.payment_date && i.payment_date >= currentMonth.start && i.payment_date < currentMonth.end)
    .reduce((sum, i) => sum + Number(i.paid_amount), 0);
  const umsatzDiesenMonat = activeInvoices
    .filter((i) => i.kind === "rechnung" && i.status === "bezahlt" && i.issue_date >= currentMonth.start && i.issue_date < currentMonth.end)
    .reduce((sum, i) => sum + i.gross, 0);
  const ueberfaelligeRechnungen = activeInvoices.filter((i) => i.kind === "rechnung" && i.effectiveStatus === "ueberfaellig").length;

  const kpis = [
    { key: "offene_angebote", label: "Offene Angebote", icon: FileText, value: offeneAngebote },
    { key: "warten", label: "Warten auf Antwort", icon: Clock3, value: angeboteWartenAufAntwort },
    { key: "offene_rechnungen", label: "Offene Rechnungen", icon: Receipt, value: offeneRechnungen },
    { key: "bezahlt_monat", label: "Bezahlt diesen Monat", icon: CheckCircle2, value: formatEuro(bezahltDiesenMonat) },
    { key: "umsatz_monat", label: "Umsatz diesen Monat", icon: TrendingUp, value: formatEuro(umsatzDiesenMonat) },
    { key: "ueberfaellig", label: "Überfällige Rechnungen", icon: AlertTriangle, value: ueberfaelligeRechnungen },
  ];

  // ===================================================================
  // Zahlungsübersicht / Cashflow "Heute" (Spec-Punkt 10)
  // ===================================================================
  const heuteBezahlt = activeInvoices.filter((i) => i.kind === "rechnung" && i.payment_date === today).reduce((sum, i) => sum + Number(i.paid_amount), 0);
  const heuteFaellig = activeInvoices
    .filter((i) => i.kind === "rechnung" && BILL_OPEN_STATUSES.includes(i.status) && i.due_date === today)
    .reduce((sum, i) => sum + Math.max(0, i.gross - Number(i.paid_amount)), 0);
  const heuteUeberfaellig = activeInvoices
    .filter((i) => i.kind === "rechnung" && i.effectiveStatus === "ueberfaellig")
    .reduce((sum, i) => sum + Math.max(0, i.gross - Number(i.paid_amount)), 0);

  // ===================================================================
  // Erinnerungen (Spec-Punkt 9) – ohne Cron bei jedem Aufruf frisch
  // berechnet, siehe RemindersWidget.tsx.
  // ===================================================================
  const tomorrow = new Date(`${today}T00:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().slice(0, 10);

  const reminders: ReminderItem[] = [];
  for (const i of activeInvoices) {
    if (i.kind === "angebot" && QUOTE_PENDING_STATUSES.includes(i.status) && i.valid_until === tomorrowISO) {
      reminders.push({ id: `expiring-${i.id}`, type: "quote_expiring", title: `Angebot ${i.invoice_number ?? ""} läuft morgen ab`, subtitle: i.customerName ?? "", href: panelHref(i.id) });
    }
    if (i.kind === "rechnung" && BILL_OPEN_STATUSES.includes(i.status) && daysBetweenISO(i.issue_date, today) >= 14) {
      reminders.push({
        id: `overdue-${i.id}`,
        type: "invoice_overdue",
        title: `Rechnung ${i.invoice_number ?? ""} seit ${daysBetweenISO(i.issue_date, today)} Tagen offen`,
        subtitle: i.customerName ?? "",
        href: panelHref(i.id),
      });
    }
    if (i.kind === "rechnung" && i.payment_date && daysBetweenISO(i.payment_date, today) >= 0 && daysBetweenISO(i.payment_date, today) <= 3 && Number(i.paid_amount) > 0) {
      reminders.push({
        id: `paid-${i.id}`,
        type: "payment_received",
        title: `Zahlung für ${i.invoice_number ?? ""} eingegangen`,
        subtitle: `${formatEuro(Number(i.paid_amount))} · ${i.customerName ?? ""}`,
        href: panelHref(i.id, "zahlung"),
      });
    }
    if (i.kind === "angebot" && i.viewed_at && daysBetweenISO(i.viewed_at.slice(0, 10), today) <= 3) {
      reminders.push({ id: `viewed-${i.id}`, type: "quote_viewed", title: `Kunde hat Angebot ${i.invoice_number ?? ""} geöffnet`, subtitle: i.customerName ?? "", href: panelHref(i.id) });
    }
  }
  reminders.sort((a, b) => a.id.localeCompare(b.id));

  // ===================================================================
  // Filterung (Spec-Punkt 2/12)
  // ===================================================================
  let visible = showArchived ? allInvoices : allInvoices.filter((i) => !i.is_archived);
  if (kindFilter) visible = visible.filter((i) => i.kind === kindFilter);
  if (q) {
    visible = visible.filter(
      (i) =>
        (i.invoice_number ?? "").toLowerCase().includes(q) ||
        (i.customerName ?? "").toLowerCase().includes(q) ||
        (i.orderTitle ?? "").toLowerCase().includes(q) ||
        (i.notes ?? "").toLowerCase().includes(q),
    );
  }
  if (statusFilter.length) visible = visible.filter((i) => statusFilter.includes(i.status) || statusFilter.includes(i.effectiveStatus));
  if (customerFilter) visible = visible.filter((i) => i.customer_id === customerFilter);
  if (assignedToFilter) visible = visible.filter((i) => i.assigned_to === assignedToFilter);
  if (orderFilter) visible = visible.filter((i) => i.order_id === orderFilter);
  if (paymentMethodFilter) visible = visible.filter((i) => i.payment_method === paymentMethodFilter);
  if (dateFrom) visible = visible.filter((i) => i.issue_date >= dateFrom);
  if (dateTo) visible = visible.filter((i) => i.issue_date <= dateTo);
  if (amountMin) visible = visible.filter((i) => i.gross >= Number(amountMin));
  if (amountMax) visible = visible.filter((i) => i.gross <= Number(amountMax));
  if (paidOnly) visible = visible.filter((i) => i.status === "bezahlt");
  if (overdueOnly) visible = visible.filter((i) => i.effectiveStatus === "ueberfaellig" || i.effectiveStatus === "abgelaufen");

  const activeFilterCount =
    statusFilter.length +
    (customerFilter ? 1 : 0) +
    (assignedToFilter ? 1 : 0) +
    (orderFilter ? 1 : 0) +
    (paymentMethodFilter ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (amountMin ? 1 : 0) +
    (amountMax ? 1 : 0) +
    (paidOnly ? 1 : 0) +
    (overdueOnly ? 1 : 0) +
    (showArchived ? 1 : 0);

  const invoiceRows: InvoiceRow[] = visible.map((i) => ({
    id: i.id,
    invoiceNumber: i.invoice_number,
    kind: i.kind,
    status: i.status,
    effectiveStatus: i.effectiveStatus,
    customerId: i.customer_id,
    customerName: i.customerName,
    customerEmail: i.customerEmail,
    gross: i.gross,
    paidAmount: Number(i.paid_amount),
    dueDate: i.kind === "angebot" ? i.valid_until : i.due_date,
    assignedToName: i.assigned_to ? employeeNameById[i.assigned_to] ?? null : null,
    paymentMethod: i.payment_method,
    orderLabel: i.orderTitle,
    dunningLevel: Number(i.dunning_level),
    isArchived: i.is_archived,
  }));

  // ===================================================================
  // Detailpanel (Angebot/Rechnung)
  // ===================================================================
  const panelId = raw.panel && raw.panel.trim().length > 0 ? raw.panel.trim() : null;
  const panelTab: PanelTabKey = PANEL_TABS.includes(raw.panelTab as PanelTabKey) ? (raw.panelTab as PanelTabKey) : "uebersicht";
  let panelData: InvoiceDetailPanelData | null = null;

  if (panelId) {
    const panelInvoice = allInvoices.find((i) => i.id === panelId);
    if (panelInvoice) {
      const returnTo = panelHref(panelId, panelTab);
      const items = (itemsByInvoiceId.get(panelId) ?? []).sort((a, b) => a.position - b.position);
      const customer = panelInvoice.customers as CustomerLike | null;
      const customerAddress = customer ? [customer.street, [customer.postal_code, customer.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") : null;

      const [{ data: history }, { data: sourceQuote }, { data: convertedInvoice }] = await Promise.all([
        supabase
          .from("invoice_history")
          .select("id, action, summary, actor_id, created_at")
          .eq("invoice_id", panelId)
          .order("created_at", { ascending: false }),
        panelInvoice.source_quote_id ? supabase.from("invoices").select("invoice_number").eq("id", panelInvoice.source_quote_id).maybeSingle() : Promise.resolve({ data: null }),
        panelInvoice.converted_to_invoice_id ? supabase.from("invoices").select("invoice_number").eq("id", panelInvoice.converted_to_invoice_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      panelData = {
        id: panelInvoice.id,
        invoiceNumber: panelInvoice.invoice_number,
        kind: panelInvoice.kind,
        status: panelInvoice.status,
        effectiveStatus: panelInvoice.effectiveStatus,
        issueDate: panelInvoice.issue_date,
        dueDate: panelInvoice.due_date,
        validUntil: panelInvoice.valid_until,
        taxRate: Number(panelInvoice.tax_rate ?? 19),
        notes: panelInvoice.notes,
        paidAmount: Number(panelInvoice.paid_amount),
        paymentMethod: panelInvoice.payment_method,
        paymentDate: panelInvoice.payment_date,
        sentAt: panelInvoice.sent_at,
        viewedAt: panelInvoice.viewed_at,
        dunningLevel: Number(panelInvoice.dunning_level),
        isArchived: panelInvoice.is_archived,
        companyName,
        customerId: panelInvoice.customer_id,
        customerName: panelInvoice.customerName,
        customerEmail: panelInvoice.customerEmail,
        customerPhone: customer?.phone ?? null,
        customerContactPerson: customer?.contact_person ?? null,
        customerAddress: customerAddress || null,
        orderId: panelInvoice.order_id,
        orderLabel: panelInvoice.orderTitle,
        assignedToId: panelInvoice.assigned_to,
        assignedToName: panelInvoice.assigned_to ? employeeNameById[panelInvoice.assigned_to] ?? null : null,
        employeeOptions: activeEmployees.map((e) => ({ id: e.id, label: e.full_name ?? "Unbenannt" })),
        customerOptions: customers.map((c) => ({ id: c.id, label: c.name })),
        orderOptions: orders.map((o) => ({ id: o.id, label: o.title })),
        sourceQuoteId: panelInvoice.source_quote_id,
        sourceQuoteNumber: sourceQuote?.invoice_number ?? null,
        convertedToInvoiceId: panelInvoice.converted_to_invoice_id,
        convertedToInvoiceNumber: convertedInvoice?.invoice_number ?? null,
        items: items.map((it) => ({
          id: it.id,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          position: it.position,
          updateAction: updateInvoiceItem.bind(null, it.id, returnTo),
          deleteAction: deleteInvoiceItem.bind(null, panelId, it.id, returnTo),
        })),
        history: (history ?? []).map((h) => ({
          id: h.id,
          action: h.action,
          summary: h.summary,
          actorName: h.actor_id ? employeeNameById[h.actor_id] ?? null : null,
          created_at: h.created_at,
        })),
        canManage,
        activeTab: panelTab,
        hrefs: {
          close: panelCloseHref(),
          tabs: Object.fromEntries(PANEL_TABS.map((t) => [t, panelHref(panelId, t)])) as Record<PanelTabKey, string>,
          pdf: `/rechnungen/${panelId}/pdf`,
        },
        updateAction: updateInvoice.bind(null, panelId, returnTo),
        addItemAction: addInvoiceItem.bind(null, panelId, returnTo),
        sendAction: sendInvoice.bind(null, panelId, returnTo),
        setStatusAction: setInvoiceStatus.bind(null, panelId, returnTo),
        recordPaymentAction: recordPayment.bind(null, panelId, returnTo),
        convertAction: convertQuoteToInvoice.bind(null, panelId, returnTo),
        markViewedAction: markInvoiceViewed.bind(null, panelId, returnTo),
        increaseDunningAction: increaseDunningLevel.bind(null, panelId, returnTo),
        assignAction: assignInvoice.bind(null, panelId, returnTo),
        archiveAction: archiveInvoice.bind(null, panelId, !panelInvoice.is_archived, returnTo),
        duplicateAction: duplicateInvoice.bind(null, panelId, returnTo),
        deleteAction: deleteInvoice.bind(null, panelId, returnTo),
      };
    }
  }

  // ===================================================================
  // Kundenvorschau (Spec-Punkt 6) – nur wenn kein Dokument-Panel offen ist.
  // ===================================================================
  let customerPreviewData: CustomerPreviewData | null = null;
  const customerPreviewId = !panelId && raw.customerPreview ? raw.customerPreview.trim() : null;
  if (customerPreviewId) {
    const { data: customerRow } = await supabase
      .from("customers")
      .select("id, name, contact_person, phone, email, street, postal_code, city")
      .eq("id", customerPreviewId)
      .maybeSingle();

    if (customerRow) {
      const customerInvoices = allInvoices.filter((i) => i.customer_id === customerPreviewId);
      const openInvoices = customerInvoices.filter((i) => i.kind === "rechnung" && (BILL_OPEN_STATUSES.includes(i.status) || i.effectiveStatus === "ueberfaellig"));
      const openOrders = orders.filter((o) => o.customer_id === customerPreviewId && !["abgeschlossen", "storniert"].includes(o.status));
      const paidInvoices = customerInvoices.filter((i) => i.kind === "rechnung" && i.status === "bezahlt");
      const lastPayment = customerInvoices
        .filter((i) => i.payment_date)
        .sort((a, b) => (b.payment_date! < a.payment_date! ? -1 : 1))[0];

      const address = [customerRow.street, [customerRow.postal_code, customerRow.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

      customerPreviewData = {
        id: customerRow.id,
        name: customerRow.name,
        contactPerson: customerRow.contact_person,
        phone: customerRow.phone,
        email: customerRow.email,
        address: address || null,
        openOrdersCount: openOrders.length,
        openInvoicesCount: openInvoices.length,
        openInvoicesAmount: openInvoices.reduce((sum, i) => sum + Math.max(0, i.gross - Number(i.paid_amount)), 0),
        totalRevenue: paidInvoices.reduce((sum, i) => sum + i.gross, 0),
        lastPaymentDate: lastPayment?.payment_date ?? null,
        lastPaymentAmount: lastPayment ? Number(lastPayment.paid_amount) : null,
        hrefs: {
          close: customerPreviewCloseHref(),
          full: `/kunden/${customerRow.id}`,
          newQuote: `/rechnungen/neu?customer_id=${customerRow.id}&kind=angebot`,
          newInvoice: `/rechnungen/neu?customer_id=${customerRow.id}&kind=rechnung`,
        },
      };
    }
  }

  const hasAnyInvoices = allInvoices.length > 0;
  const isFiltered = Boolean(q || kindFilter || activeFilterCount > 0);

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-md shadow-brand/20">
            <Receipt className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Angebote &amp; Rechnungen</h1>
            <p className="mt-0.5 text-sm text-muted">{activeInvoices.length} aktive Dokumente</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RemindersWidget items={reminders} />
          <Link href="/rechnungen/statistiken" className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground hover:bg-background">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Statistiken</span>
          </Link>
          {canManage && (
            <Link href="/rechnungen/neu" className="rounded-lg bg-gradient-to-br from-brand to-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md">
              + Neu
            </Link>
          )}
        </div>
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

      <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-brand" />
          <p className="text-sm font-semibold text-foreground">Zahlungsübersicht heute</p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-semibold text-green-700">+{formatEuro(heuteBezahlt)}</p>
            <p className="text-[11px] text-muted">Heute bezahlt</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-amber-700">-{formatEuro(heuteFaellig)}</p>
            <p className="text-[11px] text-muted">Heute fällig</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-red-600">-{formatEuro(heuteUeberfaellig)}</p>
            <p className="text-[11px] text-muted">Überfällig gesamt</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={kindHref("")} className={`rounded-full px-3 py-1.5 text-xs font-medium ${!kindFilter ? "bg-foreground text-background" : "border border-border bg-card text-muted"}`}>
          Alle
        </Link>
        <Link href={kindHref("angebot")} className={`rounded-full px-3 py-1.5 text-xs font-medium ${kindFilter === "angebot" ? "bg-foreground text-background" : "border border-border bg-card text-muted"}`}>
          Angebote
        </Link>
        <Link href={kindHref("rechnung")} className={`rounded-full px-3 py-1.5 text-xs font-medium ${kindFilter === "rechnung" ? "bg-foreground text-background" : "border border-border bg-card text-muted"}`}>
          Rechnungen
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <form method="GET" action="/rechnungen" className="relative min-w-[220px] flex-1">
          {kindFilter && <input type="hidden" name="kind" value={kindFilter} />}
          <input
            type="search"
            name="q"
            defaultValue={raw.q ?? ""}
            placeholder="Nummer, Kunde, Auftrag oder Notiz suchen…"
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-3 pr-3 text-base outline-none focus:border-brand sm:text-sm"
          />
        </form>

        <InvoiceFilterPanel
          kind={kindFilter}
          q={raw.q ?? ""}
          customerOptions={customers.map((c) => ({ id: c.id, name: c.name }))}
          employeeOptions={activeEmployees.map((e) => ({ id: e.id, label: e.full_name ?? "Unbenannt" }))}
          orderOptions={orders.map((o) => ({ id: o.id, label: o.title }))}
          initial={{
            status: statusFilter,
            customer: customerFilter,
            assignedTo: assignedToFilter,
            order: orderFilter,
            paymentMethod: paymentMethodFilter,
            dateFrom,
            dateTo,
            amountMin,
            amountMax,
            paidOnly,
            overdueOnly,
            archived: showArchived,
          }}
          activeCount={activeFilterCount}
        />
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          {invoiceRows.length === 0 ? (
            <InvoiceEmptyState filtered={hasAnyInvoices && isFiltered} />
          ) : (
            <InvoiceTable items={invoiceRows} panelBaseQuery={baseQuery} showingArchived={showArchived} />
          )}
        </div>

        {panelData && <InvoiceDetailPanel data={panelData} />}
        {!panelData && customerPreviewData && <CustomerPreviewPanel data={customerPreviewData} />}
      </div>

      {!canManage && (
        <p className="mt-6 text-xs text-muted">Nur Owner, Admin, Geschäftsführer oder Büro können Angebote und Rechnungen anlegen oder bearbeiten.</p>
      )}
    </div>
  );
}
