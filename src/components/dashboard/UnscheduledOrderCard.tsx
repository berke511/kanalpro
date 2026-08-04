"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { Loader2 } from "lucide-react";
import { ORDER_KIND_COLOR, ORDER_KIND_LABELS } from "@/lib/orders";
import { scheduleOrder } from "@/app/(dashboard)/einsatzplanung/actions";

type Option = { id: string; label: string };

export function UnscheduledOrderCard({
  order,
  employees,
  vehicles,
  returnTo,
}: {
  order: { id: string; title: string; order_kind: string; customerName: string | null; planned_duration_minutes: number | null };
  employees: Option[];
  vehicles: Option[];
  returnTo: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const colors = ORDER_KIND_COLOR[order.order_kind] ?? ORDER_KIND_COLOR.sonstige;

  function handleSubmit(formData: FormData) {
    setSubmitting(true);
    startTransition(async () => {
      await scheduleOrder(order.id, returnTo, formData);
      router.refresh();
      setSubmitting(false);
      setOpen(false);
    });
  }

  return (
    <div className={`rounded-lg border border-border border-l-4 ${colors.border} bg-background p-3`}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full text-left">
        <p className="truncate text-sm font-medium text-foreground">{order.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{order.customerName ?? "Kein Kunde"}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text}`}>
            {ORDER_KIND_LABELS[order.order_kind] ?? order.order_kind}
          </span>
          {order.planned_duration_minutes && (
            <span className="text-[11px] text-muted">{(order.planned_duration_minutes / 60).toFixed(1).replace(/\.0$/, "")}h</span>
          )}
        </div>
      </button>

      {open && (
        <form action={handleSubmit} className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" name="scheduled_date" required className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs" />
            <input type="time" name="start_time" className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs" />
          </div>
          {employees.length > 0 && (
            <select name="employee_ids" className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-xs">
              <option value="">Mitarbeiter wählen…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          )}
          {vehicles.length > 0 && (
            <select name="vehicle_ids" className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-xs">
              <option value="">Fahrzeug wählen…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Einplanen
          </button>
        </form>
      )}
    </div>
  );
}
