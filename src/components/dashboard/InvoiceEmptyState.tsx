import Link from "next/link";
import { FileText, Receipt } from "lucide-react";

/** Moderner Empty State (Spec-Punkt 15) für die Angebote-/Rechnungsliste,
 * wenn noch keine Dokumente existieren bzw. der aktuelle Filter nichts
 * findet. */
export function InvoiceEmptyState({ filtered = false }: { filtered?: boolean }) {
  return (
    <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="absolute h-24 w-24 rounded-full bg-brand-soft" />
        <Receipt className="relative h-11 w-11 text-brand" strokeWidth={1.5} />
        <FileText className="absolute bottom-1 right-1 h-8 w-8 rounded-lg bg-card p-1 text-brand-dark shadow-sm" strokeWidth={1.5} />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-foreground">{filtered ? "Keine Treffer für diese Filter" : "Noch keine Angebote oder Rechnungen"}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted">
        {filtered
          ? "Passe die Suche oder die Filter an, um wieder Ergebnisse zu sehen."
          : "Erstelle dein erstes Angebot oder deine erste Rechnung – wahlweise frei oder direkt aus einem bestehenden Auftrag heraus, ohne doppelte Dateneingabe."}
      </p>
      {!filtered && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/rechnungen/neu?kind=rechnung"
            className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-brand to-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
          >
            <Receipt className="h-4 w-4" />
            Erste Rechnung erstellen
          </Link>
          <Link
            href="/rechnungen/neu?kind=angebot"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-background"
          >
            <FileText className="h-4 w-4" />
            Erstes Angebot erstellen
          </Link>
        </div>
      )}
    </div>
  );
}
