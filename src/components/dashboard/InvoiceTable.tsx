"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Columns3,
  Copy,
  CreditCard,
  Download,
  Eye,
  FileText,
  Mail,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  INVOICE_KIND_LABELS,
  PAYMENT_METHOD_LABELS,
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
  DUNNING_LABELS,
  ALL_STATUSES,
} from "@/lib/invoices";
import { formatDate } from "@/lib/date";
import { formatEuro } from "@/lib/format";
import { bulkArchiveInvoices, bulkDeleteInvoices, bulkSetInvoiceStatus, duplicateInvoice } from "@/app/(dashboard)/rechnungen/actions";

export type InvoiceRow = {
  id: string;
  invoiceNumber: string | null;
  kind: string;
  status: string;
  effectiveStatus: string;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  gross: number;
  paidAmount: number;
  dueDate: string | null;
  assignedToName: string | null;
  paymentMethod: string | null;
  orderLabel: string | null;
  dunningLevel: number;
  isArchived: boolean;
};

type ColumnKey = "paymentMethod" | "order" | "dunning" | "paid";

const COLUMN_DEFS: Array<{ key: ColumnKey; label: string }> = [
  { key: "paymentMethod", label: "Zahlungsart" },
  { key: "order", label: "Projekt / Auftragsnummer" },
  { key: "dunning", label: "Mahnstufe" },
  { key: "paid", label: "Bezahlter Betrag" },
];

const STORAGE_KEY = "kanalpro:rechnungen:columns";
const COLUMNS_EVENT = "kanalpro:rechnungen:columns-changed";
const DEFAULT_VISIBLE: ColumnKey[] = [];

function subscribeToColumnPrefs(callback: () => void) {
  window.addEventListener(COLUMNS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(COLUMNS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
function getColumnPrefsSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}
function getColumnPrefsServerSnapshot() {
  return "";
}
function parseVisibleColumns(raw: string): Set<ColumnKey> {
  if (!raw) return new Set(DEFAULT_VISIBLE);
  try {
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed.filter((k): k is ColumnKey => COLUMN_DEFS.some((c) => c.key === k)));
  } catch {
    return new Set(DEFAULT_VISIBLE);
  }
}

function escapeCsvCell(value: string) {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// "Export (PDF/Excel)": CSV ist von Excel direkt zu öffnen; für PDF gibt es
// keine echte Server-seitige PDF-Bibliothek in diesem Projekt – stattdessen
// öffnet exportInvoicesPdf ein druckfertiges HTML-Fenster, das der Browser
// per "Als PDF speichern" sichern kann (gleiches Muster wie
// MaterialTable.tsx exportMaterialPdf).
function exportInvoicesCsv(rows: InvoiceRow[]) {
  const headers = ["Nummer", "Typ", "Kunde", "Betrag", "Bezahlt", "Status", "Fällig", "Bearbeiter", "Zahlungsart", "Projekt/Auftrag", "Mahnstufe"];
  const lines = [headers.join(";")];
  for (const r of rows) {
    const cells = [
      r.invoiceNumber ?? "",
      INVOICE_KIND_LABELS[r.kind] ?? r.kind,
      r.customerName ?? "",
      r.gross.toFixed(2).replace(".", ","),
      r.paidAmount.toFixed(2).replace(".", ","),
      STATUS_LABELS[r.effectiveStatus] ?? r.effectiveStatus,
      r.dueDate ? formatDate(r.dueDate) : "",
      r.assignedToName ?? "",
      r.paymentMethod ? PAYMENT_METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod : "",
      r.orderLabel ?? "",
      String(r.dunningLevel),
    ];
    lines.push(cells.map(escapeCsvCell).join(";"));
  }
  const csv = "﻿" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `angebote-rechnungen-export-${rows.length}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportInvoicesPdf(rows: InvoiceRow[]) {
  const win = window.open("", "_blank");
  if (!win) return;
  const rowsHtml = rows
    .map(
      (r) => `<tr>
        <td>${r.invoiceNumber ?? "—"}</td>
        <td>${INVOICE_KIND_LABELS[r.kind] ?? r.kind}</td>
        <td>${r.customerName ?? "—"}</td>
        <td>${formatEuro(r.gross)}</td>
        <td>${STATUS_LABELS[r.effectiveStatus] ?? r.effectiveStatus}</td>
        <td>${r.dueDate ? formatDate(r.dueDate) : "—"}</td>
        <td>${r.assignedToName ?? "—"}</td>
      </tr>`,
    )
    .join("");
  win.document.write(`<!DOCTYPE html>
    <html lang="de"><head><meta charset="utf-8" /><title>Angebote &amp; Rechnungen Export</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      p { color: #6b7280; font-size: 12px; margin-top: 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
      th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
      th { background: #f9fafb; }
    </style></head>
    <body>
      <h1>Angebote &amp; Rechnungen</h1>
      <p>${rows.length} Eintrag${rows.length === 1 ? "" : "e"} · Exportiert am ${formatDate(new Date().toISOString())}</p>
      <table>
        <thead><tr><th>Nr.</th><th>Typ</th><th>Kunde</th><th>Betrag</th><th>Status</th><th>Fällig</th><th>Bearbeiter</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <script>window.onload = () => window.print();</script>
    </body></html>`);
  win.document.close();
}

type SortKey = "date" | "amount" | "customer" | "status";

export function InvoiceTable({
  items,
  panelBaseQuery,
  showingArchived = false,
}: {
  items: InvoiceRow[];
  panelBaseQuery: string;
  showingArchived?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" });

  const columnPrefsRaw = useSyncExternalStore(subscribeToColumnPrefs, getColumnPrefsSnapshot, getColumnPrefsServerSnapshot);
  const visible = useMemo(() => parseVisibleColumns(columnPrefsRaw), [columnPrefsRaw]);

  function toggleColumn(key: ColumnKey) {
    const next = new Set(visible);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      window.dispatchEvent(new Event(COLUMNS_EVENT));
    } catch {
      // localStorage nicht verfügbar
    }
  }

  function panelHref(id: string) {
    const params = new URLSearchParams(panelBaseQuery);
    params.delete("panelTab");
    params.set("panel", id);
    return `/rechnungen?${params.toString()}`;
  }
  function panelHrefTab(id: string, tab: string) {
    const params = new URLSearchParams(panelBaseQuery);
    params.set("panel", id);
    params.set("panelTab", tab);
    return `/rechnungen?${params.toString()}`;
  }
  function customerHref(customerId: string) {
    const params = new URLSearchParams(panelBaseQuery);
    params.delete("panel");
    params.delete("panelTab");
    params.set("customerPreview", customerId);
    return `/rechnungen?${params.toString()}`;
  }

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  const sortedItems = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sort.key === "amount") cmp = a.gross - b.gross;
      else if (sort.key === "customer") cmp = (a.customerName ?? "").localeCompare(b.customerName ?? "");
      else if (sort.key === "status") cmp = (STATUS_LABELS[a.effectiveStatus] ?? "").localeCompare(STATUS_LABELS[b.effectiveStatus] ?? "");
      else cmp = (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [items, sort]);

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  }
  function toggleSelectOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection() {
    setSelected(new Set());
    setStatusMenuOpen(false);
  }

  function handleBulkArchiveToggle() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startTransition(async () => {
      await bulkArchiveInvoices(ids, !showingArchived);
      clearSelection();
      router.refresh();
    });
  }
  function handleBulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const ok = window.confirm(`${ids.length} Eintrag/Einträge wirklich endgültig löschen? Dies kann nicht rückgängig gemacht werden.`);
    if (!ok) return;
    startTransition(async () => {
      const result = await bulkDeleteInvoices(ids);
      clearSelection();
      router.refresh();
      if (result?.error) window.alert(result.error);
    });
  }
  function handleBulkStatus(status: string) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startTransition(async () => {
      await bulkSetInvoiceStatus(ids, status);
      clearSelection();
      router.refresh();
    });
  }
  function handleBulkPrint() {
    exportInvoicesPdf(items.filter((i) => selected.has(i.id)));
  }

  const actionBtnClass =
    "flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-background hover:text-foreground";

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background/60 px-3 py-2">
        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{selected.size} ausgewählt</span>
            <button type="button" onClick={clearSelection} className={actionBtnClass}>
              Auswahl aufheben
            </button>
          </div>
        ) : (
          <span />
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {selected.size > 0 && (
            <>
              <button type="button" onClick={() => exportInvoicesCsv(items.filter((i) => selected.has(i.id)))} className={actionBtnClass}>
                <Download className="h-3.5 w-3.5" />
                CSV / Excel
              </button>
              <button type="button" onClick={() => exportInvoicesPdf(items.filter((i) => selected.has(i.id)))} className={actionBtnClass}>
                <Download className="h-3.5 w-3.5" />
                PDF
              </button>
              <button type="button" onClick={handleBulkPrint} className={actionBtnClass}>
                <FileText className="h-3.5 w-3.5" />
                Drucken
              </button>

              <div className="relative">
                <button type="button" onClick={() => setStatusMenuOpen((v) => !v)} className={actionBtnClass}>
                  Status setzen
                </button>
                {statusMenuOpen && (
                  <>
                    <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Menü schließen" onClick={() => setStatusMenuOpen(false)} />
                    <div className="absolute right-0 z-20 mt-2 max-h-72 w-48 overflow-y-auto rounded-lg border border-border bg-card p-1.5 shadow-lg">
                      {ALL_STATUSES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setStatusMenuOpen(false);
                            handleBulkStatus(s);
                          }}
                          className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-background"
                        >
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button type="button" onClick={handleBulkArchiveToggle} className={actionBtnClass}>
                {showingArchived ? (
                  <>
                    <ArchiveRestore className="h-3.5 w-3.5" />
                    Dearchivieren
                  </>
                ) : (
                  <>
                    <Archive className="h-3.5 w-3.5" />
                    Archivieren
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Löschen
              </button>
            </>
          )}

          <div className="relative">
            <button type="button" onClick={() => setMenuOpen((v) => !v)} className={actionBtnClass}>
              <Columns3 className="h-3.5 w-3.5" />
              Spalten
            </button>
            {menuOpen && (
              <>
                <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Menü schließen" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 max-h-80 w-64 overflow-y-auto rounded-lg border border-border bg-card p-2 shadow-lg">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">Sichtbare Spalten</p>
                  {COLUMN_DEFS.map((col) => (
                    <label key={col.key} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-background">
                      <input type="checkbox" checked={visible.has(col.key)} onChange={() => toggleColumn(col.key)} className="accent-brand" />
                      {col.label}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background text-xs uppercase text-muted">
            <tr>
              <th className="w-10 px-3 py-3">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} aria-label="Alle auswählen" className="h-4 w-4 rounded border-border text-brand focus:ring-brand" />
              </th>
              <th className="px-4 py-3 font-medium">Nr.</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Typ</th>
              <th className="hidden cursor-pointer px-4 py-3 font-medium md:table-cell" onClick={() => toggleSort("customer")}>
                Kunde {sort.key === "customer" && (sort.dir === "asc" ? "↑" : "↓")}
              </th>
              <th className="cursor-pointer px-4 py-3 text-right font-medium" onClick={() => toggleSort("amount")}>
                Betrag {sort.key === "amount" && (sort.dir === "asc" ? "↑" : "↓")}
              </th>
              {visible.has("paid") && <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Bezahlt</th>}
              <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort("status")}>
                Status {sort.key === "status" && (sort.dir === "asc" ? "↑" : "↓")}
              </th>
              <th className="hidden cursor-pointer px-4 py-3 font-medium lg:table-cell" onClick={() => toggleSort("date")}>
                Fällig {sort.key === "date" && (sort.dir === "asc" ? "↑" : "↓")}
              </th>
              <th className="hidden px-4 py-3 font-medium xl:table-cell">Bearbeiter</th>
              {visible.has("paymentMethod") && <th className="hidden px-4 py-3 font-medium xl:table-cell">Zahlungsart</th>}
              {visible.has("order") && <th className="hidden px-4 py-3 font-medium xl:table-cell">Projekt / Auftrag</th>}
              {visible.has("dunning") && <th className="hidden px-4 py-3 font-medium xl:table-cell">Mahnstufe</th>}
              <th className="w-40 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => (
              <tr key={item.id} className="group border-b border-border transition-colors last:border-0 hover:bg-background/70">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelectOne(item.id)}
                    aria-label={`${item.invoiceNumber ?? "Eintrag"} auswählen`}
                    className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link href={panelHref(item.id)} className="font-medium text-foreground hover:text-brand">
                    {item.invoiceNumber ?? "Ohne Nummer"}
                  </Link>
                  <p className="text-xs text-muted sm:hidden">{INVOICE_KIND_LABELS[item.kind] ?? item.kind}</p>
                </td>
                <td className="hidden px-4 py-3 text-muted sm:table-cell">{INVOICE_KIND_LABELS[item.kind] ?? item.kind}</td>
                <td className="hidden px-4 py-3 md:table-cell">
                  {item.customerId && item.customerName ? (
                    <Link href={customerHref(item.customerId)} className="text-foreground hover:text-brand hover:underline">
                      {item.customerName}
                    </Link>
                  ) : (
                    <span className="text-muted">{item.customerName ?? "—"}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{formatEuro(item.gross)}</td>
                {visible.has("paid") && <td className="hidden px-4 py-3 text-right tabular-nums text-muted lg:table-cell">{formatEuro(item.paidAmount)}</td>}
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[item.effectiveStatus] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABELS[item.effectiveStatus] ?? item.effectiveStatus}
                  </span>
                  {item.isArchived && <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Archiviert</span>}
                </td>
                <td className="hidden px-4 py-3 text-muted lg:table-cell">{item.dueDate ? formatDate(item.dueDate) : "—"}</td>
                <td className="hidden px-4 py-3 text-muted xl:table-cell">{item.assignedToName ?? "—"}</td>
                {visible.has("paymentMethod") && (
                  <td className="hidden px-4 py-3 text-muted xl:table-cell">{item.paymentMethod ? PAYMENT_METHOD_LABELS[item.paymentMethod] ?? item.paymentMethod : "—"}</td>
                )}
                {visible.has("order") && <td className="hidden px-4 py-3 text-muted xl:table-cell">{item.orderLabel ?? "—"}</td>}
                {visible.has("dunning") && (
                  <td className="hidden px-4 py-3 text-muted xl:table-cell">{item.dunningLevel > 0 ? DUNNING_LABELS[item.dunningLevel] : "—"}</td>
                )}
                <td className="px-2 py-3">
                  <div className="flex items-center justify-end gap-0.5">
                    <div className="hidden items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 lg:flex">
                      <Link href={panelHref(item.id)} title="Anzeigen" className="rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground">
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link href={`/rechnungen/${item.id}/pdf`} target="_blank" title="PDF öffnen" className="rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground">
                        <FileText className="h-4 w-4" />
                      </Link>
                      {item.customerEmail && (
                        <a
                          href={`mailto:${item.customerEmail}?subject=${encodeURIComponent(`${INVOICE_KIND_LABELS[item.kind] ?? item.kind} ${item.invoiceNumber ?? ""}`)}`}
                          title="Per Mail senden"
                          className="rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        title="Löschen"
                        onClick={() => {
                          if (!window.confirm("Diesen Eintrag unwiderruflich löschen?")) return;
                          startTransition(async () => {
                            const result = await bulkDeleteInvoices([item.id]);
                            router.refresh();
                            if (result?.error) window.alert(result.error);
                          });
                        }}
                        className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setRowMenuOpenId(rowMenuOpenId === item.id ? null : item.id)}
                        className="rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground"
                        aria-label="Weitere Aktionen"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {rowMenuOpenId === item.id && (
                        <>
                          <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Menü schließen" onClick={() => setRowMenuOpenId(null)} />
                          <div className="absolute right-2 z-20 mt-1 w-52 rounded-lg border border-border bg-card p-1.5 shadow-lg">
                            <Link href={panelHref(item.id)} onClick={() => setRowMenuOpenId(null)} className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-background">
                              <Pencil className="h-3.5 w-3.5" />
                              Bearbeiten
                            </Link>
                            <Link href={`/rechnungen/${item.id}/pdf`} target="_blank" onClick={() => setRowMenuOpenId(null)} className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-background">
                              <Download className="h-3.5 w-3.5" />
                              Download (PDF-Vorschau)
                            </Link>
                            {item.kind === "rechnung" && (
                              <Link
                                href={panelHrefTab(item.id, "zahlung")}
                                onClick={() => setRowMenuOpenId(null)}
                                className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-background"
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                                Zahlung erfassen
                              </Link>
                            )}
                            <form action={duplicateInvoice.bind(null, item.id, panelHref(item.id))}>
                              <button
                                type="submit"
                                onClick={() => setRowMenuOpenId(null)}
                                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-background"
                              >
                                <Copy className="h-3.5 w-3.5" />
                                Kopieren
                              </button>
                            </form>
                            <button
                              type="button"
                              onClick={() => {
                                setRowMenuOpenId(null);
                                startTransition(async () => {
                                  await bulkArchiveInvoices([item.id], !item.isArchived);
                                  router.refresh();
                                });
                              }}
                              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-background"
                            >
                              {item.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                              {item.isArchived ? "Dearchivieren" : "Archivieren"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRowMenuOpenId(null);
                                if (!window.confirm("Diesen Eintrag unwiderruflich löschen?")) return;
                                startTransition(async () => {
                                  const result = await bulkDeleteInvoices([item.id]);
                                  router.refresh();
                                  if (result?.error) window.alert(result.error);
                                });
                              }}
                              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Löschen
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
