import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function KundenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select("id, kind, name, contact_person, email, phone, city")
    .order("name", { ascending: true });

  if (q && q.trim()) {
    query = query.ilike("name", `%${q.trim()}%`);
  }

  const { data: customers, error } = await query;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kundenverwaltung</h1>
          <p className="mt-1 text-sm text-muted">
            {customers?.length ?? 0} Kunde{customers?.length === 1 ? "" : "n"}
          </p>
        </div>
        <Link
          href="/kunden/neu"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          + Neuer Kunde
        </Link>
      </div>

      <form className="mt-6 max-w-sm">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Kunden nach Namen suchen…"
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </form>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Kunden konnten nicht geladen werden: {error.message}
        </p>
      )}

      {!error && (!customers || customers.length === 0) && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-muted">
            {q ? "Keine Kunden gefunden." : "Noch keine Kunden angelegt."}
          </p>
          {!q && (
            <Link href="/kunden/neu" className="mt-3 inline-block text-sm font-medium text-brand">
              Ersten Kunden anlegen
            </Link>
          )}
        </div>
      )}

      {customers && customers.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Typ</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Kontakt</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Ort</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/kunden/${customer.id}`}
                      className="font-medium text-foreground hover:text-brand"
                    >
                      {customer.name}
                    </Link>
                    {customer.contact_person && (
                      <p className="text-xs text-muted">{customer.contact_person}</p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    {customer.kind === "firma" ? "Firma" : "Privat"}
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    {customer.email || customer.phone || "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    {customer.city || "—"}
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
