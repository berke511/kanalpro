"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowRightLeft,
  Ban,
  Copy,
  CreditCard,
  Eye,
  FileText,
  History as HistoryIcon,
  Info,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Send,
  Trash2,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/date";
import { formatEuro } from "@/lib/format";
import {
  INVOICE_KIND_LABELS,
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
  statusesForKind,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  DUNNING_LABELS,
  QUOTE_PENDING_STATUSES,
  BILL_OPEN_STATUSES,
  calculateTotals,
  initialsFor,
} from "@/lib/invoices";

export type PanelTabKey = "uebersicht" | "positionen" | "verlauf" | "zahlung";

const HISTORY_ICONS: Record<string, LucideIcon> = {
  created: Receipt,
  status_changed: Info,
  sent: Send,
  payment_recorded: CreditCard,
  converted: ArrowRightLeft,
  archived: Archive,
  unarchived: ArchiveRestore,
  viewed_marked_manually: Eye,
  dunning: Ban,
  assigned: User,
};

export type InvoiceItemData = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  position: number;
  updateAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
};

export type InvoiceHistoryEntry = {
  id: string;
  action: string;
  summary: string | null;
  actorName: string | null;
  created_at: string;
};

export type InvoiceDetailPanelData = {
  id: string;
  invoiceNumber: string | null;
  kind: string;
  status: string;
  effectiveStatus: string;
  issueDate: string | null;
  dueDate: string | null;
  validUntil: string | null;
  taxRate: number;
  notes: string | null;
  paidAmount: number;
  paymentMethod: string | null;
  paymentDate: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  dunningLevel: number;
  isArchived: boolean;
  companyName: string;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerContactPerson: string | null;
  customerAddress: string | null;
  orderId: string | null;
  orderLabel: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  employeeOptions: Array<{ id: string; label: string }>;
  customerOptions: Array<{ id: string; label: string }>;
  orderOptions: Array<{ id: string; label: string }>;
  sourceQuoteId: string | null;
  sourceQuoteNumber: string | null;
  convertedToInvoiceId: string | null;
  convertedToInvoiceNumber: string | null;
  items: InvoiceItemData[];
  history: InvoiceHistoryEntry[];
  canManage: boolean;
  activeTab: PanelTabKey;
  hrefs: { close: string; tabs: Record<PanelTabKey, string>; pdf: string };
  updateAction: (formData: FormData) => void;
  addItemAction: (formData: FormData) => void;
  sendAction: (formData: FormData) => void;
  setStatusAction: (formData: FormData) => void;
  recordPaymentAction: (formData: FormData) => void;
  convertAction: (formData: FormData) => void;
  markViewedAction: (formData: FormData) => void;
  increaseDunningAction: (formData: FormData) => void;
  assignAction: (formData: FormData) => void;
  archiveAction: (formData: FormData) => void;
  duplicateAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
};

function statusForm(action: (formData: FormData) => void, status: string, label: string, className: string) {
  return (
    <form action={action}>
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}

export function InvoiceDetailPanel({ data }: { data: InvoiceDetailPanelData }) {
  const router = useRouter();
  const isQuote = data.kind === "angebot";
  const items = [...data.items].sort((a, b) => a.position - b.position);
  const totals = calculateTotals(items, data.taxRate);
  const openAmount = Math.max(0, totals.gross - data.paidAmount);

  const TABS: Array<{ key: PanelTabKey; label: string; icon: LucideIcon }> = [
    { key: "uebersicht", label: "Übersicht", icon: Info },
    { key: "positionen", label: "Positionen", icon: Receipt },
    { key: "verlauf", label: "Verlauf", icon: HistoryIcon },
    ...(!isQuote ? [{ key: "zahlung" as PanelTabKey, label: "Zahlung", icon: CreditCard }] : []),
  ];

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") router.push(data.hrefs.close);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router, data.hrefs.close]);

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10";
  const labelClass = "text-xs font-medium text-muted";
  const quickBtnClass =
    "flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-brand/30 hover:bg-brand-soft";

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] lg:hidden" onClick={() => router.push(data.hrefs.close)} />
      <div className="fixed inset-y-0 right-0 z-40 w-full max-w-lg animate-slide-in-right overflow-y-auto border-l border-border bg-card p-5 shadow-xl lg:sticky lg:top-0 lg:z-0 lg:h-[calc(100vh-2rem)] lg:max-w-none lg:animate-none lg:shadow-none">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{isQuote ? "Angebotsakte" : "Rechnungsakte"}</h2>
          <Link href={data.hrefs.close} className="rounded-full p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground">
            <X className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-lg font-semibold text-white shadow-sm">
            {initialsFor(data.customerName)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-tight text-foreground">{data.invoiceNumber ?? "Ohne Nummer"}</h3>
            <p className="truncate text-sm text-muted">
              {INVOICE_KIND_LABELS[data.kind] ?? data.kind} · {data.customerName ?? "Kein Kunde zugeordnet"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${STATUS_BADGE_CLASS[data.effectiveStatus] ?? "bg-gray-100 text-gray-600"}`}>
            {STATUS_LABELS[data.effectiveStatus] ?? data.effectiveStatus}
          </span>
          {data.isArchived && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">Archiviert</span>}
          {data.dunningLevel > 0 && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">{DUNNING_LABELS[data.dunningLevel]}</span>}
          {data.canManage && (
            <form action={data.setStatusAction} className="ml-auto">
              <select
                name="status"
                defaultValue={data.status}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium outline-none focus:border-brand"
              >
                {statusesForKind(data.kind).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </form>
          )}
        </div>

        {/* Quick Actions */}
        {data.canManage && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {data.status === "entwurf" && (
              <form action={data.sendAction}>
                <button type="submit" className={quickBtnClass}>
                  <Send className="h-3.5 w-3.5" />
                  Versenden
                </button>
              </form>
            )}
            <Link href={data.hrefs.pdf} target="_blank" className={quickBtnClass}>
              <FileText className="h-3.5 w-3.5" />
              PDF öffnen
            </Link>
            {data.customerEmail && (
              <a
                href={`mailto:${data.customerEmail}?subject=${encodeURIComponent(`${INVOICE_KIND_LABELS[data.kind]} ${data.invoiceNumber ?? ""}`)}`}
                className={quickBtnClass}
              >
                <Mail className="h-3.5 w-3.5" />
                Per Mail senden
              </a>
            )}
            {isQuote && QUOTE_PENDING_STATUSES.includes(data.status) && (
              <>
                {statusForm(data.setStatusAction, "angenommen", "Angenommen", "flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100")}
                {statusForm(data.setStatusAction, "abgelehnt", "Abgelehnt", "flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100")}
              </>
            )}
            {isQuote && data.status === "angenommen" && !data.convertedToInvoiceId && (
              <form action={data.convertAction}>
                <button type="submit" className="flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand-soft px-2.5 py-1.5 text-xs font-medium text-brand-dark hover:bg-brand/10">
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Rechnung erstellen
                </button>
              </form>
            )}
            {!isQuote && BILL_OPEN_STATUSES.includes(data.status) && (
              <Link href={data.hrefs.tabs.zahlung} className={quickBtnClass}>
                <CreditCard className="h-3.5 w-3.5" />
                Zahlung erfassen
              </Link>
            )}
            {!isQuote && data.effectiveStatus === "ueberfaellig" && (
              <form action={data.increaseDunningAction}>
                <button type="submit" className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100">
                  <Ban className="h-3.5 w-3.5" />
                  Mahnstufe erhöhen
                </button>
              </form>
            )}
            {isQuote && !data.viewedAt && (
              <form action={data.markViewedAction}>
                <button type="submit" className={quickBtnClass}>
                  <Eye className="h-3.5 w-3.5" />
                  Als geöffnet markieren
                </button>
              </form>
            )}
            <form action={data.duplicateAction}>
              <button type="submit" className={quickBtnClass}>
                <Copy className="h-3.5 w-3.5" />
                Kopieren
              </button>
            </form>
          </div>
        )}

        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.key}
                href={data.hrefs.tabs[t.key]}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  data.activeTab === t.key ? "bg-gradient-to-br from-brand to-brand-dark text-white shadow-sm" : "text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-4">
          {data.activeTab === "uebersicht" && (
            <div className="space-y-4 text-sm">
              {/* PDF-Vorschau-artige Karte */}
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-foreground">{data.companyName}</p>
                    <p className="mt-0.5 text-xs text-muted">{INVOICE_KIND_LABELS[data.kind]} {data.invoiceNumber ?? ""}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_CLASS[data.effectiveStatus] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABELS[data.effectiveStatus] ?? data.effectiveStatus}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted">Kunde</p>
                    <p className="font-medium text-foreground">{data.customerName ?? "—"}</p>
                    {data.customerAddress && <p className="text-muted">{data.customerAddress}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-muted">Datum</p>
                    <p className="font-medium text-foreground">{data.issueDate ? formatDate(data.issueDate) : "—"}</p>
                    <p className="mt-1 text-muted">{isQuote ? "Gültig bis" : "Zahlungsziel"}</p>
                    <p className="font-medium text-foreground">
                      {isQuote ? (data.validUntil ? formatDate(data.validUntil) : "—") : data.dueDate ? formatDate(data.dueDate) : "—"}
                    </p>
                  </div>
                </div>
                <table className="mt-3 w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted">
                      <th className="py-1.5 text-left font-medium">Position</th>
                      <th className="py-1.5 text-right font-medium">Menge</th>
                      <th className="py-1.5 text-right font-medium">Preis</th>
                      <th className="py-1.5 text-right font-medium">Summe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-2 text-center text-muted">Noch keine Positionen erfasst.</td>
                      </tr>
                    )}
                    {items.map((it) => (
                      <tr key={it.id} className="border-b border-border/60 last:border-0">
                        <td className="py-1.5 text-foreground">{it.description}</td>
                        <td className="py-1.5 text-right text-muted">{it.quantity.toLocaleString("de-DE")}</td>
                        <td className="py-1.5 text-right text-muted">{formatEuro(it.unit_price)}</td>
                        <td className="py-1.5 text-right font-medium text-foreground">{formatEuro(it.quantity * it.unit_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs">
                  <div className="flex justify-between text-muted">
                    <span>Netto</span>
                    <span>{formatEuro(totals.net)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>MwSt. ({data.taxRate.toLocaleString("de-DE")}%)</span>
                    <span>{formatEuro(totals.tax)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-foreground">
                    <span>Gesamtsumme</span>
                    <span>{formatEuro(totals.gross)}</span>
                  </div>
                </div>
              </div>

              {/* Kundenmini-Info */}
              {data.customerId && (
                <div className="space-y-2 rounded-xl bg-background p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Kunde</p>
                  <Link href={`/kunden/${data.customerId}`} className="flex items-center gap-2.5 font-medium text-foreground hover:text-brand">
                    <User className="h-4 w-4 shrink-0 text-muted" />
                    {data.customerName}
                  </Link>
                  {data.customerContactPerson && <p className="pl-6 text-xs text-muted">{data.customerContactPerson}</p>}
                  {data.customerPhone && (
                    <a href={`tel:${data.customerPhone}`} className="flex items-center gap-2.5 text-foreground hover:text-brand">
                      <Phone className="h-4 w-4 shrink-0 text-muted" />
                      {data.customerPhone}
                    </a>
                  )}
                  {data.customerEmail && (
                    <a href={`mailto:${data.customerEmail}`} className="flex items-center gap-2.5 text-foreground hover:text-brand">
                      <Mail className="h-4 w-4 shrink-0 text-muted" />
                      {data.customerEmail}
                    </a>
                  )}
                  {data.customerAddress && (
                    <p className="flex items-center gap-2.5 text-foreground">
                      <MapPin className="h-4 w-4 shrink-0 text-muted" />
                      {data.customerAddress}
                    </p>
                  )}
                </div>
              )}

              {/* Verknüpfungen */}
              {(data.orderId || data.sourceQuoteId || data.convertedToInvoiceId) && (
                <div className="space-y-1.5 rounded-xl bg-background p-3 text-xs">
                  <p className="font-medium uppercase tracking-wide text-muted">Verknüpfungen</p>
                  {data.orderId && (
                    <Link href={`/auftraege/${data.orderId}`} className="block text-foreground hover:text-brand">
                      Auftrag: {data.orderLabel ?? data.orderId}
                    </Link>
                  )}
                  {data.sourceQuoteId && (
                    <p className="text-foreground">Erstellt aus Angebot {data.sourceQuoteNumber ?? ""}</p>
                  )}
                  {data.convertedToInvoiceId && (
                    <p className="text-foreground">→ Rechnung {data.convertedToInvoiceNumber ?? ""} erstellt</p>
                  )}
                </div>
              )}

              {/* Bearbeiter */}
              <div className="rounded-xl bg-background p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Bearbeiter</p>
                {data.canManage ? (
                  <form action={data.assignAction} className="mt-1.5">
                    <select
                      name="assigned_to"
                      defaultValue={data.assignedToId ?? ""}
                      onChange={(e) => e.currentTarget.form?.requestSubmit()}
                      className={inputClass}
                    >
                      <option value="">Kein Bearbeiter</option>
                      {data.employeeOptions.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.label}
                        </option>
                      ))}
                    </select>
                  </form>
                ) : (
                  <p className="mt-1 font-medium text-foreground">{data.assignedToName ?? "—"}</p>
                )}
              </div>

              {data.notes && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Notizen</p>
                  <p className="mt-1 rounded-xl bg-background p-3 text-foreground">{data.notes}</p>
                </div>
              )}

              {data.canManage ? (
                <details className="rounded-xl border border-border">
                  <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted [&::-webkit-details-marker]:hidden">
                    Stammdaten bearbeiten
                  </summary>
                  <form action={data.updateAction} className="space-y-3 border-t border-border p-3">
                    <div>
                      <label className={labelClass}>Nummer</label>
                      <input name="invoice_number" defaultValue={data.invoiceNumber ?? ""} className={`mt-1 ${inputClass}`} />
                    </div>
                    <div>
                      <label className={labelClass}>Kunde</label>
                      <select name="customer_id" defaultValue={data.customerId ?? ""} className={`mt-1 ${inputClass}`}>
                        <option value="">—</option>
                        {data.customerOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {data.orderOptions.length > 0 && (
                      <div>
                        <label className={labelClass}>Auftrag / Projekt</label>
                        <select name="order_id" defaultValue={data.orderId ?? ""} className={`mt-1 ${inputClass}`}>
                          <option value="">—</option>
                          {data.orderOptions.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Datum</label>
                        <input type="date" name="issue_date" defaultValue={data.issueDate ?? ""} className={`mt-1 ${inputClass}`} />
                      </div>
                      <div>
                        <label className={labelClass}>{isQuote ? "Gültig bis" : "Fälligkeitsdatum"}</label>
                        <input type="date" name={isQuote ? "valid_until" : "due_date"} defaultValue={(isQuote ? data.validUntil : data.dueDate) ?? ""} className={`mt-1 ${inputClass}`} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>MwSt.-Satz (%)</label>
                      <input type="number" step="0.01" min="0" name="tax_rate" defaultValue={data.taxRate} className={`mt-1 ${inputClass}`} />
                    </div>
                    {!isQuote && (
                      <div>
                        <label className={labelClass}>Zahlungsart</label>
                        <select name="payment_method" defaultValue={data.paymentMethod ?? ""} className={`mt-1 ${inputClass}`}>
                          <option value="">—</option>
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m} value={m}>
                              {PAYMENT_METHOD_LABELS[m]}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className={labelClass}>Notizen</label>
                      <textarea name="notes" defaultValue={data.notes ?? ""} rows={3} className={`mt-1 ${inputClass}`} />
                    </div>
                    <input type="hidden" name="status" value={data.status} />
                    <button type="submit" className="w-full rounded-lg bg-gradient-to-br from-brand to-brand-dark px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md">
                      Speichern
                    </button>
                  </form>
                </details>
              ) : (
                <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">
                  Nur Owner, Admin, Geschäftsführer oder Büro können Daten bearbeiten.
                </p>
              )}

              {data.canManage && (
                <div className="space-y-2 border-t border-border pt-4">
                  <form action={data.archiveAction}>
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-brand/30 hover:bg-brand-soft"
                    >
                      {data.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      {data.isArchived ? "Archivierung aufheben" : "Archivieren"}
                    </button>
                  </form>
                  <form
                    action={data.deleteAction}
                    onSubmit={(e) => {
                      if (!window.confirm("Diesen Eintrag unwiderruflich löschen? Dies kann nicht rückgängig gemacht werden.")) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                      Endgültig löschen
                    </button>
                  </form>
                  {(Number(data.paidAmount) > 0 || data.status === "bezahlt") && (
                    <p className="text-center text-[11px] text-muted">(Teil-)bezahlte Dokumente können nicht gelöscht werden – bitte archivieren.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {data.activeTab === "positionen" && (
            <div className="space-y-3">
              {items.length === 0 && <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">Noch keine Positionen erfasst.</p>}
              {items.map((it) => (
                <div key={it.id} className="rounded-xl border border-border bg-background p-3">
                  {data.canManage ? (
                    <form action={it.updateAction} className="space-y-2">
                      <input name="description" defaultValue={it.description} required className={inputClass} placeholder="Beschreibung" />
                      <div className="grid grid-cols-3 gap-2">
                        <input type="number" step="0.01" min="0" name="quantity" defaultValue={it.quantity} required className={inputClass} placeholder="Menge" />
                        <input type="number" step="0.01" min="0" name="unit_price" defaultValue={it.unit_price} required className={inputClass} placeholder="Preis (€)" />
                        <div className="flex items-center justify-end rounded-lg bg-card px-2 text-sm font-medium text-foreground">
                          {formatEuro(it.quantity * it.unit_price)}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark">
                          Speichern
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between text-sm">
                      <p className="text-foreground">{it.description}</p>
                      <p className="font-medium text-foreground">
                        {it.quantity.toLocaleString("de-DE")} × {formatEuro(it.unit_price)} = {formatEuro(it.quantity * it.unit_price)}
                      </p>
                    </div>
                  )}
                  {data.canManage && (
                    <form action={it.deleteAction} className="mt-1 flex justify-end">
                      <button type="submit" className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700">
                        <Trash2 className="h-3 w-3" />
                        Position löschen
                      </button>
                    </form>
                  )}
                </div>
              ))}

              <div className="space-y-1 rounded-xl bg-background p-3 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Netto</span>
                  <span>{formatEuro(totals.net)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>MwSt. ({data.taxRate.toLocaleString("de-DE")}%)</span>
                  <span>{formatEuro(totals.tax)}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground">
                  <span>Gesamtsumme</span>
                  <span>{formatEuro(totals.gross)}</span>
                </div>
              </div>

              {data.canManage && (
                <form action={data.addItemAction} className="space-y-2 rounded-xl border border-dashed border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Position hinzufügen</p>
                  <input name="description" required placeholder="Beschreibung" className={inputClass} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" step="0.01" min="0" name="quantity" defaultValue={1} required placeholder="Menge" className={inputClass} />
                    <input type="number" step="0.01" min="0" name="unit_price" defaultValue={0} required placeholder="Preis (€)" className={inputClass} />
                  </div>
                  <button type="submit" className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                    Hinzufügen
                  </button>
                </form>
              )}
            </div>
          )}

          {data.activeTab === "verlauf" && (
            <div className="space-y-2">
              {data.history.length === 0 && <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">Noch keine Ereignisse erfasst.</p>}
              <div className="relative space-y-3 pl-5">
                {data.history.length > 0 && <div className="absolute bottom-1 left-[7px] top-1 w-px bg-border" />}
                {data.history.map((h) => {
                  const Icon = HISTORY_ICONS[h.action] ?? Info;
                  return (
                    <div key={h.id} className="relative">
                      <span className="absolute -left-5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand text-white ring-4 ring-card">
                        <Icon className="h-2.5 w-2.5" />
                      </span>
                      <p className="text-sm text-foreground">{h.summary ?? h.action}</p>
                      <p className="text-[11px] text-muted">
                        {formatDateTime(h.created_at)}
                        {h.actorName ? ` · ${h.actorName}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data.activeTab === "zahlung" && !isQuote && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-background p-2.5 text-center">
                  <p className="text-base font-semibold text-foreground">{formatEuro(totals.gross)}</p>
                  <p className="text-[11px] text-muted">Gesamtsumme</p>
                </div>
                <div className="rounded-xl bg-background p-2.5 text-center">
                  <p className="text-base font-semibold text-green-700">{formatEuro(data.paidAmount)}</p>
                  <p className="text-[11px] text-muted">Bezahlt</p>
                </div>
                <div className="rounded-xl bg-background p-2.5 text-center">
                  <p className={`text-base font-semibold ${openAmount > 0 ? "text-red-600" : "text-foreground"}`}>{formatEuro(openAmount)}</p>
                  <p className="text-[11px] text-muted">Offen</p>
                </div>
              </div>

              {data.paymentDate && (
                <p className="text-xs text-muted">
                  Letzte Zahlung: {formatDate(data.paymentDate)}
                  {data.paymentMethod ? ` · ${PAYMENT_METHOD_LABELS[data.paymentMethod] ?? data.paymentMethod}` : ""}
                </p>
              )}

              {data.canManage && openAmount > 0.004 && (
                <form action={data.recordPaymentAction} className="space-y-2 rounded-xl border border-dashed border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Zahlung erfassen</p>
                  <input type="number" step="0.01" min="0.01" name="amount" defaultValue={openAmount.toFixed(2)} required className={inputClass} placeholder="Betrag (€)" />
                  <select name="payment_method" defaultValue="ueberweisung" className={inputClass}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {PAYMENT_METHOD_LABELS[m]}
                      </option>
                    ))}
                  </select>
                  <input type="date" name="payment_date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} />
                  <button type="submit" className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                    Zahlung erfassen
                  </button>
                </form>
              )}

              {openAmount <= 0.004 && <p className="rounded-xl bg-green-50 p-3 text-center text-sm font-medium text-green-700">Vollständig bezahlt.</p>}

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Zahlungsverlauf</p>
                <div className="mt-2 space-y-1.5">
                  {data.history
                    .filter((h) => h.action === "payment_recorded")
                    .map((h) => (
                      <div key={h.id} className="rounded-xl bg-background p-2.5 text-xs">
                        <p className="text-foreground">{h.summary}</p>
                        <p className="mt-0.5 text-muted">{formatDateTime(h.created_at)}</p>
                      </div>
                    ))}
                  {data.history.filter((h) => h.action === "payment_recorded").length === 0 && (
                    <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">Noch keine Zahlung erfasst.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
