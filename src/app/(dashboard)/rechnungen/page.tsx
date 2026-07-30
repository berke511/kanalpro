import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { INVOICE_KIND_LABELS, INVOICE_STATUS_LABELS } from "@/lib/invoices";

const STATUS_BADGE_CLASS: Record<string, string> = {
  entwurf: "bg-brand-soft text-brand",
  versendet: "bg-amber-50 text-amber-700",
  bezahlt: "bg-green-50 text-green-700",
  storniert: "bg-red-50 text-red-700",
};

export default async function RechnungenPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("invoices")
    .select("id, kind, invoice_number, status, issue_date, customers(name)")
    .order("issue_date", { ascending: false });

  if (kind && kind in INVOICE_KIND_LABELS) {
    query = query.eq("kind", kind);
  }

  const { data: invoices, error } = await query;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Angebote & Rechnungen</h1>
          <p className="mt-1 text-sm text-muted">
            {invoices?.length ?? 0} Eintrag{invoices?.length === 1 ? "" : "e"}
          </p>
        </div>
        <Link
          href="/rechnungen/neu"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          + Neu
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/rechnungen"
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            !kind ? "bg-foreground text-background" : "bg-card text-muted border border-border"
          }`}
        >
          Alle
        </Link>
        {Object.entries(INVOICE_KIND_LABELS).map(([value, label]) => (
          <Link
            key={value}
            href={`/rechnungen?kind=${value}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              kind === value
                ? "bg-foreground text-background"
                : "bg-card text-muted border border-border"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Einträge konnten nicht geladen werden: {error.message}
        </p>
      )}

      {!error && (!invoices || invoices.length === 0) && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-muted">
            {kind ? "Keine Einträge in dieser Kategorie." : "Noch keine Angebote oder Rechnungen angelegt."}
          </p>
          {!kind && (
            <Link href="/rechnungen/neu" className="mt-3 inline-block text-sm font-medium text-brand">
              Ersten Eintrag anlegen
            </Link>
          )}
        </div>
      )}

      {invoices && invoices.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nummer</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Typ</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Kunde</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Datum</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/rechnungen/${invoice.id}`}
                      className="font-medium text-foreground hover:text-brand"
                    >
                      {invoice.invoice_number || "Ohne Nummer"}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    {INVOICE_KIND_LABELS[invoice.kind] ?? invoice.kind}
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    {invoice.customers?.name ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">{invoice.issue_date}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        STATUS_BADGE_CLASS[invoice.status] ?? "bg-brand-soft text-brand"
                      }`}
                    >
                      {INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
