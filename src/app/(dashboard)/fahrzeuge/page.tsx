import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FLEET_KIND_LABELS, FLEET_STATUS_LABELS } from "@/lib/fleet";

const STATUS_BADGE_CLASS: Record<string, string> = {
  verfuegbar: "bg-green-50 text-green-700",
  im_einsatz: "bg-blue-50 text-blue-700",
  wartung: "bg-amber-50 text-amber-700",
  defekt: "bg-red-50 text-red-700",
};

export default async function FahrzeugePage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("fleet_items")
    .select("id, kind, name, license_plate, status")
    .order("name", { ascending: true });

  if (kind && kind in FLEET_KIND_LABELS) {
    query = query.eq("kind", kind);
  }

  const { data: items, error } = await query;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fahrzeug- & Maschinenverwaltung</h1>
          <p className="mt-1 text-sm text-muted">
            {items?.length ?? 0} Eintrag{items?.length === 1 ? "" : "e"}
          </p>
        </div>
        <Link
          href="/fahrzeuge/neu"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          + Neuer Eintrag
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/fahrzeuge"
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            !kind ? "bg-foreground text-background" : "bg-card text-muted border border-border"
          }`}
        >
          Alle
        </Link>
        {Object.entries(FLEET_KIND_LABELS).map(([value, label]) => (
          <Link
            key={value}
            href={`/fahrzeuge?kind=${value}`}
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

      {!error && (!items || items.length === 0) && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-muted">
            {kind ? "Keine Einträge in dieser Kategorie." : "Noch keine Fahrzeuge oder Maschinen angelegt."}
          </p>
          {!kind && (
            <Link href="/fahrzeuge/neu" className="mt-3 inline-block text-sm font-medium text-brand">
              Ersten Eintrag anlegen
            </Link>
          )}
        </div>
      )}

      {items && items.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Bezeichnung</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Typ</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Kennzeichen</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/fahrzeuge/${item.id}`}
                      className="font-medium text-foreground hover:text-brand"
                    >
                      {item.name}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    {FLEET_KIND_LABELS[item.kind] ?? item.kind}
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    {item.license_plate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        STATUS_BADGE_CLASS[item.status] ?? "bg-brand-soft text-brand"
                      }`}
                    >
                      {FLEET_STATUS_LABELS[item.status] ?? item.status}
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
