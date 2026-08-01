import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteFleetItem, updateFleetItem } from "@/app/(dashboard)/fahrzeuge/actions";
import { FleetForm } from "@/components/dashboard/FleetForm";

export default async function FleetItemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const { error, message } = await searchParams;

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("fleet_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!item) {
    notFound();
  }

  const updateWithId = updateFleetItem.bind(null, id);
  const deleteWithId = deleteFleetItem.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link href="/fahrzeuge" className="text-sm text-muted hover:text-foreground">
        ← Zurück zur Übersicht
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{item.name}</h1>
        <form action={deleteWithId}>
          <button
            type="submit"
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Eintrag löschen
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
        <FleetForm action={updateWithId} defaultValues={item} submitLabel="Änderungen speichern" />
      </div>
    </div>
  );
}
