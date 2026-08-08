"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Euro, FileText, Mail, MapPin, Phone, Receipt, User, X } from "lucide-react";
import { formatDate } from "@/lib/date";
import { formatEuro } from "@/lib/format";
import { initialsFor } from "@/lib/invoices";

export type CustomerPreviewData = {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  openOrdersCount: number;
  openInvoicesCount: number;
  openInvoicesAmount: number;
  totalRevenue: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  hrefs: { close: string; full: string; newQuote: string; newInvoice: string };
};

/**
 * Leichtgewichtige Kundenvorschau, die per Klick auf einen Kundennamen in
 * der Angebote-/Rechnungen-Tabelle geöffnet wird, ohne die Seite zu
 * verlassen (Spec-Punkt 6). Bewusst nur lesend – für Bearbeitung verweist
 * der "Zum vollständigen Kundenprofil"-Link auf /kunden/[id].
 */
export function CustomerPreviewPanel({ data }: { data: CustomerPreviewData }) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") router.push(data.hrefs.close);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router, data.hrefs.close]);

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] lg:hidden" onClick={() => router.push(data.hrefs.close)} />
      <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md animate-slide-in-right overflow-y-auto border-l border-border bg-card p-5 shadow-xl lg:sticky lg:top-0 lg:z-0 lg:h-[calc(100vh-2rem)] lg:max-w-none lg:animate-none lg:shadow-none">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Kundenvorschau</h2>
          <Link href={data.hrefs.close} className="rounded-full p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground">
            <X className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-lg font-semibold text-white shadow-sm">
            {initialsFor(data.name)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-tight text-foreground">{data.name}</h3>
            {data.contactPerson && <p className="truncate text-sm text-muted">{data.contactPerson}</p>}
          </div>
        </div>

        <Link href={data.hrefs.full} className="mt-3 flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-dark">
          Zum vollständigen Kundenprofil
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>

        <div className="mt-4 space-y-2.5 rounded-xl bg-background p-3 text-sm">
          {data.phone && (
            <a href={`tel:${data.phone}`} className="flex items-center gap-2.5 text-foreground hover:text-brand">
              <Phone className="h-4 w-4 shrink-0 text-muted" />
              {data.phone}
            </a>
          )}
          {data.email && (
            <a href={`mailto:${data.email}`} className="flex items-center gap-2.5 text-foreground hover:text-brand">
              <Mail className="h-4 w-4 shrink-0 text-muted" />
              {data.email}
            </a>
          )}
          {data.address && (
            <p className="flex items-center gap-2.5 text-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-muted" />
              {data.address}
            </p>
          )}
          {!data.phone && !data.email && !data.address && <p className="text-muted">Keine Kontaktdaten hinterlegt.</p>}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-background p-3 text-center">
            <p className="text-lg font-semibold text-foreground">{data.openOrdersCount}</p>
            <p className="text-[11px] text-muted">Offene Aufträge</p>
          </div>
          <div className="rounded-xl bg-background p-3 text-center">
            <p className="text-lg font-semibold text-foreground">{data.openInvoicesCount}</p>
            <p className="text-[11px] text-muted">Offene Rechnungen</p>
          </div>
          <div className="rounded-xl bg-background p-3 text-center">
            <p className="text-lg font-semibold text-foreground">{formatEuro(data.openInvoicesAmount)}</p>
            <p className="text-[11px] text-muted">Offener Betrag</p>
          </div>
          <div className="rounded-xl bg-background p-3 text-center">
            <p className="text-lg font-semibold text-foreground">{formatEuro(data.totalRevenue)}</p>
            <p className="text-[11px] text-muted">Gesamtumsatz</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-background p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Letzte Zahlung</p>
          {data.lastPaymentDate ? (
            <div className="mt-1.5 flex items-center gap-2.5 text-sm text-foreground">
              <Euro className="h-4 w-4 shrink-0 text-muted" />
              {data.lastPaymentAmount !== null ? formatEuro(data.lastPaymentAmount) : ""} · {formatDate(data.lastPaymentDate)}
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted">Noch keine Zahlung erfasst.</p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href={data.hrefs.newQuote} className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-background">
            <FileText className="h-3.5 w-3.5" />
            Neues Angebot
          </Link>
          <Link href={data.hrefs.newInvoice} className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-background">
            <Receipt className="h-3.5 w-3.5" />
            Neue Rechnung
          </Link>
        </div>

        <Link href={`/auftraege?customer=${data.id}`} className="mt-4 flex items-center gap-2 text-xs text-muted hover:text-foreground">
          <User className="h-3.5 w-3.5" />
          Alle Aufträge dieses Kunden ansehen
        </Link>
      </div>
    </>
  );
}
