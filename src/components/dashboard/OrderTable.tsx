"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarClock,
  Copy,
  Eye,
  FileEdit,
  MoreVertical,
  Star,
  Trash2,
  Truck,
  Users,
  Wrench,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import {
  ORDER_KIND_LABELS,
  ORDER_PRIORITY_BADGE_CLASS,
  ORDER_PRIORITY_LABELS,
  ORDER_STATUS_BADGE_CLASS,
  STATUS_LABELS,
} from "@/lib/orders";
import { formatDate, formatTime } from "@/lib/date";
import { deleteOrder, duplicateOrder, setOrderArchived, toggleOrderFavorite } from "@/app/(dashboard)/auftraege/actions";

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
  customerName: string | null;
  customerSecondLine: string | null;
  propertyName: string | null;
  propertyStreet: string | null;
  propertyCityLine: string | null;
  employees: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; name: string; licensePlate: string | null }>;
  progressPercent: number;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function OrderTable({
  orders,
  sortHrefs,
  currentSort,
  currentDir,
  showingArchived,
  panelBaseQuery,
}: {
  orders: OrderRow[];
  sortHrefs: Record<string, string>;
  currentSort: string;
  currentDir: "asc" | "desc";
  showingArchived: boolean;
  panelBaseQuery: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background text-xs uppercase text-muted">
            <tr>
              <th className="w-10 px-3 py-3" />
              <th className="px-4 py-3 font-medium">
                <Link href={sortHrefs.order_number} className="flex items-center gap-1 hover:text-foreground">
                  Auftrag {sortIcon("order_number")}
                </Link>
              </th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Kunde</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">Objekt</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">
                <Link href={sortHrefs.scheduled_date} className="flex items-center gap-1 hover:text-foreground">
                  Termin {sortIcon("scheduled_date")}
                </Link>
              </th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">Mitarbeiter</th>
              <th className="hidden px-4 py-3 font-medium xl:table-cell">Fahrzeug</th>
              <th className="px-4 py-3 font-medium">
                <Link href={sortHrefs.status} className="flex items-center gap-1 hover:text-foreground">
                  Status {sortIcon("status")}
                </Link>
              </th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Fortschritt</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">
                <Link href={sortHrefs.priority} className="flex items-center gap-1 hover:text-foreground">
                  Priorität {sortIcon("priority")}
                </Link>
              </th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="group border-b border-border transition-colors last:border-0 hover:bg-background/70">
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => handleFavoriteClick(order)}
                    aria-label={isFavorite(order) ? "Favorit entfernen" : "Als Favorit markieren"}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:text-amber-500"
                  >
                    <Star className={`h-4 w-4 ${isFavorite(order) ? "fill-amber-400 text-amber-400" : ""}`} />
                  </button>
                </td>
                <td className="px-4 py-3">
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
                <td className="hidden px-4 py-3 sm:table-cell">
                  {order.customerName ? (
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
                <td className="hidden px-4 py-3 text-muted lg:table-cell">
                  {order.propertyName || order.propertyStreet ? (
                    <>
                      <p className="truncate">{order.propertyName || order.propertyStreet}</p>
                      {order.propertyCityLine && <p className="truncate text-xs text-muted">{order.propertyCityLine}</p>}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="hidden px-4 py-3 text-muted md:table-cell">
                  {order.scheduled_date ? (
                    <>
                      <p>{formatDate(order.scheduled_date)}</p>
                      {order.start_time && <p className="text-xs text-muted">{formatTime(order.start_time)} Uhr</p>}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
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
                <td className="hidden px-4 py-3 xl:table-cell">
                  {order.vehicles.length > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 shrink-0 text-muted" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">
                          {order.vehicles[0].licensePlate || order.vehicles[0].name}
                        </p>
                        {order.vehicles.length > 1 && (
                          <p className="text-[11px] text-muted">+{order.vehicles.length - 1} weitere</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE_CLASS[order.status] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
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
                <td className="hidden px-4 py-3 sm:table-cell">
                  <span
                    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_PRIORITY_BADGE_CLASS[order.priority] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {ORDER_PRIORITY_LABELS[order.priority] ?? order.priority}
                  </span>
                </td>
                <td className="px-3 py-3">
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
