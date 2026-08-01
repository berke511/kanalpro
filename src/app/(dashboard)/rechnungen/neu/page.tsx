import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createInvoice } from "@/app/(dashboard)/rechnungen/actions";
import { InvoiceForm } from "@/components/dashboard/InvoiceForm";

export default async function NeuesRechnungPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: orders }, { data: customers }] = await Promise.all([
    supabase.from("orders").select("id, title, customers(name)").order("created_at", { ascending: false }),
    supabase.from("customers").select("id, name").order("name", { ascending: true }),
  ]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link href="/rechnungen" className="text-sm text-muted hover:text-foreground">
        ← Zurück zur Übersicht
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Neues Angebot / Neue Rechnung</h1>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm p-6">
        <InvoiceForm
          action={createInvoice}
          submitLabel="Anlegen"
          orders={(orders ?? []).map((o) => ({
            id: o.id,
            label: o.customers?.name ? `${o.title} (${o.customers.name})` : o.title,
          }))}
          customers={(customers ?? []).map((c) => ({ id: c.id, label: c.name }))}
        />
      </div>
    </div>
  );
}
