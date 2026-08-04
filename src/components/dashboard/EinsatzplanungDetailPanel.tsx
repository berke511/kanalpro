"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { Loader2, Mail, MapPin, Phone, Truck, X } from "lucide-react";
import {
  ORDER_KIND_LABELS,
  ORDER_PRIORITY_BADGE_CLASS,
  ORDER_PRIORITY_LABELS,
  ORDER_STATUS_BADGE_CLASS,
  STATUS_LABELS,
} from "@/lib/orders";
import { formatDate } from "@/lib/date";
import { updateOrderStatus } from "@/app/(dashboard)/auftraege/actions";

export type EinsatzplanungPanelData = {
  id: string;
  order_number: string | null;
  title: string;
  status: string;
  priority: string;
  order_kind: string;
  scheduled_date: string | null;
  start_time: string | null;
  planned_duration_minutes: number | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  addressLine: string | null;
  employees: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; name: string }>;
  machines: Array<{ id: string; name: string }>;
  closeHref: string;
  canManage: boolean;
};

export function EinsatzplanungDetailPanel({ data }: { data: EinsatzplanungPanelData }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  function runStatusChange(status: string, label: string) {
    setPending(label);
    startTransition(async () => {
      await updateOrderStatus(data.id, status);
      router.refresh();
      setPending(null);
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] lg:hidden" onClick={() => router.push(data.closeHref)} />
      <div className="fixed inset-y-0 right-0 z-40 w-full max-w-sm animate-slide-in-right overflow-y-auto border-l border-border bg-card p-5 shadow-xl lg:sticky lg:top-0 lg:z-0 lg:h-[calc(100vh-2rem)] lg:max-w-none lg:animate-none lg:shadow-none">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Auftragsdetails</h2>
          <Link href={data.closeHref} className="rounded-full p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground">
            <X className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${ORDER_STATUS_BADGE_CLASS[data.status] ?? "bg-gray-100 text-gray-600"}`}>
            {STATUS_LABELS[data.status] ?? data.status}
          </span>
          {data.priority !== "standard" && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${ORDER_PRIORITY_BADGE_CLASS[data.priority] ?? ""}`}>
              {ORDER_PRIORITY_LABELS[data.priority] ?? data.priority}
            </span>
          )}
        </div>

        <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
          {data.order_number ? `${data.order_number} · ` : ""}
          {data.title || ORDER_KIND_LABELS[data.order_kind] || data.order_kind}
        </h3>
        <p className="text-sm text-muted">{data.customerName ?? "Kein Kunde hinterlegt"}</p>

        <div className="mt-5 space-y-3 text-sm">
          {data.addressLine && (
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-muted">
                <MapPin className="h-4 w-4" />
              </span>
              <p className="mt-1.5 text-foreground">{data.addressLine}</p>
            </div>
          )}
          {data.customerPhone && (
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-muted">
                <Phone className="h-4 w-4" />
              </span>
              <a href={`tel:${data.customerPhone}`} className="text-foreground transition-colors hover:text-brand">
                {data.customerPhone}
              </a>
            </div>
          )}
          {data.customerEmail && (
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-muted">
                <Mail className="h-4 w-4" />
              </span>
              <a href={`mailto:${data.customerEmail}`} className="truncate text-foreground transition-colors hover:text-brand">
                {data.customerEmail}
              </a>
            </div>
          )}
          <div className="rounded-xl bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Termin</p>
            <p className="mt-1 font-medium text-foreground">
              {data.scheduled_date ? formatDate(data.scheduled_date) : "Noch nicht terminiert"}
              {data.start_time ? ` · ${data.start_time.slice(0, 5)} Uhr` : ""}
              {data.planned_duration_minutes ? ` (${(data.planned_duration_minutes / 60).toFixed(1).replace(/\.0$/, "")}h)` : ""}
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Zugewiesen</p>
          <div className="mt-2.5 space-y-2 text-sm">
            {data.employees.length === 0 && data.vehicles.length === 0 && data.machines.length === 0 && (
              <p className="text-muted">Noch keine Ressourcen zugewiesen</p>
            )}
            {data.employees.map((e) => (
              <div key={e.id} className="flex items-center gap-2.5 rounded-lg bg-background px-2.5 py-1.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-[10px] font-semibold text-white">
                  {e.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="truncate text-foreground">{e.name}</span>
              </div>
            ))}
            {[...data.vehicles, ...data.machines].map((v) => (
              <div key={v.id} className="flex items-center gap-2.5 rounded-lg bg-background px-2.5 py-1.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Truck className="h-3.5 w-3.5" />
                </span>
                <span className="truncate text-foreground">{v.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-2 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Aktionen</p>
          <Link
            href={`/auftraege/${data.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-brand to-brand-dark px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
          >
            Bearbeiten
          </Link>
          {data.canManage && data.status !== "in_bearbeitung" && data.status !== "abgeschlossen" && data.status !== "storniert" && (
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => runStatusChange("in_bearbeitung", "start")}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-brand/30 hover:bg-brand-soft disabled:opacity-60"
            >
              {pending === "start" && <Loader2 className="h-4 w-4 animate-spin" />}
              In Arbeit setzen
            </button>
          )}
          {data.canManage && data.status !== "abgeschlossen" && data.status !== "storniert" && (
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => {
                if (window.confirm("Diesen Auftrag wirklich absagen?")) runStatusChange("storniert", "cancel");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
            >
              {pending === "cancel" && <Loader2 className="h-4 w-4 animate-spin" />}
              Absagen
            </button>
          )}
        </div>
      </div>
    </>
  );
}
