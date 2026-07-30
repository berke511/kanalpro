import Link from "next/link";
import { createFleetItem } from "@/app/(dashboard)/fahrzeuge/actions";
import { FleetForm } from "@/components/dashboard/FleetForm";

export default async function NeuerFleetItemPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link href="/fahrzeuge" className="text-sm text-muted hover:text-foreground">
        ← Zurück zur Übersicht
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Neues Fahrzeug / Neue Maschine</h1>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <FleetForm action={createFleetItem} submitLabel="Eintrag anlegen" />
      </div>
    </div>
  );
}
