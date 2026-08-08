import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createInvoice } from "@/app/(dashboard)/rechnungen/actions";
import { InvoiceCreateForm } from "@/components/dashboard/InvoiceCreateForm";

export default async function NeuesRechnungPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; customer_id?: string; order_id?: string; kind?: string }>;
}) {
  const { error, customer_id: customerId, order_id: orderId, kind } = await searchParams;
  const supabase = await createClient();

  const [{ data: orders }, { data: customers }] = await Promise.all([
    supabase.from("orders").select("id, title, customer_id, customers(name)").order("created_at", { ascending: false }),
    supabase.from("customers").select("id, name").order("name", { ascending: true }),
  ]);

  return (
    <div className="mx-auto max-w-xl p-6">
      <Link href="/rechnungen" className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Übersicht
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Neues Angebot / Neue Rechnung</h1>
      <p className="mt-1 text-sm text-muted">Positionen, Status und Zahlungen lassen sich anschließend in der Detailansicht ergänzen.</p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <InvoiceCreateForm
          action={createInvoice}
          defaultKind={kind === "angebot" || kind === "rechnung" ? kind : "rechnung"}
          defaultCustomerId={customerId}
          defaultOrderId={orderId}
          customerOptions={(customers ?? []).map((c) => ({ id: c.id, label: c.name }))}
          orderOptions={(orders ?? []).map((o) => ({
            id: o.id,
            label: o.customers?.name ? `${o.title} (${o.customers.name})` : o.title,
            customerId: o.customer_id,
          }))}
        />
      </div>
    </div>
  );
}
