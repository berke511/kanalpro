"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, Rows3, SlidersHorizontal, X } from "lucide-react";

type CustomerFilterPanelProps = {
  q: string;
  view: string;
  kinds: readonly string[];
  kindLabels: Record<string, string>;
  statuses: readonly string[];
  statusLabels: Record<string, string>;
  employees: Array<{ id: string; full_name: string | null }>;
  initial: {
    kind: string[];
    status: string[];
    city: string;
    employee: string;
    createdFrom: string;
    createdTo: string;
    lastOrderFrom: string;
    lastOrderTo: string;
    openInvoices: boolean;
    openQuotes: boolean;
    maintenance: boolean;
    archived: boolean;
  };
  activeCount: number;
  listHref: string;
  compactHref: string;
  gridHref: string;
};

export function CustomerFilterPanel({
  q,
  view,
  kinds,
  kindLabels,
  statuses,
  statusLabels,
  employees,
  initial,
  activeCount,
  listHref,
  compactHref,
  gridHref,
}: CustomerFilterPanelProps) {
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
            active
              ? "border-brand/30 bg-brand-soft text-brand-dark"
              : "border-border bg-card hover:bg-background"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter{active ? ` ${activeCount}` : ""}
        </button>

        {open && (
          <>
            {/* Auf Mobile abgedunkelter Hintergrund + Bottom-Sheet, damit das
                umfangreiche Filterformular nicht als winziges Dropdown über
                den Bildschirmrand hinausragt. Ab sm: wieder normales
                Dropdown-Panel rechtsbündig unter dem Filter-Button. */}
            <div
              className="fixed inset-0 z-30 bg-black/30 sm:hidden"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-border bg-card p-4 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:bottom-auto sm:mt-2 sm:max-h-[75vh] sm:w-[min(92vw,420px)] sm:rounded-2xl">
              <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-border sm:hidden" />
              <form method="GET" action="/kunden" onSubmit={() => setOpen(false)} className="space-y-5">
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Kundenart</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {kinds.map((k) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="kind"
                        value={k}
                        defaultChecked={initial.kind.includes(k)}
                        className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                      />
                      {kindLabels[k] ?? k}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Kundenstatus</p>
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

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="filter-city">
                  Ort oder Postleitzahl
                </label>
                <input
                  id="filter-city"
                  name="city"
                  type="text"
                  defaultValue={initial.city}
                  placeholder="z. B. Köln oder 50667"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="filter-employee">
                  Zuständiger Mitarbeiter
                </label>
                <select
                  id="filter-employee"
                  name="employee"
                  defaultValue={initial.employee}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                >
                  <option value="">Alle Mitarbeiter</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name ?? "Unbenannt"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Erstellungsdatum</p>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    name="createdFrom"
                    defaultValue={initial.createdFrom}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-brand"
                  />
                  <span className="shrink-0 text-xs text-muted">bis</span>
                  <input
                    type="date"
                    name="createdTo"
                    defaultValue={initial.createdTo}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-brand"
                  />
                </div>
              </div>

              <details className="group rounded-lg border border-border/70" open={Boolean(initial.lastOrderFrom || initial.lastOrderTo || initial.openInvoices || initial.openQuotes || initial.maintenance || initial.archived)}>
                <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted [&::-webkit-details-marker]:hidden">
                  Weitere Filter
                </summary>
                <div className="space-y-4 border-t border-border/70 p-3">
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted">Letzter Auftrag</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        name="lastOrderFrom"
                        defaultValue={initial.lastOrderFrom}
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-brand"
                      />
                      <span className="shrink-0 text-xs text-muted">bis</span>
                      <input
                        type="date"
                        name="lastOrderTo"
                        defaultValue={initial.lastOrderTo}
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-brand"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="openInvoices"
                      value="1"
                      defaultChecked={initial.openInvoices}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                    />
                    Offene Rechnungen
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="openQuotes"
                      value="1"
                      defaultChecked={initial.openQuotes}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                    />
                    Offene Angebote
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="maintenance"
                      value="1"
                      defaultChecked={initial.maintenance}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                    />
                    Kunden mit Wartungsvertrag
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="archived"
                      value="1"
                      defaultChecked={initial.archived}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                    />
                    Auch archivierte Kunden anzeigen
                  </label>
                </div>
              </details>

              {/* Sticky, damit die Aktionen auch bei langem, scrollendem
                  Filterinhalt auf kleinen Bildschirmen immer erreichbar
                  bleiben, statt am Ende eines langen Sheets zu verschwinden. */}
              <div className="sticky bottom-0 -mx-4 -mb-4 flex items-center justify-between gap-2 border-t border-border bg-card px-4 py-3">
                <Link
                  href="/kunden"
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-muted hover:text-foreground"
                >
                  Zurücksetzen
                </Link>
                <button
                  type="submit"
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
                >
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
          href={compactHref}
          aria-label="Kompaktansicht"
          className={`flex items-center border-l border-border px-2.5 py-2.5 sm:py-2 ${view === "compact" ? "bg-brand-soft text-brand-dark" : "text-muted hover:bg-background"}`}
        >
          <Rows3 className="h-4 w-4" />
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
