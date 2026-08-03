"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Kanban, LayoutGrid, List, Rows3, SlidersHorizontal, X } from "lucide-react";

type Option = { id: string; label: string };

type OrderFilterPanelProps = {
  q: string;
  view: string;
  statuses: readonly string[];
  statusLabels: Record<string, string>;
  kinds: readonly string[];
  kindLabels: Record<string, string>;
  priorities: readonly string[];
  priorityLabels: Record<string, string>;
  customers: Option[];
  properties: Option[];
  employees: Option[];
  vehicles: Option[];
  initial: {
    status: string[];
    von: string;
    bis: string;
    customer: string[];
    property: string[];
    employee: string[];
    vehicle: string[];
    kind: string[];
    priority: string[];
    archived: boolean;
  };
  activeCount: number;
  listHref: string;
  compactHref: string;
  gridHref: string;
  kanbanHref: string;
};

export function OrderFilterPanel({
  q,
  view,
  statuses,
  statusLabels,
  kinds,
  kindLabels,
  priorities,
  priorityLabels,
  customers,
  properties,
  employees,
  vehicles,
  initial,
  activeCount,
  listHref,
  compactHref,
  gridHref,
  kanbanHref,
}: OrderFilterPanelProps) {
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

  const hasMore = Boolean(
    initial.property.length ||
      initial.vehicle.length ||
      initial.kind.length ||
      initial.priority.length ||
      initial.archived,
  );

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
            <div
              className="fixed inset-0 z-30 bg-black/30 sm:hidden"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-border bg-card p-4 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:bottom-auto sm:mt-2 sm:max-h-[75vh] sm:w-[min(92vw,440px)] sm:rounded-2xl">
              <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-border sm:hidden" />
              <form method="GET" action="/auftraege" onSubmit={() => setOpen(false)} className="space-y-5">
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

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Zeitraum (Termin)</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      name="von"
                      defaultValue={initial.von}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-brand"
                    />
                    <span className="shrink-0 text-xs text-muted">bis</span>
                    <input
                      type="date"
                      name="bis"
                      defaultValue={initial.bis}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-brand"
                    />
                  </div>
                </div>

                <CheckboxGroup label="Kunde" name="customer" options={customers} selected={initial.customer} />
                <CheckboxGroup label="Mitarbeiter" name="employee" options={employees} selected={initial.employee} />

                <details className="group rounded-lg border border-border/70" open={hasMore}>
                  <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted [&::-webkit-details-marker]:hidden">
                    Weitere Filter
                  </summary>
                  <div className="space-y-4 border-t border-border/70 p-3">
                    <CheckboxGroup label="Objekt" name="property" options={properties} selected={initial.property} />
                    <CheckboxGroup label="Fahrzeug" name="vehicle" options={vehicles} selected={initial.vehicle} />

                    <div>
                      <p className="mb-2 text-xs font-medium text-muted">Auftragsart</p>
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
                      <p className="mb-2 text-xs font-medium text-muted">Priorität</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-2">
                        {priorities.map((p) => (
                          <label key={p} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              name="priority"
                              value={p}
                              defaultChecked={initial.priority.includes(p)}
                              className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                            />
                            {priorityLabels[p] ?? p}
                          </label>
                        ))}
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="archived"
                        value="1"
                        defaultChecked={initial.archived}
                        className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                      />
                      Auch archivierte Aufträge anzeigen
                    </label>
                  </div>
                </details>

                <div className="sticky bottom-0 -mx-4 -mb-4 flex items-center justify-between gap-2 border-t border-border bg-card px-4 py-3">
                  <Link
                    href="/auftraege"
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
          aria-label="Kompakte Tabellenansicht"
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
        <a
          href={kanbanHref}
          aria-label="Kanban-Ansicht"
          className={`flex items-center border-l border-border px-2.5 py-2.5 sm:py-2 ${view === "kanban" ? "bg-brand-soft text-brand-dark" : "text-muted hover:bg-background"}`}
        >
          <Kanban className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

function CheckboxGroup({
  label,
  name,
  options,
  selected,
}: {
  label: string;
  name: string;
  options: Option[];
  selected: string[];
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-border/70 p-2.5">
        {options.map((opt) => (
          <label key={opt.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name={name}
              value={opt.id}
              defaultChecked={selected.includes(opt.id)}
              className="h-4 w-4 shrink-0 rounded border-border text-brand focus:ring-brand"
            />
            <span className="truncate">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
