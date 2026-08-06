"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Columns3, Download, FileText, MoreVertical, PenLine, Trash2 } from "lucide-react";
import { REPORT_STATUS_BADGE_CLASS, REPORT_STATUS_LABELS, formatMinutesAsHours } from "@/lib/reports";
import { formatDate } from "@/lib/date";
import { archiveReport, deleteReport } from "@/app/(dashboard)/berichte/actions";

export type ReportRow = {
  id: string;
  reportNumber: string | null;
  orderLabel: string;
  customerName: string | null;
  employeeNames: string[];
  reportDate: string;
  durationMinutes: number | null;
  status: string;
  signed: boolean;
  pdfGeneratedAt: string | null;
  isArchived: boolean;
};

type ColumnKey = "kunde" | "mitarbeiter" | "datum" | "dauer" | "unterschrift" | "pdf";

const COLUMN_DEFS: Array<{ key: ColumnKey; label: string }> = [
  { key: "kunde", label: "Kunde" },
  { key: "mitarbeiter", label: "Mitarbeiter" },
  { key: "datum", label: "Datum" },
  { key: "dauer", label: "Dauer" },
  { key: "unterschrift", label: "Unterschrift" },
  { key: "pdf", label: "PDF" },
];

const STORAGE_KEY = "kanalpro:berichte:columns";
const COLUMNS_EVENT = "kanalpro:berichte:columns-changed";
// Bewusst schlank gehalten (siehe MaterialTable.tsx / FleetTable.tsx) – bei
// geöffnetem Detailpanel bleibt sonst nicht genug Platz.
const DEFAULT_VISIBLE: ColumnKey[] = ["datum"];

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

export function exportReportsCsv(rows: ReportRow[]) {
  const headers = ["Berichtsnummer", "Auftrag", "Kunde", "Mitarbeiter", "Datum", "Dauer", "Status", "Unterschrieben", "Archiviert"];
  const lines = [headers.join(";")];
  for (const r of rows) {
    const cells = [
      r.reportNumber ?? "",
      r.orderLabel,
      r.customerName ?? "",
      r.employeeNames.join(", "),
      formatDate(r.reportDate),
      formatMinutesAsHours(r.durationMinutes),
      REPORT_STATUS_LABELS[r.status] ?? r.status,
      r.signed ? "Ja" : "Nein",
      r.isArchived ? "Ja" : "Nein",
    ];
    lines.push(cells.map(escapeCsvCell).join(";"));
  }
  const csv = "﻿" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `einsatzberichte-export-${rows.length}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ReportTable({
  items,
  panelBaseQuery,
  canManage,
}: {
  items: ReportRow[];
  panelBaseQuery: string;
  canManage: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

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
      // localStorage nicht verfügbar – Änderung bleibt ohne Effekt.
    }
  }

  function panelHref(id: string) {
    const params = new URLSearchParams(panelBaseQuery);
    params.delete("panelTab");
    params.set("panel", id);
    return `/berichte?${params.toString()}`;
  }

  const actionBtnClass =
    "flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-background hover:text-foreground";

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-end gap-2 border-b border-border bg-background/60 px-3 py-2">
        <button type="button" onClick={() => exportReportsCsv(items)} className={actionBtnClass}>
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
        <div className="relative">
          <button type="button" onClick={() => setMenuOpen((v) => !v)} className={actionBtnClass}>
            <Columns3 className="h-3.5 w-3.5" />
            Spalten
          </button>
          {menuOpen && (
            <>
              <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Menü schließen" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 max-h-80 w-56 overflow-y-auto rounded-lg border border-border bg-card p-2 shadow-lg">
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

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Bericht</th>
              <th className="px-4 py-3 font-medium">Auftrag</th>
              {visible.has("kunde") && <th className="hidden px-4 py-3 font-medium sm:table-cell">Kunde</th>}
              {visible.has("mitarbeiter") && <th className="hidden px-4 py-3 font-medium lg:table-cell">Mitarbeiter</th>}
              {visible.has("datum") && <th className="hidden px-4 py-3 font-medium md:table-cell">Datum</th>}
              {visible.has("dauer") && <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Dauer</th>}
              <th className="px-4 py-3 font-medium">Status</th>
              {visible.has("unterschrift") && <th className="hidden px-4 py-3 font-medium xl:table-cell">Unterschrift</th>}
              {visible.has("pdf") && <th className="hidden px-4 py-3 font-medium xl:table-cell">PDF</th>}
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="group border-b border-border transition-colors last:border-0 hover:bg-background/70">
                <td className="px-4 py-3">
                  <Link href={panelHref(item.id)} className="font-medium text-foreground hover:text-brand">
                    {item.reportNumber ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{item.orderLabel}</td>
                {visible.has("kunde") && <td className="hidden px-4 py-3 text-muted sm:table-cell">{item.customerName ?? "—"}</td>}
                {visible.has("mitarbeiter") && (
                  <td className="hidden px-4 py-3 text-muted lg:table-cell">{item.employeeNames.length ? item.employeeNames.join(", ") : "—"}</td>
                )}
                {visible.has("datum") && <td className="hidden px-4 py-3 text-muted md:table-cell">{formatDate(item.reportDate)}</td>}
                {visible.has("dauer") && <td className="hidden px-4 py-3 text-right tabular-nums text-muted lg:table-cell">{formatMinutesAsHours(item.durationMinutes)}</td>}
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REPORT_STATUS_BADGE_CLASS[item.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {REPORT_STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </td>
                {visible.has("unterschrift") && (
                  <td className="hidden px-4 py-3 xl:table-cell">
                    {item.signed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                        <PenLine className="h-3 w-3" /> Unterschrieben
                      </span>
                    ) : (
                      <span className="text-xs text-muted">Ausstehend</span>
                    )}
                  </td>
                )}
                {visible.has("pdf") && (
                  <td className="hidden px-4 py-3 xl:table-cell">
                    {item.pdfGeneratedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                        <FileText className="h-3 w-3" /> Erzeugt
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                )}
                <td className="relative px-2 py-3">
                  <button
                    type="button"
                    onClick={() => setRowMenuOpenId(rowMenuOpenId === item.id ? null : item.id)}
                    className="rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground"
                    aria-label="Schnellaktionen"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {rowMenuOpenId === item.id && (
                    <>
                      <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Menü schließen" onClick={() => setRowMenuOpenId(null)} />
                      <div className="absolute right-2 z-20 mt-1 w-48 rounded-lg border border-border bg-card p-1.5 shadow-lg">
                        <Link href={panelHref(item.id)} onClick={() => setRowMenuOpenId(null)} className="block rounded-md px-2.5 py-1.5 text-sm hover:bg-background">
                          Details öffnen
                        </Link>
                        {canManage && (
                          <>
                            <form action={archiveReport.bind(null, item.id, !item.isArchived, panelHref(item.id))}>
                              <button
                                type="submit"
                                onClick={() => setRowMenuOpenId(null)}
                                className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-background"
                              >
                                {item.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                                {item.isArchived ? "Dearchivieren" : "Archivieren"}
                              </button>
                            </form>
                            <form
                              action={deleteReport.bind(null, item.id, "/berichte")}
                              onSubmit={(e) => {
                                if (!window.confirm("Diesen Bericht unwiderruflich löschen?")) e.preventDefault();
                                setRowMenuOpenId(null);
                              }}
                            >
                              <button type="submit" className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-sm text-red-600 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" />
                                Löschen
                              </button>
                            </form>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
