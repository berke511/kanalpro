import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS } from "@/lib/orders";

const STATUS_BADGE_CLASS: Record<string, string> = {
  offen: "bg-brand-soft text-brand",
  eingeplant: "bg-amber-50 text-amber-700",
  in_arbeit: "bg-blue-50 text-blue-700",
  abgeschlossen: "bg-green-50 text-green-700",
};

export default async function AuftraegePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("id, title, status, scheduled_date, customers(name), profiles!orders_assigned_to_fkey(full_name)")
    .order("created_at", { ascending: false });

  if (status && status in STATUS_LABELS) {
    query = query.eq("status", status);
  }

  const { data: orders, error } = await query;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Auftragsmanagement</h1>
          <p className="mt-1 text-sm text-muted">
            {orders?.length ?? 0} Auftrag{orders?.length === 1 ? "" : "e"}
          </p>
        </div>
        <Link
          href="/auftraege/neu"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          + Neuer Auftrag
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/auftraege"
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            !status ? "bg-foreground text-background" : "bg-card text-muted border border-border"
          }`}
        >
          Alle
        </Link>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <Link
            key={value}
            href={`/auftraege?status=${value}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              status === value
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
          Aufträge konnten nicht geladen werden: {error.message}
        </p>
      )}

      {!error && (!orders || orders.length === 0) && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-muted">
            {status ? "Keine Aufträge mit diesem Status." : "Noch keine Aufträge angelegt."}
          </p>
          {!status && (
            <Link href="/auftraege/neu" className="mt-3 inline-block text-sm font-medium text-brand">
              Ersten Auftrag anlegen
            </Link>
          )}
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Titel</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Kunde</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Mitarbeiter</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Termin</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/auftraege/${order.id}`}
                      className="font-medium text-foreground hover:text-brand"
                    >
                      {order.title}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    {order.customers?.name ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    {order.profiles?.full_name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        STATUS_BADGE_CLASS[order.status] ?? "bg-brand-soft text-brand"
                      }`}
                    >
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    {order.scheduled_date ?? "—"}
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
