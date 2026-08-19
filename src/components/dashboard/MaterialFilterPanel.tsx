
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, SlidersHorizontal, X } from "lucide-react";

type MaterialFilterPanelProps = {
  q: string;
  view: string;
  categories: readonly string[];
  categoryLabels: Record<string, string>;
  statuses: readonly string[];
  statusLabels: Record<string, string>;
  locationOptions: Array<{ id: string; name: string }>;
  supplierOptions: string[];
  initial: {
    category: string[];
    status: string[];
    location: string;
    supplier: string;
    lowStock: boolean;
    outOfStock: boolean;
    archived: boolean;
  };
  activeCount: number;
  listHref: string;
  gridHref: string;
};

export function MaterialFilterPanel({
  q,
  view,
  categories,
  categoryLabels,
  statuses,
  statusLabels,
  locationOptions,
  supplierOptions,
  initial,
  activeCount,
  listHref,
  gridHref,
}: MaterialFilterPanelProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const active = activeCount > 0;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative" ref={panelRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition sm:py-2 ${
            active ? "border-brand/30 bg-brand-soft text-brand-dark" : "border-border bg-card hover:bg-background"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter{active ? ` ${activeCount}` : ""}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-30 bg-black/30 sm:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
            <div className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-border bg-card p-4 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:bottom-auto sm:mt-2 sm:max-h-[75vh] sm:w-[min(92vw,420px)] sm:rounded-2xl">
              <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-border sm:hidden" />
              <form method="GET" action="/material" onSubmit={() => setOpen(false)} className="space-y-5">
                <input type="hidden" name="q" value={q} />
                {view !== "list" && <input type="hidden" name="view" value={view} />}

                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Filter</h3>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded p-1 text-muted hover:bg-background hover:text-foreground"
                    aria-label="Filter schließen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Kategorie</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {categories.map((c) => (
                      <label key={c} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="category"
                          value={c}
                          defaultChecked={initial.category.includes(c)}
                          className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                        />
                        {categoryLabels[c] ?? c}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Status</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {statuses.map((s) => (
                      <label key={s} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="status"
                          value={s}
                          defaultChecked={initial.status.includes(s)}
                          className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                        />
                        {statusLabels[s] ?? s}
                      </label>
                    ))}
                  </div>
                </div>

                {locationOptions.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="filter-location">
                      Lagerort
                    </label>
                    <select
                      id="filter-location"
                      name="location"
                      defaultValue={initial.location}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                    >
                      <option value="">Alle Lagerorte</option>
                      {locationOptions.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {supplierOptions.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="filter-supplier">
                      Lieferant
                    </label>
                    <input
                      id="filter-supplier"
                      name="supplier"
                      list="filter-supplier-options"
                      defaultValue={initial.supplier}
                      placeholder="Alle Lieferanten"
                      autoComplete="off"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                    />
                    <datalist id="filter-supplier-options">
                      {supplierOptions.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="lowStock"
                      value="1"
                      defaultChecked={initial.lowStock}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                    />
                    Nur niedriger Bestand
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="outOfStock"
                      value="1"
                      defaultChecked={initial.outOfStock}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                    />
                    Nur nicht verfügbar
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="archived"
                      value="1"
                      defaultChecked={initial.archived}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                    />
                    Auch archivierte Einträge anzeigen
                  </label>
                </div>

                <div className="sticky bottom-0 -mx-4 -mb-4 flex items-center justify-between gap-2 border-t border-border bg-card px-4 py-3">
                  <Link href="/material" onClick={() => setOpen(false)} className="text-sm font-medium text-muted hover:text-foreground">
                    Zurücksetzen
                  </Link>
                  <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark">
                    Filter anwenden
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center overflow-hidden rounded-lg border border-border bg-card">
        <a
          href={listHref}
          aria-label="Listenansicht"
          className={`flex items-center px-2.5 py-2.5 sm:py-2 ${view === "list" ? "bg-brand-soft text-brand-dark" : "text-muted hover:bg-background"}`}
        >
          <List className="h-4 w-4" />
        </a>
        <a
          href={gridHref}
          aria-label="Kartenansicht"
          className={`flex items-center border-l border-border px-2.5 py-2.5 sm:py-2 ${view === "grid" ? "bg-brand-soft text-brand-dark" : "text-muted hover:bg-background"}`}
        >
          <LayoutGrid className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
