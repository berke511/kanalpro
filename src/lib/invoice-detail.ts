import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { InvoiceDetailPanelData, PanelTabKey } from "@/components/dashboard/InvoiceDetailPanel";
import { effectiveStatus } from "@/lib/invoices";
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
} from "@/app/(dashboard)/rechnungen/actions";

export const PANEL_TABS: readonly PanelTabKey[] = ["uebersicht", "positionen", "verlauf", "zahlung"];

type CustomerLike = {
  name: string;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
};

/**
 * Lädt alle Daten für die Angebots-/Rechnungsdetailansicht und bindet die
 * Server-Actions an den jeweiligen Eintrag. Genutzt von der eigenen Route
 * /rechnungen/[id] – früher lief das über ein rechtes Overlay-Panel auf der
 * Liste, das durch die eigene Seite ersetzt wurde (gleiches Muster wie
 * /fahrzeuge/[id], /material/[id], /berichte/[id]).
 */
export async function loadInvoiceDetailData(options: {
  supabase: SupabaseClient<Database>;
  invoiceId: string;
  companyId: string;
  canManage: boolean;
  todayISO: string;
  activeTab: PanelTabKey;
  closeHref: string;
  tabHrefs: Record<PanelTabKey, string>;
  returnTo: string;
}): Promise<InvoiceDetailPanelData | null> {
  const { supabase, invoiceId, companyId, canManage, todayISO, activeTab, closeHref, tabHrefs, returnTo } = options;

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, kind, status, customer_id, order_id, assigned_to, issue_date, due_date, valid_until, tax_rate, payment_method, payment_date, paid_amount, sent_at, viewed_at, dunning_level, is_archived, notes, source_quote_id, converted_to_invoice_id, customers(name, email, phone, contact_person, street, postal_code, city), orders(title)",
    )
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) return null;

  const [{ data: companyRow }, { data: itemsRaw }, { data: employeesRaw }, { data: customersRaw }, { data: ordersRaw }, { data: history }] = await Promise.all([
    supabase.from("companies").select("name").eq("id", companyId).maybeSingle(),
    supabase.from("invoice_items").select("id, description, quantity, unit_price, position").eq("invoice_id", invoiceId).order("position", { ascending: true }),
    supabase.from("profiles").select("id, full_name, is_archived").order("full_name", { ascending: true }),
    supabase.from("customers").select("id, name").order("name", { ascending: true }),
    supabase.from("orders").select("id, title").order("created_at", { ascending: false }),
    supabase.from("invoice_history").select("id, action, summary, actor_id, created_at").eq("invoice_id", invoiceId).order("created_at", { ascending: false }),
  ]);

  const companyName = companyRow?.name ?? "Mein Unternehmen";
  const employees = employeesRaw ?? [];
  const activeEmployees = employees.filter((e) => !e.is_archived);
  const employeeNameById = Object.fromEntries(employees.map((e) => [e.id, e.full_name ?? "Unbenannt"]));
  const customers = customersRaw ?? [];
  const orders = ordersRaw ?? [];
  const orderTitleById = Object.fromEntries(orders.map((o) => [o.id, o.title]));

  const items = (itemsRaw ?? []).map((it) => ({ id: it.id, description: it.description, quantity: Number(it.quantity), unit_price: Number(it.unit_price), position: it.position }));
  const eff = effectiveStatus({ kind: invoice.kind, status: invoice.status, dueDate: invoice.due_date, validUntil: invoice.valid_until, todayISO });

  const customer = invoice.customers as CustomerLike | null;
  const customerAddress = customer ? [customer.street, [customer.postal_code, customer.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") : null;

  const [{ data: sourceQuote }, { data: convertedInvoice }] = await Promise.all([
    invoice.source_quote_id ? supabase.from("invoices").select("invoice_number").eq("id", invoice.source_quote_id).maybeSingle() : Promise.resolve({ data: null }),
    invoice.converted_to_invoice_id ? supabase.from("invoices").select("invoice_number").eq("id", invoice.converted_to_invoice_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    kind: invoice.kind,
    status: invoice.status,
    effectiveStatus: eff,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    validUntil: invoice.valid_until,
    taxRate: Number(invoice.tax_rate ?? 19),
    notes: invoice.notes,
    paidAmount: Number(invoice.paid_amount),
    paymentMethod: invoice.payment_method,
    paymentDate: invoice.payment_date,
    sentAt: invoice.sent_at,
    viewedAt: invoice.viewed_at,
    dunningLevel: Number(invoice.dunning_level),
    isArchived: invoice.is_archived,
    companyName,
    customerId: invoice.customer_id,
    customerName: customer?.name ?? null,
    customerEmail: customer?.email ?? null,
    customerPhone: customer?.phone ?? null,
    customerContactPerson: customer?.contact_person ?? null,
    customerAddress: customerAddress || null,
    orderId: invoice.order_id,
    orderLabel: invoice.order_id ? orderTitleById[invoice.order_id] ?? null : null,
    assignedToId: invoice.assigned_to,
    assignedToName: invoice.assigned_to ? employeeNameById[invoice.assigned_to] ?? null : null,
    employeeOptions: activeEmployees.map((e) => ({ id: e.id, label: e.full_name ?? "Unbenannt" })),
    customerOptions: customers.map((c) => ({ id: c.id, label: c.name })),
    orderOptions: orders.map((o) => ({ id: o.id, label: o.title })),
    sourceQuoteId: invoice.source_quote_id,
    sourceQuoteNumber: sourceQuote?.invoice_number ?? null,
    convertedToInvoiceId: invoice.converted_to_invoice_id,
    convertedToInvoiceNumber: convertedInvoice?.invoice_number ?? null,
    items: items.map((it) => ({
      id: it.id,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      position: it.position,
      updateAction: updateInvoiceItem.bind(null, it.id, returnTo),
      deleteAction: deleteInvoiceItem.bind(null, invoiceId, it.id, returnTo),
    })),
    history: (history ?? []).map((h) => ({
      id: h.id,
      action: h.action,
      summary: h.summary,
      actorName: h.actor_id ? employeeNameById[h.actor_id] ?? null : null,
      created_at: h.created_at,
    })),
    canManage,
    activeTab,
    hrefs: {
      close: closeHref,
      tabs: tabHrefs,
      pdf: `/rechnungen/${invoiceId}/pdf`,
    },
    updateAction: updateInvoice.bind(null, invoiceId, returnTo),
    addItemAction: addInvoiceItem.bind(null, invoiceId, returnTo),
    sendAction: sendInvoice.bind(null, invoiceId, returnTo),
    setStatusAction: setInvoiceStatus.bind(null, invoiceId, returnTo),
    recordPaymentAction: recordPayment.bind(null, invoiceId, returnTo),
    convertAction: convertQuoteToInvoice.bind(null, invoiceId, returnTo),
    markViewedAction: markInvoiceViewed.bind(null, invoiceId, returnTo),
    increaseDunningAction: increaseDunningLevel.bind(null, invoiceId, returnTo),
    assignAction: assignInvoice.bind(null, invoiceId, returnTo),
    archiveAction: archiveInvoice.bind(null, invoiceId, !invoice.is_archived, returnTo),
    duplicateAction: duplicateInvoice.bind(null, invoiceId, returnTo),
    deleteAction: deleteInvoice.bind(null, invoiceId, "/rechnungen"),
  };
}
