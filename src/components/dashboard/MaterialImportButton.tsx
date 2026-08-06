"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";

export function MaterialImportButton({ action }: { action: (formData: FormData) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-background sm:py-2"
      >
        <Upload className="h-4 w-4" />
        Importieren
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 rounded-2xl border border-border bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Material importieren</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-muted hover:bg-background hover:text-foreground" aria-label="Schließen">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              CSV-Datei mit Kopfzeile (name, unit, category, quantity, min_quantity, supplier_name, purchase_price, unit_price). Nur &quot;name&quot; ist
              erforderlich.
            </p>
            <form action={action} className="mt-3 space-y-3" onSubmit={() => setOpen(false)}>
              <input type="file" name="file" accept=".csv,text/csv" required className="w-full text-sm" />
              <button type="submit" className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                Importieren
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
