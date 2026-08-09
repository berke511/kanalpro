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

      <div className="relative mt-2 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#3a63ff] via-[#3151e6] to-[#5b3ec9] px-6 py-6 text-white shadow-lg shadow-brand/25">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/20 blur-2xl" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <h1 className="break-words text-2xl font-semibold tracking-tight">{order.title}</h1>
          <form action={deleteWithId}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-[11px] border border-white/30 bg-white/10 px-3.5 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              Auftrag löschen
            </button>
          </form>
        </div>
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
