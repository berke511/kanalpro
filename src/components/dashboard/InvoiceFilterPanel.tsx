"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import { ALL_STATUSES, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, STATUS_LABELS } from "@/lib/invoices";

type InvoiceFilterPanelProps = {
  kind: string;
  q: string;
  customerOptions: Array<{ id: string; name: string }>;
  employeeOptions: Array<{ id: string; label: string }>;
  orderOptions: Array<{ id: string; label: string }>;
  initial: {
    status: string[];
    customer: string;
    assignedTo: string;
    order: string;
    paymentMethod: string;
    dateFrom: string;
    dateTo: string;
    amountMin: string;
    amountMax: string;
    paidOnly: boolean;
    overdueOnly: boolean;
    archived: boolean;
  };
  activeCount: number;
};

export function InvoiceFilterPanel({ kind, q, customerOptions, employeeOptions, orderOptions, initial, activeCount }: InvoiceFilterPanelProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const active = activeCount > 0;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
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

  const statusOptions = ALL_STATUSES;

  return (
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
          <div className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-border bg-card p-4 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:bottom-auto sm:mt-2 sm:max-h-[75vh] sm:w-[min(92vw,440px)] sm:rounded-2xl">
            <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-border sm:hidden" />
            <form method="GET" action="/rechnungen" onSubmit={() => setOpen(false)} className="space-y-5">
              <input type="hidden" name="q" value={q} />
              {kind && <input type="hidden" name="kind" value={kind} />}

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Filter</h3>
                <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-muted hover:bg-background hover:text-foreground" aria-label="Filter schließen">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Status</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {statusOptions.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="status" value={s} defaultChecked={initial.status.includes(s)} className="h-4 w-4 rounded border-border text-brand focus:ring-brand" />
                      {STATUS_LABELS[s] ?? s}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="filter-customer">
                  Kunde
                </label>
                <select id="filter-customer" name="customer" defaultValue={initial.customer} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand">
                  <option value="">Alle Kunden</option>
                  {customerOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="filter-assignedTo">
                  Bearbeiter
                </label>
                <select id="filter-assignedTo" name="assignedTo" defaultValue={initial.assignedTo} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand">
                  <option value="">Alle Bearbeiter</option>
                  {employeeOptions.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>

              {orderOptions.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="filter-order">
                    Projekt / Auftrag
                  </label>
                  <select id="filter-order" name="order" defaultValue={initial.order} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand">
                    <option value="">Alle Aufträge</option>
                    {orderOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="filter-paymentMethod">
                  Zahlungsart
                </label>
                <select id="filter-paymentMethod" name="paymentMethod" defaultValue={initial.paymentMethod} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand">
                  <option value="">Alle Zahlungsarten</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Zeitraum (Datum)</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" name="dateFrom" defaultValue={initial.dateFrom} className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-brand" />
                  <input type="date" name="dateTo" defaultValue={initial.dateTo} className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-brand" />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Betrag (€)</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="0.01" name="amountMin" defaultValue={initial.amountMin} placeholder="Von" className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-brand" />
                  <input type="number" step="0.01" name="amountMax" defaultValue={initial.amountMax} placeholder="Bis" className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-brand" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="paidOnly" value="1" defaultChecked={initial.paidOnly} className="h-4 w-4 rounded border-border text-brand focus:ring-brand" />
                  Nur bezahlt
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="overdueOnly" value="1" defaultChecked={initial.overdueOnly} className="h-4 w-4 rounded border-border text-brand focus:ring-brand" />
                  Nur überfällig / abgelaufen
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="archived" value="1" defaultChecked={initial.archived} className="h-4 w-4 rounded border-border text-brand focus:ring-brand" />
                  Auch archivierte Einträge anzeigen
                </label>
              </div>

              <div className="sticky bottom-0 -mx-4 -mb-4 flex items-center justify-between gap-2 border-t border-border bg-card px-4 py-3">
                <Link href={kind ? `/rechnungen?kind=${kind}` : "/rechnungen"} onClick={() => setOpen(false)} className="text-sm font-medium text-muted hover:text-foreground">
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
  );
}
