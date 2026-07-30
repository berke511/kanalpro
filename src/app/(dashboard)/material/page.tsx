import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function MaterialPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from("materials")
    .select("id, name, unit, quantity, min_quantity, unit_price")
    .order("name", { ascending: true });

  const lowStock = (items ?? []).filter(
    (item) => item.min_quantity != null && Number(item.quantity) <= Number(item.min_quantity)
  );

  const visibleItems = filter === "niedrig" ? lowStock : items;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Materialverwaltung</h1>
          <p className="mt-1 text-sm text-muted">
            {items?.length ?? 0} Material{items?.length === 1 ? "" : "ien"}
            {lowStock.length > 0 && (
              <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                {lowStock.length} mit niedrigem Bestand
              </span>
            )}
          </p>
        </div>
        <Link
          href="/material/neu"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          + Neues Material
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/material"
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            !filter ? "bg-foreground text-background" : "bg-card text-muted border border-border"
          }`}
        >
          Alle
        </Link>
        <Link
          href="/material?filter=niedrig"
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            filter === "niedrig" ? "bg-foreground text-background" : "bg-card text-muted border border-border"
          }`}
        >
          Niedriger Bestand
        </Link>
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Materialien konnten nicht geladen werden: {error.message}
        </p>
      )}

      {!error && (!visibleItems || visibleItems.length === 0) && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-muted">
            {filter === "niedrig" ? "Kein Material mit niedrigem Bestand." : "Noch kein Material angelegt."}
          </p>
          {!filter && (
            <Link href="/material/neu" className="mt-3 inline-block text-sm font-medium text-brand">
              Erstes Material anlegen
            </Link>
          )}
        </div>
      )}

      {visibleItems && visibleItems.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Bezeichnung</th>
                <th className="px-4 py-3 font-medium">Bestand</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Einheit</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Preis/Einheit</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const isLow =
                  item.min_quantity != null && Number(item.quantity) <= Number(item.min_quantity);
                return (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/material/${item.id}`}
                        className="font-medium text-foreground hover:text-brand"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{item.quantity}</td>
                    <td className="hidden px-4 py-3 text-muted sm:table-cell">{item.unit}</td>
                    <td className="hidden px-4 py-3 text-muted md:table-cell">
                      {item.unit_price != null ? `${Number(item.unit_price).toFixed(2)} €` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {isLow ? (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                          Niedriger Bestand
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                          Ausreichend
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
