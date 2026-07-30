import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  CUSTOMER_KINDS,
  CUSTOMER_KIND_LABELS,
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_BADGE_CLASS,
  CUSTOMER_STATUS_LABELS,
} from "@/lib/customers";

function buildHref(base: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(base)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/kunden?${qs}` : "/kunden";
}

export default async function KundenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; status?: string }>;
}) {
  const { q, kind, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select("id, kind, status, name, company_name, customer_number, email, phone, city, tags")
    .order("created_at", { ascending: false });

  if (kind && CUSTOMER_KINDS.includes(kind as (typeof CUSTOMER_KINDS)[number])) {
    query = query.eq("kind", kind);
  }
  if (status && CUSTOMER_STATUSES.includes(status as (typeof CUSTOMER_STATUSES)[number])) {
    query = query.eq("status", status);
  }
  if (q && q.trim()) {
    const term = q.trim().replace(/[%,()]/g, " ");
    query = query.or(
      `name.ilike.%${term}%,company_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,customer_number.ilike.%${term}%`,
    );
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

      <form className="mt-6 flex max-w-xl flex-wrap gap-3">
        <input type="hidden" name="kind" value={kind ?? ""} />
        <input type="hidden" name="status" value={status ?? ""} />
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Suche nach Name, Firma, E-Mail, Telefon, Kundennummer…"
          className="min-w-[260px] flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background"
        >
          Suchen
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={buildHref({ q, status })}
          className={`rounded-full px-3 py-1 text-xs font-medium ${!kind ? "bg-brand text-white" : "bg-card text-muted hover:text-foreground"}`}
        >
          Alle Arten
        </Link>
        {CUSTOMER_KINDS.map((k) => (
          <Link
            key={k}
            href={buildHref({ q, status, kind: k })}
            className={`rounded-full px-3 py-1 text-xs font-medium ${kind === k ? "bg-brand text-white" : "bg-card text-muted hover:text-foreground"}`}
          >
            {CUSTOMER_KIND_LABELS[k]}
          </Link>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href={buildHref({ q, kind })}
          className={`rounded-full px-3 py-1 text-xs font-medium ${!status ? "bg-brand-soft text-brand-dark" : "bg-card text-muted hover:text-foreground"}`}
        >
          Alle Status
        </Link>
        {CUSTOMER_STATUSES.map((s) => (
          <Link
            key={s}
            href={buildHref({ q, kind, status: s })}
            className={`rounded-full px-3 py-1 text-xs font-medium ${status === s ? "bg-brand-soft text-brand-dark" : "bg-card text-muted hover:text-foreground"}`}
          >
            {CUSTOMER_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Kunden konnten nicht geladen werden: {error.message}
        </p>
      )}

      {!error && (!customers || customers.length === 0) && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-muted">
            {q || kind || status ? "Keine Kunden gefunden." : "Noch keine Kunden angelegt."}
          </p>
          {!q && !kind && !status && (
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
                <th className="px-4 py-3 font-medium">Kunde</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Nr.</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Art</th>
                <th className="px-4 py-3 font-medium">Status</th>
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
                    {customer.tags && customer.tags.length > 0 && (
                      <p className="mt-0.5 text-xs text-muted">{customer.tags.join(" · ")}</p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">{customer.customer_number ?? "—"}</td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    {CUSTOMER_KIND_LABELS[customer.kind] ?? customer.kind}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${CUSTOMER_STATUS_BADGE_CLASS[customer.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {CUSTOMER_STATUS_LABELS[customer.status] ?? customer.status}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    {customer.email || customer.phone || "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">{customer.city || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
