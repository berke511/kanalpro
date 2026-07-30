import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createReport } from "@/app/(dashboard)/berichte/actions";
import { ReportForm } from "@/components/dashboard/ReportForm";

export default async function NeuerBerichtPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; order?: string }>;
}) {
  const { error, order } = await searchParams;
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, title, customers(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link href="/berichte" className="text-sm text-muted hover:text-foreground">
        ← Zurück zur Übersicht
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Neuer Einsatzbericht</h1>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <ReportForm
          action={createReport}
          submitLabel="Bericht speichern"
          orders={(orders ?? []).map((o) => ({
            id: o.id,
            label: o.customers?.name ? `${o.title} (${o.customers.name})` : o.title,
          }))}
          defaultValues={order ? { order_id: order } : undefined}
        />
      </div>
    </div>
  );
}
