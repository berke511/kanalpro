
"use client";

import { useMemo, useState, useSyncExternalStore, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Building2,
  CalendarClock,
  Columns3,
  Copy,
  Download,
  Eye,
  FileEdit,
  MoreVertical,
  Star,
  Trash2,
  Truck,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import {
  ORDER_KIND_LABELS,
  ORDER_PRIORITY_BADGE_CLASS,
  ORDER_PRIORITY_LABELS,
  ORDER_STATUSES,
  ORDER_STATUS_BADGE_CLASS,
  STATUS_LABELS,
} from "@/lib/orders";
import { formatDate, formatDateTime, formatTime } from "@/lib/date";
import { formatEuro } from "@/lib/format";
import {
  bulkAssignEmployeeToOrders,
  bulkAssignVehicleToOrders,
  bulkDeleteOrders,
  bulkSetOrderArchived,
  bulkSetOrderStatus,
  deleteOrder,
  duplicateOrder,
  setOrderArchived,
  toggleOrderFavorite,
} from "@/app/(dashboard)/auftraege/actions";

export type OrderRow = {
  id: string;
  order_number: string | null;
  title: string;
  order_kind: string;
  status: string;
  priority: string;
  is_favorite: boolean;
  is_archived: boolean;
  scheduled_date: string | null;
  start_time: string | null;
  customerId: string | null;
  propertyId: string | null;
  customerName: string | null;
  customerSecondLine: string | null;
  propertyName: string | null;
  propertyStreet: string | null;
  propertyCityLine: string | null;
  employees: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; name: string; licensePlate: string | null }>;
  progressPercent: number;
  created_at: string;
  updated_at: string;
  dispatcherName: string | null;
  order_value: number | null;
  planned_duration_minutes: number | null;
  isDocumented: boolean;
};

type ColumnKey =
  | "property"
  | "employees"
  | "vehicle"
  | "progress"
  | "created_at"
  | "updated_at"
  | "dispatcher"
  | "order_value"
  | "duration"
  | "documentation";

// Objekt/Mitarbeiter/Fahrzeug/Fortschritt sind bewusst Teil des optionalen
// "Spalten"-Menüs statt fest immer versucht angezeigt zu werden: die feste
// Breite (table-fixed) aller "immer sichtbaren" Spalten zusammengerechnet
// bleibt damit deutlich unter der auf typischen Desktop-Fensterbreiten
// (~1280–1440px, abzüglich Sidebar + Padding) verfügbaren Inhaltsbreite –
// die Tabelle braucht dadurch standardmäßig kein horizontales Scrollen mehr.
// Wer mehr sehen will, blendet die Spalten hier gezielt ein (bewusster
// Trade-off: dann ggf. wieder Scrollen nötig).
const COLUMN_DEFS: Array<{ key: ColumnKey; label: string }> = [
  { key: "property", label: "Objekt" },
  { key: "employees", label: "Mitarbeiter" },
  { key: "vehicle", label: "Fahrzeug" },
  { key: "progress", label: "Fortschritt" },
  { key: "created_at", label: "Erstellungsdatum" },
  { key: "updated_at", label: "Letzte Änderung" },
  { key: "dispatcher", label: "Verantwortlicher Disponent" },
  { key: "order_value", label: "Auftragswert" },
  { key: "duration", label: "Einsatzdauer" },
  { key: "documentation", label: "Dokumentationsstatus" },
];

const STORAGE_KEY = "kanalpro:auftraege:columns";
const COLUMNS_EVENT = "kanalpro:auftraege:columns-changed";
const DEFAULT_VISIBLE: ColumnKey[] = [];

// Sichtbarkeit der optionalen Spalten wird geräteweise in localStorage
// gespeichert – gleiches Muster wie in der Kundenverwaltung
// (useSyncExternalStore statt useState+useEffect, damit das erste Rendern
// auf Server und Client identisch bleibt).
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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function escapeCsvCell(value: string) {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportOrdersCsv(rows: OrderRow[]) {
  const headers = [
    "Auftragsnummer",
    "Titel",
    "Kunde",
    "Objekt",
    "Termin",
    "Status",
    "Priorität",
    "Fortschritt",
    "Mitarbeiter",
    "Fahrzeuge",
    "Archiviert",
  ];
  const lines = [headers.join(";")];
  for (const o of rows) {
    const cells = [
      o.order_number ?? "",
      o.title,
      o.customerName ?? "",
      o.propertyName ?? o.propertyStreet ?? "",
      o.scheduled_date ? formatDate(o.scheduled_date) : "",
      STATUS_LABELS[o.status] ?? o.status,
      ORDER_PRIORITY_LABELS[o.priority] ?? o.priority,
      `${o.progressPercent}%`,
      o.employees.map((e) => e.name).join(", "),
      o.vehicles.map((v) => v.licensePlate || v.name).join(", "),
      o.is_archived ? "Ja" : "Nein",
    ];
    lines.push(cells.map(escapeCsvCell).join(";"));
  }
  const csv = "﻿" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `auftraege-export-${rows.length}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function OrderTable({
  orders,
  sortHrefs,
  currentSort,
  currentDir,
  showingArchived,
  panelBaseQuery,
  density = "comfortable",
  employees = [],
  vehicles = [],
  canManageResources = true,
  canDelete = true,
}: {
  orders: OrderRow[];
  sortHrefs: Record<string, string>;
  currentSort: string;
  currentDir: "asc" | "desc";
  showingArchived: boolean;
  panelBaseQuery: string;
  density?: "comfortable" | "compact";
  employees?: Array<{ id: string; label: string }>;
  vehicles?: Array<{ id: string; label: string }>;
  canManageResources?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [employeeMenuOpen, setEmployeeMenuOpen] = useState(false);
  const [vehicleMenuOpen, setVehicleMenuOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<string>(ORDER_STATUSES[0]);
  const [bulkEmployeeValue, setBulkEmployeeValue] = useState("");
  const [bulkVehicleValue, setBulkVehicleValue] = useState("");

  const columnPrefsRaw = useSyncExternalStore(
    subscribeToColumnPrefs,
    getColumnPrefsSnapshot,
    getColumnPrefsServerSnapshot,
  );
  const visible = useMemo(() => parseVisibleColumns(columnPrefsRaw), [columnPrefsRaw]);

  function toggleColumn(key: ColumnKey) {
    const next = new Set(visible);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      window.dispatchEvent(new Event(COLUMNS_EVENT));
    } catch {
      // localStorage nicht verfügbar (z. B. Privatmodus) – Änderung bleibt dann nur für diese Anzeige ohne Effekt.
    }
  }

  // Öffnet das rechte Detailpanel für den angeklickten Auftrag, statt auf
  // die volle Profilseite zu navigieren – alle übrigen Filter/Sortier-/
  // Seiten-Parameter bleiben dabei erhalten (gleiches Muster wie /kunden).
  function panelHref(orderId: string, tab?: string) {
    const params = new URLSearchParams(panelBaseQuery);
    params.set("panel", orderId);
    if (tab) params.set("panelTab", tab);
    else params.delete("panelTab");
    return `/auftraege?${params.toString()}`;
  }

  function isFavorite(order: OrderRow) {
    return favoriteOverrides[order.id] ?? order.is_favorite;
  }

  function handleFavoriteClick(order: OrderRow) {
    const next = !isFavorite(order);
    setFavoriteOverrides((prev) => ({ ...prev, [order.id]: next }));
    startTransition(async () => {
      await toggleOrderFavorite(order.id, next);
      router.refresh();
    });
  }

  function handleDuplicate(order: OrderRow) {
    setOpenMenuId(null);
    startTransition(async () => {
      await duplicateOrder(order.id);
      router.refresh();
    });
  }

  function handleArchiveToggle(order: OrderRow) {
    setOpenMenuId(null);
    startTransition(async () => {
      await setOrderArchived(order.id, !order.is_archived);
      router.refresh();
    });
  }

  function handleDelete(order: OrderRow) {
    setOpenMenuId(null);
    const ok = window.confirm(
      `Auftrag "${order.order_number ?? order.title}" wirklich endgültig löschen? Dies kann nicht rückgängig gemacht werden.`,
    );
    if (!ok) return;
    startTransition(async () => {
      await deleteOrder(order.id);
    });
  }

  function sortIcon(column: string) {
    if (currentSort !== column) return null;
    return <span className="text-brand">{currentDir === "asc" ? "↑" : "↓"}</span>;
  }

  const allOnPageSelected = orders.length > 0 && orders.every((o) => selected.has(o.id));

  function toggleSelectAll() {
    setSelected(allOnPageSelected ? new Set() : new Set(orders.map((o) => o.id)));
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
    setEmployeeMenuOpen(false);
    setVehicleMenuOpen(false);
  }

  function handleExportSelected() {
    exportOrdersCsv(orders.filter((o) => selected.has(o.id)));
  }

  function handleBulkArchiveToggle() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const nextArchived = !showingArchived;
    startTransition(async () => {
      await bulkSetOrderArchived(ids, nextArchived);
      clearSelection();
      router.refresh();
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const ok = window.confirm(
      `${ids.length} Auftrag${ids.length === 1 ? "" : "e"} wirklich endgültig löschen? Dies kann nicht rückgängig gemacht werden.`,
    );
    if (!ok) return;
    startTransition(async () => {
      await bulkDeleteOrders(ids);
      clearSelection();
      router.refresh();
    });
  }

  function handleBulkStatusSubmit(e: FormEvent) {
    e.preventDefault();
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startTransition(async () => {
      await bulkSetOrderStatus(ids, bulkStatusValue);
      setStatusMenuOpen(false);
      setSelected(new Set());
      router.refresh();
    });
  }

  function handleBulkEmployeeSubmit(e: FormEvent) {
    e.preventDefault();
    const ids = Array.from(selected);
    if (ids.length === 0 || !bulkEmployeeValue) return;
    startTransition(async () => {
      await bulkAssignEmployeeToOrders(ids, bulkEmployeeValue);
      setBulkEmployeeValue("");
      setEmployeeMenuOpen(false);
      setSelected(new Set());
      router.refresh();
    });
  }

  function handleBulkVehicleSubmit(e: FormEvent) {
    e.preventDefault();
    const ids = Array.from(selected);
    if (ids.length === 0 || !bulkVehicleValue) return;
    startTransition(async () => {
      await bulkAssignVehicleToOrders(ids, bulkVehicleValue);
      setBulkVehicleValue("");
      setVehicleMenuOpen(false);
      setSelected(new Set());
      router.refresh();
    });
  }

  const rowPad = density === "compact" ? "py-1.5" : "py-3";
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
              <button type="button" onClick={handleExportSelected} className={actionBtnClass}>
                <Download className="h-3.5 w-3.5" />
                Exportieren
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setStatusMenuOpen((v) => !v);
                    setEmployeeMenuOpen(false);
                    setVehicleMenuOpen(false);
                  }}
                  className={actionBtnClass}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Status ändern
                </button>
                {statusMenuOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-10 cursor-default"
                      aria-label="Menü schließen"
                      onClick={() => setStatusMenuOpen(false)}
                    />
                    <form
                      onSubmit={handleBulkStatusSubmit}
                      className="absolute right-0 z-20 mt-2 w-60 space-y-2 rounded-lg border border-border bg-card p-3 shadow-lg"
                    >
                      <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
                        Neuer Status
                      </label>
                      <select
                        value={bulkStatusValue}
                        onChange={(e) => setBulkStatusValue(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-brand"
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s] ?? s}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="w-full rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
                      >
                        Übernehmen
                      </button>
                    </form>
                  </>
                )}
              </div>

              {canManageResources && (
                <>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setEmployeeMenuOpen((v) => !v);
                        setStatusMenuOpen(false);
                        setVehicleMenuOpen(false);
                      }}
                      className={actionBtnClass}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Mitarbeiter zuweisen
                    </button>
                    {employeeMenuOpen && (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-10 cursor-default"
                          aria-label="Menü schließen"
                          onClick={() => setEmployeeMenuOpen(false)}
                        />
                        <form
                          onSubmit={handleBulkEmployeeSubmit}
                          className="absolute right-0 z-20 mt-2 w-60 space-y-2 rounded-lg border border-border bg-card p-3 shadow-lg"
                        >
                          <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
                            Mitarbeiter auswählen
                          </label>
                          <select
                            value={bulkEmployeeValue}
                            onChange={(e) => setBulkEmployeeValue(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-brand"
                          >
                            <option value="">Bitte wählen…</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="w-full rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
                          >
                            Übernehmen
                          </button>
                        </form>
                      </>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setVehicleMenuOpen((v) => !v);
                        setStatusMenuOpen(false);
                        setEmployeeMenuOpen(false);
                      }}
                      className={actionBtnClass}
                    >
                      <Truck className="h-3.5 w-3.5" />
                      Fahrzeug zuweisen
                    </button>
                    {vehicleMenuOpen && (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-10 cursor-default"
                          aria-label="Menü schließen"
                          onClick={() => setVehicleMenuOpen(false)}
                        />
                        <form
                          onSubmit={handleBulkVehicleSubmit}
                          className="absolute right-0 z-20 mt-2 w-60 space-y-2 rounded-lg border border-border bg-card p-3 shadow-lg"
                        >
                          <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
                            Fahrzeug auswählen
                          </label>
                          <select
                            value={bulkVehicleValue}
                            onChange={(e) => setBulkVehicleValue(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-brand"
                          >
                            <option value="">Bitte wählen…</option>
                            {vehicles.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="w-full rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
                          >
                            Übernehmen
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </>
              )}

              {canDelete && (
                <>
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
            </>
          )}

          <div className="relative">
            <button type="button" onClick={() => setColumnsMenuOpen((v) => !v)} className={actionBtnClass}>
              <Columns3 className="h-3.5 w-3.5" />
              Spalten
            </button>
            {columnsMenuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="Menü schließen"
                  onClick={() => setColumnsMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-border bg-card p-2 shadow-lg">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    Zusätzliche Spalten
                  </p>
                  {COLUMN_DEFS.map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-background"
                    >
                      <input
                        type="checkbox"
                        checked={visible.has(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* table-fixed + feste Spaltenbreiten (statt automatischer Breitenberechnung
          nach Inhalt): nur so greift "truncate" auf lange Kunden-/Objektnamen
          tatsächlich – ohne table-fixed ignoriert die Browser-Tabellenlayout-
          Berechnung overflow-hidden bei der Breitenermittlung und die Tabelle
          (und damit die ganze Seite, siehe layout.tsx) wird beliebig breit. */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-border bg-background text-xs uppercase text-muted">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAll}
                  aria-label="Alle auswählen"
                  className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                />
              </th>
              <th className="w-10 px-3 py-3" />
              <th className="w-40 px-4 py-3 font-medium sm:w-48">
                <Link href={sortHrefs.order_number} className="flex items-center gap-1 hover:text-foreground">
                  Auftrag {sortIcon("order_number")}
                </Link>
              </th>
              <th className="hidden w-40 px-4 py-3 font-medium sm:table-cell">Kunde</th>
              {visible.has("property") && <th className="hidden w-36 px-4 py-3 font-medium lg:table-cell">Objekt</th>}
              <th className="hidden w-28 px-4 py-3 font-medium md:table-cell">
                <Link href={sortHrefs.scheduled_date} className="flex items-center gap-1 hover:text-foreground">
                  Termin {sortIcon("scheduled_date")}
                </Link>
              </th>
              {visible.has("employees") && <th className="hidden w-28 px-4 py-3 font-medium lg:table-cell">Mitarbeiter</th>}
              {visible.has("vehicle") && <th className="hidden w-32 px-4 py-3 font-medium xl:table-cell">Fahrzeug</th>}
              <th className="w-28 px-4 py-3 font-medium">
                <Link href={sortHrefs.status} className="flex items-center gap-1 hover:text-foreground">
                  Status {sortIcon("status")}
                </Link>
              </th>
              {visible.has("progress") && <th className="hidden w-28 px-4 py-3 font-medium md:table-cell">Fortschritt</th>}
              <th className="hidden w-24 px-4 py-3 font-medium sm:table-cell">
                <Link href={sortHrefs.priority} className="flex items-center gap-1 hover:text-foreground">
                  Priorität {sortIcon("priority")}
                </Link>
              </th>
              {visible.has("created_at") && <th className="hidden w-32 px-4 py-3 font-medium xl:table-cell">Erstellungsdatum</th>}
              {visible.has("updated_at") && <th className="hidden w-32 px-4 py-3 font-medium xl:table-cell">Letzte Änderung</th>}
              {visible.has("dispatcher") && <th className="hidden w-32 px-4 py-3 font-medium xl:table-cell">Disponent</th>}
              {visible.has("order_value") && <th className="hidden w-32 px-4 py-3 font-medium xl:table-cell">Auftragswert</th>}
              {visible.has("duration") && <th className="hidden w-32 px-4 py-3 font-medium xl:table-cell">Einsatzdauer</th>}
              {visible.has("documentation") && <th className="hidden w-32 px-4 py-3 font-medium xl:table-cell">Dokumentation</th>}
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="group border-b border-border transition-colors last:border-0 hover:bg-background/70">
                <td className={`px-3 ${rowPad}`}>
                  <input
                    type="checkbox"
                    checked={selected.has(order.id)}
                    onChange={() => toggleSelectOne(order.id)}
                    aria-label={`${order.order_number ?? order.title} auswählen`}
                    className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                  />
                </td>
                <td className={`px-3 ${rowPad}`}>
                  <button
                    type="button"
                    onClick={() => handleFavoriteClick(order)}
                    aria-label={isFavorite(order) ? "Favorit entfernen" : "Als Favorit markieren"}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:text-amber-500"
                  >
                    <Star className={`h-4 w-4 ${isFavorite(order) ? "fill-amber-400 text-amber-400" : ""}`} />
                  </button>
                </td>
                <td className={`px-4 ${rowPad}`}>
                  <Link href={panelHref(order.id)} className="font-medium text-foreground hover:text-brand">
                    {order.order_number ?? "—"}
                  </Link>
                  <p className="truncate text-xs text-muted">{order.title || ORDER_KIND_LABELS[order.order_kind] || order.order_kind}</p>
                  {order.is_archived && (
                    <span className="mt-1 inline-block rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                      Archiviert
                    </span>
                  )}
                </td>
                <td className={`hidden px-4 ${rowPad} sm:table-cell`}>
                  {order.customerName && order.customerId ? (
                    <Link href={`/kunden?panel=${order.customerId}`} className="block hover:text-brand">
                      <p className="truncate font-medium text-foreground hover:text-brand">{order.customerName}</p>
                      {order.customerSecondLine && (
                        <p className="truncate text-xs text-muted">{order.customerSecondLine}</p>
                      )}
                    </Link>
                  ) : order.customerName ? (
                    <>
                      <p className="truncate font-medium text-foreground">{order.customerName}</p>
                      {order.customerSecondLine && (
                        <p className="truncate text-xs text-muted">{order.customerSecondLine}</p>
                      )}
                    </>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                {visible.has("property") && (
                  <td className={`hidden px-4 ${rowPad} text-muted lg:table-cell`}>
                    {(order.propertyName || order.propertyStreet) && order.customerId ? (
                      <Link href={`/kunden?panel=${order.customerId}&panelTab=objekte`} className="block hover:text-brand">
                        <p className="truncate">{order.propertyName || order.propertyStreet}</p>
                        {order.propertyCityLine && <p className="truncate text-xs text-muted">{order.propertyCityLine}</p>}
                      </Link>
                    ) : order.propertyName || order.propertyStreet ? (
                      <>
                        <p className="truncate">{order.propertyName || order.propertyStreet}</p>
                        {order.propertyCityLine && <p className="truncate text-xs text-muted">{order.propertyCityLine}</p>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
                <td className={`hidden px-4 ${rowPad} text-muted md:table-cell`}>
                  {order.scheduled_date ? (
                    <>
                      <p>{formatDate(order.scheduled_date)}</p>
                      {order.start_time && <p className="text-xs text-muted">{formatTime(order.start_time)} Uhr</p>}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                {visible.has("employees") && (
                  <td className={`hidden px-4 ${rowPad} lg:table-cell`}>
                    {order.employees.length > 0 ? (
                      <div className="flex items-center -space-x-2">
                        {order.employees.slice(0, 3).map((e) => (
                          <span
                            key={e.id}
                            title={e.name}
                            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-brand-soft text-[10px] font-semibold text-brand-dark"
                          >
                            {initials(e.name)}
                          </span>
                        ))}
                        {order.employees.length > 3 && (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-background text-[10px] font-medium text-muted">
                            +{order.employees.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                )}
                {visible.has("vehicle") && (
                  <td className={`hidden px-4 ${rowPad} xl:table-cell`}>
                    {order.vehicles.length > 0 ? (
                      <Link href={`/fahrzeuge/${order.vehicles[0].id}`} className="flex items-center gap-1.5 hover:text-brand">
                        <Truck className="h-3.5 w-3.5 shrink-0 text-muted" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-foreground hover:text-brand">
                            {order.vehicles[0].licensePlate || order.vehicles[0].name}
                          </p>
                          {order.vehicles.length > 1 && (
                            <p className="text-[11px] text-muted">+{order.vehicles.length - 1} weitere</p>
                          )}
                        </div>
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                )}
                <td className={`px-4 ${rowPad}`}>
                  <span
                    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE_CLASS[order.status] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </td>
                {visible.has("progress") && (
                  <td className={`hidden px-4 ${rowPad} md:table-cell`}>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-background">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${order.progressPercent}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted">{order.progressPercent}%</span>
                    </div>
                  </td>
                )}
                <td className={`hidden px-4 ${rowPad} sm:table-cell`}>
                  <span
                    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_PRIORITY_BADGE_CLASS[order.priority] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {ORDER_PRIORITY_LABELS[order.priority] ?? order.priority}
                  </span>
                </td>
                {visible.has("created_at") && (
                  <td className={`hidden px-4 ${rowPad} text-muted xl:table-cell`}>{formatDateTime(order.created_at)}</td>
                )}
                {visible.has("updated_at") && (
                  <td className={`hidden px-4 ${rowPad} text-muted xl:table-cell`}>{formatDateTime(order.updated_at)}</td>
                )}
                {visible.has("dispatcher") && (
                  <td className={`hidden px-4 ${rowPad} text-muted xl:table-cell`}>{order.dispatcherName ?? "—"}</td>
                )}
                {visible.has("order_value") && (
                  <td className={`hidden px-4 ${rowPad} text-muted xl:table-cell`}>
                    {order.order_value ? formatEuro(order.order_value) : "—"}
                  </td>
                )}
                {visible.has("duration") && (
                  <td className={`hidden px-4 ${rowPad} text-muted xl:table-cell`}>
                    {order.planned_duration_minutes ? `${order.planned_duration_minutes} Min.` : "—"}
                  </td>
                )}
                {visible.has("documentation") && (
                  <td className={`hidden px-4 ${rowPad} xl:table-cell`}>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${order.isDocumented ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}
                    >
                      {order.isDocumented ? "Dokumentiert" : "Offen"}
                    </span>
                  </td>
                )}
                <td className={`px-3 ${rowPad}`}>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenuId((v) => (v === order.id ? null : order.id))}
                      aria-label="Aktionen"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-background hover:text-foreground"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuId === order.id && (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-10 cursor-default"
                          aria-label="Menü schließen"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-border bg-card p-1.5 shadow-lg">
                          <Link
                            href={panelHref(order.id)}
                            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-background"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <Eye className="h-3.5 w-3.5" /> Auftrag ansehen
                          </Link>
                          <Link
                            href={`/auftraege/${order.id}`}
                            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-background"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <FileEdit className="h-3.5 w-3.5" /> Bearbeiten
                          </Link>
                          <Link
                            href={panelHref(order.id, "uebersicht")}
                            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-background"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <CalendarClock className="h-3.5 w-3.5" /> Status ändern
                          </Link>
                          {canManageResources && (
                            <>
                              <Link
                                href={panelHref(order.id, "ressourcen")}
                                className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-background"
                                onClick={() => setOpenMenuId(null)}
                              >
                                <Users className="h-3.5 w-3.5" /> Mitarbeiter zuweisen
                              </Link>
                              <Link
                                href={panelHref(order.id, "ressourcen")}
                                className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-background"
                                onClick={() => setOpenMenuId(null)}
                              >
                                <Truck className="h-3.5 w-3.5" /> Fahrzeug zuweisen
                              </Link>
                            </>
                          )}
                          <Link
                            href={`/berichte/neu?order=${order.id}`}
                            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-background"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <Wrench className="h-3.5 w-3.5" /> Einsatzbericht öffnen
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(order)}
                            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-background"
                          >
                            <Copy className="h-3.5 w-3.5" /> Auftrag duplizieren
                          </button>
                          {canDelete && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleArchiveToggle(order)}
                                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-background"
                              >
                                {order.is_archived ? (
                                  <>
                                    <ArchiveRestore className="h-3.5 w-3.5" /> Dearchivieren
                                  </>
                                ) : (
                                  <>
                                    <Archive className="h-3.5 w-3.5" /> Archivieren
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(order)}
                                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Löschen
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showingArchived && (
        <div className="flex items-center gap-2 border-t border-border bg-background/60 px-4 py-2 text-xs text-muted">
          <Building2 className="h-3.5 w-3.5" />
          Zeigt auch archivierte Aufträge.
        </div>
      )}
    </div>
  );
}
