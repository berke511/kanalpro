"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Columns3, Download, MoreVertical, Trash2 } from "lucide-react";
import {
  FLEET_KIND_LABELS,
  FLEET_STATUS_BADGE_CLASS,
  FLEET_STATUS_LABELS,
  FLEET_STATUSES,
  initialsFor,
  isDueSoon,
  isOverdue,
} from "@/lib/fleet";
import { formatDate } from "@/lib/date";
import { bulkDeleteFleetItems, bulkSetFleetArchived, bulkSetFleetStatus } from "@/app/(dashboard)/fahrzeuge/actions";

export type FleetRow = {
  id: string;
  kind: string;
  name: string;
  licensePlate: string | null;
  status: string;
  photoUrl: string | null;
  inventoryNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  yearBuilt: number | null;
  location: string | null;
  assignedEmployeeNames: string[];
  currentOrderTitle: string | null;
  odometerKm: number | null;
  operatingHours: number | null;
  lastMaintenanceAt: string | null;
  nextMaintenanceAt: string | null;
  tuvDueDate: string | null;
  uvvDueDate: string | null;
  maintenanceProgress: number | null;
  isArchived: boolean;
};

type ColumnKey =
  | "kind"
  | "inventory_number"
  | "manufacturer_model"
  | "year_built"
  | "location"
  | "assigned_employee"
  | "current_order"
  | "mileage"
  | "next_maintenance"
  | "tuv_uvv"
  | "last_maintenance"
  | "progress"
  | "priority";

const COLUMN_DEFS: Array<{ key: ColumnKey; label: string }> = [
  { key: "kind", label: "Typ" },
  { key: "inventory_number", label: "Inventarnr." },
  { key: "manufacturer_model", label: "Hersteller / Modell" },
  { key: "year_built", label: "Baujahr" },
  { key: "location", label: "Standort" },
  { key: "assigned_employee", label: "Zugewiesener Mitarbeiter" },
  { key: "current_order", label: "Aktueller Auftrag" },
  { key: "mileage", label: "Km-Stand / Betriebsstunden" },
  { key: "next_maintenance", label: "Nächste Wartung" },
  { key: "tuv_uvv", label: "TÜV / UVV" },
  { key: "last_maintenance", label: "Letzte Wartung" },
  { key: "progress", label: "Fortschritt" },
  { key: "priority", label: "Einsatzbereitschaft" },
];

const STORAGE_KEY = "kanalpro:fahrzeuge:columns";
const COLUMNS_EVENT = "kanalpro:fahrzeuge:columns-changed";
const DEFAULT_VISIBLE: ColumnKey[] = ["kind"];

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

function priorityLabel(row: FleetRow): { label: string; className: string } {
  if (row.status === "defekt" || row.status === "ausser_betrieb") {
    return { label: "Nicht einsatzbereit", className: "bg-red-50 text-red-700" };
  }
  if (isOverdue(row.nextMaintenanceAt) || isOverdue(row.tuvDueDate) || isOverdue(row.uvvDueDate)) {
    return { label: "Termin überfällig", className: "bg-red-50 text-red-700" };
  }
  if (isDueSoon(row.nextMaintenanceAt) || isDueSoon(row.tuvDueDate) || isDueSoon(row.uvvDueDate)) {
    return { label: "Termin bald fällig", className: "bg-amber-50 text-amber-700" };
  }
  if (row.status === "verfuegbar") {
    return { label: "Einsatzbereit", className: "bg-green-50 text-green-700" };
  }
  return { label: "—", className: "bg-gray-100 text-gray-500" };
}

function exportFleetCsv(rows: FleetRow[]) {
  const headers = [
    "Bezeichnung",
    "Kennzeichen",
    "Typ",
    "Status",
    "Inventarnummer",
    "Hersteller",
    "Modell",
    "Baujahr",
    "Standort",
    "Zugewiesener Mitarbeiter",
    "Aktueller Auftrag",
    "Km-Stand",
    "Betriebsstunden",
    "Letzte Wartung",
    "Nächste Wartung",
    "TÜV fällig",
    "UVV fällig",
    "Archiviert",
  ];
  const lines = [headers.join(";")];
  for (const r of rows) {
    const cells = [
      r.name,
      r.licensePlate ?? "",
      FLEET_KIND_LABELS[r.kind] ?? r.kind,
      FLEET_STATUS_LABELS[r.status] ?? r.status,
      r.inventoryNumber ?? "",
      r.manufacturer ?? "",
      r.model ?? "",
      r.yearBuilt ? String(r.yearBuilt) : "",
      r.location ?? "",
      r.assignedEmployeeNames.join(", "),
      r.currentOrderTitle ?? "",
      r.odometerKm !== null ? String(r.odometerKm) : "",
      r.operatingHours !== null ? String(r.operatingHours) : "",
      r.lastMaintenanceAt ? formatDate(r.lastMaintenanceAt) : "",
      r.nextMaintenanceAt ? formatDate(r.nextMaintenanceAt) : "",
      r.tuvDueDate ? formatDate(r.tuvDueDate) : "",
      r.uvvDueDate ? formatDate(r.uvvDueDate) : "",
      r.isArchived ? "Ja" : "Nein",
    ];
    lines.push(cells.map(escapeCsvCell).join(";"));
  }
  const csv = "﻿" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fahrzeuge-export-${rows.length}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportFleetPdf(rows: FleetRow[]) {
  const win = window.open("", "_blank");
  if (!win) return;
  const rowsHtml = rows
    .map(
      (r) => `<tr>
        <td>${r.name}${r.licensePlate ? ` (${r.licensePlate})` : ""}</td>
        <td>${FLEET_KIND_LABELS[r.kind] ?? r.kind}</td>
        <td>${FLEET_STATUS_LABELS[r.status] ?? r.status}</td>
        <td>${[r.manufacturer, r.model].filter(Boolean).join(" ") || "—"}</td>
        <td>${r.location ?? "—"}</td>
        <td>${r.assignedEmployeeNames.join(", ") || "—"}</td>
        <td>${r.nextMaintenanceAt ? formatDate(r.nextMaintenanceAt) : "—"}</td>
        <td>${r.tuvDueDate ? formatDate(r.tuvDueDate) : "—"}</td>
      </tr>`,
    )
    .join("");
  win.document.write(`<!DOCTYPE html>
    <html lang="de"><head><meta charset="utf-8" /><title>Fahrzeuge Export</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      p { color: #6b7280; font-size: 12px; margin-top: 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
      th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
      th { background: #f9fafb; }
    </style></head>
    <body>
      <h1>Fahrzeug- & Maschinenübersicht</h1>
      <p>${rows.length} Eintrag${rows.length === 1 ? "" : "e"} · Exportiert am ${formatDate(new Date().toISOString())}</p>
      <table>
        <thead><tr><th>Bezeichnung</th><th>Typ</th><th>Status</th><th>Hersteller/Modell</th><th>Standort</th><th>Mitarbeiter</th><th>Nächste Wartung</th><th>TÜV</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <script>window.onload = () => window.print();</script>
    </body></html>`);
  win.document.close();
}

export function FleetTable({
  items,
  showingArchived = false,
}: {
  items: FleetRow[];
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

  function detailHref(id: string) {
    return `/fahrzeuge/${id}`;
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
    exportFleetCsv(items.filter((i) => selected.has(i.id)));
  }
  function handleExportPdf() {
    exportFleetPdf(items.filter((i) => selected.has(i.id)));
  }
  function handleBulkArchiveToggle() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startTransition(async () => {
      await bulkSetFleetArchived(ids, !showingArchived);
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
      await bulkDeleteFleetItems(ids);
      clearSelection();
      router.refresh();
    });
  }
  function handleBulkStatus(status: string) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startTransition(async () => {
      await bulkSetFleetStatus(ids, status);
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
                <button
                  type="button"
                  onClick={() => setStatusMenuOpen((v) => !v)}
                  className={actionBtnClass}
                >
                  Status setzen
                </button>
                {statusMenuOpen && (
                  <>
                    <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Menü schließen" onClick={() => setStatusMenuOpen(false)} />
                    <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-border bg-card p-1.5 shadow-lg">
                      {FLEET_STATUSES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setStatusMenuOpen(false);
                            handleBulkStatus(s);
                          }}
                          className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-background"
                        >
                          {FLEET_STATUS_LABELS[s]}
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
              {visible.has("kind") && <th className="hidden px-4 py-3 font-medium sm:table-cell">Typ</th>}
              {visible.has("inventory_number") && <th className="hidden px-4 py-3 font-medium lg:table-cell">Inventarnr.</th>}
              {visible.has("manufacturer_model") && <th className="hidden px-4 py-3 font-medium lg:table-cell">Hersteller / Modell</th>}
              {visible.has("year_built") && <th className="hidden px-4 py-3 font-medium xl:table-cell">Baujahr</th>}
              {visible.has("location") && <th className="hidden px-4 py-3 font-medium lg:table-cell">Standort</th>}
              <th className="px-4 py-3 font-medium">Status</th>
              {visible.has("assigned_employee") && <th className="hidden px-4 py-3 font-medium md:table-cell">Mitarbeiter</th>}
              {visible.has("current_order") && <th className="hidden px-4 py-3 font-medium lg:table-cell">Aktueller Auftrag</th>}
              {visible.has("mileage") && <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Km / Std.</th>}
              {visible.has("next_maintenance") && <th className="hidden px-4 py-3 font-medium md:table-cell">Nächste Wartung</th>}
              {visible.has("tuv_uvv") && <th className="hidden px-4 py-3 font-medium lg:table-cell">TÜV / UVV</th>}
              {visible.has("last_maintenance") && <th className="hidden px-4 py-3 font-medium xl:table-cell">Letzte Wartung</th>}
              {visible.has("progress") && <th className="hidden px-4 py-3 font-medium xl:table-cell">Fortschritt</th>}
              {visible.has("priority") && <th className="hidden px-4 py-3 font-medium lg:table-cell">Einsatzbereitschaft</th>}
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const prio = priorityLabel(item);
              return (
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
                    <Link href={detailHref(item.id)} className="font-medium text-foreground hover:text-brand">
                      {item.name}
                    </Link>
                    {item.licensePlate && <p className="text-xs text-muted">{item.licensePlate}</p>}
                  </td>
                  {visible.has("kind") && <td className="hidden px-4 py-3 text-muted sm:table-cell">{FLEET_KIND_LABELS[item.kind] ?? item.kind}</td>}
                  {visible.has("inventory_number") && <td className="hidden px-4 py-3 text-muted lg:table-cell">{item.inventoryNumber ?? "—"}</td>}
                  {visible.has("manufacturer_model") && (
                    <td className="hidden px-4 py-3 text-muted lg:table-cell">{[item.manufacturer, item.model].filter(Boolean).join(" ") || "—"}</td>
                  )}
                  {visible.has("year_built") && <td className="hidden px-4 py-3 text-muted xl:table-cell">{item.yearBuilt ?? "—"}</td>}
                  {visible.has("location") && <td className="hidden px-4 py-3 text-muted lg:table-cell">{item.location ?? "—"}</td>}
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${FLEET_STATUS_BADGE_CLASS[item.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {FLEET_STATUS_LABELS[item.status] ?? item.status}
                    </span>
                    {item.isArchived && <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Archiviert</span>}
                  </td>
                  {visible.has("assigned_employee") && (
                    <td className="hidden px-4 py-3 text-muted md:table-cell">{item.assignedEmployeeNames.join(", ") || "—"}</td>
                  )}
                  {visible.has("current_order") && <td className="hidden px-4 py-3 text-muted lg:table-cell">{item.currentOrderTitle ?? "—"}</td>}
                  {visible.has("mileage") && (
                    <td className="hidden px-4 py-3 text-right tabular-nums text-muted lg:table-cell">
                      {item.odometerKm !== null ? `${item.odometerKm.toLocaleString("de-DE")} km` : item.operatingHours !== null ? `${item.operatingHours} Std.` : "—"}
                    </td>
                  )}
                  {visible.has("next_maintenance") && (
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className={isOverdue(item.nextMaintenanceAt) ? "font-medium text-red-600" : isDueSoon(item.nextMaintenanceAt) ? "font-medium text-amber-600" : "text-muted"}>
                        {item.nextMaintenanceAt ? formatDate(item.nextMaintenanceAt) : "—"}
                      </span>
                    </td>
                  )}
                  {visible.has("tuv_uvv") && (
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className={isOverdue(item.tuvDueDate) ? "font-medium text-red-600" : isDueSoon(item.tuvDueDate) ? "font-medium text-amber-600" : "text-muted"}>
                          TÜV: {item.tuvDueDate ? formatDate(item.tuvDueDate) : "—"}
                        </span>
                        <span className={isOverdue(item.uvvDueDate) ? "font-medium text-red-600" : isDueSoon(item.uvvDueDate) ? "font-medium text-amber-600" : "text-muted"}>
                          UVV: {item.uvvDueDate ? formatDate(item.uvvDueDate) : "—"}
                        </span>
                      </div>
                    </td>
                  )}
                  {visible.has("last_maintenance") && (
                    <td className="hidden px-4 py-3 text-muted xl:table-cell">{item.lastMaintenanceAt ? formatDate(item.lastMaintenanceAt) : "—"}</td>
                  )}
                  {visible.has("progress") && (
                    <td className="hidden px-4 py-3 xl:table-cell">
                      {item.maintenanceProgress !== null ? (
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-background">
                          <div
                            className={`h-full rounded-full ${item.maintenanceProgress >= 100 ? "bg-red-500" : item.maintenanceProgress >= 75 ? "bg-amber-500" : "bg-brand"}`}
                            style={{ width: `${Math.min(100, Math.max(4, item.maintenanceProgress))}%` }}
                          />
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  )}
                  {visible.has("priority") && (
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${prio.className}`}>{prio.label}</span>
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
                        <div className="absolute right-2 z-20 mt-1 w-44 rounded-lg border border-border bg-card p-1.5 shadow-lg">
                          <Link href={detailHref(item.id)} onClick={() => setRowMenuOpenId(null)} className="block rounded-md px-2.5 py-1.5 text-sm hover:bg-background">
                            Details öffnen
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setRowMenuOpenId(null);
                              startTransition(async () => {
                                await bulkSetFleetArchived([item.id], !item.isArchived);
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
                                await bulkDeleteFleetItems([item.id]);
                                router.refresh();
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
