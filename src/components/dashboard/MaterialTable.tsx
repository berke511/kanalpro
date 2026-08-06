"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Columns3, Download, MoreVertical, Trash2 } from "lucide-react";
import {
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_STATUS_BADGE_CLASS,
  MATERIAL_STATUS_LABELS,
  MATERIAL_STATUSES,
  initialsFor,
} from "@/lib/materials";
import { formatDate } from "@/lib/date";
import { bulkDeleteMaterials, bulkSetMaterialArchived, bulkSetMaterialStatus } from "@/app/(dashboard)/material/actions";

export type MaterialRow = {
  id: string;
  materialNumber: string | null;
  name: string;
  category: string | null;
  status: string;
  photoUrl: string | null;
  location: string | null;
  supplierName: string | null;
  quantity: number;
  minQuantity: number | null;
  reservedQuantity: number;
  availableQuantity: number;
  unit: string;
  lastOrderedAt: string | null;
  isArchived: boolean;
};

type ColumnKey = "category" | "location" | "min_quantity" | "reserved" | "available" | "unit" | "supplier" | "last_ordered";

const COLUMN_DEFS: Array<{ key: ColumnKey; label: string }> = [
  { key: "category", label: "Kategorie" },
  { key: "location", label: "Lagerort" },
  { key: "min_quantity", label: "Mindestbestand" },
  { key: "reserved", label: "Reserviert" },
  { key: "available", label: "Verfügbar" },
  { key: "unit", label: "Einheit" },
  { key: "supplier", label: "Lieferant" },
  { key: "last_ordered", label: "Letzte Bestellung" },
];

const STORAGE_KEY = "kanalpro:material:columns";
const COLUMNS_EVENT = "kanalpro:material:columns-changed";
// Bewusst schlank gehalten – bei geöffnetem Detailpanel bleibt sonst nicht
// genug Platz und die Tabelle muss horizontal gescrollt werden (siehe die
// analoge Korrektur bei der Fahrzeugtabelle, FleetTable.tsx).
const DEFAULT_VISIBLE: ColumnKey[] = ["category"];

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

function exportMaterialCsv(rows: MaterialRow[]) {
  const headers = [
    "Materialnummer",
    "Bezeichnung",
    "Kategorie",
    "Status",
    "Lagerort",
    "Bestand",
    "Mindestbestand",
    "Reserviert",
    "Verfügbar",
    "Einheit",
    "Lieferant",
    "Letzte Bestellung",
    "Archiviert",
  ];
  const lines = [headers.join(";")];
  for (const r of rows) {
    const cells = [
      r.materialNumber ?? "",
      r.name,
      MATERIAL_CATEGORY_LABELS[r.category ?? ""] ?? r.category ?? "",
      MATERIAL_STATUS_LABELS[r.status] ?? r.status,
      r.location ?? "",
      String(r.quantity),
      r.minQuantity !== null ? String(r.minQuantity) : "",
      String(r.reservedQuantity),
      String(r.availableQuantity),
      r.unit,
      r.supplierName ?? "",
      r.lastOrderedAt ? formatDate(r.lastOrderedAt) : "",
      r.isArchived ? "Ja" : "Nein",
    ];
    lines.push(cells.map(escapeCsvCell).join(";"));
  }
  const csv = "﻿" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `material-export-${rows.length}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportMaterialPdf(rows: MaterialRow[]) {
  const win = window.open("", "_blank");
  if (!win) return;
  const rowsHtml = rows
    .map(
      (r) => `<tr>
        <td>${r.materialNumber ?? "—"}</td>
        <td>${r.name}</td>
        <td>${MATERIAL_CATEGORY_LABELS[r.category ?? ""] ?? r.category ?? "—"}</td>
        <td>${MATERIAL_STATUS_LABELS[r.status] ?? r.status}</td>
        <td>${r.location ?? "—"}</td>
        <td>${r.quantity} ${r.unit}</td>
        <td>${r.availableQuantity} ${r.unit}</td>
        <td>${r.supplierName ?? "—"}</td>
      </tr>`,
    )
    .join("");
  win.document.write(`<!DOCTYPE html>
    <html lang="de"><head><meta charset="utf-8" /><title>Material Export</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      p { color: #6b7280; font-size: 12px; margin-top: 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
      th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
      th { background: #f9fafb; }
    </style></head>
    <body>
      <h1>Materialübersicht</h1>
      <p>${rows.length} Eintrag${rows.length === 1 ? "" : "e"} · Exportiert am ${formatDate(new Date().toISOString())}</p>
      <table>
        <thead><tr><th>Nr.</th><th>Bezeichnung</th><th>Kategorie</th><th>Status</th><th>Lagerort</th><th>Bestand</th><th>Verfügbar</th><th>Lieferant</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <script>window.onload = () => window.print();</script>
    </body></html>`);
  win.document.close();
}

export function MaterialTable({
  items,
  panelBaseQuery,
  showingArchived = false,
}: {
  items: MaterialRow[];
  panelBaseQuery: string;
  showingArchived?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
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
      // localStorage nicht verfügbar – Änderung bleibt dann nur für diese Anzeige ohne Effekt.
    }
  }

  function panelHref(id: string) {
    const params = new URLSearchParams(panelBaseQuery);
    params.delete("panelTab");
    params.set("panel", id);
    return `/material?${params.toString()}`;
  }

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

  function handleExportCsv() {
    exportMaterialCsv(items.filter((i) => selected.has(i.id)));
  }
  function handleExportPdf() {
    exportMaterialPdf(items.filter((i) => selected.has(i.id)));
  }
  function handleBulkArchiveToggle() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startTransition(async () => {
      await bulkSetMaterialArchived(ids, !showingArchived);
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
      const result = await bulkDeleteMaterials(ids);
      clearSelection();
      router.refresh();
      if (result?.error) window.alert(result.error);
    });
  }
  function handleBulkStatus(status: string) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startTransition(async () => {
      await bulkSetMaterialStatus(ids, status);
      clearSelection();
      router.refresh();
    });
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
              <button type="button" onClick={handleExportCsv} className={actionBtnClass}>
                <Download className="h-3.5 w-3.5" />
                CSV / Excel
              </button>
              <button type="button" onClick={handleExportPdf} className={actionBtnClass}>
                <Download className="h-3.5 w-3.5" />
                PDF
              </button>

              <div className="relative">
                <button type="button" onClick={() => setStatusMenuOpen((v) => !v)} className={actionBtnClass}>
                  Status setzen
                </button>
                {statusMenuOpen && (
                  <>
                    <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Menü schließen" onClick={() => setStatusMenuOpen(false)} />
                    <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-border bg-card p-1.5 shadow-lg">
                      {MATERIAL_STATUSES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setStatusMenuOpen(false);
                            handleBulkStatus(s);
                          }}
                          className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-background"
                        >
                          {MATERIAL_STATUS_LABELS[s]}
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
              <th className="w-10 px-2 py-3" />
              <th className="px-4 py-3 font-medium">Bezeichnung</th>
              {visible.has("category") && <th className="hidden px-4 py-3 font-medium sm:table-cell">Kategorie</th>}
              {visible.has("location") && <th className="hidden px-4 py-3 font-medium lg:table-cell">Lagerort</th>}
              <th className="px-4 py-3 text-right font-medium">Bestand</th>
              {visible.has("min_quantity") && <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Mindestbestand</th>}
              {visible.has("reserved") && <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Reserviert</th>}
              {visible.has("available") && <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Verfügbar</th>}
              {visible.has("unit") && <th className="hidden px-4 py-3 font-medium xl:table-cell">Einheit</th>}
              <th className="px-4 py-3 font-medium">Status</th>
              {visible.has("supplier") && <th className="hidden px-4 py-3 font-medium lg:table-cell">Lieferant</th>}
              {visible.has("last_ordered") && <th className="hidden px-4 py-3 font-medium xl:table-cell">Letzte Bestellung</th>}
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="group border-b border-border transition-colors last:border-0 hover:bg-background/70">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelectOne(item.id)}
                    aria-label={`${item.name} auswählen`}
                    className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                  />
                </td>
                <td className="px-2 py-3">
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photoUrl} alt={item.name} className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-[10px] font-semibold text-brand">
                      {initialsFor(item.name)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link href={panelHref(item.id)} className="font-medium text-foreground hover:text-brand">
                    {item.name}
                  </Link>
                  {item.materialNumber && <p className="text-xs text-muted">{item.materialNumber}</p>}
                </td>
                {visible.has("category") && (
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">{MATERIAL_CATEGORY_LABELS[item.category ?? ""] ?? item.category ?? "—"}</td>
                )}
                {visible.has("location") && <td className="hidden px-4 py-3 text-muted lg:table-cell">{item.location ?? "—"}</td>}
                <td className="px-4 py-3 text-right tabular-nums">
                  <span className={item.quantity <= 0 ? "font-medium text-red-600" : item.minQuantity !== null && item.quantity <= item.minQuantity ? "font-medium text-amber-600" : "text-foreground"}>
                    {item.quantity.toLocaleString("de-DE")} {item.unit}
                  </span>
                </td>
                {visible.has("min_quantity") && (
                  <td className="hidden px-4 py-3 text-right tabular-nums text-muted lg:table-cell">{item.minQuantity !== null ? item.minQuantity.toLocaleString("de-DE") : "—"}</td>
                )}
                {visible.has("reserved") && (
                  <td className="hidden px-4 py-3 text-right tabular-nums text-muted lg:table-cell">{item.reservedQuantity.toLocaleString("de-DE")}</td>
                )}
                {visible.has("available") && (
                  <td className="hidden px-4 py-3 text-right tabular-nums text-muted lg:table-cell">{item.availableQuantity.toLocaleString("de-DE")}</td>
                )}
                {visible.has("unit") && <td className="hidden px-4 py-3 text-muted xl:table-cell">{item.unit}</td>}
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${MATERIAL_STATUS_BADGE_CLASS[item.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {MATERIAL_STATUS_LABELS[item.status] ?? item.status}
                  </span>
                  {item.isArchived && <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Archiviert</span>}
                </td>
                {visible.has("supplier") && <td className="hidden px-4 py-3 text-muted lg:table-cell">{item.supplierName ?? "—"}</td>}
                {visible.has("last_ordered") && (
                  <td className="hidden px-4 py-3 text-muted xl:table-cell">{item.lastOrderedAt ? formatDate(item.lastOrderedAt) : "—"}</td>
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
                      <div className="absolute right-2 z-20 mt-1 w-44 rounded-lg border border-border bg-card p-1.5 shadow-lg">
                        <Link href={panelHref(item.id)} onClick={() => setRowMenuOpenId(null)} className="block rounded-md px-2.5 py-1.5 text-sm hover:bg-background">
                          Details öffnen
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setRowMenuOpenId(null);
                            startTransition(async () => {
                              await bulkSetMaterialArchived([item.id], !item.isArchived);
                              router.refresh();
                            });
                          }}
                          className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-background"
                        >
                          {item.isArchived ? "Dearchivieren" : "Archivieren"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRowMenuOpenId(null);
                            if (!window.confirm("Diesen Eintrag unwiderruflich löschen?")) return;
                            startTransition(async () => {
                              const result = await bulkDeleteMaterials([item.id]);
                              router.refresh();
                              if (result?.error) window.alert(result.error);
                            });
                          }}
                          className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          Löschen
                        </button>
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
