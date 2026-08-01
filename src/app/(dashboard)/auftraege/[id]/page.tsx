import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteOrder, updateOrder } from "@/app/(dashboard)/auftraege/actions";
import { OrderForm } from "@/components/dashboard/OrderForm";

export default async function AuftragDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const { error, message } = await searchParams;

  const supabase = await createClient();
  const [{ data: order }, { data: customers }, { data: employees }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("customers").select("id, name").order("name", { ascending: true }),
    supabase.from("profiles").select("id, full_name").order("full_name", { ascending: true }),
  ]);

  if (!order) {
    notFound();
  }

  const updateWithId = updateOrder.bind(null, id);
  const deleteWithId = deleteOrder.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link href="/auftraege" className="text-sm text-muted hover:text-foreground">
        ← Zurück zur Auftragsliste
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{order.title}</h1>
        <form action={deleteWithId}>
          <button
            type="submit"
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Auftrag löschen
          </button>
        </form>
      </div>

      {message && (
        <p className="mt-4 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-dark">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm p-6">
        <OrderForm
          action={updateWithId}
          defaultValues={order}
          submitLabel="Änderungen speichern"
          customers={(customers ?? []).map((c) => ({ id: c.id, label: c.name }))}
          employees={(employees ?? []).map((e) => ({ id: e.id, label: e.full_name || "Unbenannt" }))}
        />
      </div>
    </div>
  );
}
