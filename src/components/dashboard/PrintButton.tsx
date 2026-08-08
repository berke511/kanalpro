"use client";

import { Printer } from "lucide-react";

/** Kleiner Client-Baustein für "Als PDF speichern" auf server-gerenderten
 * Druckansichten (z. B. /rechnungen/[id]/pdf) – nutzt den nativen
 * Browser-Druckdialog, aus dem sich jedes System als PDF sichern lässt.
 * Es gibt keine echte serverseitige PDF-Bibliothek in diesem Projekt. */
export function PrintButton({ label = "Als PDF speichern / drucken" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-brand to-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md print:hidden"
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}
