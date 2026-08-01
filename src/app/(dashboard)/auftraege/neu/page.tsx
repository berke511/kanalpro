import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createOrder } from "@/app/(dashboard)/auftraege/actions";
import { OrderForm } from "@/components/dashboard/OrderForm";

export default async function NeuerAuftragPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: customers }, { data: employees }] = await Promise.all([
    supabase.from("customers").select("id, name").order("name", { ascending: true }),
    supabase.from("profiles").select("id, full_name").order("full_name", { ascending: true }),
  ]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link href="/auftraege" className="text-sm text-muted hover:text-foreground">
        ← Zurück zur Auftragsliste
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Neuer Auftrag</h1>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm p-6">
        <OrderForm
          action={createOrder}
          submitLabel="Auftrag anlegen"
          customers={(customers ?? []).map((c) => ({ id: c.id, label: c.name }))}
          employees={(employees ?? []).map((e) => ({ id: e.id, label: e.full_name || "Unbenannt" }))}
        />
      </div>
    </div>
  );
}
