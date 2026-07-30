import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function BerichtePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const supabase = await createClient();

  const { data: reports, error } = await supabase
    .from("service_reports")
    .select(
      "id, report_date, work_performed, hours_worked, customer_signature_name, signed_at, orders(id, title, customers(name))",
    )
    .order("report_date", { ascending: false });

  const visibleReports =
    filter === "unsigned" ? (reports ?? []).filter((r) => !r.signed_at) : reports;

  const unsignedCount = (reports ?? []).filter((r) => !r.signed_at).length;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Einsatz- & Abschlussberichte</h1>
          <p className="mt-1 text-sm text-muted">
            {reports?.length ?? 0} Bericht{reports?.length === 1 ? "" : "e"}
            {unsignedCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                {unsignedCount} ohne Unterschrift
              </span>
            )}
          </p>
        </div>
        <Link
          href="/berichte/neu"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          + Neuer Bericht
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/berichte"
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            !filter ? "bg-foreground text-background" : "bg-card text-muted border border-border"
          }`}
        >
          Alle
        </Link>
        <Link
          href="/berichte?filter=unsigned"
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            filter === "unsigned"
              ? "bg-foreground text-background"
              : "bg-card text-muted border border-border"
          }`}
        >
          Ohne Unterschrift
        </Link>
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Berichte konnten nicht geladen werden: {error.message}
        </p>
      )}

      {!error && (!visibleReports || visibleReports.length === 0) && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-muted">
            {filter === "unsigned" ? "Alle Berichte sind unterschrieben." : "Noch keine Berichte angelegt."}
          </p>
          {!filter && (
            <Link href="/berichte/neu" className="mt-3 inline-block text-sm font-medium text-brand">
              Ersten Bericht anlegen
            </Link>
          )}
        </div>
      )}

      {visibleReports && visibleReports.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Auftrag</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Kunde</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Datum</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Std.</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleReports.map((report) => (
                <tr key={report.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/berichte/${report.id}`}
                      className="font-medium text-foreground hover:text-brand"
                    >
                      {report.orders?.title ?? "—"}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    {report.orders?.customers?.name ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    {report.report_date ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    {report.hours_worked ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {report.signed_at ? (
                      <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                        Unterschrieben
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        Offen
                      </span>
                    )}
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
