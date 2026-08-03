"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Columns3, Star, User } from "lucide-react";
import {
  CUSTOMER_KIND_LABELS,
  CUSTOMER_STATUS_BADGE_CLASS,
  CUSTOMER_STATUS_LABELS,
  isCompanyKind,
} from "@/lib/customers";
import { formatEuro } from "@/lib/format";
import { formatDate } from "@/lib/date";
import { toggleCustomerFavorite } from "@/app/(dashboard)/kunden/actions";

export type CustomerRow = {
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
  employeeName: string | null;
  primaryContactName: string | null;
  lastOrderDate: string | null;
  revenue: number;
};

type ColumnKey = "customer_number" | "kind" | "contact" | "city" | "employee" | "lastOrder" | "revenue";

const COLUMN_DEFS: Array<{ key: ColumnKey; label: string }> = [
  { key: "customer_number", label: "Nr." },
  { key: "kind", label: "Art" },
  { key: "contact", label: "Kontakt" },
  { key: "city", label: "Ort" },
  { key: "employee", label: "Verantwortlicher" },
  { key: "lastOrder", label: "Letzter Auftrag" },
  { key: "revenue", label: "Umsatz" },
];

const STORAGE_KEY = "kanalpro:kunden:columns";
const COLUMNS_EVENT = "kanalpro:kunden:columns-changed";
const DEFAULT_VISIBLE: ColumnKey[] = ["customer_number", "kind", "contact", "city"];

// Spalten-Sichtbarkeit wird geräteweise in localStorage gespeichert. Über
// useSyncExternalStore statt useState+useEffect gelesen, damit das erste
// Rendern auf Server und Client identisch bleibt (kein Hydration-Mismatch)
// und ohne setState-Aufruf innerhalb eines Effects.
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

export function CustomerTable({
  customers,
  sortHrefs,
  currentSort,
  currentDir,
  panelBaseQuery,
}: {
  customers: CustomerRow[];
  sortHrefs: Record<string, string>;
  currentSort: string;
  currentDir: "asc" | "desc";
  panelBaseQuery: string;
}) {
  const router = useRouter();

  // Öffnet das rechte Detailpanel für den angeklickten Kunden, statt auf die
  // volle Profilseite zu navigieren – alle übrigen Filter/Sortier-/Seiten-
  // Parameter der aktuellen Ansicht bleiben dabei erhalten.
  function panelHref(customerId: string) {
    const params = new URLSearchParams(panelBaseQuery);
    params.delete("panelTab");
    params.set("panel", customerId);
    return `/kunden?${params.toString()}`;
  }
  const [, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  // Optimistische Überschreibungen für den Favoriten-Stern: nur Einträge,
  // die der Nutzer in dieser Sitzung selbst umgeschaltet hat. Alles andere
  // kommt direkt aus den (nach router.refresh() aktuellen) Server-Daten –
  // dadurch ist kein Sync-Effect nötig, wenn sich `customers` ändert.
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});

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

  function isFavorite(customer: CustomerRow) {
    return favoriteOverrides[customer.id] ?? customer.is_favorite;
  }

  function handleFavoriteClick(customer: CustomerRow) {
    const next = !isFavorite(customer);
    setFavoriteOverrides((prev) => ({ ...prev, [customer.id]: next }));
    startTransition(async () => {
      await toggleCustomerFavorite(customer.id, next);
      router.refresh();
    });
  }

  function sortIcon(column: string) {
    if (currentSort !== column) return null;
    return <span className="text-brand">{currentDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-end border-b border-border bg-background/60 px-3 py-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-background hover:text-foreground"
          >
            <Columns3 className="h-3.5 w-3.5" />
            Spalten
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Menü schließen"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-border bg-card p-2 shadow-lg">
                <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  Sichtbare Spalten
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
                      className="accent-brand"
                    />
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
              <th className="w-10 px-3 py-3" />
              <th className="px-4 py-3 font-medium">
                <Link href={sortHrefs.name} className="flex items-center gap-1 hover:text-foreground">
                  Kunde {sortIcon("name")}
                </Link>
              </th>
              {visible.has("customer_number") && (
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  <Link href={sortHrefs.customer_number} className="flex items-center gap-1 hover:text-foreground">
                    Nr. {sortIcon("customer_number")}
                  </Link>
                </th>
              )}
              {visible.has("kind") && (
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  <Link href={sortHrefs.kind} className="flex items-center gap-1 hover:text-foreground">
                    Art {sortIcon("kind")}
                  </Link>
                </th>
              )}
              <th className="px-4 py-3 font-medium">
                <Link href={sortHrefs.status} className="flex items-center gap-1 hover:text-foreground">
                  Status {sortIcon("status")}
                </Link>
              </th>
              {visible.has("contact") && <th className="hidden px-4 py-3 font-medium md:table-cell">Kontakt</th>}
              {visible.has("city") && (
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  <Link href={sortHrefs.city} className="flex items-center gap-1 hover:text-foreground">
                    Ort {sortIcon("city")}
                  </Link>
                </th>
              )}
              {visible.has("employee") && (
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Verantwortlicher</th>
              )}
              {visible.has("lastOrder") && (
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Letzter Auftrag</th>
              )}
              {visible.has("revenue") && (
                <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Umsatz</th>
              )}
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => {
              const secondLine = customer.primaryContactName || CUSTOMER_KIND_LABELS[customer.kind] || customer.kind;
              const isCompany = isCompanyKind(customer.kind);
              return (
                <tr key={customer.id} className="group border-b border-border transition-colors last:border-0 hover:bg-background/70">
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => handleFavoriteClick(customer)}
                      aria-label={isFavorite(customer) ? "Favorit entfernen" : "Als Favorit markieren"}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:text-amber-500"
                    >
                      <Star className={`h-4 w-4 ${isFavorite(customer) ? "fill-amber-400 text-amber-400" : ""}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-dark">
                        {isCompany ? <Building2 className="h-4 w-4" /> : initials(customer.name)}
                      </span>
                      <div className="min-w-0">
                        <Link href={panelHref(customer.id)} className="font-medium text-foreground hover:text-brand">
                          {customer.name}
                        </Link>
                        <p className="truncate text-xs text-muted">{secondLine}</p>
                      </div>
                    </div>
                  </td>
                  {visible.has("customer_number") && (
                    <td className="hidden px-4 py-3 text-muted sm:table-cell">{customer.customer_number ?? "—"}</td>
                  )}
                  {visible.has("kind") && (
                    <td className="hidden px-4 py-3 text-muted sm:table-cell">
                      {CUSTOMER_KIND_LABELS[customer.kind] ?? customer.kind}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${CUSTOMER_STATUS_BADGE_CLASS[customer.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {CUSTOMER_STATUS_LABELS[customer.status] ?? customer.status}
                    </span>
                  </td>
                  {visible.has("contact") && (
                    <td className="hidden px-4 py-3 text-muted md:table-cell">
                      {customer.email || customer.phone || "—"}
                    </td>
                  )}
                  {visible.has("city") && (
                    <td className="hidden px-4 py-3 text-muted md:table-cell">{customer.city || "—"}</td>
                  )}
                  {visible.has("employee") && (
                    <td className="hidden px-4 py-3 text-muted lg:table-cell">
                      {customer.employeeName || (
                        <span className="flex items-center gap-1 text-muted/70">
                          <User className="h-3.5 w-3.5" /> —
                        </span>
                      )}
                    </td>
                  )}
                  {visible.has("lastOrder") && (
                    <td className="hidden px-4 py-3 text-muted lg:table-cell">
                      {customer.lastOrderDate ? formatDate(customer.lastOrderDate) : "—"}
                    </td>
                  )}
                  {visible.has("revenue") && (
                    <td className="hidden px-4 py-3 text-right tabular-nums text-muted lg:table-cell">
                      {customer.revenue > 0 ? formatEuro(customer.revenue) : "—"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
