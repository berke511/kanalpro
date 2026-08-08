"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Clock3, Eye, type LucideIcon } from "lucide-react";

export type ReminderType = "quote_expiring" | "invoice_overdue" | "payment_received" | "quote_viewed";

export type ReminderItem = {
  id: string;
  type: ReminderType;
  title: string;
  subtitle: string;
  href: string;
};

const TYPE_META: Record<ReminderType, { icon: LucideIcon; className: string }> = {
  quote_expiring: { icon: Clock3, className: "bg-amber-50 text-amber-700" },
  invoice_overdue: { icon: Clock3, className: "bg-red-50 text-red-700" },
  payment_received: { icon: CheckCheck, className: "bg-green-50 text-green-700" },
  quote_viewed: { icon: Eye, className: "bg-blue-50 text-blue-700" },
};

/**
 * Erinnerungs-Widget (Glocke). Es gibt in diesem Projekt keine
 * Hintergrundjobs/Cron – alle Erinnerungen werden bei jedem Seitenaufruf
 * frisch aus den aktuellen Angebots-/Rechnungsdaten berechnet (siehe
 * rechnungen/page.tsx: läuft morgen ab / seit 14 Tagen offen / Zahlung in
 * den letzten Tagen eingegangen / manuell als "vom Kunden geöffnet"
 * markierte Angebote), nicht aus einer separaten Benachrichtigungs-
 * Tabelle mit Push/E-Mail-Versand.
 */
export function RemindersWidget({ items }: { items: ReminderItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center rounded-lg border border-border bg-card p-2.5 text-muted transition hover:bg-background hover:text-foreground"
        aria-label="Erinnerungen"
      >
        <Bell className="h-4 w-4" />
        {items.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {items.length > 9 ? "9+" : items.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30 bg-black/30 sm:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="fixed inset-x-0 bottom-0 z-40 max-h-[75vh] overflow-y-auto rounded-t-2xl border border-border bg-card p-3 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:bottom-auto sm:mt-2 sm:max-h-96 sm:w-[min(92vw,380px)] sm:rounded-2xl">
            <div className="mx-auto mb-2 h-1.5 w-10 shrink-0 rounded-full bg-border sm:hidden" />
            <p className="px-1 py-1 text-xs font-semibold uppercase tracking-wide text-muted">Erinnerungen</p>
            <div className="mt-1 space-y-1">
              {items.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">Keine offenen Erinnerungen. Alles im Blick!</p>}
              {items.map((item) => {
                const meta = TYPE_META[item.type];
                const Icon = meta.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5 rounded-xl px-2 py-2 text-sm hover:bg-background"
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.className}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">{item.title}</span>
                      <span className="block truncate text-xs text-muted">{item.subtitle}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
